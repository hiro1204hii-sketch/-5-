import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getDeals, saveDeal, deleteDeal, getCustomers } from '../hooks/useStorage';
import { Deal, DealStage, Customer } from '../types';
import { Colors, Gradients } from '../constants/theme';
import { GoldButton } from '../components/GoldButton';

const STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: 'approach',    label: 'アプローチ', color: Colors.cold },
  { key: 'proposal',   label: '提案中',     color: Colors.warm },
  { key: 'negotiation',label: '交渉中',     color: Colors.hot },
  { key: 'won',        label: '受注',       color: Colors.won },
];

type Form = { title: string; customerId: string; amount: string; stage: DealStage; memo: string };
const EMPTY: Form = { title: '', customerId: '', amount: '', stage: 'approach', memo: '' };

export default function PipelineScreen() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [d, c] = await Promise.all([getDeals(), getCustomers()]);
      setDeals(d); setCustomers(c);
    })();
  }, []));

  const reload = async () => { const d = await getDeals(); setDeals(d); };

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setForm({ title: deal.title, customerId: deal.customerId ?? '', amount: deal.amount?.toString() ?? '', stage: deal.stage, memo: deal.memo ?? '' });
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('', '案件名を入力してください'); return; }
    const d: Deal = {
      id: editing?.id ?? Date.now().toString(),
      title: form.title.trim(),
      customerId: form.customerId || undefined,
      amount: form.amount ? parseInt(form.amount) : undefined,
      stage: form.stage,
      memo: form.memo.trim() || undefined,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveDeal(d); setShowModal(false); reload();
  };
  const handleDelete = (id: string, title: string) =>
    Alert.alert('削除', `「${title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteDeal(id); reload(); } },
    ]);

  const moveStage = async (deal: Deal, stage: DealStage) => {
    await saveDeal({ ...deal, stage, updatedAt: new Date().toISOString() }); reload();
  };

  const totalAmount = deals.filter(d => d.stage === 'won').reduce((s, d) => s + (d.amount ?? 0), 0);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient colors={Gradients.hero} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>案件パイプライン</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addText}>＋</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Won summary */}
      {totalAmount > 0 && (
        <View style={styles.wonBanner}>
          <Text style={styles.wonText}>🏆 受注合計 ¥{totalAmount.toLocaleString()}万円</Text>
        </View>
      )}

      {/* Kanban columns */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kanban}>
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.key);
          return (
            <View key={stage.key} style={styles.column}>
              <View style={[styles.colHeader, { borderTopColor: stage.color }]}>
                <Text style={[styles.colTitle, { color: stage.color }]}>{stage.label}</Text>
                <View style={[styles.colBadge, { backgroundColor: stage.color + '22' }]}>
                  <Text style={[styles.colCount, { color: stage.color }]}>{stageDeals.length}</Text>
                </View>
              </View>
              <ScrollView style={styles.colBody} showsVerticalScrollIndicator={false}>
                {stageDeals.map(deal => {
                  const cust = customers.find(c => c.id === deal.customerId);
                  return (
                    <TouchableOpacity
                      key={deal.id}
                      style={styles.dealCard}
                      onPress={() => openEdit(deal)}
                      onLongPress={() => handleDelete(deal.id, deal.title)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.dealTitle} numberOfLines={2}>{deal.title}</Text>
                      {cust && <Text style={styles.dealCust}>{cust.name}</Text>}
                      {deal.amount ? <Text style={styles.dealAmount}>¥{deal.amount.toLocaleString()}万</Text> : null}
                      {/* Stage move buttons */}
                      <View style={styles.stageArrows}>
                        {STAGES.findIndex(s => s.key === stage.key) > 0 && (
                          <TouchableOpacity
                            style={styles.arrowBtn}
                            onPress={() => moveStage(deal, STAGES[STAGES.findIndex(s => s.key === stage.key) - 1].key)}
                          >
                            <Text style={styles.arrowText}>◀</Text>
                          </TouchableOpacity>
                        )}
                        {STAGES.findIndex(s => s.key === stage.key) < STAGES.length - 1 && (
                          <TouchableOpacity
                            style={[styles.arrowBtn, styles.arrowBtnRight]}
                            onPress={() => moveStage(deal, STAGES[STAGES.findIndex(s => s.key === stage.key) + 1].key)}
                          >
                            <Text style={styles.arrowText}>▶</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHd}>
            <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalCancel}>キャンセル</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{editing ? '案件を編集' : '案件を追加'}</Text>
            <TouchableOpacity onPress={handleSave}><Text style={styles.modalSave}>保存</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {[
              { label: '案件名 *', placeholder: '○○社 システム導入', key: 'title' as keyof Form },
              { label: '金額（万円）', placeholder: '500', key: 'amount' as keyof Form, num: true },
              { label: 'メモ', placeholder: '提案内容・懸念点など', key: 'memo' as keyof Form },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={form[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.w20}
                  keyboardType={f.num ? 'number-pad' : 'default'}
                />
              </View>
            ))}
            {/* Customer picker */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>顧客</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.custChip, !form.customerId && styles.custChipSel]}
                    onPress={() => setForm(p => ({ ...p, customerId: '' }))}
                  >
                    <Text style={[styles.custChipText, !form.customerId && styles.custChipTextSel]}>未設定</Text>
                  </TouchableOpacity>
                  {customers.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.custChip, form.customerId === c.id && styles.custChipSel]}
                      onPress={() => setForm(p => ({ ...p, customerId: c.id }))}
                    >
                      <Text style={[styles.custChipText, form.customerId === c.id && styles.custChipTextSel]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            {/* Stage selector */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ステージ</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {STAGES.map(s => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.stageChip, form.stage === s.key && { backgroundColor: s.color + '22', borderColor: s.color }]}
                    onPress={() => setForm(p => ({ ...p, stage: s.key }))}
                  >
                    <Text style={[styles.stageChipText, form.stage === s.key && { color: s.color }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  wonBanner: { backgroundColor: 'rgba(0,217,126,0.08)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,217,126,0.2)', padding: 10, alignItems: 'center' },
  wonText: { fontSize: 13, fontWeight: '700', color: Colors.won },
  kanban: { padding: 12, gap: 10, alignItems: 'flex-start' },
  column: { width: 220, backgroundColor: Colors.w04, borderRadius: 14, borderWidth: 1, borderColor: Colors.w08, overflow: 'hidden', maxHeight: 600 },
  colHeader: { padding: 12, borderTopWidth: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colTitle: { fontSize: 13, fontWeight: '700' },
  colBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  colCount: { fontSize: 12, fontWeight: '700' },
  colBody: { padding: 8, gap: 8 },
  dealCard: { backgroundColor: Colors.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.w08, gap: 4, marginBottom: 8 },
  dealTitle: { fontSize: 13, fontWeight: '700', color: Colors.w100 },
  dealCust: { fontSize: 11, color: Colors.w40 },
  dealAmount: { fontSize: 12, fontWeight: '700', color: Colors.gold },
  stageArrows: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  arrowBtn: { padding: 4 },
  arrowBtnRight: { marginLeft: 'auto' },
  arrowText: { fontSize: 10, color: Colors.w40 },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: Colors.w08 },
  modalCancel: { fontSize: 15, color: Colors.w60 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.w100 },
  modalSave: { fontSize: 15, fontWeight: '700', color: Colors.gold },
  modalBody: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.w60, letterSpacing: 0.3 },
  fieldInput: { backgroundColor: Colors.w04, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.w100, borderWidth: 1, borderColor: Colors.w08 },
  custChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.w04, borderWidth: 1, borderColor: Colors.w08 },
  custChipSel: { backgroundColor: 'rgba(200,168,75,0.15)', borderColor: Colors.gold },
  custChipText: { fontSize: 12, color: Colors.w40 },
  custChipTextSel: { color: Colors.gold, fontWeight: '700' },
  stageChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.w04, borderWidth: 1, borderColor: Colors.w08, alignItems: 'center' },
  stageChipText: { fontSize: 11, color: Colors.w40, fontWeight: '600' },
});
