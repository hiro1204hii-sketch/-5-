import { db, initSchema, nowISO } from './db';

/**
 * 初期データ投入。既にデータがある場合はスキップする（冪等）。
 */
export function seedIfEmpty() {
  initSchema();
  const count = db.prepare('SELECT COUNT(*) AS c FROM work_items').get() as { c: number };
  if (count.c > 0) return;
  seed();
}

function seed() {
  const now = nowISO();

  // ---- 補正係数 ----
  const coef = db.prepare('INSERT INTO coefficients (type, key, value, note) VALUES (?,?,?,?)');
  const coefRows: [string, string, number, string][] = [
    ['room', '3', 0.95, '部屋数 3以下'],
    ['room', '4', 1.0, '部屋数 4 標準'],
    ['room', '5', 1.06, '部屋数 5'],
    ['room', '6', 1.12, '部屋数 6以上'],
    ['floor', '1', 0.92, '平屋'],
    ['floor', '2', 1.0, '2階建 標準'],
    ['floor', '3', 1.15, '3階建'],
    ['sw', 'on', 1.12, 'SW工法 加算'],
    ['sw', 'off', 1.0, '一般工法'],
    ['gx', 'on', 1.08, 'GX志向型 加算'],
    ['gx', 'off', 1.0, '非GX'],
    ['grade', 'standard', 1.0, '標準グレード'],
    ['grade', 'high', 1.15, '上位グレード'],
    ['grade', 'premium', 1.3, '最上位グレード'],
  ];
  for (const r of coefRows) coef.run(...r);

  // ---- 工事項目（大>小） ----
  const insMajor = db.prepare(
    'INSERT INTO work_items (parent_id, level, name, unit, standard_price, cost, sale_price, calc_method, sort_order, note, updated_at) VALUES (NULL,1,?,?,0,0,0,?,?,?,?)'
  );
  const insLeaf = db.prepare(
    'INSERT INTO work_items (parent_id, level, name, unit, standard_price, cost, sale_price, calc_method, sort_order, note, updated_at) VALUES (?,3,?,?,?,?,?,?,?,?,?)'
  );

  type Leaf = { name: string; unit: string; price: number; cost: number; calc: string; note?: string };
  const groups: { name: string; calc: string; leaves: Leaf[] }[] = [
    { name: '仮設工事', calc: 'floor_area', leaves: [
      { name: '仮設足場', unit: '㎡', price: 1200, cost: 950, calc: 'floor_area' },
      { name: '養生・clean', unit: '式', price: 80000, cost: 60000, calc: 'lump_sum', note: '養生・clean' },
    ]},
    { name: '基礎工事', calc: 'building_area', leaves: [
      { name: 'ベタ基礎', unit: '㎡', price: 28000, cost: 22000, calc: 'building_area' },
      { name: '地盤改良', unit: '式', price: 600000, cost: 480000, calc: 'lump_sum' },
    ]},
    { name: '木工事', calc: 'floor_area', leaves: [
      { name: '構造材・建方', unit: '㎡', price: 42000, cost: 33000, calc: 'sw_factor', note: 'SW工法で割増' },
      { name: '造作工事', unit: '㎡', price: 18000, cost: 14000, calc: 'room_factor' },
    ]},
    { name: '屋根工事', calc: 'building_area', leaves: [
      { name: 'ガルバリウム屋根', unit: '㎡', price: 9500, cost: 7200, calc: 'building_area' },
    ]},
    { name: '外壁工事', calc: 'floor_area', leaves: [
      { name: '窯業系サイディング', unit: '㎡', price: 11000, cost: 8500, calc: 'floor_area' },
    ]},
    { name: '防水工事', calc: 'lump_sum', leaves: [
      { name: 'バルコニー防水', unit: '式', price: 120000, cost: 90000, calc: 'lump_sum' },
    ]},
    { name: '建具工事', calc: 'room_factor', leaves: [
      { name: '内部建具', unit: '室', price: 65000, cost: 50000, calc: 'room_factor' },
      { name: 'サッシ・玄関ドア', unit: '式', price: 850000, cost: 660000, calc: 'lump_sum', note: 'GX時は高性能サッシへ差替' },
    ]},
    { name: '内装工事', calc: 'floor_area', leaves: [
      { name: 'クロス工事', unit: '㎡', price: 1500, cost: 1100, calc: 'floor_area' },
      { name: 'フローリング', unit: '㎡', price: 8500, cost: 6500, calc: 'grade_factor' },
    ]},
    { name: '電気工事', calc: 'floor_area', leaves: [
      { name: '電気配線・器具', unit: '㎡', price: 6500, cost: 5000, calc: 'floor_area' },
    ]},
    { name: '給排水工事', calc: 'lump_sum', leaves: [
      { name: '給排水衛生設備', unit: '式', price: 950000, cost: 740000, calc: 'lump_sum' },
    ]},
    { name: '設備工事', calc: 'lump_sum', leaves: [
      { name: '空調・換気設備', unit: '㎡', price: 5000, cost: 3900, calc: 'gx_factor' },
    ]},
    { name: '外構工事', calc: 'quantity', leaves: [
      { name: '外構・造園', unit: '㎡', price: 12000, cost: 9000, calc: 'quantity' },
    ]},
    { name: '諸経費', calc: 'floor_area', leaves: [
      { name: '現場管理費', unit: '㎡', price: 7000, cost: 7000, calc: 'floor_area' },
      { name: '一般管理費', unit: '式', price: 800000, cost: 800000, calc: 'lump_sum' },
    ]},
  ];

  let sort = 0;
  for (const g of groups) {
    const major = insMajor.run(g.name, '式', g.calc, sort++, '', now);
    const parentId = Number(major.lastInsertRowid);
    let lsort = 0;
    for (const leaf of g.leaves) {
      const sale = Math.round(leaf.price); // 標準単価=売価初期値
      insLeaf.run(parentId, leaf.name, leaf.unit, leaf.price, leaf.cost, sale, leaf.calc, lsort++, leaf.note || '', now);
    }
  }

  // ---- 単価更新履歴（サンプル：値上がり傾向） ----
  const hist = db.prepare(
    'INSERT INTO price_history (work_item_id, old_price, new_price, old_cost, new_cost, reason, changed_at) VALUES (?,?,?,?,?,?,?)'
  );
  const leafItems = db.prepare("SELECT id, standard_price, cost FROM work_items WHERE level=3").all() as any[];
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  for (const it of leafItems.slice(0, 8)) {
    const oldP = Math.round(it.standard_price * 0.9);
    const oldC = Math.round(it.cost * 0.9);
    hist.run(it.id, oldP, it.standard_price, oldC, it.cost, '資材価格高騰による改定', daysAgo(40));
    const mid = Math.round(it.standard_price * 0.95);
    hist.run(it.id, oldP, mid, oldC, Math.round(it.cost * 0.93), '中間改定', daysAgo(80));
  }

  // ---- 住設マスター ----
  const insEq = db.prepare(
    'INSERT INTO equipment (category, maker, product_name, grade, is_standard, list_price, cost, sale_price, install_cost, note, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  );
  type Eq = [string, string, string, string, number, number, number, number, number];
  const eqs: Eq[] = [
    // category, maker, product, grade, is_standard, list, cost, sale, install
    ['キッチン', 'LIXIL', 'シエラS', 'standard', 1, 950000, 520000, 800000, 80000],
    ['キッチン', 'Panasonic', 'ラクシーナ', 'high', 0, 1300000, 720000, 1100000, 90000],
    ['キッチン', 'クリナップ', 'STEDIA', 'premium', 0, 1800000, 1000000, 1500000, 100000],
    ['浴室', 'TOTO', 'サザナ', 'standard', 1, 900000, 480000, 720000, 120000],
    ['浴室', 'LIXIL', 'スパージュ', 'premium', 0, 1500000, 820000, 1250000, 130000],
    ['洗面', 'LIXIL', 'ピアラ', 'standard', 1, 180000, 95000, 150000, 30000],
    ['洗面', 'Panasonic', 'シーライン', 'high', 0, 280000, 150000, 230000, 32000],
    ['トイレ', 'TOTO', 'ピュアレストQR', 'standard', 1, 150000, 80000, 125000, 25000],
    ['トイレ', 'TOTO', 'ネオレスト', 'premium', 0, 400000, 230000, 360000, 28000],
    ['給湯器', 'リンナイ', 'エコジョーズ', 'standard', 1, 250000, 140000, 210000, 20000],
    ['給湯器', 'ダイキン', 'エコキュート', 'high', 0, 600000, 360000, 520000, 40000],
    ['換気', 'Panasonic', '第1種熱交換換気', 'standard', 1, 350000, 200000, 300000, 50000],
    ['エアコン', 'ダイキン', '壁掛けエアコン', 'standard', 1, 150000, 90000, 130000, 20000],
    ['建具', 'LIXIL', 'ラシッサD', 'standard', 1, 0, 0, 0, 0],
    ['フローリング', '朝日ウッドテック', '挽板フローリング', 'standard', 1, 0, 0, 0, 0],
    ['外壁', 'ニチハ', 'Fu-ge', 'standard', 1, 0, 0, 0, 0],
    ['屋根', 'ニチハ', 'ガルバ横葺', 'standard', 1, 0, 0, 0, 0],
  ];
  for (const e of eqs) insEq.run(e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], '', now);

  // ---- オプションマスター ----
  const insOpt = db.prepare('INSERT INTO options (category, name, cost, sale_price, note) VALUES (?,?,?,?,?)');
  const opts: [string, string, number, number][] = [
    ['キッチン', '深型食洗機', 70000, 120000],
    ['キッチン', 'タッチレス水栓', 35000, 60000],
    ['キッチン', 'カップボード', 180000, 280000],
    ['キッチン', '天板変更（セラミック）', 120000, 200000],
    ['キッチン', 'レンジフード変更', 45000, 80000],
    ['浴室', '浴室暖房乾燥機', 90000, 150000],
    ['浴室', '手すり', 12000, 25000],
    ['浴室', '窓追加', 40000, 70000],
    ['トイレ', 'タンクレス化', 130000, 220000],
    ['トイレ', '手洗い器', 55000, 95000],
    ['洗面', '三面鏡収納', 30000, 55000],
  ];
  for (const o of opts) insOpt.run(o[0], o[1], o[2], o[3], '');

  // ---- 標準仕様セット（SW標準仕様） ----
  const insSet = db.prepare('INSERT INTO spec_sets (name, note) VALUES (?,?)');
  const insSetItem = db.prepare('INSERT INTO spec_set_items (spec_set_id, category, equipment_id) VALUES (?,?,?)');
  const stdCats = ['キッチン', '浴室', '洗面', 'トイレ', '外壁', '屋根'];
  const sw = insSet.run('SW標準仕様', 'SW工法 標準パッケージ');
  const swId = Number(sw.lastInsertRowid);
  for (const cat of stdCats) {
    const eq = db.prepare('SELECT id FROM equipment WHERE category=? AND is_standard=1 LIMIT 1').get(cat) as any;
    insSetItem.run(swId, cat, eq ? eq.id : null);
  }
  const std = insSet.run('一般標準仕様', '一般工法 標準パッケージ');
  const stdId = Number(std.lastInsertRowid);
  for (const cat of stdCats) {
    const eq = db.prepare('SELECT id FROM equipment WHERE category=? AND is_standard=1 LIMIT 1').get(cat) as any;
    insSetItem.run(stdId, cat, eq ? eq.id : null);
  }

  // ---- 物件サンプル ----
  const insProp = db.prepare(
    `INSERT INTO properties (name,total_floor_area,building_area,site_area,floors,rooms,is_two_household,is_sw,insulation_grade,seismic_grade,is_long_life,is_gx,note,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  insProp.run('A様邸 新築工事', 105.2, 58.4, 165.0, 2, 4, 0, 1, 6, 2, 1, 1, 'SW工法・長期優良', daysAgo(5), daysAgo(5));
  insProp.run('B様邸 二世帯住宅', 142.6, 78.2, 210.5, 2, 6, 1, 1, 6, 3, 1, 0, '二世帯', daysAgo(12), daysAgo(12));
  insProp.run('C様邸 平屋プラン', 88.0, 88.0, 200.0, 1, 3, 0, 0, 5, 2, 0, 0, '平屋', daysAgo(20), daysAgo(20));

  // ---- 過去見積データベース（分析用サンプル） ----
  const insPast = db.prepare(
    'INSERT INTO past_estimates (property_name,total_floor_area,work_item,detail,quantity,unit_price,amount,created_date,imported_at) VALUES (?,?,?,?,?,?,?,?,?)'
  );
  const pastSeed: [string, number, string, string, number, number, string][] = [
    ['過去物件1', 102, '基礎工事', 'ベタ基礎', 56, 25000, '2024-04-10'],
    ['過去物件2', 110, '基礎工事', 'ベタ基礎', 60, 26500, '2024-09-15'],
    ['過去物件3', 98, '基礎工事', 'ベタ基礎', 54, 28000, '2025-02-20'],
    ['過去物件4', 120, '基礎工事', 'ベタ基礎', 66, 29000, '2025-11-05'],
    ['過去物件1', 102, '木工事', '構造材・建方', 102, 38000, '2024-04-10'],
    ['過去物件2', 110, '木工事', '構造材・建方', 110, 40000, '2024-09-15'],
    ['過去物件3', 98, '木工事', '構造材・建方', 98, 41500, '2025-02-20'],
    ['過去物件4', 120, '木工事', '構造材・建方', 120, 43000, '2025-11-05'],
    ['過去物件1', 102, '外壁工事', '窯業系サイディング', 180, 9800, '2024-04-10'],
    ['過去物件2', 110, '外壁工事', '窯業系サイディング', 195, 10500, '2024-09-15'],
    ['過去物件3', 98, '外壁工事', '窯業系サイディング', 170, 11000, '2025-02-20'],
    ['過去物件1', 102, '内装工事', 'クロス工事', 320, 1350, '2024-04-10'],
    ['過去物件2', 110, '内装工事', 'クロス工事', 350, 1450, '2024-09-15'],
    ['過去物件3', 98, '内装工事', 'クロス工事', 300, 1500, '2025-02-20'],
  ];
  for (const p of pastSeed) insPast.run(p[0], p[1], p[2], p[3], p[4], p[5], p[4] * p[5], p[6], now);

  console.log('[seed] 初期データ投入完了');
}

if (require.main === module) {
  seedIfEmpty();
}
