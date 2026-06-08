import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { useRecording } from '../../hooks/useRecording';
import { useSubscription } from '../../hooks/useSubscription';
import { getSettings, getUsageThisMonth, incrementUsage, saveResult } from '../../hooks/useStorage';
import { transcribeAudio } from '../../services/transcriptionService';
import { analyzeTranscript } from '../../services/anthropicService';
import { UsageBadge } from '../../components/UsageBadge';
import { Colors, FREE_TIER_LIMIT } from '../../constants/theme';

export default function RecordScreen() {
  const { state, duration, formattedDuration, startRecording, stopRecording, reset } = useRecording();
  const { isProUser } = useSubscription();
  const [usageCount, setUsageCount] = useState(0);
  const [statusText, setStatusText] = useState('');

  const pulseScale = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    getUsageThisMonth().then(setUsageCount);
  }, []);

  useEffect(() => {
    if (state === 'recording') {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.12, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1, true
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [state]);

  const handlePress = useCallback(async () => {
    if (state === 'recording') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await handleStop();
      return;
    }

    if (state === 'processing') return;

    // Check free tier
    if (!isProUser && usageCount >= FREE_TIER_LIMIT) {
      router.push('/paywall');
      return;
    }

    const settings = await getSettings();
    if (!settings.anthropicApiKey) {
      Alert.alert('APIキー未設定', '「設定」タブでAnthropicのAPIキーを入力してください。');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await startRecording();
      setStatusText('🔴 録音中...');
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    }
  }, [state, isProUser, usageCount]);

  const handleStop = useCallback(async () => {
    setStatusText('');
    try {
      const uri = await stopRecording();
      if (!uri) return;

      const settings = await getSettings();

      setStatusText('🎤 文字起こし中...');
      let transcript = '';

      if (settings.openaiApiKey) {
        transcript = await transcribeAudio(uri, settings.openaiApiKey);
      } else {
        // Fallback: prompt user for manual input
        await new Promise<void>(resolve => {
          Alert.prompt(
            '手動入力',
            'OpenAI APIキーが未設定のため、商談内容を手動で入力してください。',
            [
              { text: 'キャンセル', onPress: () => resolve(), style: 'cancel' },
              { text: 'OK', onPress: text => { transcript = text ?? ''; resolve(); } },
            ],
            'plain-text'
          );
        });
      }

      if (!transcript.trim()) {
        setStatusText('');
        reset();
        return;
      }

      setStatusText('🤖 AIが分析中...');
      const analysis = await analyzeTranscript(transcript, settings.anthropicApiKey);

      const newCount = await incrementUsage();
      setUsageCount(newCount);

      const result = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        transcript,
        duration,
        ...analysis,
      };

      await saveResult(result);
      setStatusText('');
      reset();

      router.push({ pathname: '/results', params: { id: result.id } });
    } catch (e: any) {
      setStatusText('');
      Alert.alert('エラー', e.message);
      reset();
    }
  }, [duration]);

  const isButtonDisabled = state === 'processing';
  const isRecording = state === 'recording';

  return (
    <ScrollView contentContainerStyle={styles.container} bounces={false}>
      {/* Date */}
      <Text style={styles.date}>
        {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
      </Text>

      <UsageBadge used={usageCount} isProUser={isProUser} />

      {/* Record area */}
      <View style={styles.recordArea}>
        <Text style={styles.instruction}>
          {isRecording ? '商談が終わったら停止してください' : '録音ボタンで商談を記録'}
        </Text>

        <Animated.View style={[styles.btnWrap, pulseStyle]}>
          <TouchableOpacity
            style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
            onPress={handlePress}
            disabled={isButtonDisabled}
            activeOpacity={0.85}
          >
            {isButtonDisabled ? (
              <ActivityIndicator color={Colors.warmBrown} size="large" />
            ) : (
              <Text style={styles.btnIcon}>{isRecording ? '⏹' : '🎙️'}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {isRecording && (
          <Text style={styles.timer}>{formattedDuration}</Text>
        )}

        <Text style={styles.btnLabel}>
          {isRecording ? 'タップして停止' : isButtonDisabled ? '処理中...' : '録音開始'}
        </Text>
      </View>

      {statusText ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      ) : null}

      {/* Ruled lines decoration */}
      <View style={styles.ruledLines}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={styles.ruledLine} />
        ))}
      </View>

      {/* Upgrade prompt for free users */}
      {!isProUser && usageCount >= FREE_TIER_LIMIT - 1 && (
        <TouchableOpacity style={styles.upgradePrompt} onPress={() => router.push('/paywall')}>
          <Text style={styles.upgradeText}>
            {usageCount >= FREE_TIER_LIMIT
              ? '⚠️ 今月の無料枠を使い切りました。プロプランで無制限に。'
              : '⭐ 残り1回！プロプランで無制限に使えます。'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 20,
    backgroundColor: Colors.cream,
    backgroundImage: undefined,
  },
  date: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.warmBrown,
    letterSpacing: 0.5,
  },
  recordArea: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  instruction: {
    fontSize: 14,
    color: Colors.warmBrown,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  btnWrap: {},
  recordBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.warmBrown,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.darkBrown,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  recordBtnActive: {
    borderColor: Colors.hot,
    shadowColor: Colors.hot,
    shadowOpacity: 0.4,
  },
  btnIcon: { fontSize: 48 },
  timer: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.hot,
    letterSpacing: 4,
  },
  btnLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  statusBox: {
    backgroundColor: 'rgba(139,94,60,0.08)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statusText: { fontSize: 14, color: Colors.warmBrown, fontStyle: 'italic' },
  ruledLines: { gap: 0, marginTop: 8 },
  ruledLine: {
    height: 1,
    backgroundColor: Colors.lineColor,
    marginBottom: 31,
  },
  upgradePrompt: {
    backgroundColor: 'rgba(192,57,43,0.08)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.2)',
  },
  upgradeText: { fontSize: 13, color: Colors.hot, textAlign: 'center', lineHeight: 20 },
});
