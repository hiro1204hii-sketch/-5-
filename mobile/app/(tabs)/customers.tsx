import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, TextInput, Modal, ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getCustomers, saveCustomer, deleteCustomer, getResults } from '../../hooks/useStorage';
import { Customer, Temperature } from '../../types';
import { Colors } from '../../constants/theme';

const TEMP_COLORS: Record<Temperature, string> = {
  HOT: Colors.hot, WARM: Colors.warm, COLD: Colors.cold,
};
const TEMP_EMOJIS: Record<Temperature, string> = { HOT: '🔥', WARM: '☀️', COLD: '❄️' };

interface FormState { name: string; company: string; phone: string; email: string; memo: string; }
const EMPTY_FORM: FormState = { name: '', company: '', phone: '', email: '', memo: '' };

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analysisCounts, setAnalysisCounts] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    const [custs, results] = await Promise.all([getCustomers(), getResults()]);
    setCustomers(custs);
    const counts: Record<string, number> = {};
    results.forEach(r => {
      if (r.customerId) counts[r.customerId] = (counts[r.customerId] ?? 0) + 1;
    });
    setAnalysisCounts(counts);
  };

  const openNew = () => {
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setForm({ name: c.name, company: c.company, phone: c.phone ?? '', email: c.email ?? '', memo: c.memo ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('', 'お客様名を入力してください'); return; }
    const customer: Customer = {
      id: editingCustomer?.id ?? Date.now().toString(),
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      memo: form.memo.trim() || undefined,
      createdAt: editingCustomer?.createdAt ?? new Date().toISOString(),
      latestTemperature: editingCustomer?.latestTemperature,
      lastContactedAt: editingCustomer?.lastContactedAt,
    };
    await saveCustomer(customer);
    setShowModal(false);
    loadData();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('削除', `「${name}」を削除しますか？関連する商談記録は保持されます。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          await deleteCustomer(id);
          loadData();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Customer }) => {
    const count = analysisCounts[item.id] ?? 0;
    const lastDate = item.lastContactedAt
      ? new Date(item.lastContactedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
      : '未接触';
    const temp = item.latestTemperature;

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push({ pathname: '/customer-detail', params: { id: item.id } })}
        onLongPress={() => handleDelete(item.id, item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.itemMain}>
          <View style={styles.itemTop}>
            <Text style={styles.itemName}>{item.name}</Text>
            {temp && (
              <View style={[styles.tempPill, { backgroundColor: TEMP_COLORS[temp] + '22' }]}>
                <Text style={[styles.tempPillText, { color: TEMP_COLORS[temp] }]}>
                  {TEMP_EMOJIS[temp]} {temp}
                </Text>
              </View>
            )}
          </View>
          {item.company ? <Text style={styles.itemCompany}>{item.company}</Text> : null}
          <View style={styles.itemMeta}>
            <Text style={styles.metaText}>商談 {count}回</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>最終: {lastDate}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => openEdit(item)} hitSlop={12}>
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {customers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>お客様がいません</Text>
          <Text style={styles.emptyHint}>右下のボタンで追加しましょう</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={c => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openNew} activeOpacity={0.85}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingCustomer ? '編集' : '新規登録'}</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ gap: 16, padding: 20 }}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>お客様名 *</Text>
              <TextInput
                style={styles.formInput}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="山田 太郎"
                placeholderTextColor={Colors.lightBrown}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>会社名</Text>
              <TextInput
                style={styles.formInput}
                value={form.company}
                onChangeText={v => setForm(f => ({ ...f, company: v }))}
                placeholder="株式会社〇〇"
                placeholderTextColor={Colors.lightBrown}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>電話番号</Text>
              <TextInput
                style={styles.formInput}
                value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                placeholder="090-0000-0000"
                placeholderTextColor={Colors.lightBrown}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>メールアドレス</Text>
              <TextInput
                style={styles.formInput}
                value={form.email}
                onChangeText={v => setForm(f => ({ ...f, email: v }))}
                placeholder="taro@example.com"
                placeholderTextColor={Colors.lightBrown}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>メモ</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={form.memo}
                onChangeText={v => setForm(f => ({ ...f, memo: v }))}
                placeholder="業界・課題・特記事項など"
                placeholderTextColor={Colors.lightBrown}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  list: { padding: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.lineColor,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.lightBrown,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, color: Colors.cream, fontWeight: '700' },
  itemMain: { flex: 1, gap: 2 },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.ink },
  tempPill: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
  },
  tempPillText: { fontSize: 10, fontWeight: '700' },
  itemCompany: { fontSize: 12, color: Colors.warmBrown },
  itemMeta: { flexDirection: 'row', gap: 4, marginTop: 2 },
  metaText: { fontSize: 11, color: Colors.lightBrown },
  metaDot: { fontSize: 11, color: Colors.lightBrown },
  editIcon: { fontSize: 16 },
  sep: { height: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 56, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '500', color: Colors.warmBrown },
  emptyHint: { fontSize: 13, color: Colors.lightBrown },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.darkBrown,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.darkBrown,
    shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { fontSize: 28, color: Colors.cream, lineHeight: 32 },
  modal: { flex: 1, backgroundColor: Colors.cream },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.lineColor,
  },
  modalCancel: { fontSize: 16, color: Colors.warmBrown },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.darkBrown },
  modalSave: { fontSize: 16, fontWeight: '700', color: Colors.warmBrown },
  modalBody: { flex: 1 },
  formField: { gap: 6 },
  formLabel: { fontSize: 13, fontWeight: '500', color: Colors.ink },
  formInput: {
    borderWidth: 1, borderColor: Colors.lineColor, borderRadius: 8,
    padding: 12, fontSize: 14, color: Colors.ink, backgroundColor: Colors.white,
  },
  formTextarea: { height: 100, textAlignVertical: 'top' },
});
