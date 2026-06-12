import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients, Colors } from '../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'gold' | 'ghost' | 'danger';
}

export function GoldButton({ label, onPress, loading, disabled, style, variant = 'gold' }: Props) {
  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        style={[styles.ghost, style]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
      >
        <Text style={styles.ghostText}>{label}</Text>
      </TouchableOpacity>
    );
  }
  if (variant === 'danger') {
    return (
      <TouchableOpacity
        style={[styles.danger, style]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
      >
        <Text style={styles.ghostText}>{label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.wrap, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      <LinearGradient colors={Gradients.gold} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {loading
          ? <ActivityIndicator color={Colors.navy} />
          : <Text style={styles.goldText}>{label}</Text>
        }
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden', shadowColor: '#C8A84B', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  gradient: { paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center' },
  goldText: { fontSize: 15, fontWeight: '700', color: '#0A0D1A', letterSpacing: 0.5 },
  ghost: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 14, alignItems: 'center' },
  danger: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,82,82,0.35)', paddingVertical: 14, alignItems: 'center' },
  ghostText: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
});
