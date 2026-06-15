import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getResults, deleteResult } from '../../hooks/useStorage';
import { AnalysisResult, Temperature } from '../../types';
import { Colors } from '../../constants/theme';

const TC: Record<Temperature, string> = { HOT: Colors.hot, WARM: Colors.warm, COLD: Colors.cold };
const TE: Record<Temperature, string> = { HOT: '🔥', WARM: '☀️', COLD: '❄️' };

export default function HistoryScreen() {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [filter, setFilter] = useState<Temperature | 'ALL'>('ALL');

  useFocusEffect(useCallback(() => { getResults().then(setResults); }, []));

  const filtered = filter === 'ALL' ? results : results.filter(r => r.temperature === filter);

  const handleDelete = (id: string) =>
    Alert.alert('削除', 'この記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteResult(id); setResults(p => p.filter(r => r.id !== id)); } },
    ]);

  const renderItem = ({ item }: { item: AnalysisResult }) => {
    const d = new Date(item.date);
    const ds = d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
    const ts = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const preview = item.minutes.split('\n')[0].replace(/^[•・\-*]\s*/, '').slice(0, 45);
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push({ pathname: '/results', params: { id: item.id } })}
        onLongPress={() => handleDelete(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.tempDot, { backgroundColor: TC[item.temperature] + '22' }]}>
          <Text style={styles.tempEmoji}>{TE[item.temperature]}</Text>
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemTop}>
            <Text style={styles.itemDate}>{ds} {ts}</Text>
            <View style={[styles.tempTag, { backgroundColor: TC[item.temperature] + '22' }]}>
              <Text style={[styles.tempTagText, { color: TC[item.temperature] }]}>{item.temperature}</Text>
            </View>
          </View>
          {item.customerName && <Text style={styles.custName}>👤 {item.customerName}</Text>}
          <Text style={styles.itemPreview} numberOfLines={1}>{preview}…</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.filterBar}>
        {(['ALL', 'HOT', 'WARM', 'COLD'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? '全て' : `${TE[f as Temperature]} ${f}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📓</Text>
          <Text style={styles.emptyTitle}>まだ商談記録がありません</Text>
          <Text style={styles.emptyHint}>録音タブで商談を記録しましょう</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  filterBar: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.w08 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.w04, borderWidth: 1, borderColor: Colors.w08 },
  filterBtnActive: { backgroundColor: 'rgba(200,168,75,0.15)', borderColor: 'rgba(200,168,75,0.4)' },
  filterText: { fontSize: 12, color: Colors.w40, fontWeight: '500' },
  filterTextActive: { color: Colors.gold },
  list: { padding: 12, paddingBottom: 48 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.w04, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.w08 },
  tempDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tempEmoji: { fontSize: 20 },
  itemContent: { flex: 1, gap: 3 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemDate: { fontSize: 12, color: Colors.w40 },
  tempTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tempTagText: { fontSize: 10, fontWeight: '700' },
  custName: { fontSize: 11, color: Colors.gold },
  itemPreview: { fontSize: 13, color: Colors.w60 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 16, color: Colors.w40, fontWeight: '500' },
  emptyHint: { fontSize: 13, color: Colors.w20 },
});
