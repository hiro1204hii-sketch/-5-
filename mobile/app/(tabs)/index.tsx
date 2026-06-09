import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence,
} from 'react-native-reanimated';
import { useRecording } from '../../hooks/useRecording';
import { useSubscription } from '../../hooks/useSubscription';
import {
  getSettings, getUsageThisMonth, incrementUsage, saveResult,
  getResults, getCustomers, updateCustomerTemperature,
} from '../../hooks/useStorage';
import { transcribeAudio } from '../../services/transcriptionService';
import { analyzeTranscript } from '../../services/anthropicService';
import { UsageBadge } from '../../components/UsageBadge';
import { Colors, FREE_TIER_LIMIT } from '../../constants/theme';
import { Customer, Temperature } from '../../types';

const TEMP_COLORS: Record<Temperature, string> = {
  HOT: Colors.hot, WARM: Colors.warm, COLD: Colors.cold,
};

export default function RecordScreen() {
  const { state, duration, formattedDuration, startRecording, stopRecording, reset } = useRecording();
  const { isProUser } = useSubscription();
  const [usageCount, setUsageCount] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [stats, setStats] = useState({ total: 0, hot: 0, warm: 0, cold: 0 });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  const pulseScale = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    const [count, results, custs] = await Promise.all([
      getUsageThisMonth(),
      getResults(),
      getCustomers(),
    ]);
    setUsageCount(count);
    setCustomers(custs);
    setStats({
      total: results.length,
      hot: results.filter(r => r.temperature === 'HOT').length,
      warm: results.filter(r => r.temperature === 'WARM').length,
      cold: results.filter(r => r.temperature === 'COLD').length,
    });
  };

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
        await new Promise<void>(resolve => {
          Alert.prompt(
            '手動入力',
            'OpenAI APIキーが未設定のため商談内容を入力してください。',
            [
              { text: 'キャンセル', onPress: () => resolve(), style: 'cancel' },
              { text: 'OK', onPress: t => { transcript = t ?? ''; resolve(); } },
            ],
            'plain-text'
          );
        });
      }

      if (!transcript.trim()) { setStatusText(''); reset(); return; }

      setStatusText('🤖 AIが分析中...');
      const analysis = await analyzeTranscript(transcript, settings.anthropicApiKey);

      const newCount = await incrementUsage();
      setUsageCount(newCount);

      const result = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        transcript,
        duration,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        ...analysis,
      };

      await saveResult(result);

      if (selectedCustomer) {
        await updateCustomerTemperature(selectedCustomer.id, analysis.temperature);
      }

      setStatusText('');
      reset();
      await loadData();

      router.push({ pathname: '/results', params: { id: result.id } });
    } catch (e: any) {
      setStatusText('');
      Alert.alert('エラー', e.message);
      reset();
    }
  }, [duration, selectedCustomer]);

  const isRecording = state === 'recording';
  const isDisabled = state === 'processing';

  return (
    <ScrollView contentContainerStyle={styles.container} bounces={false}>
      {/* Date & usage */}
      <View style={styles.topRow}>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </Text>
        <UsageBadge used={usageCount} isProUser={isProUser} />
      </View>

      {/* Pipeline dashboard */}
      {stats.total > 0 && (
        <View style={styles.dashboard}>
          <Text style={styles.dashTitle}>パイプライン</Text>
          <View style={styles.dashRow}>
            <View style={[styles.dashCard, styles.dashHot]}>
              <Text style={styles.dashNum}>{stats.hot}</Text>
              <Text style={styles.dashLabel}>🔥 HOT</Text>
            </View>
            <View style={[styles.dashCard, styles.dashWarm]}>
              <Text style={styles.dashNum}>{stats.warm}</Text>
              <Text style={styles.dashLabel}>☀️ WARM</Text>
            </View>
            <View style={[styles.dashCard, styles.dashCold]}>
              <Text style={styles.dashNum}>{stats.cold}</Text>
              <Text style={styles.dashLabel}>❄️ COLD</Text>
            </View>
            <View style={styles.dashCard}>
              <Text style={styles.dashNum}>{stats.total}</Text>
              <Text style={styles.dashLabel}>合計</Text>
            </View>
          </View>
        </View>
      )}

      {/* Customer selector */}
      <TouchableOpacity
        style={styles.customerSelector}
        onPress={() => setShowCustomerPicker(true)}
        disabled={isRecording || isDisabled}
        activeOpacity={0.7}
      >
        <Text style={styles.customerSelectorIcon}>👤</Text>
        <Text style={[styles.customerSelectorText, !selectedCustomer && styles.placeholder]}>
          {selectedCustomer ? `${selectedCustomer.name}（${selectedCustomer.company}）` : 'お客様を選択（任意）'}
        </Text>
        {selectedCustomer && (
          <TouchableOpacity onPress={() => setSelectedCustomer(null)} hitSlop={12}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Record button */}
      <View style={styles.recordArea}>
        <Text style={styles.instruction}>
          {isRecording ? '商談が終わったら停止してください' : '録音ボタンで商談を記録'}
        </Text>

        <Animated.View style={pulseStyle}>
          <TouchableOpacity
            style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
            onPress={handlePress}
            disabled={isDisabled}
            activeOpacity={0.85}
          >
            {isDisabled
              ? <ActivityIndicator color={Colors.warmBrown} size="large" />
              : <Text style={styles.btnIcon}>{isRecording ? '⏹' : '🎙️'}</Text>
            }
          </TouchableOpacity>
        </Animated.View>

        {isRecording && <Text style={styles.timer}>{formattedDuration}</Text>}

        <Text style={styles.btnLabel}>
          {isRecording ? 'タップして停止' : isDisabled ? '処理中...' : '録音開始'}
        </Text>
      </View>

      {statusText ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      ) : null}

      {!isProUser && usageCount >= FREE_TIER_LIMIT - 1 && (
        <TouchableOpacity style={styles.upgradePrompt} onPress={() => router.push('/paywall')}>
          <Text style={styles.upgradeText}>
            {usageCount >= FREE_TIER_LIMIT
              ? '⚠️ 今月の無料枠を使い切りました。プロプランで無制限に。'
              : '⭐ 残り1回！プロプランで無制限に。'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Ruled lines */}
      <View style={styles.lines}>
        {Array.from({ length: 6 }).map((_, i) => <View key={i} style={styles.line} />)}
      </View>

      {/* Customer picker modal */}
      <Modal visible={showCustomerPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
              <Text style={styles.pickerCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>お客様を選択</Text>
            <TouchableOpacity onPress={() => { setSelectedCustomer(null); setShowCustomerPicker(false); }}>
              <Text style={styles.pickerClear}>選択解除</Text>
            </TouchableOpacity>
          </View>
          {customers.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Text style={styles.pickerEmptyText}>まだ顧客が登録されていません</Text>
              <TouchableOpacity onPress={() => { setShowCustomerPicker(false); router.push('/(tabs)/customers'); }}>
                <Text style={styles.pickerAddLink}>顧客タブで追加する →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={customers}
              keyExtractor={c => c.id}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, selectedCustomer?.id === item.id && styles.pickerItemSelected]}
                  onPress={() => { setSelectedCustomer(item); setShowCustomerPicker(false); }}
                >
                  <View style={styles.pickerAvatar}>
                    <Text style={styles.pickerAvatarText}>{item.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName}>{item.name}</Text>
                    {item.company ? <Text style={styles.pickerCompany}>{item.company}</Text> : null}
                  </View>
                  {selectedCustomer?.id === item.id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 16, backgroundColor: Colors.cream },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  date: { fontSize: 13, color: Colors.warmBrown, letterSpacing: 0.3 },
  dashboard: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.lineColor,
    gap: 8,
  },
  dashTitle: { fontSize: 12, fontWeight: '600', color: Colors.warmBrown, letterSpacing: 1 },
  dashRow: { flexDirection: 'row', gap: 8 },
  dashCard: {
    flex: 1, backgroundColor: 'rgba(196,149,106,0.08)',
    borderRadius: 8, padding: 10, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: Colors.lineColor,
  },
  dashHot: { borderColor: Colors.hot + '33', backgroundColor: Colors.hot + '08' },
  dashWarm: { borderColor: Colors.warm + '33', backgroundColor: Colors.warm + '08' },
  dashCold: { borderColor: Colors.cold + '33', backgroundColor: Colors.cold + '08' },
  dashNum: { fontSize: 22, fontWeight: '700', color: Colors.darkBrown },
  dashLabel: { fontSize: 10, color: Colors.warmBrown },
  customerSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.lineColor,
  },
  customerSelectorIcon: { fontSize: 18 },
  customerSelectorText: { flex: 1, fontSize: 14, color: Colors.ink },
  placeholder: { color: Colors.lightBrown },
  clearBtn: { fontSize: 14, color: Colors.lightBrown, paddingHorizontal: 4 },
  recordArea: { alignItems: 'center', paddingVertical: 8, gap: 14 },
  instruction: { fontSize: 14, color: Colors.warmBrown, fontStyle: 'italic', textAlign: 'center' },
  recordBtn: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 4, borderColor: Colors.warmBrown,
    backgroundColor: Colors.cream,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.darkBrown, shadowOpacity: 0.2,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  recordBtnActive: {
    borderColor: Colors.hot, shadowColor: Colors.hot, shadowOpacity: 0.4,
  },
  btnIcon: { fontSize: 48 },
  timer: { fontSize: 28, fontWeight: '700', color: Colors.hot, letterSpacing: 4 },
  btnLabel: { fontSize: 14, fontWeight: '500', color: Colors.ink, letterSpacing: 0.5 },
  statusBox: {
    backgroundColor: 'rgba(139,94,60,0.08)', borderRadius: 8,
    padding: 12, alignItems: 'center',
  },
  statusText: { fontSize: 14, color: Colors.warmBrown, fontStyle: 'italic' },
  upgradePrompt: {
    backgroundColor: 'rgba(192,57,43,0.08)', borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: 'rgba(192,57,43,0.2)',
  },
  upgradeText: { fontSize: 13, color: Colors.hot, textAlign: 'center', lineHeight: 20 },
  lines: { gap: 0, marginTop: 4 },
  line: { height: 1, backgroundColor: Colors.lineColor, marginBottom: 31 },
  pickerModal: { flex: 1, backgroundColor: Colors.cream },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.lineColor,
  },
  pickerCancel: { fontSize: 15, color: Colors.warmBrown },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: Colors.darkBrown },
  pickerClear: { fontSize: 13, color: Colors.lightBrown },
  pickerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  pickerEmptyText: { fontSize: 15, color: Colors.warmBrown },
  pickerAddLink: { fontSize: 14, color: Colors.warmBrown, textDecorationLine: 'underline' },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.lineColor,
  },
  pickerItemSelected: { borderColor: Colors.warmBrown, backgroundColor: 'rgba(139,94,60,0.06)' },
  pickerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.lightBrown, alignItems: 'center', justifyContent: 'center',
  },
  pickerAvatarText: { fontSize: 18, color: Colors.cream, fontWeight: '700' },
  pickerName: { fontSize: 15, fontWeight: '600', color: Colors.ink },
  pickerCompany: { fontSize: 12, color: Colors.warmBrown },
  checkmark: { fontSize: 18, color: Colors.warmBrown, fontWeight: '700' },
});
