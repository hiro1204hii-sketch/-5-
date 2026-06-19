# 5. テーブル設計（物理 / PostgreSQL）

DBMSは PostgreSQL を想定。全文検索＋サジェストは `pg_trgm`（メーカー名・商品名・シリーズ名）。
共通方針：主キーは `BIGSERIAL`、`created_at`/`updated_at` を付与、公開可否は `products.status` /
各テーブルの `is_published` で制御。建材サーチの住設版として、入稿承認・施工例の逆引き（N:N）・
匿名お気に入り・価格非公開運用を物理設計に反映する。

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## 5.1 テーブル一覧

| テーブル | 概要 |
|---|---|
| `makers` | メーカー |
| `maker_users` | メーカー担当者（自社商品を入稿） |
| `categories` | カテゴリ（自己参照ツリー可） |
| `products` | 商品（`status` で入稿〜公開） |
| `product_images` | 商品画像 |
| `product_assets` | 商品資料（カタログ/仕様書/CAD/取説） |
| `product_specs` | 商品仕様（key/value） |
| `tags` | タグ（特徴/スタイルを `type` で共用） |
| `category_tags` | カテゴリ⇔特徴タグ（絞り込み候補） |
| `product_tags` | 商品⇔特徴タグ |
| `portfolios` | 施工例 |
| `portfolio_images` | 施工例の写真 |
| `portfolio_products` | 施工例⇔商品（N:N＝逆引き） |
| `portfolio_tags` | 施工例⇔スタイルタグ |
| `users` | 一般ユーザー（任意登録・最小構成） |
| `favorites` | お気に入り（ログイン/匿名） |
| `admin_users` | 運営アカウント |
| `product_review_logs` | 入稿の承認/差戻し履歴 |

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
  description   TEXT,                          -- メーカー概要
  logo_url      TEXT,
  official_url  TEXT,                          -- メーカーサイトリンク
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_makers_name_trgm ON makers USING gin (name gin_trgm_ops);

-- =========================================================
-- メーカー担当者（自社商品を入稿。maker_id に属する）
-- =========================================================
CREATE TABLE maker_users (
  id            BIGSERIAL PRIMARY KEY,
  maker_id      BIGINT NOT NULL REFERENCES makers(id) ON DELETE CASCADE,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(120),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_maker_users_maker ON maker_users(maker_id);

-- =========================================================
-- カテゴリ（11種。parent_id で小分類も可）
-- =========================================================
CREATE TABLE categories (
  id            BIGSERIAL PRIMARY KEY,
  parent_id     BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(120) UNIQUE NOT NULL,
  icon          VARCHAR(60),
  description   TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 商品（入稿〜公開ワークフローを status で管理）
-- =========================================================
CREATE TYPE product_status AS ENUM ('draft', 'submitted', 'published', 'rejected');
CREATE TYPE price_kind     AS ENUM ('fixed', 'open', 'inquiry');  -- 通常/オープン価格/要問合せ

CREATE TABLE products (
  id            BIGSERIAL PRIMARY KEY,
  maker_id      BIGINT NOT NULL REFERENCES makers(id) ON DELETE RESTRICT,
  category_id   BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  created_by_maker_user BIGINT REFERENCES maker_users(id) ON DELETE SET NULL, -- 入稿者(任意)
  name          VARCHAR(255) NOT NULL,         -- 商品名
  series_name   VARCHAR(255),                  -- シリーズ名
  slug          VARCHAR(255) UNIQUE,
  description   TEXT,                           -- 商品説明
  -- 価格（住宅設備はオープン価格が多い）
  price_kind    price_kind NOT NULL DEFAULT 'fixed',
  price         INT,                            -- メーカー希望小売価格(税抜)。open/inquiry時はNULL
  price_band    VARCHAR(20),                    -- '~10','10-30','30-50','50-'（priceあり時のみ）
  -- 代表値（一覧・比較の高速表示）
  size_label    VARCHAR(120),                   -- 例 "W2550" "1616"
  color_count   INT,
  color_label   VARCHAR(255),
  product_url   TEXT,                           -- メーカー商品ページURL
  main_image_url TEXT,
  -- 状態
  status        product_status NOT NULL DEFAULT 'draft',
  reject_reason TEXT,                           -- 直近の差戻し理由
  view_count    INT NOT NULL DEFAULT 0,
  published_at  TIMESTAMPTZ,                    -- 公開（新着並び用）
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_price CHECK (
    (price_kind = 'fixed'  AND price IS NOT NULL) OR
    (price_kind <> 'fixed' AND price IS NULL)
  )
);
CREATE INDEX idx_products_maker       ON products(maker_id);
CREATE INDEX idx_products_category    ON products(category_id);
CREATE INDEX idx_products_status      ON products(status, published_at DESC);
CREATE INDEX idx_products_price_band  ON products(price_band) WHERE price_band IS NOT NULL;
CREATE INDEX idx_products_name_trgm   ON products USING gin (name gin_trgm_ops);
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
  title        VARCHAR(255),
  file_url     TEXT NOT NULL,
  file_name    VARCHAR(255),
  file_ext     VARCHAR(20),                    -- pdf, zip, dwg, jww ...
  file_size    BIGINT,                         -- bytes
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_assets_product ON product_assets(product_id, asset_type);

-- =========================================================
-- 商品仕様（key/value）
-- =========================================================
CREATE TABLE product_specs (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  spec_key     VARCHAR(120) NOT NULL,          -- "天板素材" "間口" "タンク容量"
  spec_value   VARCHAR(500) NOT NULL,
  unit         VARCHAR(40),
  sort_order   INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_specs_product ON product_specs(product_id, sort_order);

-- =========================================================
-- タグ（特徴タグ / 施工例スタイルタグを type で共用）
-- =========================================================
CREATE TYPE tag_type AS ENUM ('feature', 'style');

CREATE TABLE tags (
  id           BIGSERIAL PRIMARY KEY,
  type         tag_type NOT NULL DEFAULT 'feature',
  name         VARCHAR(80) NOT NULL,           -- "ペニンシュラ" "タンクレス" "モダン"
  slug         VARCHAR(80) UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- カテゴリで使える特徴タグ（絞り込みUIの動的生成用）
CREATE TABLE category_tags (
  category_id  BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  tag_id       BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  sort_order   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, tag_id)
);

-- 商品⇔特徴タグ
CREATE TABLE product_tags (
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id       BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);
CREATE INDEX idx_product_tags_tag ON product_tags(tag_id);

-- =========================================================
-- 施工例（空間イメージ）
-- =========================================================
CREATE TABLE portfolios (
  id           BIGSERIAL PRIMARY KEY,
  title        VARCHAR(255),
  comment      TEXT,                            -- コメント
  cover_image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_portfolios_published ON portfolios(is_published, published_at DESC);

CREATE TABLE portfolio_images (
  id           BIGSERIAL PRIMARY KEY,
  portfolio_id BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  alt          VARCHAR(255),
  sort_order   INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_portfolio_images_pf ON portfolio_images(portfolio_id, sort_order);

-- ★ 施工例⇔商品（N:N）＝1事例に複数設備（逆引きの核）
CREATE TABLE portfolio_products (
  id           BIGSERIAL PRIMARY KEY,
  portfolio_id BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_label  VARCHAR(120),                    -- この事例での採用カラー
  caption      TEXT,                            -- 「セラミック天板を採用」等
  sort_order   INT NOT NULL DEFAULT 0,
  UNIQUE (portfolio_id, product_id)
);
CREATE INDEX idx_pf_products_pf      ON portfolio_products(portfolio_id, sort_order);
CREATE INDEX idx_pf_products_product ON portfolio_products(product_id);

-- 施工例⇔スタイルタグ
CREATE TABLE portfolio_tags (
  portfolio_id BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  tag_id       BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (portfolio_id, tag_id)
);
CREATE INDEX idx_portfolio_tags_tag ON portfolio_tags(tag_id);

-- =========================================================
-- 一般ユーザー（任意登録・お気に入り同期用、最小構成）
-- =========================================================
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(120),
  user_type     VARCHAR(40),                    -- 任意 'sales'/'design'/'builder'/'reform'/'owner'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- お気に入り（登録不要＝匿名 anon_id / ログイン＝user_id）
-- =========================================================
CREATE TABLE favorites (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT REFERENCES users(id) ON DELETE CASCADE,
  anon_id      UUID,                            -- 未ログイン時のブラウザID
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)
);
CREATE UNIQUE INDEX uq_fav_user ON favorites(user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_fav_anon ON favorites(anon_id, product_id) WHERE anon_id IS NOT NULL;

-- =========================================================
-- 運営アカウント
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

-- =========================================================
-- 入稿承認/差戻しの履歴（監査）
-- =========================================================
CREATE TABLE product_review_logs (
  id            BIGSERIAL PRIMARY KEY,
  product_id    BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_status   product_status,
  to_status     product_status NOT NULL,
  admin_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
  comment       TEXT,                            -- 差戻し理由など
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_logs_product ON product_review_logs(product_id, created_at);
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

-- 特徴タグ(type=feature)。category_tags でカテゴリに紐付け
-- キッチン: ペニンシュラ/アイランド/I型/L型/セラミック天板/ステンレス天板/食洗機対応
-- ユニットバス: 1616/1620/肩湯/浴室乾燥機
-- 洗面: 900/1200/造作風
-- トイレ: タンクレス/タンク付/自動洗浄

-- スタイルタグ(type=style)：施工例用
-- モダン / ナチュラル / 北欧 / ホテルライク / 和モダン / インダストリアル …
```

## 5.4 公開・集計の方針（簡素）

- **一般公開クエリ** … `products.status='published'`、`portfolios.is_published=TRUE` のみ対象。
- **人気商品** … `products.view_count DESC`（必要に応じ将来 `product_views_daily` を追加）。
- **新着商品** … `products.published_at DESC`。
- **人気メーカー** … メーカー単位の `view_count` 合計 or お気に入り数で算出。
- 初期は専用集計テーブルを置かず、過剰設計を避ける（拡張余地は注記のみ）。

## 5.5 整合性・運用メモ

- `products.status` 遷移時は必ず `product_review_logs` に追記（アプリ層 or トリガ）。
- メーカーポータル経由の更新は `maker_id` スコープで制御（自社以外は不可）。
- 価格は `price_kind` で表示を出し分け（fixed=金額 / open=オープン価格 / inquiry=要問合せ）。
- 施工例の「使用設備」削除時、商品自体は消さない（`portfolio_products` のみ CASCADE）。
