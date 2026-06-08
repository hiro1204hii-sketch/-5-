import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Switch,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getSettings, saveSettings } from '../../hooks/useStorage';
import { useSubscription } from '../../hooks/useSubscription';
import { Colors } from '../../constants/theme';

export default function SettingsScreen() {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const { isProUser, restorePurchases } = useSubscription();

  useFocusEffect(useCallback(() => {
    getSettings().then(s => {
      setAnthropicKey(s.anthropicApiKey);
      setOpenaiKey(s.openaiApiKey);
    });
  }, []));

  const handleSave = async () => {
    await saveSettings({ anthropicApiKey: anthropicKey, openaiApiKey: openaiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRestore = async () => {
    try {
      const restored = await restorePurchases();
      Alert.alert('完了', restored ? 'プロプランを復元しました ✓' : '有効な購入が見つかりませんでした。');
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Subscription card */}
      <View style={[styles.card, isProUser && styles.proCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{isProUser ? '✨ PROプラン' : '🎁 フリープラン'}</Text>
          {!isProUser && (
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/paywall')}>
              <Text style={styles.upgradeBtnText}>アップグレード</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.planDesc}>
          {isProUser
            ? '無制限の商談分析・全機能が利用可能です'
            : '毎月5回まで無料で利用できます'}
        </Text>
        {!isProUser && (
          <TouchableOpacity onPress={handleRestore}>
            <Text style={styles.restoreLink}>購入を復元する</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* API Keys */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔑 APIキー設定</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Anthropic APIキー（必須）</Text>
          <Text style={styles.hint}>Claude AIによる商談分析に使用します</Text>
          <TextInput
            style={styles.input}
            value={anthropicKey}
            onChangeText={setAnthropicKey}
            placeholder="sk-ant-..."
            placeholderTextColor={Colors.lightBrown}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>OpenAI APIキー（推奨）</Text>
          <Text style={styles.hint}>Whisperによる音声文字起こしに使用します。未設定の場合は手動入力になります。</Text>
          <TextInput
            style={styles.input}
            value={openaiKey}
            onChangeText={setOpenaiKey}
            placeholder="sk-..."
            placeholderTextColor={Colors.lightBrown}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{saved ? '✓ 保存しました' : '保存する'}</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>🔒 プライバシーについて</Text>
        <Text style={styles.infoText}>
          APIキーはお使いの端末のみに保存されます。外部サーバーには送信されません。
          商談データもすべてローカルに保存されます。
        </Text>
      </View>

      <Text style={styles.version}>育てる営業手帳 v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  container: { padding: 20, gap: 20, paddingBottom: 40 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.lineColor,
    gap: 8,
  },
  proCard: {
    borderColor: Colors.warmBrown,
    backgroundColor: 'rgba(139,94,60,0.06)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.darkBrown },
  upgradeBtn: {
    backgroundColor: Colors.warmBrown,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  upgradeBtnText: { color: Colors.cream, fontSize: 12, fontWeight: '600' },
  planDesc: { fontSize: 13, color: Colors.warmBrown, lineHeight: 20 },
  restoreLink: { fontSize: 12, color: Colors.lightBrown, textDecorationLine: 'underline' },
  section: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.lineColor,
    gap: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.darkBrown },
  field: { gap: 4 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.ink },
  hint: { fontSize: 11, color: Colors.lightBrown, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: Colors.lineColor,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: Colors.ink,
    backgroundColor: Colors.cream,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: Colors.darkBrown,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: Colors.cream, fontWeight: '600', fontSize: 14 },
  infoBox: {
    backgroundColor: 'rgba(139,94,60,0.06)',
    borderRadius: 10,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(196,149,106,0.3)',
  },
  infoTitle: { fontSize: 13, fontWeight: '600', color: Colors.warmBrown },
  infoText: { fontSize: 12, color: Colors.warmBrown, lineHeight: 20 },
  version: { textAlign: 'center', fontSize: 11, color: Colors.lightBrown },
});
