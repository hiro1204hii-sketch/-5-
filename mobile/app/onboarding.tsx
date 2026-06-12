import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { setOnboarded, saveSettings } from '../hooks/useStorage';
import { Colors, Gradients } from '../constants/theme';

const STEPS = [
  {
    emoji: '🏆',
    title: '育てる営業手帳へ\nようこそ',
    desc: '商談を録音するだけでAIが議事録・\n次のアクション・温度感を自動生成。\n営業を"管理"ではなく"育てる"ツール。',
  },
  {
    emoji: '🎙',
    title: '録音して\n自動分析',
    desc: '商談中にボタンひとつで録音。\n終了後、AIが数秒で分析して\n大切な気づきを整理します。',
  },
  {
    emoji: '🔥',
    title: '温度感で\nパイプライン管理',
    desc: '🔥 HOT・☀️ WARM・❄️ COLD で\nお客様の購買意欲を可視化。\n優先順位が一目でわかります。',
  },
  {
    emoji: '⭐',
    title: 'ゲーミフィケーション\nで成長を実感',
    desc: '毎日の活動がスコアに。\nレベルアップとストリークで\n継続の習慣が生まれます。',
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = async () => {
    if (isLast) { await setOnboarded(); router.replace('/(tabs)'); }
    else setStep(s => s + 1);
  };
  const handleSkip = async () => { await setOnboarded(); router.replace('/(tabs)'); };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#1a2a4a', '#0D1526', '#0A0D1A']} style={styles.gradient}>
        {step < STEPS.length - 1 && (
          <TouchableOpacity style={styles.skip} onPress={handleSkip}>
            <Text style={styles.skipText}>スキップ</Text>
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          <LinearGradient colors={Gradients.gold} style={styles.emojiCircle}>
            <Text style={styles.emoji}>{current.emoji}</Text>
          </LinearGradient>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.desc}>{current.desc}</Text>
        </View>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.btnWrap} onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient colors={Gradients.gold} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.btnText}>{isLast ? 'はじめる ✓' : '次へ →'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  gradient: { flex: 1, padding: 32, justifyContent: 'space-between' },
  skip: { alignSelf: 'flex-end', paddingVertical: 4 },
  skipText: { fontSize: 14, color: Colors.w40 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  emojiCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 48 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.w100, textAlign: 'center', lineHeight: 40 },
  desc: { fontSize: 15, color: Colors.w60, textAlign: 'center', lineHeight: 26 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.w20 },
  dotActive: { backgroundColor: Colors.gold, width: 24 },
  btnWrap: { borderRadius: 14, overflow: 'hidden' },
  btn: { padding: 18, alignItems: 'center' },
  btnText: { fontSize: 17, fontWeight: '900', color: Colors.navy, letterSpacing: 0.5 },
});
