import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isOnboarded } from '../hooks/useStorage';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      const done = await isOnboarded();
      if (!done) {
        router.replace('/onboarding');
      }
    })();
  }, []);

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
          options={{ title: '分析結果', presentation: 'card' }}
        />
        <Stack.Screen
          name="paywall"
          options={{ title: 'プランのアップグレード', presentation: 'modal' }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="customer-detail"
          options={{ title: '顧客詳細', presentation: 'card' }}
        />
      </Stack>
    </>
  );
}
