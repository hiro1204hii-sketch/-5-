import { Router } from 'express';
import { db, nowISO } from '../lib/db';

export const equipmentRouter = Router();

const FIELDS = ['category', 'maker', 'product_name', 'grade', 'is_standard', 'list_price', 'cost', 'sale_price', 'install_cost', 'note'];

equipmentRouter.get('/', (req, res) => {
  const cat = req.query.category as string | undefined;
  const rows = cat
    ? db.prepare('SELECT * FROM equipment WHERE category=? ORDER BY is_standard DESC, list_price').all(cat)
    : db.prepare('SELECT * FROM equipment ORDER BY category, is_standard DESC, list_price').all();
  res.json(rows);
});

equipmentRouter.post('/', (req, res) => {
  const now = nowISO();
  const info = db
    .prepare(
      `INSERT INTO equipment (category,maker,product_name,grade,is_standard,list_price,cost,sale_price,install_cost,note,updated_at)
       VALUES (@category,@maker,@product_name,@grade,@is_standard,@list_price,@cost,@sale_price,@install_cost,@note,@now)`
    )
    .run(normalize(req.body, now));
  res.status(201).json(db.prepare('SELECT * FROM equipment WHERE id=?').get(info.lastInsertRowid));
});

equipmentRouter.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id) as any;
  if (!cur) return res.status(404).json({ error: 'not found' });
  const now = nowISO();
  db.prepare(
    `UPDATE equipment SET category=@category,maker=@maker,product_name=@product_name,grade=@grade,is_standard=@is_standard,
     list_price=@list_price,cost=@cost,sale_price=@sale_price,install_cost=@install_cost,note=@note,updated_at=@now WHERE id=@id`
  ).run({ ...normalize({ ...cur, ...req.body }, now), id: req.params.id });
  res.json(db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id));
});

equipmentRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM equipment WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

function normalize(b: any, now: string) {
  return {
    category: b.category ?? '',
    maker: b.maker ?? '',
    product_name: b.product_name ?? '',
    grade: b.grade ?? 'standard',
    is_standard: b.is_standard ? 1 : 0,
    list_price: Number(b.list_price ?? 0),
    cost: Number(b.cost ?? 0),
    sale_price: Number(b.sale_price ?? 0),
    install_cost: Number(b.install_cost ?? 0),
    note: b.note ?? '',
    now,
  };
}
