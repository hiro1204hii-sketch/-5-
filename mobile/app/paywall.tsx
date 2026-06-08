import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../hooks/useSubscription';
import { Colors, FREE_TIER_LIMIT } from '../constants/theme';

const FEATURES_FREE = [
  `毎月${FREE_TIER_LIMIT}回まで分析`,
  '議事録・アクション生成',
  'お客様温度感（HOT/WARM/COLD）',
  '過去履歴の閲覧',
];

const FEATURES_PRO = [
  '✓ 無制限の商談分析',
  '✓ 議事録・アクション生成',
  '✓ お客様温度感（HOT/WARM/COLD）',
  '✓ 過去履歴の閲覧・共有',
  '✓ 優先サポート',
  '✓ 新機能への早期アクセス',
];

export default function PaywallScreen() {
  const { packages, purchasePackage, restorePurchases, loading } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (packages.length === 0) {
      Alert.alert('エラー', 'プランの取得中です。しばらくお待ちください。');
      return;
    }

    setPurchasing(true);
    try {
      const pkg = packages[0]; // Monthly plan
      const success = await purchasePackage(pkg);
      if (success) {
        Alert.alert('🎉 ありがとうございます！', 'プロプランの登録が完了しました。', [
          { text: 'はじめる', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert('完了', '購入を復元しました ✓', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('', '有効な購入が見つかりませんでした。');
      }
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setPurchasing(false);
    }
  };

  const priceLabel = packages[0]?.localizedPriceString ?? '¥980/月';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.darkBrown, Colors.warmBrown]}
        style={styles.hero}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Text style={styles.heroIcon}>📓✨</Text>
        <Text style={styles.heroTitle}>育てる営業手帳</Text>
        <Text style={styles.heroSubtitle}>PROプラン</Text>
        <Text style={styles.heroDesc}>
          商談を無制限に記録・分析して{'\n'}最速で成約率を高めましょう
        </Text>
      </LinearGradient>

      {/* Plan comparison */}
      <View style={styles.planRow}>
        {/* Free */}
        <View style={styles.planCard}>
          <Text style={styles.planTitle}>フリー</Text>
          <Text style={styles.planPrice}>¥0</Text>
          <View style={styles.featureList}>
            {FEATURES_FREE.map((f, i) => (
              <Text key={i} style={styles.featureItem}>• {f}</Text>
            ))}
          </View>
        </View>

        {/* Pro */}
        <View style={[styles.planCard, styles.proPlanCard]}>
          <View style={styles.badge}><Text style={styles.badgeText}>おすすめ</Text></View>
          <Text style={[styles.planTitle, styles.proText]}>プロ</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.planPrice, styles.proText]}>{priceLabel}</Text>
          </View>
          <Text style={styles.planNote}>いつでも解約可能</Text>
          <View style={styles.featureList}>
            {FEATURES_PRO.map((f, i) => (
              <Text key={i} style={[styles.featureItem, styles.proFeature]}>{f}</Text>
            ))}
          </View>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={handlePurchase}
        disabled={purchasing || loading}
        activeOpacity={0.85}
      >
        {purchasing ? (
          <ActivityIndicator color={Colors.cream} />
        ) : (
          <>
            <Text style={styles.ctaTitle}>プロプランを始める</Text>
            <Text style={styles.ctaPrice}>{priceLabel}</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
        <Text style={styles.restoreLink}>以前の購入を復元する</Text>
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
  scroll: { flex: 1, backgroundColor: Colors.cream },
  container: { paddingBottom: 40 },
  hero: {
    padding: 32,
    alignItems: 'center',
    gap: 6,
  },
  heroIcon: { fontSize: 40, marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: Colors.cream, letterSpacing: 1 },
  heroSubtitle: { fontSize: 15, color: 'rgba(250,246,240,0.8)', letterSpacing: 4 },
  heroDesc: { fontSize: 14, color: 'rgba(250,246,240,0.75)', textAlign: 'center', lineHeight: 22, marginTop: 8 },
  planRow: { flexDirection: 'row', padding: 16, gap: 12 },
  planCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.lineColor,
    backgroundColor: 'rgba(255,255,255,0.5)',
    gap: 4,
  },
  proPlanCard: {
    borderColor: Colors.warmBrown,
    borderWidth: 2,
    backgroundColor: 'rgba(139,94,60,0.05)',
  },
  badge: {
    backgroundColor: Colors.warmBrown,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: { fontSize: 10, color: Colors.cream, fontWeight: '700' },
  planTitle: { fontSize: 16, fontWeight: '700', color: Colors.warmBrown },
  proText: { color: Colors.darkBrown },
  planPrice: { fontSize: 20, fontWeight: '700', color: Colors.warmBrown },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planNote: { fontSize: 10, color: Colors.lightBrown, marginTop: -2, marginBottom: 4 },
  featureList: { gap: 4, marginTop: 6 },
  featureItem: { fontSize: 11, color: Colors.warmBrown, lineHeight: 18 },
  proFeature: { color: Colors.darkBrown, fontWeight: '500' },
  ctaBtn: {
    backgroundColor: Colors.darkBrown,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    gap: 2,
    shadowColor: Colors.darkBrown,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: Colors.cream },
  ctaPrice: { fontSize: 12, color: 'rgba(250,246,240,0.75)' },
  restoreLink: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    color: Colors.lightBrown,
    textDecorationLine: 'underline',
  },
  legal: {
    fontSize: 10,
    color: Colors.lightBrown,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    lineHeight: 18,
  },
});
