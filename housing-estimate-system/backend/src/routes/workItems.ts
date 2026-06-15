import { Router } from 'express';
import { db, nowISO } from '../lib/db';

export const workItemsRouter = Router();

// 階層ツリー（大項目 > 小項目）
workItemsRouter.get('/tree', (_req, res) => {
  const all = db.prepare('SELECT * FROM work_items ORDER BY level, sort_order, id').all() as any[];
  const majors = all.filter((w) => w.level === 1);
  const tree = majors.map((m) => ({
    ...m,
    children: all.filter((c) => c.parent_id === m.id),
  }));
  res.json(tree);
});

workItemsRouter.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM work_items ORDER BY level, sort_order, id').all());
});

workItemsRouter.get('/:id/history', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM price_history WHERE work_item_id=? ORDER BY changed_at DESC')
    .all(req.params.id);
  res.json(rows);
});

workItemsRouter.post('/', (req, res) => {
  const b = req.body || {};
  const now = nowISO();
  const info = db
    .prepare(
      `INSERT INTO work_items (parent_id,level,name,unit,standard_price,cost,sale_price,calc_method,sort_order,note,updated_at)
       VALUES (@parent_id,@level,@name,@unit,@standard_price,@cost,@sale_price,@calc_method,@sort_order,@note,@now)`
    )
    .run({
      parent_id: b.parent_id ?? null,
      level: Number(b.level ?? (b.parent_id ? 3 : 1)),
      name: b.name ?? '',
      unit: b.unit ?? '式',
      standard_price: Number(b.standard_price ?? 0),
      cost: Number(b.cost ?? 0),
      sale_price: Number(b.sale_price ?? 0),
      calc_method: b.calc_method ?? 'lump_sum',
      sort_order: Number(b.sort_order ?? 0),
      note: b.note ?? '',
      now,
    });
  res.status(201).json(db.prepare('SELECT * FROM work_items WHERE id=?').get(info.lastInsertRowid));
});

// 更新。標準単価/原価が変わったら price_history に自動記録（精度向上の中核）
workItemsRouter.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM work_items WHERE id=?').get(req.params.id) as any;
  if (!cur) return res.status(404).json({ error: 'not found' });
  const b = req.body || {};
  const now = nowISO();

  const newPrice = b.standard_price != null ? Number(b.standard_price) : cur.standard_price;
  const newCost = b.cost != null ? Number(b.cost) : cur.cost;

  if (newPrice !== cur.standard_price || newCost !== cur.cost) {
    db.prepare(
      `INSERT INTO price_history (work_item_id,old_price,new_price,old_cost,new_cost,reason,changed_at)
       VALUES (?,?,?,?,?,?,?)`
    ).run(cur.id, cur.standard_price, newPrice, cur.cost, newCost, b.reason ?? '単価改定', now);
  }

  db.prepare(
    `UPDATE work_items SET name=@name,unit=@unit,standard_price=@standard_price,cost=@cost,sale_price=@sale_price,
     calc_method=@calc_method,sort_order=@sort_order,note=@note,updated_at=@now WHERE id=@id`
  ).run({
    name: b.name ?? cur.name,
    unit: b.unit ?? cur.unit,
    standard_price: newPrice,
    cost: newCost,
    sale_price: b.sale_price != null ? Number(b.sale_price) : cur.sale_price,
    calc_method: b.calc_method ?? cur.calc_method,
    sort_order: b.sort_order != null ? Number(b.sort_order) : cur.sort_order,
    note: b.note ?? cur.note,
    now,
    id: cur.id,
  });
  res.json(db.prepare('SELECT * FROM work_items WHERE id=?').get(req.params.id));
});

workItemsRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM work_items WHERE id=? OR parent_id=?').run(req.params.id, req.params.id);
  res.json({ ok: true });
});
