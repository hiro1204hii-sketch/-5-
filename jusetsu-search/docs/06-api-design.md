# 6. API設計（REST）

ベースURL：`/api/v1`。レスポンスは JSON。一覧系はページネーション（`page`,`per_page`,`total`）を含む。
建材サーチの住設版として、**公開APIは登録不要**（お気に入り/比較も匿名で操作可）、施工例の逆引き、
メーカー入稿＋運営承認を表現する。

## 6.0 認証・スコープ

| 利用者 | 認証 | ヘッダ |
|---|---|---|
| 一般（閲覧・資料DL・お気に入り・比較） | 不要（匿名 `anon_id`） | `X-Anon-Id: <uuid>`（任意・お気に入り用） |
| 一般（同期したい人） | 任意ログイン(JWT) | `Authorization: Bearer <token>` |
| メーカー担当者（入稿） | JWT（`maker_users`） | `Authorization: Bearer <token>` |
| 運営（承認・全管理） | JWT（`admin_users`） | `Authorization: Bearer <token>` |

> 一般公開APIが返す商品は `status='published'` のみ。下書き/申請中はメーカー/運営APIでのみ参照可。

---

## 6.1 公開API（一般ユーザー・登録不要）

### 商品

| メソッド | パス | 説明 | 主なクエリ |
|---|---|---|---|
| GET | `/products` | 商品一覧・絞り込み・検索 | `q, category, maker, price_band, tags[], sort, page, per_page` |
| GET | `/products/:id` | 商品詳細（画像/資料/仕様/タグ/採用事例含む） | - |
| GET | `/products/:id/portfolios` | この商品の採用施工例 | `page` |
| GET | `/products/popular` | 人気商品 | `category, limit` |
| GET | `/products/new` | 新着商品 | `limit` |

**`GET /products` クエリ詳細**

| パラメータ | 例 | 説明 |
|---|---|---|
| `q` | `リシェル` | メーカー名/商品名/シリーズ名の部分一致 |
| `category` | `kitchen` | カテゴリslug |
| `maker` | `lixil,toto` | メーカーslug（カンマ区切りOR） |
| `price_band` | `10-30` | 価格帯（priceあり商品のみ対象） |
| `tags` | `island,ceramic-top` | 特徴タグslug（AND） |
| `sort` | `popular`/`new`/`price_asc`/`price_desc` | 並び替え |
| `page`,`per_page` | `1`,`24` | ページング |

**レスポンス例（`GET /products`）**

```json
{
  "data": [
    {
      "id": 101,
      "name": "システムキッチン リシェルSI I型",
      "series_name": "リシェルSI",
      "maker": { "id": 1, "name": "LIXIL", "slug": "lixil" },
      "category": { "id": 1, "name": "キッチン", "slug": "kitchen" },
      "price_kind": "fixed",
      "price": 850000,
      "price_band": "50-",
      "size_label": "W2550",
      "color_label": "12色",
      "main_image_url": "https://cdn/.../101.jpg",
      "tags": ["I型", "セラミック天板", "食洗機対応"]
    },
    {
      "id": 102, "name": "...", "price_kind": "open", "price": null, "price_band": null
    }
  ],
  "meta": { "page": 1, "per_page": 24, "total": 128 },
  "facets": {
    "categories":  [{ "slug": "kitchen", "count": 128 }],
    "makers":      [{ "slug": "lixil", "count": 40 }],
    "price_bands": [{ "band": "50-", "count": 32 }],
    "tags":        [{ "slug": "island", "count": 21 }]
  }
}
```

> `facets` は絞り込みUIの件数表示用。カテゴリ選択時はそのカテゴリの `category_tags` に属するタグのみ返す。
> `price_band` 集計は `price_kind='fixed'` の商品のみ（open/inquiry は除外）。

**レスポンス例（`GET /products/:id`）**

```json
{
  "id": 101,
  "name": "システムキッチン リシェルSI I型",
  "series_name": "リシェルSI",
  "description": "セラミックトップを採用した……",
  "price_kind": "fixed",
  "price": 850000,
  "price_label": "¥850,000〜（税抜）",
  "size_label": "W2550",
  "color_label": "ホワイト ほか12色",
  "product_url": "https://www.lixil.co.jp/...",
  "maker": { "id": 1, "name": "LIXIL", "slug": "lixil", "official_url": "..." },
  "category": { "id": 1, "name": "キッチン", "slug": "kitchen" },
  "images": [{ "url": "...", "alt": "..." }],
  "assets": [
    { "type": "catalog",    "title": "カタログ",   "file_url": "...", "file_ext": "pdf", "file_size": 12582912 },
    { "type": "spec_sheet", "title": "仕様書",     "file_url": "...", "file_ext": "pdf" },
    { "type": "cad",        "title": "CADデータ",  "file_url": "...", "file_ext": "zip" },
    { "type": "manual",     "title": "取扱説明書", "file_url": "...", "file_ext": "pdf" }
  ],
  "specs": [
    { "key": "天板素材", "value": "セラミック" },
    { "key": "間口", "value": "2550", "unit": "mm" }
  ],
  "tags": [{ "slug": "ceramic-top", "name": "セラミック天板" }],
  "portfolios": [ { "id": 9, "title": "モダンな対面キッチンのある家", "cover_image_url": "..." } ],
  "related": [ { "id": 102, "name": "..." } ]
}
```

> 価格の表示は `price_kind` により出し分け：`fixed`→`price_label`、`open`→「オープン価格」、`inquiry`→「要問合せ」。

### メーカー

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/makers` | メーカー一覧（`q, category, page`） |
| GET | `/makers/:id` | メーカー詳細（概要・公式URL・主要商品） |
| GET | `/makers/:id/products` | メーカーの商品一覧（`category, sort, page`） |
| GET | `/makers/popular` | 人気メーカー |

### カテゴリ・タグ

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/products/categories` | 全カテゴリ（建材サーチ準拠URL） |
| GET | `/products/categories/:slug` | カテゴリ詳細＋利用可能な特徴タグ |
| GET | `/products/categories/:slug/tags` | そのカテゴリの絞り込みタグ一覧 |

### 検索・サジェスト（EC感覚）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/search?q=` | メーカー・商品・シリーズ・施工例を横断検索（セクション別） |
| GET | `/search/suggest?q=` | **入力サジェスト**（MVP。種別ごとに最大数件を返す） |

```jsonc
// GET /search/suggest?q=リシェ
{
  "makers":   [],
  "products": [ { "id": 101, "name": "システムキッチン リシェルSI I型", "maker": "LIXIL" } ],
  "series":   [ { "series_name": "リシェルSI", "product_count": 4 } ]
}
```

### 比較（登録不要）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/compare?ids=101,102,103` | 指定商品（最大4）の比較用データ（共通仕様キーを揃えて返す） |

```json
{
  "products": [
    { "id": 101, "name": "...", "maker": "LIXIL", "price_kind": "fixed", "price_label": "¥850,000〜", "size_label": "W2550", "color_label": "12色" }
  ],
  "spec_rows": [
    { "key": "メーカー",   "values": ["LIXIL", "TOTO", "クリナップ"] },
    { "key": "価格",       "values": ["¥850,000〜", "オープン価格", "要問合せ"] },
    { "key": "天板素材",   "values": ["セラミック", "ステンレス", "人造大理石"] },
    { "key": "食洗機",     "values": ["対応", "対応", "対応"] }
  ]
}
```

### 施工例（逆引きの主役）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/portfolios` | 施工例一覧（`style, category, maker, page`） |
| GET | `/portfolios/:id` | 施工例詳細（写真・コメント・スタイルタグ・**使用設備一覧**） |

```json
// GET /portfolios/:id
{
  "id": 9,
  "title": "モダンな対面キッチンのある家",
  "comment": "グレー基調でまとめ……",
  "style_tags": [{ "slug": "modern", "name": "モダン" }],
  "images": [{ "url": "...", "alt": "..." }],
  "products": [
    { "product_id": 101, "name": "リシェルSI I型", "maker": "LIXIL", "category": "キッチン",
      "color_label": "グレー", "caption": "セラミック天板を採用", "main_image_url": "..." },
    { "product_id": 220, "name": "オクターブ", "maker": "TOTO", "category": "洗面化粧台",
      "color_label": "ホワイト", "caption": "" }
  ]
}
```

### お気に入り（匿名/ログイン両対応）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/favorites` | お気に入り一覧（`X-Anon-Id` または JWT で識別） |
| POST | `/favorites` | 追加 `{ "product_id": 101 }` |
| DELETE | `/favorites/:product_id` | 削除 |
| POST | `/favorites/merge` | 匿名→ログイン時のマージ `{ "anon_id": "..." }` |

---

## 6.2 マイページAPI（一般・任意ログイン）

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/auth/register` | 新規登録 `{ email, password, display_name?, user_type? }` |
| POST | `/auth/login` | ログイン → `{ token }` |
| GET  | `/me` | ログイン中ユーザー情報 |
| GET/POST/DELETE | `/me/compare-sets` | 保存した比較セットの取得/保存/削除 |

---

## 6.3 メーカー入稿API（要 JWT：`maker_users`、自社スコープ）

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/maker/auth/login` | メーカー担当者ログイン |
| GET  | `/maker/products` | 自社商品一覧（status フィルタ） |
| POST | `/maker/products` | 商品を下書き作成（`status=draft`） |
| GET  | `/maker/products/:id` | 自社商品取得（編集用） |
| PUT  | `/maker/products/:id` | 自社商品更新（draft/rejected のみ編集可） |
| POST | `/maker/products/:id/submit` | 公開申請（`draft/rejected → submitted`） |
| POST | `/maker/products/:id/images` , `/assets` | 画像・資料アップロード（multipart） |

> すべて `maker_id` スコープで制御し、他社商品へのアクセスは 403。

---

## 6.4 管理API（要 JWT：`admin_users` / role=admin・editor）

### 認証

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/admin/auth/login` | `{ email, password }` → `{ token }` |
| GET  | `/admin/me` | ログイン中の運営情報 |

### 入稿承認

| メソッド | パス | 説明 |
|---|---|---|
| GET  | `/admin/reviews` | 申請中（`submitted`）商品の一覧 |
| GET  | `/admin/reviews/:id` | 申請内容・差分プレビュー |
| POST | `/admin/products/:id/approve` | 承認して公開（`submitted → published`、`published_at` 設定） |
| POST | `/admin/products/:id/reject` | 差戻し（`submitted → rejected`、`{ comment }` 必須） |

> approve/reject は `product_review_logs` に履歴を追記。

### 商品 / メーカー / 担当者 / 分類 / 資料 / 施工例

| メソッド | パス | 説明 |
|---|---|---|
| GET/POST | `/admin/products` , `/:id`(GET/PUT/DELETE) | 商品CRUD（運営は `draft→published` 即時可） |
| PATCH | `/admin/products/:id/publish` | 公開/非公開切替 |
| POST/DELETE | `/admin/products/:id/images` , `/assets` | 画像・資料アップロード/削除 |
| POST | `/admin/uploads` | 署名付きURL発行（大容量CAD/カタログの直アップロード） |
| GET/POST | `/admin/makers` , `/:id`(PUT/DELETE) | メーカーCRUD |
| GET/POST | `/admin/maker-users` , `/:id`(PUT/DELETE) | メーカー担当者の発行・無効化 |
| GET/POST | `/admin/categories` , `/:id`(PUT/DELETE) | カテゴリCRUD |
| GET/POST | `/admin/tags` , `/:id`(PUT/DELETE) | タグCRUD（type: feature/style） |
| POST/DELETE | `/admin/categories/:id/tags` | カテゴリ⇔特徴タグ紐付け |
| GET/POST | `/admin/portfolios` , `/:id`(PUT/DELETE) | 施工例CRUD（写真・**使用設備(複数)** 紐付け含む） |

**`POST /admin/portfolios` ボディ例（使用設備の複数紐付け）**

```json
{
  "title": "モダンな対面キッチンのある家",
  "comment": "グレー基調でまとめ……",
  "style_tag_ids": [11, 14],
  "images": ["https://cdn/.../a.jpg", "https://cdn/.../b.jpg"],
  "products": [
    { "product_id": 101, "color_label": "グレー", "caption": "セラミック天板を採用", "sort_order": 1 },
    { "product_id": 220, "color_label": "ホワイト", "caption": "", "sort_order": 2 }
  ],
  "is_published": true
}
```

---

## 6.5 共通仕様

- **エラー形式**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "name": "必須です" } } }
  ```
- **ステータス**：200/201/204、400（バリデーション）、401/403（認証・スコープ）、404、409（重複）、422、500
- **レート制限**：公開APIはIP単位、入稿/管理APIはトークン単位
- **キャッシュ**：一覧・詳細・施工例は CDN/edge キャッシュ（更新・承認時にパージ）。`ETag` 対応
- **全文検索/サジェスト**：`pg_trgm` の類似度＋前方一致。将来 Meilisearch/OpenSearch へ差替可能な抽象化
- **ファイル**：CAD/カタログ等は署名付きURLで直アップロード/直DL（DLはログイン不要）
