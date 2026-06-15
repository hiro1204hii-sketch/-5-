// ── カラーシステム ──────────────────────────────
export const Colors = {
  // Backgrounds
  bg:      '#0A0D1A',
  surface1:'#111827',
  surface2:'#1A2235',
  surface3:'#243048',
  // Gold
  gold:    '#C8A84B',
  gold2:   '#E8C870',
  goldDim: 'rgba(200,168,75,0.15)',
  // White alpha
  w100: '#FFFFFF',
  w60:  'rgba(255,255,255,0.60)',
  w40:  'rgba(255,255,255,0.40)',
  w20:  'rgba(255,255,255,0.20)',
  w08:  'rgba(255,255,255,0.08)',
  w04:  'rgba(255,255,255,0.04)',
  // Temperature
  hot:   '#FF5252',
  warm:  '#FF9800',
  cold:  '#4B9EFF',
  won:   '#00D97E',
  // Gamification
  streak:'#FF6B35',
  level: '#A855F7',
  // Misc
  navy:  '#0A0D1A',
  error: '#FF5252',
} as const;

// Gradients (use with LinearGradient)
export const Gradients = {
  gold:    ['#C8A84B', '#E8C870'] as [string,string],
  goldRev: ['#E8C870', '#C8A84B'] as [string,string],
  goldDeep:['#A07830', '#C8A84B', '#E8C870'] as [string,string,string],
  hero:    ['#1a2a4a', '#0D1526', '#0A0D1A'] as [string,string,string],
  hot:     ['#FF5252', '#C0392B'] as [string,string],
  warm:    ['#FF9800', '#E67E22'] as [string,string],
  cold:    ['#4B9EFF', '#2980B9'] as [string,string],
  won:     ['#00D97E', '#00B865'] as [string,string],
} as const;

// ── 定数 ──────────────────────────────────────
export const FREE_TIER_LIMIT = 5;
export const REVENUECAT_ENTITLEMENT = 'pro';

// ── スタイルヘルパー ───────────────────────────
export const card = {
  background: Colors.w04,
  borderWidth: 1,
  borderColor: Colors.w08,
  borderRadius: 14,
} as const;

export const cardGold = {
  ...card,
  borderColor: 'rgba(200,168,75,0.25)',
  backgroundColor: 'rgba(200,168,75,0.05)',
} as const;

// ── 日替わりフレーズ ────────────────────────────
export const DAILY_QUOTES = [
  '信頼は一度の商談ではなく、\n小さな約束の積み重ね。',
  '断られた数だけ、\n成長できる機会がある。',
  '最高の営業とは、\nお客様の未来を一緒に描くこと。',
  '準備した人だけが、\n運をつかみとれる。',
  '一流の営業は、\n話す前に聴く。',
  '今日の行動が、\n3ヶ月後の結果をつくる。',
];
