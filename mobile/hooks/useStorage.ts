import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AnalysisResult, Customer, UserSettings, UsageData,
  Deal, Reminder, ActivityEntry, GamificationData, Temperature,
} from '../types';

const K = {
  RESULTS:    'analysis_results',
  SETTINGS:   'user_settings',
  USAGE:      'usage_data',
  CUSTOMERS:  'customers',
  DEALS:      'deals',
  REMINDERS:  'reminders',
  ACTIVITY:   'activity',
  GAMIF:      'gamification',
  ONBOARDED:  'onboarded',
} as const;

// ── Generic helpers ─────────────────────────────
async function getList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}
async function setList<T>(key: string, list: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

// ── Results ──────────────────────────────────────
export const saveResult = async (r: AnalysisResult) => {
  const list = await getList<AnalysisResult>(K.RESULTS);
  await setList(K.RESULTS, [r, ...list].slice(0, 100));
};
export const getResults = () => getList<AnalysisResult>(K.RESULTS);
export const deleteResult = async (id: string) => {
  const list = await getResults();
  await setList(K.RESULTS, list.filter(r => r.id !== id));
};

// ── Settings ─────────────────────────────────────
export const getSettings = async (): Promise<UserSettings> => {
  const raw = await AsyncStorage.getItem(K.SETTINGS);
  return raw ? JSON.parse(raw) : { anthropicApiKey: '', openaiApiKey: '' };
};
export const saveSettings = async (s: Partial<UserSettings>) => {
  const cur = await getSettings();
  await AsyncStorage.setItem(K.SETTINGS, JSON.stringify({ ...cur, ...s }));
};

// ── Usage ────────────────────────────────────────
export const getUsageThisMonth = async (): Promise<number> => {
  const raw = await AsyncStorage.getItem(K.USAGE);
  const d: UsageData = raw ? JSON.parse(raw) : { month: '', count: 0 };
  const m = new Date().toISOString().slice(0, 7);
  return d.month === m ? d.count : 0;
};
export const incrementUsage = async (): Promise<number> => {
  const m = new Date().toISOString().slice(0, 7);
  const raw = await AsyncStorage.getItem(K.USAGE);
  const d: UsageData = raw ? JSON.parse(raw) : { month: '', count: 0 };
  const count = d.month === m ? d.count + 1 : 1;
  await AsyncStorage.setItem(K.USAGE, JSON.stringify({ month: m, count }));
  return count;
};

// ── Customers ────────────────────────────────────
export const getCustomers = () => getList<Customer>(K.CUSTOMERS);
export const saveCustomer = async (c: Customer) => {
  const list = await getCustomers();
  const idx = list.findIndex(x => x.id === c.id);
  await setList(K.CUSTOMERS, idx >= 0 ? list.map(x => x.id === c.id ? c : x) : [c, ...list]);
};
export const deleteCustomer = async (id: string) => {
  const list = await getCustomers();
  await setList(K.CUSTOMERS, list.filter(c => c.id !== id));
};
export const updateCustomerTemperature = async (id: string, t: Temperature) => {
  const list = await getCustomers();
  await setList(K.CUSTOMERS, list.map(c =>
    c.id === id ? { ...c, latestTemperature: t, lastContactedAt: new Date().toISOString() } : c
  ));
};

// ── Deals ────────────────────────────────────────
export const getDeals = () => getList<Deal>(K.DEALS);
export const saveDeal = async (d: Deal) => {
  const list = await getDeals();
  const idx = list.findIndex(x => x.id === d.id);
  await setList(K.DEALS, idx >= 0 ? list.map(x => x.id === d.id ? d : x) : [d, ...list]);
};
export const deleteDeal = async (id: string) => {
  const list = await getDeals();
  await setList(K.DEALS, list.filter(d => d.id !== id));
};

// ── Reminders ────────────────────────────────────
export const getReminders = () => getList<Reminder>(K.REMINDERS);
export const saveReminder = async (r: Reminder) => {
  const list = await getReminders();
  const idx = list.findIndex(x => x.id === r.id);
  await setList(K.REMINDERS, idx >= 0 ? list.map(x => x.id === r.id ? r : x) : [r, ...list]);
};
export const toggleReminder = async (id: string) => {
  const list = await getReminders();
  await setList(K.REMINDERS, list.map(r => r.id === id ? { ...r, done: !r.done } : r));
};
export const deleteReminder = async (id: string) => {
  const list = await getReminders();
  await setList(K.REMINDERS, list.filter(r => r.id !== id));
};

// ── Activity ─────────────────────────────────────
export const getActivity = () => getList<ActivityEntry>(K.ACTIVITY);
export const addActivity = async (a: ActivityEntry) => {
  const list = await getActivity();
  await setList(K.ACTIVITY, [a, ...list].slice(0, 200));
};

// ── Gamification ─────────────────────────────────
const DEFAULT_GAMIF: GamificationData = {
  streak: 0, lastActiveDate: '', level: 1, xp: 0, monthlyScore: 0, monthKey: '',
};
export const getGamification = async (): Promise<GamificationData> => {
  const raw = await AsyncStorage.getItem(K.GAMIF);
  return raw ? JSON.parse(raw) : DEFAULT_GAMIF;
};
export const recordDailyActivity = async (): Promise<GamificationData> => {
  const g = await getGamification();
  const today = new Date().toISOString().slice(0, 10);
  const monthKey = today.slice(0, 7);
  if (g.lastActiveDate === today) return g;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = g.lastActiveDate === yesterday ? g.streak + 1 : 1;
  const xp = g.xp + 10;
  const level = Math.floor(xp / 100) + 1;
  const monthlyScore = g.monthKey === monthKey ? Math.min(100, g.monthlyScore + 5) : 5;
  const updated: GamificationData = { streak, lastActiveDate: today, level, xp, monthlyScore, monthKey };
  await AsyncStorage.setItem(K.GAMIF, JSON.stringify(updated));
  return updated;
};

// ── Onboarding ───────────────────────────────────
export const isOnboarded = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(K.ONBOARDED)) === 'true';
export const setOnboarded = () => AsyncStorage.setItem(K.ONBOARDED, 'true');
