import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getResults, getGamification } from '../../hooks/useStorage';
import { AnalysisResult } from '../../types';
import { Colors, Gradients } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

type Period = 'week' | 'month' | 'all';

export default function ReportScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState({
    total: 0, hot: 0, warm: 0, cold: 0, won: 0,
    streak: 0, level: 1, score: 0,
    weeklyData: [0, 0, 0, 0, 0] as number[],
    conversionRate: 0,
    avgPerWeek: 0,
  });

  useFocusEffect(useCallback(() => {
    (async () => {
      const [results, gamif] = await Promise.all([getResults(), getGamification()]);
      const now = Date.now();
      const cutoff = period === 'week' ? now - 7 * 86400000 : period === 'month' ? now - 30 * 86400000 : 0;
      const filtered = cutoff ? results.filter(r => new Date(r.date).getTime() >= cutoff) : results;
      const hot = filtered.filter(r => r.temperature === 'HOT').length;
      const warm = filtered.filter(r => r.temperature === 'WARM').length;
      const cold = filtered.filter(r => r.temperature === 'COLD').length;

      // weekly bars (last 5 weeks)
      const weeklyData = [0,0,0,0,0];
      results.forEach(r => {
        const diff = Math.floor((now - new Date(r.date).getTime()) / (7*86400000));
        if (diff < 5) weeklyData[4 - diff]++;
      });
      const maxW = Math.max(...weeklyData, 1);

      setStats({
        total: filtered.length, hot, warm, cold, won: 0,
        streak: gamif.streak, level: gamif.level, score: gamif.monthlyScore,
        weeklyData: weeklyData.map(v => Math.round((v / maxW) * 100)),
        conversionRate: filtered.length ? Math.round((hot / filtered.length) * 100) : 0,
        avgPerWeek: Math.round(filtered.length / (period === 'week' ? 1 : 4)),
      });
    })();
  }, [period]));

  const PeriodBtn = ({ v, label }: { v: Period; label: string }) => (
    <TouchableOpacity
      style={[styles.periodBtn, period === v && styles.periodBtnActive]}
      onPress={() => setPeriod(v)}
    >
      <Text style={[styles.periodText, period === v && styles.periodTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const weekLabels = ['3週前', '2週前', '先週', '今週', '今週'];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Period selector */}
      <View style={styles.periodBar}>
        <PeriodBtn v="week" label="今週" />
        <PeriodBtn v="month" label="今月" />
        <PeriodBtn v="all"   label="全期間" />
      </View>

      {/* KPI row */}
      <View style={styles.kpiRow}>
        {[
          { num: stats.total,          lbl: '商談数',    sub: null },
          { num: `${stats.conversionRate}%`, lbl: 'HOT率', sub: '↑ 成長中' },
          { num: stats.avgPerWeek,     lbl: '週平均',    sub: '商談数' },
        ].map((k, i) => (
          <View key={i} style={styles.kpiCard}>
            <Text style={styles.kpiNum}>{k.num}</Text>
            <Text style={styles.kpiLbl}>{k.lbl}</Text>
            {k.sub ? <Text style={styles.kpiSub}>{k.sub}</Text> : null}
          </View>
        ))}
      </View>

      {/* Gamification */}
      <View style={styles.gamifRow}>
        <View style={styles.gamifCard}>
          <Text style={{ fontSize: 22 }}>🔥</Text>
          <Text style={styles.streakNum}>{stats.streak}</Text>
          <Text style={styles.gamifLbl}>継続日数</Text>
        </View>
        <View style={styles.gamifCard}>
          <Text style={{ fontSize: 22 }}>⭐</Text>
          <Text style={styles.scoreNum}>{stats.score}%</Text>
          <Text style={styles.gamifLbl}>活動スコア</Text>
        </View>
        <View style={styles.gamifCard}>
          <Text style={{ fontSize: 22 }}>🏆</Text>
          <Text style={styles.levelNum}>Lv.{stats.level}</Text>
          <Text style={styles.gamifLbl}>レベル</Text>
        </View>
      </View>

      {/* Bar chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>週別商談数</Text>
        <View style={styles.barChart}>
          {stats.weeklyData.map((pct, i) => (
            <View key={i} style={styles.barItem}>
              <View style={styles.barBg}>
                <LinearGradient
                  colors={pct > 70 ? Gradients.gold : ['rgba(200,168,75,0.4)', 'rgba(200,168,75,0.2)']}
                  style={[styles.bar, { height: `${Math.max(pct, 4)}%` }]}
                  start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
                />
              </View>
              <Text style={styles.barLabel}>{weekLabels[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Temperature distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>温度感分布</Text>
        <View style={styles.tempDist}>
          {stats.total > 0 ? (
            <>
              {[
                { label: '🔥 HOT', count: stats.hot, color: Colors.hot },
                { label: '☀️ WARM', count: stats.warm, color: Colors.warm },
                { label: '❄️ COLD', count: stats.cold, color: Colors.cold },
              ].map(({ label, count, color }) => {
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <View key={label} style={styles.tempRow}>
                    <Text style={styles.tempLabel}>{label}</Text>
                    <View style={styles.tempBarBg}>
                      <View style={[styles.tempBar, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[styles.tempPct, { color }]}>{pct}%</Text>
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={styles.noData}>データがありません</Text>
          )}
        </View>
      </View>

      {/* AI insight */}
      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>✨ AI分析インサイト</Text>
        <Text style={styles.insightText}>
          {stats.total === 0
            ? '商談を録音すると、ここにAIの分析が表示されます。'
            : stats.conversionRate >= 40
              ? `HOT率${stats.conversionRate}%と高水準です！このペースを維持しましょう。`
              : stats.conversionRate >= 20
                ? `HOT率${stats.conversionRate}%。提案の質を高めて温度感をアップしましょう。`
                : '商談後のフォローを強化するとHOT率が改善します。'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 16, paddingBottom: 48, gap: 14 },
  periodBar: { flexDirection: 'row', gap: 8, backgroundColor: Colors.w04, borderRadius: 12, padding: 4 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  periodBtnActive: { backgroundColor: 'rgba(200,168,75,0.2)' },
  periodText: { fontSize: 13, color: Colors.w40, fontWeight: '600' },
  periodTextActive: { color: Colors.gold },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiCard: { flex: 1, backgroundColor: Colors.w04, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.w08, alignItems: 'center', gap: 2 },
  kpiNum: { fontSize: 22, fontWeight: '900', color: Colors.gold },
  kpiLbl: { fontSize: 10, color: Colors.w40 },
  kpiSub: { fontSize: 9, color: Colors.won, marginTop: 1 },
  gamifRow: { flexDirection: 'row', gap: 8 },
  gamifCard: { flex: 1, backgroundColor: Colors.w04, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.w08, alignItems: 'center', gap: 3 },
  streakNum: { fontSize: 20, fontWeight: '900', color: Colors.streak },
  scoreNum:  { fontSize: 20, fontWeight: '900', color: Colors.gold },
  levelNum:  { fontSize: 20, fontWeight: '900', color: Colors.level },
  gamifLbl:  { fontSize: 9, color: Colors.w40 },
  section: { backgroundColor: Colors.w04, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.w08, gap: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.w60, letterSpacing: 0.6 },
  barChart: { flexDirection: 'row', gap: 8, height: 100, alignItems: 'flex-end' },
  barItem: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  barBg: { flex: 1, width: '100%', justifyContent: 'flex-end', maxHeight: 80 },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 8, color: Colors.w40, textAlign: 'center' },
  tempDist: { gap: 10 },
  tempRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tempLabel: { width: 60, fontSize: 11, color: Colors.w60 },
  tempBarBg: { flex: 1, height: 8, backgroundColor: Colors.w08, borderRadius: 4, overflow: 'hidden' },
  tempBar: { height: 8, borderRadius: 4 },
  tempPct: { width: 36, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  noData: { fontSize: 13, color: Colors.w40, textAlign: 'center', padding: 16 },
  insightCard: { backgroundColor: 'rgba(200,168,75,0.06)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(200,168,75,0.2)', gap: 8 },
  insightTitle: { fontSize: 12, fontWeight: '700', color: Colors.gold },
  insightText: { fontSize: 13, color: Colors.w60, lineHeight: 22 },
});
