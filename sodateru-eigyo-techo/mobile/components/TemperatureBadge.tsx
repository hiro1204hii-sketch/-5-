import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Temperature } from '../types';
import { Gradients } from '../constants/theme';

const CFG: Record<Temperature, { grad: [string,string]; emoji: string; label: string }> = {
  HOT:  { grad: Gradients.hot,  emoji: '🔥', label: 'HOT'  },
  WARM: { grad: Gradients.warm, emoji: '☀️', label: 'WARM' },
  COLD: { grad: Gradients.cold, emoji: '❄️', label: 'COLD' },
};

interface Props { temperature: Temperature; reason?: string; size?: 'sm' | 'md' | 'lg' }

export function TemperatureBadge({ temperature, reason, size = 'md' }: Props) {
  const { grad, emoji, label } = CFG[temperature];
  const isLg = size === 'lg';
  const isSm = size === 'sm';
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={grad}
        style={[styles.badge, isLg && styles.badgeLg, isSm && styles.badgeSm]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.emoji, isLg && { fontSize: 22 }, isSm && { fontSize: 12 }]}>{emoji}</Text>
        <Text style={[styles.label, isLg && { fontSize: 24, letterSpacing: 5 }, isSm && { fontSize: 10, letterSpacing: 2 }]}>{label}</Text>
      </LinearGradient>
      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 40,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  badgeLg: { paddingHorizontal: 36, paddingVertical: 14 },
  badgeSm: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, gap: 4 },
  emoji:  { fontSize: 18 },
  label:  { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  reason: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 20, lineHeight: 20 },
});
