import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getCustomers, getResults } from '../hooks/useStorage';
import { Customer, AnalysisResult, Temperature } from '../types';
import { TemperatureBadge } from '../components/TemperatureBadge';
import { Colors, Gradients } from '../constants/theme';

const TC: Record<Temperature, string> = { HOT: Colors.hot, WARM: Colors.warm, COLD: Colors.cold };

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [custs, results] = await Promise.all([getCustomers(), getResults()]);
      setCustomer(custs.find(c => c.id === id) ?? null);
      setAnalyses(results.filter(r => r.customerId === id));
    })();
  }, [id]));

  if (!customer) return (
    <View style={styles.loading}><Text style={{ color: Colors.w40 }}>読み込み中…</Text></View>
  );

  const hot  = analyses.filter(a => a.temperature === 'HOT').length;
  const warm = analyses.filter(a => a.temperature === 'WARM').length;
  const cold = analyses.filter(a => a.temperature === 'COLD').length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile hero */}
      <LinearGradient colors={Gradients.hero} style={styles.hero}>
        <LinearGradient colors={Gradients.gold} style={styles.avatar}>
          <Text style={styles.avatarText}>{customer.name.charAt(0)}</Text>
        </LinearGradient>
        <Text style={styles.name}>{customer.name}</Text>
        {customer.company ? <Text style={styles.company}>{customer.company}{customer.role ? ` · ${customer.role}` : ''}</Text> : null}
        {customer.latestTemperature && <TemperatureBadge temperature={customer.latestTemperature} size="md" />}
        {customer.dealAmount ? (
          <View style={styles.amountBadge}>
            <Text style={styles.amountText}>¥{customer.dealAmount.toLocaleString()}万</Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Contact */}
      {(customer.phone || customer.email) && (
        <View style={styles.contactRow}>
          {customer.phone && (
            <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={styles.contactLabel}>{customer.phone}</Text>
            </TouchableOpacity>
          )}
          {customer.email && (
            <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`mailto:${customer.email}`)}>
              <Text style={styles.contactIcon}>✉️</Text>
              <Text style={styles.contactLabel}>{customer.email}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { num: analyses.length, lbl: '商談数', color: Colors.gold },
          { num: hot,  lbl: '🔥 HOT',  color: Colors.hot },
          { num: warm, lbl: '☀️ WARM', color: Colors.warm },
          { num: cold, lbl: '❄️ COLD', color: Colors.cold },
        ].map(s => (
          <View key={s.lbl} style={styles.statBox}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
            <Text style={styles.statLbl}>{s.lbl}</Text>
          </View>
        ))}
      </View>

      {/* Memo */}
      {customer.memo && (
        <View style={styles.memoBox}>
          <Text style={styles.memoLabel}>メモ</Text>
          <Text style={styles.memoText}>{customer.memo}</Text>
        </View>
      )}

      {/* History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>商談履歴</Text>
        {analyses.length === 0 ? (
          <Text style={styles.noData}>まだ商談記録がありません</Text>
        ) : (
          analyses.map(a => {
            const d = new Date(a.date);
            const ds = d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
            const preview = a.minutes.split('\n')[0].replace(/^[•・\-*]\s*/, '').slice(0, 40);
            return (
              <TouchableOpacity
                key={a.id}
                style={styles.histItem}
                onPress={() => router.push({ pathname: '/results', params: { id: a.id } })}
                activeOpacity={0.7}
              >
                <View style={[styles.histDot, { backgroundColor: TC[a.temperature] }]} />
                <View style={styles.histContent}>
                  <Text style={styles.histDate}>{ds}</Text>
                  <Text style={styles.histPreview} numberOfLines={1}>{preview}…</Text>
                </View>
                <Text style={[styles.histTemp, { color: TC[a.temperature] }]}>{a.temperature}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingBottom: 48 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  hero: { padding: 24, alignItems: 'center', gap: 8, paddingTop: 32, paddingBottom: 28 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { fontSize: 34, fontWeight: '900', color: Colors.navy },
  name: { fontSize: 22, fontWeight: '900', color: Colors.w100 },
  company: { fontSize: 13, color: Colors.w40 },
  amountBadge: { backgroundColor: 'rgba(200,168,75,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(200,168,75,0.3)' },
  amountText: { fontSize: 14, fontWeight: '700', color: Colors.gold },
  contactRow: { flexDirection: 'row', gap: 10, padding: 16, flexWrap: 'wrap' },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.w04, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: Colors.w08 },
  contactIcon: { fontSize: 14 },
  contactLabel: { fontSize: 13, color: Colors.w60 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  statBox: { flex: 1, backgroundColor: Colors.w04, borderRadius: 12, padding: 12, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: Colors.w08 },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLbl: { fontSize: 9, color: Colors.w40 },
  memoBox: { marginHorizontal: 16, backgroundColor: Colors.w04, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.w08, gap: 6, marginBottom: 8 },
  memoLabel: { fontSize: 11, fontWeight: '600', color: Colors.w40, letterSpacing: 0.3 },
  memoText: { fontSize: 13, color: Colors.w60, lineHeight: 20 },
  section: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.w60, letterSpacing: 0.6 },
  noData: { fontSize: 13, color: Colors.w20, textAlign: 'center', paddingVertical: 20 },
  histItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.w04, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.w08 },
  histDot: { width: 10, height: 10, borderRadius: 5 },
  histContent: { flex: 1, gap: 2 },
  histDate: { fontSize: 11, color: Colors.w40 },
  histPreview: { fontSize: 13, color: Colors.w60 },
  histTemp: { fontSize: 11, fontWeight: '700' },
});
