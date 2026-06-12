import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getSettings } from '../hooks/useStorage';
import { chatWithCoach } from '../services/anthropicService';
import { Colors, Gradients } from '../constants/theme';

type Message = { id: string; role: 'user' | 'assistant'; text: string };

const STARTERS = [
  'HOT率を上げるには？',
  '断られた後のフォロー方法',
  '商談のクロージングが苦手',
  '今月の振り返りをしたい',
];

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', text: 'こんにちは！AIコーチです。営業の悩みや質問を何でも聞かせてください。あなたの成長をサポートします💪' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const s = await getSettings();
      const history = messages.concat(userMsg).map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));
      const reply = await chatWithCoach(history, s.anthropicApiKey);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: `エラー: ${e.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, loading]);

  const renderMsg = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <LinearGradient colors={Gradients.gold} style={styles.coachAvatar}>
            <Text style={styles.coachAvatarText}>AI</Text>
          </LinearGradient>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {/* Header */}
      <LinearGradient colors={Gradients.hero} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🤖 AIコーチ</Text>
          <Text style={styles.headerSub}>育てる営業コーチ</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMsg}
        contentContainerStyle={styles.msgList}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={loading ? (
          <View style={styles.loadingRow}>
            <LinearGradient colors={Gradients.gold} style={styles.coachAvatar}>
              <Text style={styles.coachAvatarText}>AI</Text>
            </LinearGradient>
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <ActivityIndicator color={Colors.gold} size="small" />
            </View>
          </View>
        ) : null}
      />

      {/* Quick starters */}
      {messages.length <= 1 && (
        <View style={styles.starterRow}>
          {STARTERS.map(s => (
            <TouchableOpacity key={s} style={styles.starterChip} onPress={() => send(s)}>
              <Text style={styles.starterText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          value={input}
          onChangeText={setInput}
          placeholder="メッセージを入力…"
          placeholderTextColor={Colors.w20}
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || loading}
          activeOpacity={0.8}
        >
          <LinearGradient colors={Gradients.gold} style={styles.sendGrad}>
            <Text style={styles.sendIcon}>▶</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 26, color: Colors.w60, lineHeight: 30 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.w100 },
  headerSub: { fontSize: 10, color: Colors.w40 },
  msgList: { padding: 16, gap: 12, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },
  coachAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  coachAvatarText: { fontSize: 10, fontWeight: '900', color: Colors.navy },
  bubble: { maxWidth: '76%', borderRadius: 16, padding: 12 },
  bubbleUser: { backgroundColor: 'rgba(200,168,75,0.18)', borderTopRightRadius: 4 },
  bubbleAssistant: { backgroundColor: Colors.w04, borderTopLeftRadius: 4, borderWidth: 1, borderColor: Colors.w08 },
  bubbleText: { fontSize: 14, color: Colors.w60, lineHeight: 22 },
  bubbleTextUser: { color: Colors.gold2 },
  loadingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  starterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  starterChip: { backgroundColor: Colors.w04, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(200,168,75,0.3)' },
  starterText: { fontSize: 12, color: Colors.gold },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: Colors.w08 },
  inputField: { flex: 1, backgroundColor: Colors.w04, borderRadius: 14, padding: 12, fontSize: 14, color: Colors.w100, borderWidth: 1, borderColor: Colors.w08, maxHeight: 120 },
  sendBtn: { borderRadius: 22, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.4 },
  sendGrad: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { fontSize: 16, color: Colors.navy, fontWeight: '700' },
});
