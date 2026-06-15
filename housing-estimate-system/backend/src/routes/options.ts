import { Router } from 'express';
import { db } from '../lib/db';

export const optionsRouter = Router();

optionsRouter.get('/', (req, res) => {
  const cat = req.query.category as string | undefined;
  const rows = cat
    ? db.prepare('SELECT * FROM options WHERE category=? ORDER BY name').all(cat)
    : db.prepare('SELECT * FROM options ORDER BY category, name').all();
  res.json(rows);
});

optionsRouter.post('/', (req, res) => {
  const b = req.body || {};
  const info = db
    .prepare('INSERT INTO options (category,name,cost,sale_price,note) VALUES (?,?,?,?,?)')
    .run(b.category ?? '', b.name ?? '', Number(b.cost ?? 0), Number(b.sale_price ?? 0), b.note ?? '');
  res.status(201).json(db.prepare('SELECT * FROM options WHERE id=?').get(info.lastInsertRowid));
});

optionsRouter.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM options WHERE id=?').get(req.params.id) as any;
  if (!cur) return res.status(404).json({ error: 'not found' });
  const b = { ...cur, ...req.body };
  db.prepare('UPDATE options SET category=?,name=?,cost=?,sale_price=?,note=? WHERE id=?').run(
    b.category, b.name, Number(b.cost), Number(b.sale_price), b.note ?? '', req.params.id
  );
  res.json(db.prepare('SELECT * FROM options WHERE id=?').get(req.params.id));
});

optionsRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM options WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});
