import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getSettings, saveSettings } from '../../hooks/useStorage';
import { useSubscription } from '../../hooks/useSubscription';
import { Colors, Gradients } from '../../constants/theme';

export default function SettingsScreen() {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [userName, setUserName] = useState('');
  const [saved, setSaved] = useState(false);
  const { isProUser, restorePurchases } = useSubscription();

  useFocusEffect(useCallback(() => {
    getSettings().then(s => {
      setAnthropicKey(s.anthropicApiKey ?? '');
      setOpenaiKey(s.openaiApiKey ?? '');
      setUserName(s.userName ?? '');
    });
  }, []));

  const handleSave = async () => {
    await saveSettings({ anthropicApiKey: anthropicKey, openaiApiKey: openaiKey, userName: userName.trim() || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRestore = async () => {
    try {
      const ok = await restorePurchases();
      Alert.alert('完了', ok ? 'プロプランを復元しました ✓' : '有効な購入が見つかりませんでした。');
    } catch (e: any) { Alert.alert('エラー', e.message); }
  };

  const Field = ({ label, hint, value, onChange, placeholder, secure }: {
    label: string; hint?: string; value: string; onChange: (v: string) => void;
    placeholder: string; secure?: boolean;
  }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.w20}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Subscription */}
      <LinearGradient
        colors={isProUser ? ['rgba(200,168,75,0.15)', 'rgba(200,168,75,0.05)'] : [Colors.w04, Colors.w04]}
        style={[styles.subCard, isProUser && styles.subCardPro]}
      >
        <View style={styles.subTop}>
          <Text style={styles.subTitle}>{isProUser ? '⭐ PROプラン' : '🎁 フリープラン'}</Text>
          {!isProUser && (
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/paywall')}>
              <LinearGradient colors={Gradients.gold} style={styles.upgradeGrad}>
                <Text style={styles.upgradeTxt}>アップグレード</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subDesc}>
          {isProUser ? '無制限の商談分析・全機能が利用可能です' : '毎月5回まで無料で利用できます'}
        </Text>
        {!isProUser && (
          <TouchableOpacity onPress={handleRestore}>
            <Text style={styles.restoreLink}>購入を復元する</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 プロフィール</Text>
        <Field label="名前" value={userName} onChange={setUserName} placeholder="山田 太郎" />
      </View>

      {/* API Keys */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔑 APIキー設定</Text>
        <Field
          label="Anthropic APIキー（必須）"
          hint="Claude AIによる商談分析に使用します"
          value={anthropicKey} onChange={setAnthropicKey}
          placeholder="sk-ant-..." secure
        />
        <Field
          label="OpenAI APIキー（推奨）"
          hint="Whisperによる音声文字起こしに使用します。未設定の場合は手動入力になります。"
          value={openaiKey} onChange={setOpenaiKey}
          placeholder="sk-..." secure
        />
        <TouchableOpacity style={styles.saveWrap} onPress={handleSave} activeOpacity={0.85}>
          <LinearGradient colors={saved ? [Colors.won, Colors.won] : Gradients.gold} style={styles.saveGrad}>
            <Text style={styles.saveTxt}>{saved ? '✓ 保存しました' : '保存する'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Privacy */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>🔒 プライバシーについて</Text>
        <Text style={styles.infoText}>
          APIキーはお使いの端末のみに保存されます。外部サーバーには送信されません。商談データもすべてローカルに保存されます。
        </Text>
      </View>

      <Text style={styles.version}>育てる営業手帳 v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 16, gap: 16, paddingBottom: 48 },
  subCard: { borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.w08, gap: 8 },
  subCardPro: { borderColor: 'rgba(200,168,75,0.4)' },
  subTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subTitle: { fontSize: 16, fontWeight: '700', color: Colors.w100 },
  upgradeBtn: { borderRadius: 20, overflow: 'hidden' },
  upgradeGrad: { paddingHorizontal: 14, paddingVertical: 6 },
  upgradeTxt: { fontSize: 12, fontWeight: '700', color: Colors.navy },
  subDesc: { fontSize: 13, color: Colors.w60 },
  restoreLink: { fontSize: 12, color: Colors.w40, textDecorationLine: 'underline' },
  section: { backgroundColor: Colors.w04, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.w08, gap: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.w60 },
  field: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.w60, letterSpacing: 0.3 },
  fieldHint: { fontSize: 11, color: Colors.w40, lineHeight: 17 },
  fieldInput: { backgroundColor: Colors.bg, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.w100, borderWidth: 1, borderColor: Colors.w08, marginTop: 4 },
  saveWrap: { borderRadius: 12, overflow: 'hidden' },
  saveGrad: { padding: 14, alignItems: 'center' },
  saveTxt: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  infoBox: { backgroundColor: 'rgba(200,168,75,0.06)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(200,168,75,0.15)', gap: 6 },
  infoTitle: { fontSize: 13, fontWeight: '600', color: Colors.gold },
  infoText: { fontSize: 12, color: Colors.w40, lineHeight: 20 },
  version: { textAlign: 'center', fontSize: 11, color: Colors.w20 },
});
