import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getResults, getReminders, getGamification, recordDailyActivity, getSettings } from '../../hooks/useStorage';
import { useSubscription } from '../../hooks/useSubscription';
import { UsageBadge } from '../../components/UsageBadge';
import { Colors, Gradients, DAILY_QUOTES } from '../../constants/theme';
import { AnalysisResult, Reminder } from '../../types';

const TEMP_COLORS = { HOT: Colors.hot, WARM: Colors.warm, COLD: Colors.cold } as const;
const TEMP_EMOJIS = { HOT: '🔥', WARM: '☀️', COLD: '❄️' } as const;

export default function HomeScreen() {
  const { isProUser } = useSubscription();
  const [data, setData] = useState({
    userName: '',
    streak: 0, level: 1, monthlyScore: 0,
    hotCount: 0, warmCount: 0, coldCount: 0, totalDeals: 0,
    todayReminders: 0, upcomingMeetings: 0, urgentDeals: 0,
    recentResults: [] as AnalysisResult[],
    usageCount: 0,
    quote: DAILY_QUOTES[new Date().getDay() % DAILY_QUOTES.length],
  });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [results, reminders, gamif, settings] = await Promise.all([
      getResults(), getReminders(), recordDailyActivity(), getSettings(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const todayReminders = reminders.filter(r => !r.done && r.dueDate <= today).length;
    setData({
      userName: settings.userName || '営業さん',
      streak: gamif.streak,
      level: gamif.level,
      monthlyScore: gamif.monthlyScore,
      hotCount:   results.filter(r => r.temperature === 'HOT').length,
      warmCount:  results.filter(r => r.temperature === 'WARM').length,
      coldCount:  results.filter(r => r.temperature === 'COLD').length,
      totalDeals: results.length,
      todayReminders,
      upcomingMeetings: 2, // TODO: calendar integration
      urgentDeals: results.filter(r => r.temperature === 'HOT').length,
      recentResults: results.slice(0, 3),
      usageCount: 0,
      quote: DAILY_QUOTES[new Date().getDay() % DAILY_QUOTES.length],
    });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'おはようございます！' : hour < 17 ? 'こんにちは！' : 'お疲れ様です！';
  const dateStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <LinearGradient colors={Gradients.hero} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }}>
        <View style={styles.heroOverlay} />
        {/* Top row */}
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>{greeting}</Text>
            <Text style={styles.heroHeadline}>今日も{'\n'}一歩前へ。</Text>
            <Text style={styles.heroSub}>小さな行動の積み重ねが、{'\n'}未来の大きな成果につながる。</Text>
          </View>
          <View style={styles.heroRight}>
            <UsageBadge used={data.usageCount} isProUser={isProUser} />
            <View style={styles.levelBadge}>
              <LinearGradient colors={Gradients.gold} style={styles.levelGrad}>
                <Text style={styles.levelText}>Lv.{data.level}</Text>
              </LinearGradient>
            </View>
          </View>
        </View>
        <Text style={styles.heroDate}>{dateStr}</Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* ── Today Stats ── */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/reminders')}>
            <Text style={styles.statIcon}>📞</Text>
            <Text style={[styles.statNum, { color: Colors.cold }]}>{data.todayReminders}</Text>
            <Text style={styles.statLbl}>フォロー</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard}>
            <Text style={styles.statIcon}>🤝</Text>
            <Text style={[styles.statNum, { color: Colors.gold }]}>{data.upcomingMeetings}</Text>
            <Text style={styles.statLbl}>商談予定</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/pipeline')}>
            <Text style={styles.statIcon}>⚡</Text>
            <Text style={[styles.statNum, { color: Colors.hot }]}>{data.urgentDeals}</Text>
            <Text style={styles.statLbl}>HOT案件</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/customers')}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={[styles.statNum, { color: Colors.won }]}>{data.totalDeals}</Text>
            <Text style={styles.statLbl}>商談数</Text>
          </TouchableOpacity>
        </View>

        {/* ── Today's Quote ── */}
        <LinearGradient colors={['rgba(200,168,75,0.1)', 'rgba(200,168,75,0.03)']} style={styles.quoteCard}>
          <Text style={styles.quoteMarks}>"</Text>
          <Text style={styles.quoteText}>{data.quote}</Text>
        </LinearGradient>

        {/* ── Streak + Score ── */}
        <View style={styles.gamifRow}>
          <View style={[styles.gamifCard, { flex: 1 }]}>
            <Text style={styles.gamifIcon}>🔥</Text>
            <View>
              <Text style={styles.streakNum}>{data.streak}</Text>
              <Text style={styles.gamifLbl}>継続記録（日）</Text>
            </View>
          </View>
          <View style={[styles.gamifCard, { flex: 1 }]}>
            <Text style={styles.gamifIcon}>📊</Text>
            <View>
              <Text style={styles.scoreNum}>{data.monthlyScore}%</Text>
              <Text style={styles.gamifLbl}>今月の活動スコア</Text>
            </View>
          </View>
        </View>

        {/* ── Pipeline mini ── */}
        {data.totalDeals > 0 && (
          <TouchableOpacity onPress={() => router.push('/pipeline')} activeOpacity={0.8}>
            <View style={styles.pipelineCard}>
              <View style={styles.pipelineHeader}>
                <Text style={styles.pipelineTitle}>パイプライン</Text>
                <Text style={styles.pipelineArrow}>›</Text>
              </View>
              <View style={styles.pipelineRow}>
                <View style={[styles.pipelineStat, { borderColor: Colors.hot + '44' }]}>
                  <Text style={[styles.pipelineNum, { color: Colors.hot }]}>{data.hotCount}</Text>
                  <Text style={styles.pipelineLbl}>🔥 HOT</Text>
                </View>
                <View style={[styles.pipelineStat, { borderColor: Colors.warm + '44' }]}>
                  <Text style={[styles.pipelineNum, { color: Colors.warm }]}>{data.warmCount}</Text>
                  <Text style={styles.pipelineLbl}>☀️ WARM</Text>
                </View>
                <View style={[styles.pipelineStat, { borderColor: Colors.cold + '44' }]}>
                  <Text style={[styles.pipelineNum, { color: Colors.cold }]}>{data.coldCount}</Text>
                  <Text style={styles.pipelineLbl}>❄️ COLD</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Recent Activity ── */}
        {data.recentResults.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionLabel}>直近の商談</Text>
            {data.recentResults.map(r => {
              const temp = r.temperature;
              const d = new Date(r.date);
              const ds = d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
              return (
                <TouchableOpacity
                  key={r.id}
                  style={styles.recentItem}
                  onPress={() => router.push({ pathname: '/results', params: { id: r.id } })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.recentDot, { backgroundColor: TEMP_COLORS[temp] }]} />
                  <View style={styles.recentContent}>
                    <Text style={styles.recentName}>{r.customerName ?? '顧客未設定'}</Text>
                    <Text style={styles.recentPreview} numberOfLines={1}>
                      {r.minutes.split('\n')[0].replace(/^[•・\-*]\s*/, '').slice(0, 35)}…
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.recentTemp, { color: TEMP_COLORS[temp] }]}>{TEMP_EMOJIS[temp]}</Text>
                    <Text style={styles.recentDate}>{ds}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── CTA ── */}
        <TouchableOpacity onPress={() => router.push('/record')} activeOpacity={0.85}>
          <LinearGradient colors={Gradients.gold} style={styles.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.ctaText}>▶ 今日をはじめる</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingBottom: 40 },
  hero: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24, position: 'relative', minHeight: 200 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,13,26,0.3)' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroGreeting: { fontSize: 11, color: Colors.gold, fontWeight: '600', letterSpacing: 0.8, marginBottom: 4 },
  heroHeadline: { fontSize: 30, fontWeight: '900', color: Colors.w100, lineHeight: 38 },
  heroSub: { fontSize: 11, color: Colors.w40, marginTop: 8, lineHeight: 18 },
  heroRight: { alignItems: 'flex-end', gap: 8 },
  heroDate: { fontSize: 11, color: Colors.w40, marginTop: 12 },
  levelBadge: { borderRadius: 20, overflow: 'hidden' },
  levelGrad: { paddingHorizontal: 12, paddingVertical: 4 },
  levelText: { fontSize: 11, fontWeight: '700', color: Colors.navy },
  body: { padding: 16, gap: 14 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, backgroundColor: Colors.w04, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.w08,
    padding: 10, alignItems: 'center', gap: 3,
  },
  statIcon: { fontSize: 16 },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLbl: { fontSize: 9, color: Colors.w40, textAlign: 'center', lineHeight: 13 },
  quoteCard: {
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(200,168,75,0.2)',
  },
  quoteMarks: { fontSize: 24, color: Colors.gold, opacity: 0.5, lineHeight: 20, marginBottom: 2 },
  quoteText: { fontSize: 13, color: Colors.w60, lineHeight: 22, fontStyle: 'italic' },
  gamifRow: { flexDirection: 'row', gap: 10 },
  gamifCard: {
    backgroundColor: Colors.w04, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.w08,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  gamifIcon: { fontSize: 26 },
  streakNum: { fontSize: 26, fontWeight: '900', color: Colors.streak, lineHeight: 30 },
  scoreNum:  { fontSize: 26, fontWeight: '900', color: Colors.gold,   lineHeight: 30 },
  gamifLbl: { fontSize: 10, color: Colors.w40, marginTop: 2 },
  pipelineCard: {
    backgroundColor: Colors.w04, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.w08, padding: 14, gap: 10,
  },
  pipelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pipelineTitle: { fontSize: 12, fontWeight: '700', color: Colors.w60, letterSpacing: 0.8 },
  pipelineArrow: { fontSize: 16, color: Colors.w40 },
  pipelineRow: { flexDirection: 'row', gap: 8 },
  pipelineStat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10, padding: 10, alignItems: 'center', gap: 3,
    borderWidth: 1,
  },
  pipelineNum: { fontSize: 22, fontWeight: '900' },
  pipelineLbl: { fontSize: 9, color: Colors.w40 },
  recentSection: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.w40, letterSpacing: 0.8 },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.w04, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.w08, padding: 12,
  },
  recentDot: { width: 10, height: 10, borderRadius: 5 },
  recentContent: { flex: 1 },
  recentName: { fontSize: 12, fontWeight: '600', color: Colors.w100 },
  recentPreview: { fontSize: 10, color: Colors.w40, marginTop: 2 },
  recentTemp: { fontSize: 16, textAlign: 'right' },
  recentDate: { fontSize: 9, color: Colors.w40, marginTop: 2, textAlign: 'right' },
  cta: {
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: Colors.gold, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  ctaText: { fontSize: 16, fontWeight: '900', color: Colors.navy, letterSpacing: 0.5 },
});
