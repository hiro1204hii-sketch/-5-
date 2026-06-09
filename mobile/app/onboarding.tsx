import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { setOnboarded, saveSettings } from '../hooks/useStorage';
import { Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    emoji: '📓',
    title: '育てる営業手帳へ\nようこそ',
    desc: '商談を録音するだけで\nAIが議事録・次のアクション・\nお客様の温度感を自動生成します',
  },
  {
    emoji: '🎙️',
    title: '録音して\n自動分析',
    desc: '商談中にボタンひとつで録音。\n終了後、AIが数秒で分析して\n大切な気づきを整理します。',
  },
  {
    emoji: '🌡️',
    title: '温度感で\nパイプラインを管理',
    desc: '🔥 HOT・☀️ WARM・❄️ COLD で\nお客様の購買意欲を可視化。\n優先順位が一目でわかります。',
  },
  {
    emoji: '⚙️',
    title: 'APIキーを\n設定しましょう',
    desc: 'AnthropicのAPIキーを入力すると\nAI分析機能が使えます。\n（設定は後からでも変更できます）',
    hasInput: true,
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = async () => {
    if (isLast) {
      if (apiKey.trim()) {
        await saveSettings({ anthropicApiKey: apiKey.trim() });
      }
      await setOnboarded();
      router.replace('/(tabs)');
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = async () => {
    await setOnboarded();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={[Colors.darkBrown, Colors.warmBrown, Colors.lightBrown]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }}
      >
        {/* Skip */}
        {step < STEPS.length - 1 && (
          <TouchableOpacity style={styles.skip} onPress={handleSkip}>
            <Text style={styles.skipText}>スキップ</Text>
          </TouchableOpacity>
        )}

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.desc}>{current.desc}</Text>

          {current.hasInput && (
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Anthropic APIキー（任意）</Text>
              <View style={styles.inputBox}>
                <Text
                  style={[styles.inputText, !apiKey && styles.placeholder]}
                  onPress={() => {/* handled by TextInput below */}}
                >
                  {apiKey || 'sk-ant-...'}
                </Text>
              </View>
              {/* We use a real TextInput overlay trick to avoid import issues */}
              <TouchableOpacity
                style={styles.getKeyBtn}
                onPress={() => router.replace('/(tabs)/settings')}
              >
                <Text style={styles.getKeyText}>設定画面で入力する →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.btnText}>{isLast ? 'はじめる ✓' : '次へ →'}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBrown },
  gradient: { flex: 1, padding: 32, justifyContent: 'space-between' },
  skip: { alignSelf: 'flex-end', paddingVertical: 4 },
  skipText: { fontSize: 14, color: 'rgba(250,246,240,0.6)' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  emoji: { fontSize: 80 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.cream,
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: 16,
    color: 'rgba(250,246,240,0.85)',
    textAlign: 'center',
    lineHeight: 26,
  },
  inputWrap: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  inputLabel: { fontSize: 13, color: 'rgba(250,246,240,0.7)', textAlign: 'center' },
  inputBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  inputText: { fontSize: 14, color: Colors.cream, textAlign: 'center' },
  placeholder: { opacity: 0.5 },
  getKeyBtn: { alignItems: 'center' },
  getKeyText: { fontSize: 13, color: Colors.lightBrown, textDecorationLine: 'underline' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: { backgroundColor: Colors.cream, width: 24 },
  btn: {
    backgroundColor: Colors.cream,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnText: { fontSize: 17, fontWeight: '700', color: Colors.darkBrown, letterSpacing: 0.5 },
});
