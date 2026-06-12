import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../constants/theme';

interface Props {
  icon?: string;
  title?: string;
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  goldBorder?: boolean;
  collapsible?: boolean;
}

export function NavyCard({ icon, title, children, onPress, style, goldBorder, collapsible }: Props) {
  const [expanded, setExpanded] = React.useState(true);

  const content = (
    <View style={[styles.card, goldBorder && styles.goldBorder, style]}>
      {(icon || title) && (
        <TouchableOpacity
          style={styles.header}
          onPress={collapsible ? () => setExpanded(e => !e) : undefined}
          activeOpacity={collapsible ? 0.7 : 1}
        >
          <View style={styles.headerLeft}>
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
          </View>
          {collapsible && <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>}
        </TouchableOpacity>
      )}
      {(!collapsible || expanded) && (
        <View style={styles.body}>{children}</View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.w04,
    borderWidth: 1,
    borderColor: Colors.w08,
    borderRadius: 14,
    overflow: 'hidden',
  },
  goldBorder: {
    borderColor: 'rgba(200,168,75,0.25)',
    backgroundColor: 'rgba(200,168,75,0.04)',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.w08,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 16 },
  title: { fontSize: 13, fontWeight: '700', color: Colors.w100 },
  chevron: { fontSize: 9, color: Colors.w40 },
  body: { padding: 14 },
});
