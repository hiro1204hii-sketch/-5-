const BASE = '/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`${res.status}: ${msg}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(p: string) => req<T>(p),
  post: <T>(p: string, body: unknown) => req<T>(p, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(p: string, body: unknown) => req<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(p: string) => req<T>(p, { method: 'DELETE' }),
};

export const yen = (n: number | undefined | null) =>
  '¥' + Math.round(Number(n || 0)).toLocaleString('ja-JP');

export const yenSigned = (n: number) =>
  (n >= 0 ? '+' : '−') + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP');

export const num = (n: number | undefined | null) => Number(n || 0).toLocaleString('ja-JP');

// ---- 型 ----
export interface Property {
  id: number;
  name: string;
  total_floor_area: number;
  building_area: number;
  site_area: number;
  floors: number;
  rooms: number;
  is_two_household: number;
  is_sw: number;
  insulation_grade: number;
  seismic_grade: number;
  is_long_life: number;
  is_gx: number;
  note: string;
  created_at: string;
}

export interface WorkItem {
  id: number;
  parent_id: number | null;
  level: number;
  name: string;
  unit: string;
  standard_price: number;
  cost: number;
  sale_price: number;
  calc_method: string;
  note: string;
  updated_at: string;
  children?: WorkItem[];
}

export interface Equipment {
  id: number;
  category: string;
  maker: string;
  product_name: string;
  grade: string;
  is_standard: number;
  list_price: number;
  cost: number;
  sale_price: number;
  install_cost: number;
  note: string;
}

export interface Option {
  id: number;
  category: string;
  name: string;
  cost: number;
  sale_price: number;
  note: string;
}

export interface Meta {
  calcMethods: Record<string, string>;
  equipmentCategories: string[];
  grades: { key: string; label: string }[];
}
