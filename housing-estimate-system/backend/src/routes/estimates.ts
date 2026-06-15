import { Router } from 'express';
import { db, nowISO } from '../lib/db';
import { calcWorkLine } from '../lib/calc';

export const estimatesRouter = Router();

interface CalcInput {
  property_id: number;
  spec_set_id?: number;
  name?: string;
  grade?: string;
  equipment?: Record<string, number>; // category -> equipment_id
  options?: number[]; // option ids
  manualQty?: Record<string, number>; // work_item_id -> qty
}

/** 概算の全内訳を組み立てる（保存しない）。calculate / save 双方から利用。 */
function buildBreakdown(input: CalcInput) {
  const prop = db.prepare('SELECT * FROM properties WHERE id=?').get(input.property_id) as any;
  if (!prop) throw new Error('property not found');
  const grade = input.grade || 'standard';

  // --- 工事項目（小項目=leaf）の自動計算 ---
  const leaves = db.prepare('SELECT * FROM work_items WHERE level=3 ORDER BY sort_order, id').all() as any[];
  const majors = db.prepare('SELECT * FROM work_items WHERE level=1').all() as any[];
  const majorName = (pid: number) => majors.find((m) => m.id === pid)?.name || '';

  let workSale = 0;
  let workCost = 0;
  const workLines = leaves.map((it) => {
    const manualQty = input.manualQty?.[String(it.id)];
    const r = calcWorkLine(prop, it, { manualQty, grade });
    const costRatio = it.standard_price > 0 ? it.cost / it.standard_price : 1;
    const cost_amount = Math.round(r.amount * costRatio);
    workSale += r.amount;
    workCost += cost_amount;
    return {
      work_item_id: it.id,
      category: majorName(it.parent_id),
      work_item_name: it.name,
      unit: it.unit,
      quantity: r.quantity,
      unit_price: r.unit_price,
      amount: r.amount,
      cost_amount,
      calc_method: it.calc_method,
      calc_formula: r.calc_formula,
      coefficient: r.coefficient,
    };
  });

  // --- 標準仕様（baseline） ---
  const specItems = input.spec_set_id
    ? (db.prepare('SELECT * FROM spec_set_items WHERE spec_set_id=?').all(input.spec_set_id) as any[])
    : [];
  const standardByCat: Record<string, number | null> = {};
  for (const si of specItems) standardByCat[si.category] = si.equipment_id;

  // 対象カテゴリ = 標準仕様のカテゴリ ∪ 選択されたカテゴリ
  const categories = new Set<string>([...Object.keys(standardByCat), ...Object.keys(input.equipment || {})]);

  const eqById = (id: number | null | undefined) =>
    id ? (db.prepare('SELECT * FROM equipment WHERE id=?').get(id) as any) : null;

  // --- オプション（カテゴリ別に集計） ---
  const selectedOptions = (input.options || [])
    .map((oid) => db.prepare('SELECT * FROM options WHERE id=?').get(oid) as any)
    .filter(Boolean);
  const optionLines = selectedOptions.map((o) => ({
    category: o.category,
    option_id: o.id,
    option_name: o.name,
    cost: o.cost,
    sale_price: o.sale_price,
  }));
  const optSaleByCat: Record<string, number> = {};
  const optCostByCat: Record<string, number> = {};
  for (const o of selectedOptions) {
    optSaleByCat[o.category] = (optSaleByCat[o.category] || 0) + o.sale_price;
    optCostByCat[o.category] = (optCostByCat[o.category] || 0) + o.cost;
  }

  let eqSale = 0;
  let eqCost = 0;
  const equipmentLines = [...categories].map((cat) => {
    const stdEq = eqById(standardByCat[cat]);
    const selId = input.equipment?.[cat] ?? standardByCat[cat] ?? undefined;
    const selEq = eqById(selId);
    const standard_price = stdEq ? stdEq.sale_price + stdEq.install_cost : 0;
    const selected_price = selEq ? selEq.sale_price + selEq.install_cost : 0;
    const selected_cost = selEq ? selEq.cost + selEq.install_cost : 0;
    const option_total = optSaleByCat[cat] || 0;
    const option_cost = optCostByCat[cat] || 0;
    const diff = selected_price + option_total - standard_price;
    eqSale += selected_price + option_total;
    eqCost += selected_cost + option_cost;
    return {
      category: cat,
      standard_equipment_id: stdEq?.id ?? null,
      standard_equipment_name: stdEq ? `${stdEq.maker} ${stdEq.product_name}` : '（標準なし）',
      standard_price,
      equipment_id: selEq?.id ?? null,
      equipment_name: selEq ? `${selEq.maker} ${selEq.product_name}` : '（未選択）',
      selected_price,
      option_total,
      diff,
    };
  });

  const total_sale = Math.round(workSale + eqSale);
  const total_cost = Math.round(workCost + eqCost);
  const diff_total = equipmentLines.reduce((s, e) => s + e.diff, 0);

  return {
    property: prop,
    workLines,
    equipmentLines,
    optionLines,
    totals: {
      work_sale: Math.round(workSale),
      work_cost: Math.round(workCost),
      equipment_sale: Math.round(eqSale),
      equipment_cost: Math.round(eqCost),
      total_sale,
      total_cost,
      gross_profit: total_sale - total_cost,
      gross_margin: total_sale > 0 ? Math.round(((total_sale - total_cost) / total_sale) * 1000) / 10 : 0,
      diff_total: Math.round(diff_total),
    },
  };
}

estimatesRouter.post('/calculate', (req, res) => {
  try {
    res.json(buildBreakdown(req.body || {}));
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

estimatesRouter.get('/', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT e.*, p.name AS property_name, p.total_floor_area
       FROM estimates e LEFT JOIN properties p ON p.id = e.property_id
       ORDER BY e.created_at DESC`
    )
    .all();
  res.json(rows);
});

estimatesRouter.post('/', (req, res) => {
  try {
    const input = req.body || {};
    const b = buildBreakdown(input);
    const now = nowISO();
    const name = input.name || `${b.property.name} 概算`;

    const save = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO estimates (property_id,spec_set_id,name,status,total_cost,total_sale,created_at)
           VALUES (?,?,?,?,?,?,?)`
        )
        .run(input.property_id, input.spec_set_id ?? null, name, 'draft', b.totals.total_cost, b.totals.total_sale, now);
      const eid = Number(info.lastInsertRowid);

      const wl = db.prepare(
        `INSERT INTO estimate_work_lines (estimate_id,work_item_id,work_item_name,unit,quantity,unit_price,amount,calc_method,calc_formula,coefficient,note)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      );
      for (const w of b.workLines)
        wl.run(eid, w.work_item_id, w.work_item_name, w.unit, w.quantity, w.unit_price, w.amount, w.calc_method, w.calc_formula, w.coefficient, w.category);

      const el = db.prepare(
        `INSERT INTO estimate_equipment_lines (estimate_id,category,equipment_id,equipment_name,standard_equipment_id,standard_price,selected_price,option_total,diff)
         VALUES (?,?,?,?,?,?,?,?,?)`
      );
      for (const e of b.equipmentLines)
        el.run(eid, e.category, e.equipment_id, e.equipment_name, e.standard_equipment_id, e.standard_price, e.selected_price, e.option_total, e.diff);

      const ol = db.prepare(
        `INSERT INTO estimate_option_lines (estimate_id,category,option_id,option_name,cost,sale_price) VALUES (?,?,?,?,?,?)`
      );
      for (const o of b.optionLines) ol.run(eid, o.category, o.option_id, o.option_name, o.cost, o.sale_price);

      return eid;
    });

    const eid = save();
    res.status(201).json({ id: eid });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

estimatesRouter.get('/:id', (req, res) => {
  const est = db
    .prepare(
      `SELECT e.*, p.name AS property_name, p.total_floor_area, p.building_area, p.is_sw, p.is_gx
       FROM estimates e LEFT JOIN properties p ON p.id=e.property_id WHERE e.id=?`
    )
    .get(req.params.id) as any;
  if (!est) return res.status(404).json({ error: 'not found' });
  est.workLines = db.prepare('SELECT * FROM estimate_work_lines WHERE estimate_id=? ORDER BY id').all(req.params.id);
  est.equipmentLines = db.prepare('SELECT * FROM estimate_equipment_lines WHERE estimate_id=? ORDER BY id').all(req.params.id);
  est.optionLines = db.prepare('SELECT * FROM estimate_option_lines WHERE estimate_id=? ORDER BY id').all(req.params.id);
  res.json(est);
});

estimatesRouter.delete('/:id', (req, res) => {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM estimate_work_lines WHERE estimate_id=?').run(req.params.id);
    db.prepare('DELETE FROM estimate_equipment_lines WHERE estimate_id=?').run(req.params.id);
    db.prepare('DELETE FROM estimate_option_lines WHERE estimate_id=?').run(req.params.id);
    db.prepare('DELETE FROM estimates WHERE id=?').run(req.params.id);
  });
  tx();
  res.json({ ok: true });
});
