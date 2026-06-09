export type Temperature = 'HOT' | 'WARM' | 'COLD';

export interface Customer {
  id: string;
  name: string;
  company: string;
  phone?: string;
  email?: string;
  memo?: string;
  createdAt: string;
  lastContactedAt?: string;
  latestTemperature?: Temperature;
}

export interface AnalysisResult {
  id: string;
  date: string;
  transcript: string;
  minutes: string;
  actions: string;
  temperature: Temperature;
  temperatureReason: string;
  duration: number;
  customerId?: string;
  customerName?: string;
}

export interface UserSettings {
  anthropicApiKey: string;
  openaiApiKey: string;
}

export interface UsageData {
  month: string; // YYYY-MM
  count: number;
}

export interface SubscriptionStatus {
  isProUser: boolean;
  expirationDate?: string;
}
