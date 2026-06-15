import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getActivity } from '../hooks/useStorage';
import { ActivityEntry, Temperature } from '../types';
import { Colors, Gradients } from '../constants/theme';

const TEMP_COLORS: Record<Temperature, string> = { HOT: Colors.hot, WARM: Colors.warm, COLD: Colors.cold };
const TYPE_ICON: Record<ActivityEntry['type'], string> = {
  recording: '🎙', followup: '📞', note: '📝', meeting: '🤝',
};

type Section = { date: string; data: ActivityEntry[] };

export default function ActivityScreen() {
  const [sections, setSections] = useState<Section[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const entries = await getActivity();
      const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
      const map = new Map<string, ActivityEntry[]>();
      sorted.forEach(e => {
        const d = e.date.slice(0, 10);
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(e);
      });
      setSections(Array.from(map.entries()).map(([date, data]) => ({ date, data })));
    })();
  }, []));

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  };
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  const renderSection = ({ item }: { item: Section }) => (
    <View style={styles.section}>
      <Text style={styles.dateHeader}>{formatDate(item.date)}</Text>
      {item.data.map(entry => (
        <TouchableOpacity
          key={entry.id}
          style={styles.entryCard}
          onPress={() => entry.analysisId && router.push({ pathname: '/results', params: { id: entry.analysisId } })}
          activeOpacity={entry.analysisId ? 0.7 : 1}
        >
          <View style={styles.timeline}>
            <View style={[styles.dot, entry.temperature && { backgroundColor: TEMP_COLORS[entry.temperature] }]} />
            <View style={styles.line} />
          </View>
          <View style={styles.entryMain}>
            <View style={styles.entryTop}>
              <Text style={styles.entryIcon}>{TYPE_ICON[entry.type]}</Text>
              <Text style={styles.entryTime}>{formatTime(entry.date)}</Text>
              {entry.temperature && (
                <View style={[styles.tempPill, { backgroundColor: TEMP_COLORS[entry.temperature] + '22' }]}>
                  <Text style={[styles.tempPillText, { color: TEMP_COLORS[entry.temperature] }]}>{entry.temperature}</Text>
                </View>
              )}
            </View>
            {entry.customerName && <Text style={styles.entryCustomer}>👤 {entry.customerName}</Text>}
            <Text style={styles.entrySummary} numberOfLines={2}>{entry.summary}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.screen}>
      <LinearGradient colors={Gradients.hero} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>活動履歴</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>活動がありません</Text>
          <Text style={styles.emptyHint}>商談を録音すると履歴が記録されます</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={s => s.date}
          renderItem={renderSection}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 26, color: Colors.w60, lineHeight: 30 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.w100 },
  list: { padding: 16, paddingBottom: 48 },
  section: { marginBottom: 24 },
  dateHeader: { fontSize: 11, fontWeight: '700', color: Colors.gold, letterSpacing: 0.8, marginBottom: 12 },
  entryCard: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  timeline: { alignItems: 'center', width: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.w20, marginTop: 4 },
  line: { flex: 1, width: 1, backgroundColor: Colors.w08, marginTop: 2 },
  entryMain: { flex: 1, backgroundColor: Colors.w04, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.w08, gap: 4 },
  entryTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entryIcon: { fontSize: 14 },
  entryTime: { fontSize: 11, color: Colors.w40 },
  tempPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginLeft: 'auto' },
  tempPillText: { fontSize: 9, fontWeight: '700' },
  entryCustomer: { fontSize: 11, color: Colors.w60, fontWeight: '600' },
  entrySummary: { fontSize: 12, color: Colors.w40, lineHeight: 18 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.w40 },
  emptyHint: { fontSize: 13, color: Colors.w20 },
});
