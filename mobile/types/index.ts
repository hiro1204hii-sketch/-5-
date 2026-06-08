export type Temperature = 'HOT' | 'WARM' | 'COLD';

export interface AnalysisResult {
  id: string;
  date: string;
  transcript: string;
  minutes: string;
  actions: string;
  temperature: Temperature;
  temperatureReason: string;
  duration: number; // seconds
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
