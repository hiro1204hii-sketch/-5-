import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FREE_TIER_LIMIT } from '../constants/theme';

interface Props {
  used: number;
  isProUser: boolean;
}

export function UsageBadge({ used, isProUser }: Props) {
  if (isProUser) {
    return (
      <View style={[styles.container, styles.pro]}>
        <Text style={styles.proText}>✨ PROプラン</Text>
      </View>
    );
  }

  const remaining = Math.max(0, FREE_TIER_LIMIT - used);
  const isLow = remaining <= 1;

  return (
    <View style={[styles.container, isLow ? styles.low : styles.normal]}>
      <Text style={[styles.text, isLow ? styles.lowText : styles.normalText]}>
        今月の残り: {remaining}/{FREE_TIER_LIMIT}回
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'center',
  },
  pro: { backgroundColor: Colors.darkBrown },
  normal: { backgroundColor: 'rgba(139,94,60,0.12)' },
  low: { backgroundColor: 'rgba(192,57,43,0.12)' },
  proText: { fontSize: 12, fontWeight: '600', color: Colors.cream },
  text: { fontSize: 12 },
  normalText: { color: Colors.warmBrown },
  lowText: { color: Colors.hot, fontWeight: '600' },
});
