import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput, ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getReminders, saveReminder, toggleReminder, deleteReminder, getCustomers } from '../hooks/useStorage';
import { Reminder, Customer } from '../types';
import { Colors, Gradients } from '../constants/theme';

type Form = { title: string; customerId: string; dueDate: string; memo: string };
const EMPTY: Form = { title: '', customerId: '', dueDate: new Date().toISOString().slice(0, 10), memo: '' };

const today = new Date().toISOString().slice(0, 10);
const priorityColor = (dueDate: string, done: boolean) => {
  if (done) return Colors.w20;
  if (dueDate < today) return Colors.hot;
  if (dueDate === today) return Colors.warm;
  return Colors.cold;
};
const priorityLabel = (dueDate: string, done: boolean) => {
  if (done) return '完了';
  if (dueDate < today) return '期限切れ';
  if (dueDate === today) return '今日';
  return '予定';
};

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [r, c] = await Promise.all([getReminders(), getCustomers()]);
      setReminders(r.sort((a, b) => a.dueDate.localeCompare(b.dueDate))); setCustomers(c);
    })();
  }, []));

  const reload = async () => {
    const r = await getReminders();
    setReminders(r.sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
  };

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (r: Reminder) => {
    setEditing(r);
    setForm({ title: r.title, customerId: r.customerId ?? '', dueDate: r.dueDate, memo: r.memo ?? '' });
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('', 'タイトルを入力してください'); return; }
    const r: Reminder = {
      id: editing?.id ?? Date.now().toString(),
      title: form.title.trim(),
      customerId: form.customerId || undefined,
      dueDate: form.dueDate,
      memo: form.memo.trim() || undefined,
      done: editing?.done ?? false,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    await saveReminder(r); setShowModal(false); reload();
  };
  const handleDelete = (id: string, title: string) =>
    Alert.alert('削除', `「${title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteReminder(id); reload(); } },
    ]);

  const pending = reminders.filter(r => !r.done);
  const done = reminders.filter(r => r.done);

  const renderItem = ({ item }: { item: Reminder }) => {
    const cust = customers.find(c => c.id === item.customerId);
    const color = priorityColor(item.dueDate, item.done);
    const label = priorityLabel(item.dueDate, item.done);
    return (
      <TouchableOpacity
        style={[styles.card, item.done && styles.cardDone]}
        onPress={() => openEdit(item)}
        onLongPress={() => handleDelete(item.id, item.title)}
        activeOpacity={0.75}
      >
        <TouchableOpacity style={styles.checkBox} onPress={() => toggleReminder(item.id).then(reload)} hitSlop={8}>
          <View style={[styles.check, item.done && styles.checkDone]}>
            {item.done && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </TouchableOpacity>
        <View style={styles.cardMain}>
          <Text style={[styles.cardTitle, item.done && styles.cardTitleDone]}>{item.title}</Text>
          {cust && <Text style={styles.cardCust}>👤 {cust.name}</Text>}
          {item.memo ? <Text style={styles.cardMemo} numberOfLines={1}>{item.memo}</Text> : null}
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.priorityBadge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.priorityText, { color }]}>{label}</Text>
          </View>
          <Text style={[styles.dateText, { color }]}>{item.dueDate.slice(5).replace('-', '/')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={Gradients.hero} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>フォローリマインド</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addText}>＋</Text>
        </TouchableOpacity>
      </LinearGradient>

      {reminders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📞</Text>
          <Text style={styles.emptyTitle}>リマインドがありません</Text>
          <Text style={styles.emptyHint}>右上のボタンで追加しましょう</Text>
        </View>
      ) : (
        <FlatList
          data={[...pending, ...done]}
          keyExtractor={r => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={pending.length > 0 && done.length > 0 ? (
            <Text style={styles.sectionLabel}>未完了 {pending.length}件</Text>
          ) : null}
        />
      )}

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHd}>
            <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalCancel}>キャンセル</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{editing ? '編集' : 'リマインドを追加'}</Text>
            <TouchableOpacity onPress={handleSave}><Text style={styles.modalSave}>保存</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>タイトル *</Text>
              <TextInput style={styles.fieldInput} value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))} placeholder="電話フォロー、資料送付など" placeholderTextColor={Colors.w20} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>期日 (YYYY-MM-DD)</Text>
              <TextInput style={styles.fieldInput} value={form.dueDate} onChangeText={v => setForm(p => ({ ...p, dueDate: v }))} placeholder="2026-06-15" placeholderTextColor={Colors.w20} keyboardType="numbers-and-punctuation" />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>顧客</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.chip, !form.customerId && styles.chipSel]} onPress={() => setForm(p => ({ ...p, customerId: '' }))}>
                    <Text style={[styles.chipText, !form.customerId && styles.chipTextSel]}>未設定</Text>
                  </TouchableOpacity>
                  {customers.map(c => (
                    <TouchableOpacity key={c.id} style={[styles.chip, form.customerId === c.id && styles.chipSel]} onPress={() => setForm(p => ({ ...p, customerId: c.id }))}>
                      <Text style={[styles.chipText, form.customerId === c.id && styles.chipTextSel]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>メモ</Text>
              <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]} value={form.memo} onChangeText={v => setForm(p => ({ ...p, memo: v }))} placeholder="対応内容・注意点" placeholderTextColor={Colors.w20} multiline />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 26, color: Colors.w60, lineHeight: 30 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.w100 },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 24, color: Colors.gold, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.w40 },
  emptyHint: { fontSize: 13, color: Colors.w20 },
  list: { padding: 12, paddingBottom: 48 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.w40, letterSpacing: 0.8, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.w04, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.w08 },
  cardDone: { opacity: 0.5 },
  checkBox: {},
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.w20, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: Colors.won, borderColor: Colors.won },
  checkMark: { fontSize: 12, color: Colors.navy, fontWeight: '900' },
  cardMain: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.w100 },
  cardTitleDone: { textDecorationLine: 'line-through', color: Colors.w40 },
  cardCust: { fontSize: 11, color: Colors.w40 },
  cardMemo: { fontSize: 11, color: Colors.w20 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  priorityBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  dateText: { fontSize: 11, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: Colors.w08 },
  modalCancel: { fontSize: 15, color: Colors.w60 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.w100 },
  modalSave: { fontSize: 15, fontWeight: '700', color: Colors.gold },
  modalBody: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.w60, letterSpacing: 0.3 },
  fieldInput: { backgroundColor: Colors.w04, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.w100, borderWidth: 1, borderColor: Colors.w08 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.w04, borderWidth: 1, borderColor: Colors.w08 },
  chipSel: { backgroundColor: 'rgba(200,168,75,0.15)', borderColor: Colors.gold },
  chipText: { fontSize: 12, color: Colors.w40 },
  chipTextSel: { color: Colors.gold, fontWeight: '700' },
});
