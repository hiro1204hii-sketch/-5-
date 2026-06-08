import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getResults, deleteResult } from '../../hooks/useStorage';
import { AnalysisResult, Temperature } from '../../types';
import { Colors } from '../../constants/theme';

const TEMP_COLORS: Record<Temperature, string> = {
  HOT: Colors.hot,
  WARM: Colors.warm,
  COLD: Colors.cold,
};
const TEMP_EMOJIS: Record<Temperature, string> = { HOT: '🔥', WARM: '☀️', COLD: '❄️' };

export default function HistoryScreen() {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [filter, setFilter] = useState<Temperature | 'ALL'>('ALL');

  useFocusEffect(useCallback(() => {
    getResults().then(setResults);
  }, []));

  const filtered = filter === 'ALL' ? results : results.filter(r => r.temperature === filter);

  const handleDelete = (id: string) => {
    Alert.alert('削除', 'この記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          await deleteResult(id);
          setResults(prev => prev.filter(r => r.id !== id));
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: AnalysisResult }) => {
    const d = new Date(item.date);
    const dateStr = d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
    const timeStr = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const preview = item.minutes.split('\n')[0].replace(/^[•・\-*]\s*/, '').slice(0, 45);

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push({ pathname: '/results', params: { id: item.id } })}
        onLongPress={() => handleDelete(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.tempDot, { backgroundColor: TEMP_COLORS[item.temperature] }]}>
          <Text style={styles.tempEmoji}>{TEMP_EMOJIS[item.temperature]}</Text>
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemTop}>
            <Text style={styles.itemDate}>{dateStr} {timeStr}</Text>
            <View style={[styles.tempTag, { backgroundColor: TEMP_COLORS[item.temperature] + '22' }]}>
              <Text style={[styles.tempTagText, { color: TEMP_COLORS[item.temperature] }]}>
                {item.temperature}
              </Text>
            </View>
          </View>
          <Text style={styles.itemPreview} numberOfLines={1}>{preview}...</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        {(['ALL', 'HOT', 'WARM', 'COLD'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? '全て' : `${TEMP_EMOJIS[f]} ${f}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📓</Text>
          <Text style={styles.emptyText}>まだ商談記録がありません</Text>
          <Text style={styles.emptyHint}>録音タブで商談を記録しましょう</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  filterBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: 'rgba(196,149,106,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.lineColor,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.lineColor,
    backgroundColor: Colors.cream,
  },
  filterBtnActive: { backgroundColor: Colors.darkBrown, borderColor: Colors.darkBrown },
  filterText: { fontSize: 12, color: Colors.warmBrown, fontWeight: '500' },
  filterTextActive: { color: Colors.cream },
  list: { padding: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.lineColor,
  },
  tempDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  tempEmoji: { fontSize: 20 },
  itemContent: { flex: 1, gap: 4 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemDate: { fontSize: 12, color: Colors.warmBrown },
  tempTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tempTagText: { fontSize: 10, fontWeight: '700' },
  itemPreview: { fontSize: 13, color: Colors.ink },
  separator: { height: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 4 },
  emptyText: { fontSize: 16, color: Colors.warmBrown, fontWeight: '500' },
  emptyHint: { fontSize: 13, color: Colors.lightBrown },
});
