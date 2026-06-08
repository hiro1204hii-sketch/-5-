import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.cream,
        tabBarInactiveTintColor: 'rgba(250,246,240,0.5)',
        tabBarStyle: {
          backgroundColor: Colors.darkBrown,
          borderTopColor: Colors.warmBrown,
          borderTopWidth: 1,
        },
        headerStyle: { backgroundColor: Colors.darkBrown },
        headerTintColor: Colors.cream,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '録音',
          headerTitle: '📓 育てる営業手帳',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '履歴',
          headerTitle: '📚 商談履歴',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          headerTitle: '⚙️ 設定',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
