import React, { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, Share, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getResults, deleteResult } from '../hooks/useStorage';
import { AnalysisResult } from '../types';
import { ResultCard } from '../components/ResultCard';
import { TemperatureBadge } from '../components/TemperatureBadge';
import { Colors } from '../constants/theme';

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    getResults().then(results => {
      const found = results.find(r => r.id === id);
      if (found) setResult(found);
    });
  }, [id]);

  const handleShare = async () => {
    if (!result) return;
    const d = new Date(result.date).toLocaleDateString('ja-JP');
    const text = [
      `【育てる営業手帳】商談記録 ${d}`,
      '',
      '■ 温度感',
      `${result.temperature} — ${result.temperatureReason}`,
      '',
      '■ 議事録',
      result.minutes,
      '',
      '■ 次のアクション',
      result.actions,
    ].join('\n');
    await Share.share({ message: text });
  };

  const handleDelete = () => {
    Alert.alert('削除', 'この記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          if (result) await deleteResult(result.id);
          router.back();
        },
      },
    ]);
  };

  if (!result) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  const date = new Date(result.date);
  const dateStr = date.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
  const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const mins = Math.floor(result.duration / 60);
  const secs = result.duration % 60;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header info */}
      <View style={styles.metaRow}>
        <Text style={styles.metaDate}>{dateStr} {timeStr}</Text>
        {result.duration > 0 && (
          <Text style={styles.metaDuration}>
            {mins > 0 ? `${mins}分` : ''}{secs}秒
          </Text>
        )}
      </View>

      {/* Temperature */}
      <View style={styles.tempSection}>
        <TemperatureBadge
          temperature={result.temperature}
          reason={result.temperatureReason}
        />
      </View>

      {/* Cards */}
      <ResultCard icon="📝" title="議事録" body={result.minutes} />
      <ResultCard icon="✅" title="次のアクション" body={result.actions} />

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>📤 共有</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>🗑 削除</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.warmBrown, fontSize: 14 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaDate: { fontSize: 13, color: Colors.warmBrown },
  metaDuration: {
    fontSize: 12,
    color: Colors.lightBrown,
    backgroundColor: 'rgba(196,149,106,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tempSection: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.lineColor,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 0,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: Colors.darkBrown,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  shareBtnText: { color: Colors.cream, fontWeight: '600', fontSize: 14 },
  deleteBtn: {
    paddingHorizontal: 20,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.lineColor,
    alignItems: 'center',
  },
  deleteBtnText: { color: Colors.warmBrown, fontSize: 14 },
});
