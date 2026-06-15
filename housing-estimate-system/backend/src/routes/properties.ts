import { Router } from 'express';
import { db, nowISO } from '../lib/db';

export const propertiesRouter = Router();

const FIELDS = [
  'name', 'total_floor_area', 'building_area', 'site_area', 'floors', 'rooms',
  'is_two_household', 'is_sw', 'insulation_grade', 'seismic_grade',
  'is_long_life', 'is_gx', 'note',
];

propertiesRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM properties ORDER BY created_at DESC').all();
  res.json(rows);
});

propertiesRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM properties WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

propertiesRouter.post('/', (req, res) => {
  const b = req.body || {};
  const now = nowISO();
  const stmt = db.prepare(
    `INSERT INTO properties (name,total_floor_area,building_area,site_area,floors,rooms,is_two_household,is_sw,insulation_grade,seismic_grade,is_long_life,is_gx,note,created_at,updated_at)
     VALUES (@name,@total_floor_area,@building_area,@site_area,@floors,@rooms,@is_two_household,@is_sw,@insulation_grade,@seismic_grade,@is_long_life,@is_gx,@note,@now,@now)`
  );
  const info = stmt.run(normalize(b, now));
  res.status(201).json(db.prepare('SELECT * FROM properties WHERE id=?').get(info.lastInsertRowid));
});

propertiesRouter.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM properties WHERE id=?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'not found' });
  const now = nowISO();
  const merged = { ...existing, ...req.body };
  db.prepare(
    `UPDATE properties SET name=@name,total_floor_area=@total_floor_area,building_area=@building_area,site_area=@site_area,
     floors=@floors,rooms=@rooms,is_two_household=@is_two_household,is_sw=@is_sw,insulation_grade=@insulation_grade,
     seismic_grade=@seismic_grade,is_long_life=@is_long_life,is_gx=@is_gx,note=@note,updated_at=@now WHERE id=@id`
  ).run({ ...normalize(merged, now), id: req.params.id });
  res.json(db.prepare('SELECT * FROM properties WHERE id=?').get(req.params.id));
});

propertiesRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM properties WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

function normalize(b: any, now: string) {
  const out: any = { now };
  for (const f of FIELDS) {
    if (['name', 'note'].includes(f)) out[f] = b[f] ?? '';
    else if (f.startsWith('is_')) out[f] = b[f] ? 1 : 0;
    else out[f] = Number(b[f] ?? 0);
  }
  return out;
}
