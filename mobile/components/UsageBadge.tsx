import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FREE_TIER_LIMIT } from '../constants/theme';

interface Props { used: number; isProUser: boolean }

export function UsageBadge({ used, isProUser }: Props) {
  if (isProUser) {
    return (
      <View style={[styles.pill, styles.pro]}>
        <Text style={[styles.text, styles.proText]}>✨ PRO</Text>
      </View>
    );
  }
  const remaining = Math.max(0, FREE_TIER_LIMIT - used);
  const low = remaining <= 1;
  return (
    <View style={[styles.pill, low ? styles.low : styles.normal]}>
      <Text style={[styles.text, low ? styles.lowText : styles.normalText]}>
        残り {remaining}/{FREE_TIER_LIMIT}回
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  pro:    { backgroundColor: 'rgba(200,168,75,0.15)', borderWidth: 1, borderColor: 'rgba(200,168,75,0.3)' },
  normal: { backgroundColor: Colors.w08 },
  low:    { backgroundColor: 'rgba(255,82,82,0.15)', borderWidth: 1, borderColor: 'rgba(255,82,82,0.3)' },
  text: { fontSize: 11, fontWeight: '600' },
  proText:    { color: Colors.gold2 },
  normalText: { color: Colors.w60 },
  lowText:    { color: Colors.hot },
});
