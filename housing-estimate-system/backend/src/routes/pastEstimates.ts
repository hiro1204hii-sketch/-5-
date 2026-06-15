import { Router } from 'express';
import { db, nowISO } from '../lib/db';

export const pastEstimatesRouter = Router();

pastEstimatesRouter.get('/', (req, res) => {
  const workItem = req.query.work_item as string | undefined;
  const rows = workItem
    ? db.prepare('SELECT * FROM past_estimates WHERE work_item=? ORDER BY created_date DESC').all(workItem)
    : db.prepare('SELECT * FROM past_estimates ORDER BY created_date DESC, id DESC').all();
  res.json(rows);
});

pastEstimatesRouter.post('/', (req, res) => {
  const b = req.body || {};
  const now = nowISO();
  const qty = Number(b.quantity ?? 0);
  const price = Number(b.unit_price ?? 0);
  const amount = b.amount != null ? Number(b.amount) : qty * price;
  const info = db
    .prepare(
      `INSERT INTO past_estimates (property_name,total_floor_area,work_item,detail,quantity,unit_price,amount,created_date,imported_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(b.property_name ?? '', Number(b.total_floor_area ?? 0), b.work_item ?? '', b.detail ?? '', qty, price, amount, b.created_date ?? '', now);
  res.status(201).json(db.prepare('SELECT * FROM past_estimates WHERE id=?').get(info.lastInsertRowid));
});

/**
 * CSV取込。フロントでパースした行配列を受け取り一括登録する。
 * 期待カラム: property_name, total_floor_area, work_item, detail, quantity, unit_price, amount, created_date
 */
pastEstimatesRouter.post('/import', (req, res) => {
  const rows = (req.body?.rows || []) as any[];
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'rows is empty' });
  const now = nowISO();
  const stmt = db.prepare(
    `INSERT INTO past_estimates (property_name,total_floor_area,work_item,detail,quantity,unit_price,amount,created_date,imported_at)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );
  let imported = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
      if (!r.work_item && !r.property_name) continue;
      const qty = Number(r.quantity ?? 0);
      const price = Number(r.unit_price ?? 0);
      const amount = r.amount != null && r.amount !== '' ? Number(r.amount) : qty * price;
      stmt.run(
        r.property_name ?? '',
        Number(r.total_floor_area ?? 0),
        r.work_item ?? '',
        r.detail ?? '',
        qty,
        price,
        amount,
        r.created_date ?? '',
        now
      );
      imported++;
    }
  });
  tx();
  res.json({ imported });
});

pastEstimatesRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM past_estimates WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});
