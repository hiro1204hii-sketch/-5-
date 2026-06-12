export type Temperature = 'HOT' | 'WARM' | 'COLD';
export type DealStage = 'approach' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Customer {
  id: string;
  name: string;
  company: string;
  role?: string;
  phone?: string;
  email?: string;
  memo?: string;
  createdAt: string;
  lastContactedAt?: string;
  latestTemperature?: Temperature;
  dealAmount?: number;
}

export interface AnalysisResult {
  id: string;
  date: string;
  transcript: string;
  minutes: string;
  actions: string;
  temperature: Temperature;
  temperatureReason: string;
  coachComment?: string;
  duration: number;
  customerId?: string;
  customerName?: string;
}

export interface Deal {
  id: string;
  title: string;
  customerId?: string;
  amount?: number;
  stage: DealStage;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  customerId?: string;
  dueDate: string;
  memo?: string;
  done: boolean;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  type: 'recording' | 'followup' | 'note' | 'meeting';
  date: string;
  customerId?: string;
  customerName?: string;
  summary: string;
  temperature?: Temperature;
  analysisId?: string;
}

export interface GamificationData {
  streak: number;
  lastActiveDate: string;
  level: number;
  xp: number;
  monthlyScore: number;
  monthKey: string;
}

export interface UserSettings {
  anthropicApiKey: string;
  openaiApiKey: string;
  userName?: string;
}

export interface UsageData {
  month: string;
  count: number;
}
