import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isOnboarded } from '../hooks/useStorage';
import { Colors } from '../constants/theme';

const HDR = { backgroundColor: Colors.bg, borderBottomWidth: 0 } as const;

export default function RootLayout() {
  useEffect(() => {
    isOnboarded().then(done => { if (!done) router.replace('/onboarding'); });
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: HDR, headerTintColor: Colors.w100, headerTitleStyle: { fontWeight: '700', color: Colors.w100 }, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Screen name="(tabs)"         options={{ headerShown: false }} />
        <Stack.Screen name="onboarding"     options={{ headerShown: false }} />
        <Stack.Screen name="record"         options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="results"        options={{ title: '分析結果' }} />
        <Stack.Screen name="customer-detail" options={{ title: '顧客詳細' }} />
        <Stack.Screen name="pipeline"       options={{ title: '案件パイプライン' }} />
        <Stack.Screen name="reminders"      options={{ title: 'フォローリマインド' }} />
        <Stack.Screen name="coach"          options={{ title: 'AI営業コーチ' }} />
        <Stack.Screen name="activity"       options={{ title: '活動履歴' }} />
        <Stack.Screen name="paywall"        options={{ title: 'プランのアップグレード', presentation: 'modal' }} />
        <Stack.Screen name="settings"       options={{ title: '設定' }} />
      </Stack>
    </>
  );
}
