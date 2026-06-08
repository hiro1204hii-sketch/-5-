import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.darkBrown },
          headerTintColor: Colors.cream,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="results"
          options={{
            title: '分析結果',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            title: 'プランのアップグレード',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}
