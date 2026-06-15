import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * DBアクセスはこのファイルに集約する。
 * SQLite固有の構文は使わず標準SQLのみを使用し、PostgreSQLへ移行可能にする。
 *  - 真偽値は INTEGER(0/1)
 *  - 日時は ISO8601 文字列(TEXT)
 *  - 主キーは整数(AUTOINCREMENT相当)
 */

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'housing.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const nowISO = () => new Date().toISOString();

const SCHEMA = `
CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  total_floor_area REAL DEFAULT 0,
  building_area REAL DEFAULT 0,
  site_area REAL DEFAULT 0,
  floors INTEGER DEFAULT 2,
  rooms INTEGER DEFAULT 4,
  is_two_household INTEGER DEFAULT 0,
  is_sw INTEGER DEFAULT 0,
  insulation_grade INTEGER DEFAULT 4,
  seismic_grade INTEGER DEFAULT 2,
  is_long_life INTEGER DEFAULT 0,
  is_gx INTEGER DEFAULT 0,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS work_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER,
  level INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  unit TEXT DEFAULT '式',
  standard_price REAL DEFAULT 0,
  cost REAL DEFAULT 0,
  sale_price REAL DEFAULT 0,
  calc_method TEXT DEFAULT 'lump_sum',
  sort_order INTEGER DEFAULT 0,
  note TEXT DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_item_id INTEGER NOT NULL,
  old_price REAL DEFAULT 0,
  new_price REAL DEFAULT 0,
  old_cost REAL DEFAULT 0,
  new_cost REAL DEFAULT 0,
  reason TEXT DEFAULT '',
  changed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  maker TEXT DEFAULT '',
  product_name TEXT NOT NULL,
  grade TEXT DEFAULT '',
  is_standard INTEGER DEFAULT 0,
  list_price REAL DEFAULT 0,
  cost REAL DEFAULT 0,
  sale_price REAL DEFAULT 0,
  install_cost REAL DEFAULT 0,
  note TEXT DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  cost REAL DEFAULT 0,
  sale_price REAL DEFAULT 0,
  note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS spec_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS spec_set_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spec_set_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  equipment_id INTEGER
);

CREATE TABLE IF NOT EXISTS estimates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  spec_set_id INTEGER,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  total_cost REAL DEFAULT 0,
  total_sale REAL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS estimate_work_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estimate_id INTEGER NOT NULL,
  work_item_id INTEGER,
  work_item_name TEXT NOT NULL,
  unit TEXT DEFAULT '',
  quantity REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  calc_method TEXT DEFAULT '',
  calc_formula TEXT DEFAULT '',
  coefficient REAL DEFAULT 1,
  note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS estimate_equipment_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estimate_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  equipment_id INTEGER,
  equipment_name TEXT DEFAULT '',
  standard_equipment_id INTEGER,
  standard_price REAL DEFAULT 0,
  selected_price REAL DEFAULT 0,
  option_total REAL DEFAULT 0,
  diff REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS estimate_option_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estimate_id INTEGER NOT NULL,
  equipment_line_id INTEGER,
  category TEXT DEFAULT '',
  option_id INTEGER,
  option_name TEXT DEFAULT '',
  cost REAL DEFAULT 0,
  sale_price REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS past_estimates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_name TEXT DEFAULT '',
  total_floor_area REAL DEFAULT 0,
  work_item TEXT DEFAULT '',
  detail TEXT DEFAULT '',
  quantity REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  created_date TEXT DEFAULT '',
  imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coefficients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  key TEXT NOT NULL,
  value REAL DEFAULT 1,
  note TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_work_items_parent ON work_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(work_item_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_past_estimates_item ON past_estimates(work_item);
`;

export function initSchema() {
  db.exec(SCHEMA);
}
