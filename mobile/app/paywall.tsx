import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../hooks/useSubscription';
import { Colors, Gradients, FREE_TIER_LIMIT } from '../constants/theme';

const FEATURES_FREE = [
  `毎月${FREE_TIER_LIMIT}回まで分析`,
  '議事録・アクション生成',
  '温度感スコア（HOT/WARM/COLD）',
  '履歴閲覧',
];

const FEATURES_PRO = [
  '無制限の商談分析',
  '議事録・アクション生成',
  '温度感スコア',
  '顧客管理・パイプライン',
  'フォローリマインド',
  'AIコーチ（無制限）',
  '活動スコア・ゲーミフィケーション',
  '優先サポート',
];

export default function PaywallScreen() {
  const { packages, purchasePackage, restorePurchases, loading } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (packages.length === 0) { Alert.alert('エラー', 'プランの取得中です。しばらくお待ちください。'); return; }
    setPurchasing(true);
    try {
      const success = await purchasePackage(packages[0]);
      if (success) Alert.alert('🎉 ありがとうございます！', 'プロプランの登録が完了しました。', [{ text: 'はじめる', onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert('エラー', e.message); }
    finally { setPurchasing(false); }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const ok = await restorePurchases();
      if (ok) Alert.alert('完了', '購入を復元しました ✓', [{ text: 'OK', onPress: () => router.back() }]);
      else Alert.alert('', '有効な購入が見つかりませんでした。');
    } catch (e: any) { Alert.alert('エラー', e.message); }
    finally { setPurchasing(false); }
  };

  const priceLabel = packages[0]?.localizedPriceString ?? '¥980/月';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <LinearGradient colors={['#1a2a4a', '#0A0D1A']} style={styles.hero}>
        <LinearGradient colors={Gradients.gold} style={styles.heroIcon}>
          <Text style={styles.heroIconText}>⭐</Text>
        </LinearGradient>
        <Text style={styles.heroTitle}>育てる営業手帳</Text>
        <Text style={styles.heroBadge}>PRO PLAN</Text>
        <Text style={styles.heroDesc}>商談を無制限に記録・分析して{'\n'}最速で成約率を高めましょう</Text>
      </LinearGradient>

      {/* Plan cards */}
      <View style={styles.planRow}>
        <View style={styles.planCard}>
          <Text style={styles.planTitle}>フリー</Text>
          <Text style={styles.planPrice}>¥0</Text>
          <View style={styles.divider} />
          {FEATURES_FREE.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <LinearGradient colors={['rgba(200,168,75,0.15)', 'rgba(200,168,75,0.05)']} style={[styles.planCard, styles.proPlanCard]}>
          <View style={styles.recBadge}><Text style={styles.recText}>おすすめ</Text></View>
          <Text style={[styles.planTitle, { color: Colors.gold }]}>プロ</Text>
          <Text style={[styles.planPrice, { color: Colors.gold2 }]}>{priceLabel}</Text>
          <Text style={styles.planNote}>いつでも解約可能</Text>
          <View style={styles.divider} />
          {FEATURES_PRO.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={[styles.featureCheck, { color: Colors.gold }]}>✓</Text>
              <Text style={[styles.featureText, { color: Colors.w60 }]}>{f}</Text>
            </View>
          ))}
        </LinearGradient>
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.ctaWrap} onPress={handlePurchase} disabled={purchasing || loading} activeOpacity={0.85}>
        <LinearGradient colors={Gradients.gold} style={styles.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {purchasing ? <ActivityIndicator color={Colors.navy} /> : (
            <>
              <Text style={styles.ctaTitle}>プロプランを始める</Text>
              <Text style={styles.ctaPrice}>{priceLabel}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRestore} disabled={purchasing} style={styles.restore}>
        <Text style={styles.restoreText}>以前の購入を復元する</Text>
      </TouchableOpacity>

      <Text style={styles.legal}>
        • App Store経由で課金されます{'\n'}
        • 次の課金日の24時間前までに解約しない限り自動更新されます{'\n'}
        • いつでもApp Store設定から解約できます
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingBottom: 48 },
  hero: { padding: 36, alignItems: 'center', gap: 8, paddingTop: 60 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroIconText: { fontSize: 28 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: Colors.w100 },
  heroBadge: { fontSize: 12, fontWeight: '700', color: Colors.gold, letterSpacing: 4 },
  heroDesc: { fontSize: 14, color: Colors.w40, textAlign: 'center', lineHeight: 22, marginTop: 6 },
  planRow: { flexDirection: 'row', padding: 16, gap: 12, alignItems: 'flex-start' },
  planCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.w08, gap: 6 },
  proPlanCard: { borderColor: 'rgba(200,168,75,0.4)' },
  recBadge: { backgroundColor: 'rgba(200,168,75,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  recText: { fontSize: 10, fontWeight: '700', color: Colors.gold },
  planTitle: { fontSize: 16, fontWeight: '700', color: Colors.w60 },
  planPrice: { fontSize: 20, fontWeight: '900', color: Colors.w60 },
  planNote: { fontSize: 10, color: Colors.w20 },
  divider: { height: 1, backgroundColor: Colors.w08, marginVertical: 6 },
  featureRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  featureCheck: { fontSize: 11, color: Colors.w40, fontWeight: '700', marginTop: 1 },
  featureText: { fontSize: 11, color: Colors.w40, lineHeight: 18, flex: 1 },
  ctaWrap: { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden' },
  ctaGrad: { padding: 18, alignItems: 'center', gap: 2 },
  ctaTitle: { fontSize: 16, fontWeight: '900', color: Colors.navy },
  ctaPrice: { fontSize: 12, color: Colors.navy + 'aa' },
  restore: { alignItems: 'center', marginTop: 16 },
  restoreText: { fontSize: 13, color: Colors.w40, textDecorationLine: 'underline' },
  legal: { fontSize: 10, color: Colors.w20, textAlign: 'center', paddingHorizontal: 24, marginTop: 16, lineHeight: 18 },
});
