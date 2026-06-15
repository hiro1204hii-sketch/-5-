import React from 'react';
import { Tabs, router } from 'expo-router';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients } from '../../constants/theme';

function RecordFAB() {
  return (
    <TouchableOpacity onPress={() => router.push('/record')} activeOpacity={0.85}>
      <LinearGradient
        colors={Gradients.gold}
        style={styles.fab}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Ionicons name="mic" size={24} color={Colors.navy} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600', marginTop: 2 },
        headerStyle: { backgroundColor: Colors.bg, borderBottomWidth: 0 } as any,
        headerTintColor: Colors.w100,
        headerTitleStyle: { fontWeight: '700', color: Colors.w100 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index"     options={{ title: 'ホーム', headerTitle: '育てる営業手帳', tabBarIcon: ({ color, size }) => <Ionicons name="home"        color={color} size={size} /> }} />
      <Tabs.Screen name="customers" options={{ title: '顧客',   headerTitle: '顧客管理',       tabBarIcon: ({ color, size }) => <Ionicons name="people"      color={color} size={size} /> }} />
      <Tabs.Screen name="record-tab" options={{ title: '', tabBarButton: () => <RecordFAB /> }} />
      <Tabs.Screen name="report"    options={{ title: 'レポート', headerTitle: '営業レポート',   tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart"   color={color} size={size} /> }} />
      <Tabs.Screen name="menu"      options={{ title: 'メニュー', headerTitle: 'メニュー',      tabBarIcon: ({ color, size }) => <Ionicons name="menu"        color={color} size={size} /> }} />
      {/* hidden from tab bar */}
      <Tabs.Screen name="history"   options={{ href: null }} />
      <Tabs.Screen name="settings"  options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(10,13,26,0.97)',
    borderTopColor: 'rgba(200,168,75,0.15)',
    borderTopWidth: 1,
    height: 68,
    paddingBottom: 10,
    paddingTop: 6,
  },
  fab: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -18,
    shadowColor: '#C8A84B', shadowOpacity: 0.5,
    shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
