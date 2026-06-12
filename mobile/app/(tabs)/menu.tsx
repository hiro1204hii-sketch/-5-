import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getGamification, getSettings } from '../../hooks/useStorage';
import { useSubscription } from '../../hooks/useSubscription';
import { Colors, Gradients } from '../../constants/theme';

const MENU_ITEMS = [
  { icon: '🎯', label: '案件パイプライン', sub: '商談の進捗を管理', path: '/pipeline' },
  { icon: '📞', label: 'フォローリマインド', sub: '連絡が必要なお客様', path: '/reminders' },
  { icon: '📋', label: '活動履歴', sub: '過去の商談・活動ログ', path: '/activity' },
  { icon: '🤖', label: 'AIコーチ', sub: '営業スキルをAIが指導', path: '/coach' },
  { icon: '⚙️', label: '設定', sub: 'APIキー・アカウント', path: '/settings' },
];

export default function MenuScreen() {
  const { isProUser } = useSubscription();
  const [userName, setUserName] = useState('営業さん');
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [s, g] = await Promise.all([getSettings(), getGamification()]);
      setUserName(s.userName || '営業さん');
      setLevel(g.level);
      setStreak(g.streak);
      setScore(g.monthlyScore);
    })();
  }, []));

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile card */}
      <LinearGradient colors={Gradients.hero} style={styles.profile}>
        <LinearGradient colors={Gradients.gold} style={styles.avatar}>
          <Text style={styles.avatarText}>{userName.charAt(0)}</Text>
        </LinearGradient>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userName}</Text>
          <View style={styles.profileBadges}>
            {isProUser ? (
              <View style={styles.proBadge}><Text style={styles.proBadgeText}>⭐ PRO</Text></View>
            ) : (
              <TouchableOpacity style={styles.freeBadge} onPress={() => router.push('/paywall')}>
                <Text style={styles.freeBadgeText}>FREE → アップグレード</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.profileStats}>
          <View style={styles.pStat}>
            <Text style={styles.pStatNum}>{streak}</Text>
            <Text style={styles.pStatLbl}>🔥 継続</Text>
          </View>
          <View style={styles.pStat}>
            <Text style={styles.pStatNum}>Lv.{level}</Text>
            <Text style={styles.pStatLbl}>🏆 レベル</Text>
          </View>
          <View style={styles.pStat}>
            <Text style={styles.pStatNum}>{score}%</Text>
            <Text style={styles.pStatLbl}>📊 スコア</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Menu items */}
      <View style={styles.menuList}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.path}
            style={styles.menuItem}
            onPress={() => router.push(item.path as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* App info */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>育てる営業手帳</Text>
        <Text style={styles.appVersion}>v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingBottom: 48 },
  profile: { padding: 20, gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '900', color: Colors.navy },
  profileInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileName: { fontSize: 20, fontWeight: '900', color: Colors.w100 },
  profileBadges: {},
  proBadge: { backgroundColor: 'rgba(200,168,75,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: Colors.gold },
  proBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.gold },
  freeBadge: { backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,82,82,0.3)' },
  freeBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.hot },
  profileStats: { flexDirection: 'row', gap: 12 },
  pStat: { flex: 1, backgroundColor: Colors.w04, borderRadius: 12, padding: 12, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: Colors.w08 },
  pStatNum: { fontSize: 18, fontWeight: '900', color: Colors.gold },
  pStatLbl: { fontSize: 9, color: Colors.w40 },
  menuList: { padding: 16, gap: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.w04, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.w08 },
  menuIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  menuText: { flex: 1, gap: 2 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: Colors.w100 },
  menuSub: { fontSize: 11, color: Colors.w40 },
  menuArrow: { fontSize: 20, color: Colors.w40 },
  appInfo: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  appName: { fontSize: 13, fontWeight: '700', color: Colors.w40 },
  appVersion: { fontSize: 11, color: Colors.w20 },
});
