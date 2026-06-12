import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, TextInput, Modal, ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getCustomers, saveCustomer, deleteCustomer, getResults } from '../../hooks/useStorage';
import { Customer, Temperature } from '../../types';
import { GoldButton } from '../../components/GoldButton';
import { Colors, Gradients } from '../../constants/theme';

const TC: Record<Temperature, string> = { HOT: Colors.hot, WARM: Colors.warm, COLD: Colors.cold };
const TE: Record<Temperature, string> = { HOT: '🔥', WARM: '☀️', COLD: '❄️' };
type Filter = 'ALL' | Temperature;
type Form = { name: string; company: string; role: string; phone: string; email: string; memo: string; dealAmount: string };
const EMPTY: Form = { name: '', company: '', role: '', phone: '', email: '', memo: '', dealAmount: '' };

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [custs, results] = await Promise.all([getCustomers(), getResults()]);
      setCustomers(custs);
      const c: Record<string, number> = {};
      results.forEach(r => { if (r.customerId) c[r.customerId] = (c[r.customerId] ?? 0) + 1; });
      setCounts(c);
    })();
  }, []));

  const filtered = customers.filter(c => {
    if (filter !== 'ALL' && c.latestTemperature !== filter) return false;
    if (search && !c.name.includes(search) && !c.company.includes(search)) return false;
    return true;
  });

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, company: c.company, role: c.role ?? '', phone: c.phone ?? '', email: c.email ?? '', memo: c.memo ?? '', dealAmount: c.dealAmount?.toString() ?? '' });
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('', 'お客様名を入力してください'); return; }
    const c: Customer = {
      id: editing?.id ?? Date.now().toString(),
      name: form.name.trim(), company: form.company.trim(),
      role: form.role.trim() || undefined, phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined, memo: form.memo.trim() || undefined,
      dealAmount: form.dealAmount ? parseInt(form.dealAmount) : undefined,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      latestTemperature: editing?.latestTemperature,
      lastContactedAt: editing?.lastContactedAt,
    };
    await saveCustomer(c);
    setShowModal(false);
    const list = await getCustomers(); setCustomers(list);
  };
  const handleDelete = (id: string, name: string) =>
    Alert.alert('削除', `「${name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteCustomer(id); const l = await getCustomers(); setCustomers(l); } },
    ]);

  const renderItem = ({ item }: { item: Customer }) => {
    const cnt = counts[item.id] ?? 0;
    const last = item.lastContactedAt ? new Date(item.lastContactedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : '未接触';
    const temp = item.latestTemperature;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/customer-detail', params: { id: item.id } })}
        onLongPress={() => handleDelete(item.id, item.name)}
        activeOpacity={0.7}
      >
        <LinearGradient colors={Gradients.gold} style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </LinearGradient>
        <View style={styles.cardMain}>
          <View style={styles.cardTop}>
            <Text style={styles.cardName}>{item.name}</Text>
            {temp ? (
              <View style={[styles.tempPill, { backgroundColor: TC[temp] + '22' }]}>
                <Text style={[styles.tempPillText, { color: TC[temp] }]}>{TE[temp]} {temp}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardCompany}>{item.company}{item.role ? ` · ${item.role}` : ''}</Text>
          <View style={styles.cardMeta}>
            {item.dealAmount ? <Text style={styles.amountText}>¥{item.dealAmount.toLocaleString()}万</Text> : null}
            <Text style={styles.metaText}>商談 {cnt}回 · {last}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => openEdit(item)} hitSlop={12} style={styles.editBtn}>
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const F = (t: string, v: string, key: keyof Form, num?: boolean) => (
    <View style={styles.field} key={key}>
      <Text style={styles.fieldLabel}>{t}</Text>
      <TextInput
        style={styles.fieldInput}
        value={form[key]}
        onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
        placeholder={v}
        placeholderTextColor={Colors.w20}
        keyboardType={num ? 'number-pad' : 'default'}
        autoCapitalize="none"
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="名前・会社名で検索" placeholderTextColor={Colors.w20} />
      </View>
      {/* Filters */}
      <View style={styles.filterBar}>
        {(['ALL','HOT','WARM','COLD'] as Filter[]).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? '全て' : `${TE[f as Temperature]} ${f}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>お客様がいません</Text>
          <Text style={styles.emptyHint}>右下のボタンで追加しましょう</Text>
        </View>
      ) : (
        <FlatList
          data={filtered} keyExtractor={c => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openNew} activeOpacity={0.85}>
        <LinearGradient colors={Gradients.gold} style={styles.fabGrad}>
          <Text style={styles.fabText}>＋</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHd}>
            <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalCancel}>キャンセル</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{editing ? '顧客を編集' : '顧客を追加'}</Text>
            <TouchableOpacity onPress={handleSave}><Text style={styles.modalSave}>保存</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {F('お客様名 *', '山田 太郎', 'name')}
            {F('会社名', '株式会社〇〇', 'company')}
            {F('役職', '営業部長', 'role')}
            {F('電話番号', '090-0000-0000', 'phone')}
            {F('メール', 'taro@example.com', 'email')}
            {F('案件金額（万円）', '500', 'dealAmount', true)}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>メモ</Text>
              <TextInput
                style={[styles.fieldInput, { height: 90, textAlignVertical: 'top' }]}
                value={form.memo} onChangeText={v => setForm(f => ({ ...f, memo: v }))}
                placeholder="課題・特記事項など" placeholderTextColor={Colors.w20} multiline
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, backgroundColor: Colors.w04, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.w08 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.w100 },
  filterBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.w04, borderWidth: 1, borderColor: Colors.w08 },
  filterBtnActive: { backgroundColor: 'rgba(200,168,75,0.15)', borderColor: 'rgba(200,168,75,0.4)' },
  filterText: { fontSize: 11, color: Colors.w40, fontWeight: '500' },
  filterTextActive: { color: Colors.gold },
  list: { padding: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.w04, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.w08 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.navy },
  cardMain: { flex: 1, gap: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.w100 },
  tempPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  tempPillText: { fontSize: 10, fontWeight: '700' },
  cardCompany: { fontSize: 11, color: Colors.w40 },
  cardMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 2 },
  amountText: { fontSize: 11, fontWeight: '700', color: Colors.gold },
  metaText: { fontSize: 10, color: Colors.w40 },
  editBtn: { padding: 4 },
  editIcon: { fontSize: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.w40 },
  emptyHint: { fontSize: 13, color: Colors.w20 },
  fab: { position: 'absolute', bottom: 24, right: 20, borderRadius: 28, overflow: 'hidden', shadowColor: Colors.gold, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabGrad: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  fabText: { fontSize: 28, color: Colors.navy, fontWeight: '700', lineHeight: 32 },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: Colors.w08 },
  modalCancel: { fontSize: 15, color: Colors.w60 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.w100 },
  modalSave: { fontSize: 15, fontWeight: '700', color: Colors.gold },
  modalBody: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.w60, letterSpacing: 0.3 },
  fieldInput: { backgroundColor: Colors.w04, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.w100, borderWidth: 1, borderColor: Colors.w08 },
});
