# 5. テーブル設計（物理 / PostgreSQL）

DBMSは PostgreSQL を想定。全文検索は `pg_trgm`（メーカー名・商品名・シリーズ名）を利用。
共通方針：主キーは `BIGSERIAL`（or UUID）、`created_at` / `updated_at` を全テーブルに付与、
論理削除は `is_published` / `deleted_at` で対応。

## 5.1 テーブル一覧

| テーブル | 概要 |
|---|---|
| `makers` | メーカー |
| `categories` | カテゴリ（自己参照ツリー可） |
| `products` | 商品 |
| `product_images` | 商品画像 |
| `product_assets` | 商品資料（カタログ/仕様書/CAD/取説） |
| `product_specs` | 商品仕様（key/value） |
| `tags` | 特徴タグ |
| `category_tags` | カテゴリ⇔タグ（絞り込み候補） |
| `product_tags` | 商品⇔タグ |
| `cases` | 施工事例 |
| `case_images` | 施工事例画像 |
| `users` | 一般ユーザー |
| `favorites` | お気に入り |
| `admin_users` | 管理者 |

## 5.2 DDL

```sql
-- =========================================================
-- メーカー
-- =========================================================
CREATE TABLE makers (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  name_kana     VARCHAR(255),                 -- 50音ソート用
  slug          VARCHAR(255) UNIQUE NOT NULL,
  description    TEXT,                          -- メーカー概要
  logo_url      TEXT,
  official_url  TEXT,                          -- メーカーサイトリンク
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_makers_name_trgm ON makers USING gin (name gin_trgm_ops);

-- =========================================================
-- カテゴリ（キッチン等11種。parent_id で階層化も可能）
-- =========================================================
CREATE TABLE categories (
  id            BIGSERIAL PRIMARY KEY,
  parent_id     BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(120) UNIQUE NOT NULL,
  icon          VARCHAR(60),                   -- アイコン識別子
  description    TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 商品
-- =========================================================
CREATE TABLE products (
  id            BIGSERIAL PRIMARY KEY,
  maker_id      BIGINT NOT NULL REFERENCES makers(id) ON DELETE RESTRICT,
  category_id   BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name          VARCHAR(255) NOT NULL,         -- 商品名
  series_name   VARCHAR(255),                  -- シリーズ名
  slug          VARCHAR(255) UNIQUE,
  description    TEXT,                          -- 商品説明
  -- 代表値（比較・一覧の高速表示用）
  price         INT,                           -- 参考定価(税抜) NULL=オープン価格
  price_band    VARCHAR(20),                   -- '~10' '10-30' '30-50' '50-' 等
  size_label    VARCHAR(120),                  -- 例 "W2550" "1616"
  color_count   INT,                           -- カラー数
  color_label   VARCHAR(255),                  -- 例 "ホワイト/ベージュ ほか12色"
  product_url   TEXT,                          -- メーカー商品ページURL
  main_image_url TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  view_count    INT NOT NULL DEFAULT 0,        -- 人気商品の指標
  published_at  TIMESTAMPTZ,                   -- 新着並び用
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_maker      ON products(maker_id);
CREATE INDEX idx_products_category   ON products(category_id);
CREATE INDEX idx_products_price_band ON products(price_band);
CREATE INDEX idx_products_published  ON products(is_published, published_at DESC);
CREATE INDEX idx_products_name_trgm  ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_series_trgm ON products USING gin (series_name gin_trgm_ops);

-- =========================================================
-- 商品画像
-- =========================================================
CREATE TABLE product_images (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  alt          VARCHAR(255),
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_images_product ON product_images(product_id, sort_order);

-- =========================================================
-- 商品資料（カタログ / 仕様書 / CAD / 取説）
-- =========================================================
CREATE TYPE asset_type AS ENUM ('catalog', 'spec_sheet', 'cad', 'manual', 'other');

CREATE TABLE product_assets (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  asset_type   asset_type NOT NULL,
  title        VARCHAR(255),                  -- 表示名
  file_url     TEXT NOT NULL,
  file_name    VARCHAR(255),
  file_ext     VARCHAR(20),                   -- pdf, zip, dwg, jww ...
  file_size    BIGINT,                        -- bytes
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_assets_product ON product_assets(product_id, asset_type);

-- =========================================================
-- 商品仕様（key/value。カテゴリで項目が異なるため柔軟に保持）
-- =========================================================
CREATE TABLE product_specs (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  spec_key     VARCHAR(120) NOT NULL,         -- "天板素材" "間口" "タンク容量"
  spec_value   VARCHAR(500) NOT NULL,         -- "セラミック" "2550mm"
  unit         VARCHAR(40),                   -- "mm" "L" 等（任意）
  sort_order   INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_specs_product ON product_specs(product_id, sort_order);

-- =========================================================
-- 特徴タグ
-- =========================================================
CREATE TABLE tags (
  id           BIGSERIAL PRIMARY KEY,
  name         VARCHAR(80) NOT NULL,          -- "ペニンシュラ" "タンクレス"
  slug         VARCHAR(80) UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- カテゴリで使えるタグ（絞り込みUIの動的生成用）
CREATE TABLE category_tags (
  category_id  BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  tag_id       BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  sort_order   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, tag_id)
);

-- 商品⇔タグ
CREATE TABLE product_tags (
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id       BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);
CREATE INDEX idx_product_tags_tag ON product_tags(tag_id);

-- =========================================================
-- 施工事例
-- =========================================================
CREATE TABLE cases (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT REFERENCES products(id) ON DELETE SET NULL,
  title        VARCHAR(255),
  color_label  VARCHAR(120),                  -- 採用カラー
  comment      TEXT,                          -- コメント
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cases_product ON cases(product_id);

CREATE TABLE case_images (
  id           BIGSERIAL PRIMARY KEY,
  case_id      BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  alt          VARCHAR(255),
  sort_order   INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_case_images_case ON case_images(case_id, sort_order);

-- =========================================================
-- 一般ユーザー（お気に入り用、任意登録）
-- =========================================================
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  display_name  VARCHAR(120),
  company_type  VARCHAR(40),                  -- 'sales' 'design' 'builder' 'reform' 'owner'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- お気に入り（ログイン / 匿名 両対応）
-- =========================================================
CREATE TABLE favorites (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT REFERENCES users(id) ON DELETE CASCADE,
  anon_id      UUID,                          -- 未ログイン時のブラウザID
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)
);
CREATE UNIQUE INDEX uq_fav_user ON favorites(user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_fav_anon ON favorites(anon_id, product_id) WHERE anon_id IS NOT NULL;

-- =========================================================
-- 管理者
-- =========================================================
CREATE TABLE admin_users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(120),
  role          VARCHAR(40) NOT NULL DEFAULT 'editor',  -- 'admin' / 'editor'
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 5.3 初期マスタ（カテゴリ / タグ）例

```sql
INSERT INTO categories (name, slug, icon, sort_order) VALUES
 ('キッチン','kitchen','kitchen',1),
 ('ユニットバス','unit-bath','bath',2),
 ('洗面化粧台','vanity','vanity',3),
 ('トイレ','toilet','toilet',4),
 ('給湯設備','water-heater','heater',5),
 ('換気設備','ventilation','vent',6),
 ('空調設備','air-conditioner','ac',7),
 ('太陽光発電','solar','solar',8),
 ('蓄電池','battery','battery',9),
 ('宅配ボックス','delivery-box','box',10),
 ('照明','lighting','light',11);

-- タグ例（カテゴリ別に category_tags で紐付け）
-- キッチン: ペニンシュラ/アイランド/I型/L型/セラミック天板/ステンレス天板/食洗機対応
-- ユニットバス: 1616/1620/肩湯/浴室乾燥機
-- 洗面: 900/1200/造作風
-- トイレ: タンクレス/タンク付/自動洗浄
```

## 5.4 集計・派生（人気商品など）

- **人気商品** … `products.view_count` の降順、または直近30日のアクセスを集計テーブル
  `product_views_daily(product_id, date, count)` に保持して算出。
- **新着商品** … `products.published_at DESC`。
- **人気メーカー** … メーカーごとの商品閲覧合計 or お気に入り数で算出。
