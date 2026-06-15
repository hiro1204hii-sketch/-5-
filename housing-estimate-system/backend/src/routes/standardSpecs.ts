import { Router } from 'express';
import { db } from '../lib/db';

export const standardSpecsRouter = Router();

standardSpecsRouter.get('/', (_req, res) => {
  const sets = db.prepare('SELECT * FROM spec_sets ORDER BY id').all();
  res.json(sets);
});

// セット詳細（カテゴリ別の標準住設を住設情報込みで返す）
standardSpecsRouter.get('/:id', (req, res) => {
  const set = db.prepare('SELECT * FROM spec_sets WHERE id=?').get(req.params.id) as any;
  if (!set) return res.status(404).json({ error: 'not found' });
  const items = db
    .prepare(
      `SELECT si.id, si.category, si.equipment_id,
              e.product_name, e.maker, e.grade, e.sale_price, e.install_cost
       FROM spec_set_items si LEFT JOIN equipment e ON e.id = si.equipment_id
       WHERE si.spec_set_id=? ORDER BY si.id`
    )
    .all(req.params.id);
  res.json({ ...set, items });
});

standardSpecsRouter.post('/', (req, res) => {
  const b = req.body || {};
  const info = db.prepare('INSERT INTO spec_sets (name,note) VALUES (?,?)').run(b.name ?? '', b.note ?? '');
  const setId = Number(info.lastInsertRowid);
  if (Array.isArray(b.items)) {
    const ins = db.prepare('INSERT INTO spec_set_items (spec_set_id,category,equipment_id) VALUES (?,?,?)');
    for (const it of b.items) ins.run(setId, it.category, it.equipment_id ?? null);
  }
  res.status(201).json(db.prepare('SELECT * FROM spec_sets WHERE id=?').get(setId));
});

standardSpecsRouter.put('/:id', (req, res) => {
  const b = req.body || {};
  const set = db.prepare('SELECT * FROM spec_sets WHERE id=?').get(req.params.id) as any;
  if (!set) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE spec_sets SET name=?,note=? WHERE id=?').run(b.name ?? set.name, b.note ?? set.note, req.params.id);
  if (Array.isArray(b.items)) {
    db.prepare('DELETE FROM spec_set_items WHERE spec_set_id=?').run(req.params.id);
    const ins = db.prepare('INSERT INTO spec_set_items (spec_set_id,category,equipment_id) VALUES (?,?,?)');
    for (const it of b.items) ins.run(req.params.id, it.category, it.equipment_id ?? null);
  }
  res.json(db.prepare('SELECT * FROM spec_sets WHERE id=?').get(req.params.id));
});

standardSpecsRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM spec_set_items WHERE spec_set_id=?').run(req.params.id);
  db.prepare('DELETE FROM spec_sets WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});
