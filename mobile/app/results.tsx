import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getResults, deleteResult } from '../hooks/useStorage';
import { AnalysisResult } from '../types';
import { TemperatureBadge } from '../components/TemperatureBadge';
import { NavyCard } from '../components/NavyCard';
import { GoldButton } from '../components/GoldButton';
import { Colors, Gradients } from '../constants/theme';

const TEMP_BG: Record<string, string> = {
  HOT: 'rgba(255,82,82,0.07)', WARM: 'rgba(255,152,0,0.07)', COLD: 'rgba(75,158,255,0.07)',
};

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    getResults().then(list => setResult(list.find(r => r.id === id) ?? null));
  }, [id]);

  const share = async () => {
    if (!result) return;
    const d = new Date(result.date).toLocaleDateString('ja-JP');
    await Share.share({ message: [
      `【育てる営業手帳】${d} ${result.customerName ?? ''}`,
      `■ 温度感: ${result.temperature}\n${result.temperatureReason}`,
      `■ 議事録\n${result.minutes}`,
      `■ 次のアクション\n${result.actions}`,
    ].join('\n\n') });
  };

  const remove = () => Alert.alert('削除', 'この記録を削除しますか？', [
    { text: 'キャンセル', style: 'cancel' },
    { text: '削除', style: 'destructive', onPress: async () => { await deleteResult(id!); router.back(); } },
  ]);

  if (!result) return <View style={styles.loading}><Text style={{ color: Colors.w40 }}>読み込み中…</Text></View>;

  const date = new Date(result.date);
  const ds = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const ts = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const dm = Math.floor(result.duration / 60), ds2 = result.duration % 60;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Temp hero */}
      <LinearGradient colors={[TEMP_BG[result.temperature] ?? Colors.w04, 'transparent'] as any} style={styles.hero}>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{ds} {ts}</Text>
          {result.duration > 0 && (
            <View style={styles.durBadge}>
              <Text style={styles.durText}>{dm > 0 ? `${dm}分` : ''}{ds2}秒</Text>
            </View>
          )}
        </View>
        {result.customerName && (
          <TouchableOpacity onPress={() => router.push({ pathname: '/customer-detail', params: { id: result.customerId } })}>
            <Text style={styles.customerName}>👤 {result.customerName}</Text>
          </TouchableOpacity>
        )}
        <TemperatureBadge temperature={result.temperature} reason={result.temperatureReason} size="lg" />
      </LinearGradient>

      {/* Cards */}
      <View style={styles.cards}>
        <NavyCard icon="📝" title="議事録" collapsible>
          <Text style={styles.bodyText}>{result.minutes}</Text>
        </NavyCard>
        <NavyCard icon="✅" title="次のアクション" collapsible>
          <Text style={styles.bodyText}>{result.actions}</Text>
        </NavyCard>
        {result.coachComment ? (
          <NavyCard icon="✨" title="AIコーチより" goldBorder collapsible>
            <Text style={[styles.bodyText, { color: Colors.gold2, fontStyle: 'italic' }]}>{result.coachComment}</Text>
          </NavyCard>
        ) : null}
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <GoldButton label="📤 共有する" onPress={share} style={{ flex: 1 }} />
        <TouchableOpacity style={styles.deleteBtn} onPress={remove}>
          <Text style={styles.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.coachLink} onPress={() => router.push('/coach')}>
        <LinearGradient colors={Gradients.gold} style={styles.coachLinkGrad}>
          <Text style={styles.coachLinkText}>🤖 AIコーチに相談する</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingBottom: 48 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  hero: { padding: 20, gap: 14, paddingBottom: 28 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 12, color: Colors.w40 },
  durBadge: { backgroundColor: Colors.w08, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  durText: { fontSize: 11, color: Colors.w60 },
  customerName: { fontSize: 14, fontWeight: '600', color: Colors.gold, textDecorationLine: 'underline' },
  cards: { padding: 16, gap: 10 },
  bodyText: { fontSize: 13, color: Colors.w60, lineHeight: 24 },
  actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  deleteBtn: { backgroundColor: Colors.w04, borderWidth: 1, borderColor: Colors.w08, borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 20 },
  coachLink: { margin: 16, marginTop: 12, borderRadius: 14, overflow: 'hidden' },
  coachLinkGrad: { padding: 14, alignItems: 'center' },
  coachLinkText: { fontSize: 14, fontWeight: '700', color: Colors.navy },
});
