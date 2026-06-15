import { db } from './db';

export interface PropertyLike {
  total_floor_area: number;
  building_area: number;
  floors: number;
  rooms: number;
  is_sw: number;
  is_gx: number;
}

export interface WorkItemLike {
  id?: number;
  name: string;
  unit: string;
  standard_price: number;
  calc_method: string;
  sale_price?: number;
}

export interface CalcResult {
  quantity: number;
  unit_price: number;
  amount: number;
  coefficient: number;
  calc_formula: string;
}

export const CALC_METHODS: Record<string, string> = {
  floor_area: '延床面積 × 単価',
  building_area: '建築面積 × 単価',
  quantity: '数量 × 単価',
  lump_sum: '一式',
  room_factor: '部屋数係数',
  floor_factor: '階数係数',
  sw_factor: 'SW係数',
  gx_factor: 'GX係数',
  grade_factor: 'グレード係数',
  manual: '手入力補正',
};

function coef(type: string, key: string): number {
  const row = db.prepare('SELECT value FROM coefficients WHERE type=? AND key=? LIMIT 1').get(type, key) as
    | { value: number }
    | undefined;
  return row ? row.value : 1;
}

/**
 * 計算方式 + 補正係数に基づき 1 工事項目の概算を算出する。
 * 拡張: 新しい計算方式を追加する場合はここに分岐を 1 件追加するだけでよい。
 */
export function calcWorkLine(
  prop: PropertyLike,
  item: WorkItemLike,
  opts: { manualQty?: number; manualAmount?: number; grade?: string } = {}
): CalcResult {
  const price = item.standard_price || 0;
  const fa = prop.total_floor_area || 0;
  const ba = prop.building_area || 0;
  const grade = opts.grade || 'standard';

  let quantity = 1;
  let coefficient = 1;
  let base = 0;
  let formula = '';

  switch (item.calc_method) {
    case 'floor_area':
      quantity = fa;
      base = fa * price;
      formula = `延床 ${fa}㎡ × ${price.toLocaleString()}円`;
      break;
    case 'building_area':
      quantity = ba;
      base = ba * price;
      formula = `建築 ${ba}㎡ × ${price.toLocaleString()}円`;
      break;
    case 'quantity':
      quantity = opts.manualQty ?? 0;
      base = quantity * price;
      formula = `数量 ${quantity}${item.unit} × ${price.toLocaleString()}円`;
      break;
    case 'lump_sum':
      quantity = 1;
      base = price;
      formula = `一式 ${price.toLocaleString()}円`;
      break;
    case 'room_factor':
      // 部屋数 × 単価（部屋数に比例する項目: 内部建具・器具付け等）
      quantity = prop.rooms;
      coefficient = coef('room', String(prop.rooms));
      base = prop.rooms * price;
      formula = `部屋数 ${prop.rooms}${item.unit} × ${price.toLocaleString()}円`;
      break;
    case 'floor_factor':
      coefficient = coef('floor', String(prop.floors));
      quantity = fa;
      base = fa * price * coefficient;
      formula = `延床 ${fa}㎡ × ${price.toLocaleString()}円 × 階数係数${coefficient}`;
      break;
    case 'sw_factor':
      coefficient = coef('sw', prop.is_sw ? 'on' : 'off');
      quantity = fa;
      base = fa * price * coefficient;
      formula = `延床 ${fa}㎡ × ${price.toLocaleString()}円 × SW係数${coefficient}`;
      break;
    case 'gx_factor':
      coefficient = coef('gx', prop.is_gx ? 'on' : 'off');
      quantity = fa;
      base = fa * price * coefficient;
      formula = `延床 ${fa}㎡ × ${price.toLocaleString()}円 × GX係数${coefficient}`;
      break;
    case 'grade_factor':
      coefficient = coef('grade', grade);
      quantity = fa;
      base = fa * price * coefficient;
      formula = `延床 ${fa}㎡ × ${price.toLocaleString()}円 × グレード係数${coefficient}`;
      break;
    case 'manual':
      quantity = opts.manualQty ?? 1;
      base = opts.manualAmount ?? quantity * price;
      formula = `手入力補正 ${base.toLocaleString()}円`;
      break;
    default:
      quantity = 1;
      base = price;
      formula = `一式 ${price.toLocaleString()}円`;
  }

  return {
    quantity: round(quantity),
    unit_price: round(price),
    amount: round(base),
    coefficient,
    calc_formula: formula,
  };
}

function round(n: number): number {
  return Math.round(n);
}
