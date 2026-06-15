import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
  FlatList, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useRecording } from '../hooks/useRecording';
import { useSubscription } from '../hooks/useSubscription';
import {
  getSettings, getUsageThisMonth, incrementUsage, saveResult,
  getCustomers, updateCustomerTemperature, addActivity,
} from '../hooks/useStorage';
import { transcribeAudio } from '../services/transcriptionService';
import { analyzeTranscript } from '../services/anthropicService';
import { UsageBadge } from '../components/UsageBadge';
import { GoldButton } from '../components/GoldButton';
import { Colors, Gradients, FREE_TIER_LIMIT } from '../constants/theme';
import { Customer } from '../types';

export default function RecordScreen() {
  const { state, duration, formattedDuration, startRecording, stopRecording, reset } = useRecording();
  const { isProUser } = useSubscription();
  const [usageCount, setUsageCount] = useState(0);
  const [status, setStatus] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [preMemo, setPreMemo] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }], opacity: pulseOpacity.value }));

  useEffect(() => {
    Promise.all([getUsageThisMonth(), getCustomers()]).then(([c, custs]) => {
      setUsageCount(c); setCustomers(custs);
    });
  }, []);

  useEffect(() => {
    if (state === 'recording') {
      pulseScale.value = withRepeat(withSequence(withTiming(1.1, { duration: 800 }), withTiming(1, { duration: 800 })), -1, true);
    } else {
      pulseScale.value = withTiming(1); pulseOpacity.value = withTiming(1);
    }
  }, [state]);

  const handleStart = useCallback(async () => {
    if (!isProUser && usageCount >= FREE_TIER_LIMIT) { router.push('/paywall'); return; }
    const s = await getSettings();
    if (!s.anthropicApiKey) { Alert.alert('APIキー未設定', '設定からAnthropicのAPIキーを入力してください。'); return; }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try { await startRecording(); setStatus('🔴 録音中…'); } catch (e: any) { Alert.alert('エラー', e.message); }
  }, [isProUser, usageCount]);

  const handleStop = useCallback(async () => {
    setStatus('');
    try {
      const uri = await stopRecording();
      if (!uri) return;
      await processAudio(uri, duration);
      reset();
    } catch (e: any) {
      setStatus(''); Alert.alert('エラー', e.message); reset();
    }
  }, [duration, processAudio]);

  // Process a given audio URI (shared by handleStop + handleImport)
  const processAudio = useCallback(async (uri: string, fileDuration: number) => {
    const s = await getSettings();
    if (!s.anthropicApiKey) { Alert.alert('APIキー未設定', '設定からAnthropicのAPIキーを入力してください。'); return; }
    if (!isProUser && usageCount >= FREE_TIER_LIMIT) { router.push('/paywall'); return; }

    setStatus('🎤 文字起こし中…');
    let transcript = '';
    try {
      if (s.openaiApiKey) {
        transcript = await transcribeAudio(uri, s.openaiApiKey);
      } else {
        await new Promise<void>(resolve => {
          Alert.prompt('手動入力', '商談内容を入力してください（OpenAI APIキー未設定）', [
            { text: 'キャンセル', onPress: () => resolve(), style: 'cancel' },
            { text: 'OK', onPress: t => { transcript = t ?? ''; resolve(); } },
          ], 'plain-text');
        });
      }
      if (!transcript.trim()) { setStatus(''); return; }

      setStatus('🤖 AIが分析中…');
      const analysis = await analyzeTranscript(transcript, s.anthropicApiKey);
      const newCount = await incrementUsage();
      setUsageCount(newCount);

      const result = {
        id: Date.now().toString(), date: new Date().toISOString(),
        transcript, duration: fileDuration,
        customerId: selected?.id, customerName: selected?.name, ...analysis,
      };
      await saveResult(result);
      if (selected) await updateCustomerTemperature(selected.id, analysis.temperature);
      await addActivity({
        id: Date.now().toString(), type: 'recording', date: new Date().toISOString(),
        customerId: selected?.id, customerName: selected?.name,
        summary: analysis.minutes.split('\n')[0] || '商談録音',
        temperature: analysis.temperature, analysisId: result.id,
      });

      setStatus('');
      router.replace({ pathname: '/results', params: { id: result.id } });
    } catch (e: any) {
      setStatus(''); Alert.alert('エラー', e.message);
    }
  }, [isProUser, usageCount, selected]);

  const handleImport = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'public.audio'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const { uri } = res.assets[0];
      await processAudio(uri, 0);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    }
  }, [processAudio]);

  const isRec = state === 'recording';
  const isProc = state === 'processing';

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient colors={Gradients.hero} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>商談を記録する</Text>
        <UsageBadge used={usageCount} isProUser={isProUser} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Customer picker */}
        <TouchableOpacity style={styles.customerPicker} onPress={() => setShowPicker(true)} disabled={isRec || isProc}>
          <Text style={styles.pickerIcon}>👤</Text>
          <Text style={[styles.pickerText, !selected && styles.placeholder]}>
            {selected ? `${selected.name}（${selected.company}）` : 'お客様を選択（任意）'}
          </Text>
          {selected ? (
            <TouchableOpacity onPress={() => setSelected(null)} hitSlop={12}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.chevron}>›</Text>
          )}
        </TouchableOpacity>

        {/* Pre-memo */}
        {!isRec && (
          <View style={styles.memoBox}>
            <Text style={styles.memoLabel}>事前メモ（任意）</Text>
            <TextInput
              style={styles.memoInput}
              value={preMemo}
              onChangeText={setPreMemo}
              placeholder="課題・前回の続き・確認したいこと…"
              placeholderTextColor={Colors.w20}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* Record button */}
        <View style={styles.recordArea}>
          {isRec && <Text style={styles.recordHint}>商談が終わったら停止してください</Text>}
          {!isRec && !isProc && <Text style={styles.recordHint}>マイクをタップして録音開始</Text>}

          <Animated.View style={animStyle}>
            <TouchableOpacity
              style={[styles.recordBtn, isRec && styles.recordBtnActive]}
              onPress={isRec ? handleStop : handleStart}
              disabled={isProc}
              activeOpacity={0.85}
            >
              {isProc
                ? <ActivityIndicator color={Colors.gold} size="large" />
                : <Text style={styles.recordBtnIcon}>{isRec ? '⏹' : '🎙'}</Text>
              }
            </TouchableOpacity>
          </Animated.View>

          {isRec && <Text style={styles.timer}>{formattedDuration}</Text>}
          <Text style={styles.recordLabel}>
            {isProc ? '処理中…' : isRec ? 'タップして停止' : '録音開始'}
          </Text>
        </View>

        {status ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}

        {/* Import from files */}
        {!isRec && !isProc && (
          <TouchableOpacity style={styles.importBtn} onPress={handleImport} activeOpacity={0.8}>
            <Text style={styles.importIcon}>📂</Text>
            <View>
              <Text style={styles.importLabel}>録音ファイルから取り込む</Text>
              <Text style={styles.importSub}>ボイスメモ・録音アプリのファイルを使用</Text>
            </View>
          </TouchableOpacity>
        )}

        {!isProUser && usageCount >= FREE_TIER_LIMIT - 1 && (
          <TouchableOpacity style={styles.upgradeBanner} onPress={() => router.push('/paywall')}>
            <Text style={styles.upgradeBannerText}>
              {usageCount >= FREE_TIER_LIMIT ? '⚠️ 今月の無料枠を使い切りました' : '⭐ 残り1回！プロプランで無制限に'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Customer picker modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHd}>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>お客様を選択</Text>
            <TouchableOpacity onPress={() => { setSelected(null); setShowPicker(false); }}>
              <Text style={styles.modalClear}>選択解除</Text>
            </TouchableOpacity>
          </View>
          {customers.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Text style={styles.pickerEmptyText}>顧客タブで追加してください</Text>
            </View>
          ) : (
            <FlatList
              data={customers}
              keyExtractor={c => c.id}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, selected?.id === item.id && styles.pickerItemSel]}
                  onPress={() => { setSelected(item); setShowPicker(false); }}
                >
                  <LinearGradient colors={Gradients.gold} style={styles.pickerAvatar}>
                    <Text style={styles.pickerAvatarText}>{item.name.charAt(0)}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName}>{item.name}</Text>
                    <Text style={styles.pickerCompany}>{item.company}</Text>
                  </View>
                  {selected?.id === item.id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create;
const styles = S({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: Colors.w60 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.w100 },
  body: { padding: 20, gap: 16, paddingBottom: 48 },
  customerPicker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.w04, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.w08,
  },
  pickerIcon: { fontSize: 20 },
  pickerText: { flex: 1, fontSize: 14, color: Colors.w100 },
  placeholder: { color: Colors.w40 },
  clearIcon: { fontSize: 14, color: Colors.w40, paddingHorizontal: 4 },
  chevron: { fontSize: 18, color: Colors.w40 },
  memoBox: { gap: 8 },
  memoLabel: { fontSize: 12, fontWeight: '600', color: Colors.w40, letterSpacing: 0.5 },
  memoInput: {
    backgroundColor: Colors.w04, borderRadius: 14, padding: 14,
    fontSize: 13, color: Colors.w100, borderWidth: 1, borderColor: Colors.w08,
    minHeight: 80, textAlignVertical: 'top',
  },
  recordArea: { alignItems: 'center', paddingVertical: 16, gap: 16 },
  recordHint: { fontSize: 13, color: Colors.w40, fontStyle: 'italic' },
  recordBtn: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.w04,
    borderWidth: 2.5, borderColor: 'rgba(200,168,75,0.4)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.gold, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  recordBtnActive: { borderColor: Colors.hot, shadowColor: Colors.hot, shadowOpacity: 0.5 },
  recordBtnIcon: { fontSize: 50 },
  timer: { fontSize: 32, fontWeight: '900', color: Colors.hot, letterSpacing: 6 },
  recordLabel: { fontSize: 13, fontWeight: '600', color: Colors.w60, letterSpacing: 0.5 },
  statusBox: { backgroundColor: Colors.w04, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.w08, alignItems: 'center' },
  statusText: { fontSize: 14, color: Colors.gold, fontStyle: 'italic' },
  upgradeBanner: { backgroundColor: 'rgba(255,82,82,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)' },
  upgradeBannerText: { fontSize: 13, color: Colors.hot, textAlign: 'center', lineHeight: 20 },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: Colors.w08 },
  modalCancel: { fontSize: 15, color: Colors.w60 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.w100 },
  modalClear: { fontSize: 13, color: Colors.w40 },
  pickerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pickerEmptyText: { fontSize: 15, color: Colors.w40 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.w04, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.w08 },
  pickerItemSel: { borderColor: 'rgba(200,168,75,0.4)', backgroundColor: 'rgba(200,168,75,0.06)' },
  pickerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pickerAvatarText: { fontSize: 18, fontWeight: '700', color: Colors.navy },
  pickerName: { fontSize: 15, fontWeight: '600', color: Colors.w100 },
  pickerCompany: { fontSize: 11, color: Colors.w40, marginTop: 1 },
  checkmark: { fontSize: 18, color: Colors.gold, fontWeight: '700' },
  importBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.w04, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.w08,
  },
  importIcon: { fontSize: 28 },
  importLabel: { fontSize: 14, fontWeight: '600', color: Colors.w100 },
  importSub: { fontSize: 11, color: Colors.w40, marginTop: 2 },
});
