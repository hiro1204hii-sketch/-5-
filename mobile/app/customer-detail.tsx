import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { getCustomers, getResults } from '../hooks/useStorage';
import { Customer, AnalysisResult, Temperature } from '../types';
import { TemperatureBadge } from '../components/TemperatureBadge';
import { Colors } from '../constants/theme';

const TEMP_COLORS: Record<Temperature, string> = {
  HOT: Colors.hot, WARM: Colors.warm, COLD: Colors.cold,
};

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [custs, results] = await Promise.all([getCustomers(), getResults()]);
      const found = custs.find(c => c.id === id) ?? null;
      setCustomer(found);
      setAnalyses(results.filter(r => r.customerId === id));
    })();
  }, [id]));

  if (!customer) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  const hotCount = analyses.filter(a => a.temperature === 'HOT').length;
  const warmCount = analyses.filter(a => a.temperature === 'WARM').length;
  const coldCount = analyses.filter(a => a.temperature === 'COLD').length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{customer.name.charAt(0)}</Text>
        </View>
        <Text style={styles.customerName}>{customer.name}</Text>
        {customer.company ? <Text style={styles.company}>{customer.company}</Text> : null}

        {customer.latestTemperature && (
          <TemperatureBadge temperature={customer.latestTemperature} />
        )}

        {/* Contact buttons */}
        <View style={styles.contactRow}>
          {customer.phone && (
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL(`tel:${customer.phone}`)}
            >
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={styles.contactLabel}>{customer.phone}</Text>
            </TouchableOpacity>
          )}
          {customer.email && (
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL(`mailto:${customer.email}`)}
            >
              <Text style={styles.contactIcon}>✉️</Text>
              <Text style={styles.contactLabel}>{customer.email}</Text>
            </TouchableOpacity>
          )}
        </View>

        {customer.memo && (
          <View style={styles.memoBox}>
            <Text style={styles.memoLabel}>メモ</Text>
            <Text style={styles.memoText}>{customer.memo}</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{analyses.length}</Text>
          <Text style={styles.statLabel}>商談数</Text>
        </View>
        <View style={[styles.statBox, { borderColor: Colors.hot + '44' }]}>
          <Text style={[styles.statNum, { color: Colors.hot }]}>{hotCount}</Text>
          <Text style={styles.statLabel}>🔥 HOT</Text>
        </View>
        <View style={[styles.statBox, { borderColor: Colors.warm + '44' }]}>
          <Text style={[styles.statNum, { color: Colors.warm }]}>{warmCount}</Text>
          <Text style={styles.statLabel}>☀️ WARM</Text>
        </View>
        <View style={[styles.statBox, { borderColor: Colors.cold + '44' }]}>
          <Text style={[styles.statNum, { color: Colors.cold }]}>{coldCount}</Text>
          <Text style={styles.statLabel}>❄️ COLD</Text>
        </View>
      </View>

      {/* Analysis history */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>商談履歴</Text>
        {analyses.length === 0 ? (
          <Text style={styles.noHistory}>まだ商談記録がありません</Text>
        ) : (
          analyses.map(a => {
            const d = new Date(a.date);
            const dateStr = d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
            const preview = a.minutes.split('\n')[0].replace(/^[•・\-*]\s*/, '').slice(0, 40);
            return (
              <TouchableOpacity
                key={a.id}
                style={styles.histItem}
                onPress={() => router.push({ pathname: '/results', params: { id: a.id } })}
                activeOpacity={0.7}
              >
                <View style={[styles.histDot, { backgroundColor: TEMP_COLORS[a.temperature] }]} />
                <View style={styles.histContent}>
                  <Text style={styles.histDate}>{dateStr}</Text>
                  <Text style={styles.histPreview} numberOfLines={1}>{preview}...</Text>
                </View>
                <Text style={[styles.histTemp, { color: TEMP_COLORS[a.temperature] }]}>
                  {a.temperature}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.warmBrown },
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.lineColor,
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.lightBrown,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 30, color: Colors.cream, fontWeight: '700' },
  customerName: { fontSize: 22, fontWeight: '700', color: Colors.darkBrown },
  company: { fontSize: 14, color: Colors.warmBrown },
  contactRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(139,94,60,0.1)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  contactIcon: { fontSize: 14 },
  contactLabel: { fontSize: 13, color: Colors.warmBrown },
  memoBox: {
    width: '100%', backgroundColor: 'rgba(196,149,106,0.1)',
    borderRadius: 8, padding: 12, gap: 4, marginTop: 4,
  },
  memoLabel: { fontSize: 11, color: Colors.lightBrown, fontWeight: '600' },
  memoText: { fontSize: 13, color: Colors.ink, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.lineColor,
    alignItems: 'center', gap: 4,
  },
  statNum: { fontSize: 24, fontWeight: '700', color: Colors.darkBrown },
  statLabel: { fontSize: 10, color: Colors.warmBrown },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.darkBrown },
  noHistory: { fontSize: 13, color: Colors.lightBrown, textAlign: 'center', paddingVertical: 20 },
  histItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.lineColor,
  },
  histDot: { width: 10, height: 10, borderRadius: 5 },
  histContent: { flex: 1, gap: 2 },
  histDate: { fontSize: 11, color: Colors.warmBrown },
  histPreview: { fontSize: 13, color: Colors.ink },
  histTemp: { fontSize: 11, fontWeight: '700' },
});
