import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisResult, Customer, UserSettings, UsageData } from '../types';

const KEYS = {
  RESULTS: 'analysis_results',
  SETTINGS: 'user_settings',
  USAGE: 'usage_data',
  CUSTOMERS: 'customers',
  ONBOARDED: 'onboarded',
} as const;

// --- Results ---
export async function saveResult(result: AnalysisResult): Promise<void> {
  const existing = await getResults();
  const updated = [result, ...existing].slice(0, 50);
  await AsyncStorage.setItem(KEYS.RESULTS, JSON.stringify(updated));
}

export async function getResults(): Promise<AnalysisResult[]> {
  const raw = await AsyncStorage.getItem(KEYS.RESULTS);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteResult(id: string): Promise<void> {
  const existing = await getResults();
  const updated = existing.filter(r => r.id !== id);
  await AsyncStorage.setItem(KEYS.RESULTS, JSON.stringify(updated));
}

// --- Settings ---
export async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  const current = await getSettings();
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
}

export async function getSettings(): Promise<UserSettings> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  return raw ? JSON.parse(raw) : { anthropicApiKey: '', openaiApiKey: '' };
}

// --- Usage (free tier) ---
export async function getUsageThisMonth(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.USAGE);
  const data: UsageData = raw ? JSON.parse(raw) : { month: '', count: 0 };
  const thisMonth = new Date().toISOString().slice(0, 7);
  return data.month === thisMonth ? data.count : 0;
}

export async function incrementUsage(): Promise<number> {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const raw = await AsyncStorage.getItem(KEYS.USAGE);
  const data: UsageData = raw ? JSON.parse(raw) : { month: '', count: 0 };
  const count = data.month === thisMonth ? data.count + 1 : 1;
  await AsyncStorage.setItem(KEYS.USAGE, JSON.stringify({ month: thisMonth, count }));
  return count;
}

// --- Customers ---
export async function getCustomers(): Promise<Customer[]> {
  const raw = await AsyncStorage.getItem(KEYS.CUSTOMERS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCustomer(customer: Customer): Promise<void> {
  const existing = await getCustomers();
  const idx = existing.findIndex(c => c.id === customer.id);
  const updated = idx >= 0
    ? existing.map(c => c.id === customer.id ? customer : c)
    : [customer, ...existing];
  await AsyncStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(updated));
}

export async function deleteCustomer(id: string): Promise<void> {
  const existing = await getCustomers();
  await AsyncStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(existing.filter(c => c.id !== id)));
}

export async function updateCustomerTemperature(customerId: string, temperature: import('../types').Temperature): Promise<void> {
  const customers = await getCustomers();
  const updated = customers.map(c =>
    c.id === customerId
      ? { ...c, latestTemperature: temperature, lastContactedAt: new Date().toISOString() }
      : c
  );
  await AsyncStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(updated));
}

// --- Onboarding ---
export async function isOnboarded(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEYS.ONBOARDED);
  return v === 'true';
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDED, 'true');
}
