import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Temperature } from '../types';
import { Colors } from '../constants/theme';

const CONFIG: Record<Temperature, { gradient: [string, string]; label: string; emoji: string }> = {
  HOT: { gradient: ['#e74c3c', '#c0392b'], label: 'HOT', emoji: '🔥' },
  WARM: { gradient: ['#f39c12', '#e67e22'], label: 'WARM', emoji: '☀️' },
  COLD: { gradient: ['#3498db', '#2980b9'], label: 'COLD', emoji: '❄️' },
};

interface Props {
  temperature: Temperature;
  reason?: string;
}

export function TemperatureBadge({ temperature, reason }: Props) {
  const config = CONFIG[temperature];
  return (
    <View style={styles.container}>
      <LinearGradient colors={config.gradient} style={styles.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.emoji}>{config.emoji}</Text>
        <Text style={styles.label}>{config.label}</Text>
      </LinearGradient>
      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  emoji: { fontSize: 24 },
  label: { fontSize: 28, fontWeight: '700', color: Colors.white, letterSpacing: 4 },
  reason: {
    fontSize: 13,
    color: Colors.warmBrown,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});
