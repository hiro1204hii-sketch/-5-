import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Colors } from '../constants/theme';

interface Props {
  icon: string;
  title: string;
  body: string;
}

export function ResultCard({ icon, title, body }: Props) {
  const [expanded, setExpanded] = useState(true);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.body}>
          <Text style={styles.bodyText}>{body}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.lineColor,
    overflow: 'hidden',
    shadowColor: Colors.darkBrown,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lineColor,
    backgroundColor: 'rgba(196,149,106,0.08)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.darkBrown },
  chevron: { fontSize: 10, color: Colors.lightBrown },
  body: { padding: 16 },
  bodyText: {
    fontSize: 14,
    color: Colors.ink,
    lineHeight: 24,
  },
});
