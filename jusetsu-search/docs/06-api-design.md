# 6. API設計（REST）

ベースURL：`/api/v1`
レスポンスは JSON。一覧系はページネーション（`page`, `per_page`, `total`）を含む。
認証：管理APIは `Authorization: Bearer <JWT>`。一般APIは公開（お気に入りは `X-Anon-Id` or JWT）。

## 6.1 公開API（一般ユーザー）

### 商品

| メソッド | パス | 説明 | 主なクエリ/パラメータ |
|---|---|---|---|
| GET | `/products` | 商品一覧・絞り込み・検索 | `q, category, maker, price_band, tags[], sort, page, per_page` |
| GET | `/products/:id` | 商品詳細（画像/資料/仕様/タグ/施工事例含む） | - |
| GET | `/products/:id/cases` | 商品の施工事例一覧 | `page` |
| GET | `/products/popular` | 人気商品 | `category, limit` |
| GET | `/products/new` | 新着商品 | `limit` |

**`GET /products` クエリ詳細**

| パラメータ | 例 | 説明 |
|---|---|---|
| `q` | `リシェル` | メーカー名/商品名/シリーズ名の部分一致 |
| `category` | `kitchen` | カテゴリslug |
| `maker` | `lixil,toto` | メーカーslug（カンマ区切りでOR） |
| `price_band` | `10-30` | 価格帯 |
| `tags` | `island,ceramic-top` | タグslug（AND） |
| `sort` | `popular` / `new` / `price_asc` / `price_desc` | 並び替え |
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
      "price": 850000,
      "price_band": "50-",
      "size_label": "W2550",
      "color_label": "12色",
      "main_image_url": "https://cdn/.../101.jpg",
      "tags": ["I型", "セラミック天板", "食洗機対応"]
    }
  ],
  "meta": { "page": 1, "per_page": 24, "total": 128 },
  "facets": {
    "categories": [{ "slug": "kitchen", "count": 128 }],
    "makers": [{ "slug": "lixil", "count": 40 }],
    "price_bands": [{ "band": "50-", "count": 32 }],
    "tags": [{ "slug": "island", "count": 21 }]
  }
}
```

> `facets` は絞り込みUIに件数を表示するために返す（カテゴリ選択時はそのカテゴリの `category_tags` ベースのタグのみ）。

**レスポンス例（`GET /products/:id`）**

```json
{
  "id": 101,
  "name": "システムキッチン リシェルSI I型",
  "series_name": "リシェルSI",
  "description": "セラミックトップを採用した……",
  "price": 850000,
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
  "related": [ { "id": 102, "name": "..." } ]
}
```

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
| GET | `/categories` | 全カテゴリ |
| GET | `/categories/:slug` | カテゴリ詳細＋利用可能タグ |
| GET | `/categories/:slug/tags` | そのカテゴリの絞り込みタグ一覧 |

### 比較

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/compare?ids=101,102,103` | 指定商品（最大4）の比較用データ（共通仕様キーを揃えて返す） |

```json
{
  "products": [ { "id": 101, "name": "...", "maker": "...", "price": 850000, "size_label": "W2550", "color_label": "12色" } ],
  "spec_rows": [
    { "key": "メーカー",   "values": ["LIXIL", "TOTO", "クリナップ"] },
    { "key": "天板素材",   "values": ["セラミック", "ステンレス", "人造大理石"] },
    { "key": "食洗機",     "values": ["対応", "対応", "対応"] }
  ]
}
```

### 施工事例

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/cases` | 施工事例一覧（`category, maker, tag, page`） |
| GET | `/cases/:id` | 施工事例詳細（写真・商品・カラー・コメント） |

### 検索（横断）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/search?q=` | メーカー・商品・シリーズを横断検索。種別ごとにまとめて返す |

```json
{
  "query": "リシェル",
  "makers":   [],
  "products": [ { "id": 101, "name": "...", "maker": "LIXIL" } ],
  "series":   [ { "series_name": "リシェルSI", "product_count": 4 } ]
}
```

### お気に入り（匿名/ログイン両対応）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/favorites` | お気に入り一覧（`X-Anon-Id` or JWT で識別） |
| POST | `/favorites` | 追加 `{ "product_id": 101 }` |
| DELETE | `/favorites/:product_id` | 削除 |
| POST | `/favorites/merge` | 匿名→ログイン時のマージ `{ "anon_id": "..." }` |

## 6.2 管理API（要 JWT・role=admin/editor）

### 認証

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/admin/auth/login` | `{ email, password }` → `{ token }` |
| POST | `/admin/auth/logout` | - |
| GET  | `/admin/me` | ログイン中の管理者情報 |

### 商品

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/admin/products` | 一覧（公開/下書き含む、検索・絞り込み） |
| POST | `/admin/products` | 登録 |
| GET | `/admin/products/:id` | 取得（編集用） |
| PUT | `/admin/products/:id` | 更新 |
| DELETE | `/admin/products/:id` | 削除 |
| PATCH | `/admin/products/:id/publish` | 公開/非公開切替 |

**`POST /admin/products` ボディ例**

```json
{
  "maker_id": 1,
  "category_id": 1,
  "name": "システムキッチン リシェルSI I型",
  "series_name": "リシェルSI",
  "description": "……",
  "price": 850000,
  "size_label": "W2550",
  "color_count": 12,
  "color_label": "ホワイト ほか12色",
  "product_url": "https://www.lixil.co.jp/...",
  "tag_ids": [3, 5, 7],
  "specs": [ { "key": "天板素材", "value": "セラミック" } ],
  "is_published": true
}
```

### 資料・画像アップロード

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/admin/products/:id/images` | 画像アップロード（multipart） |
| DELETE | `/admin/products/:id/images/:imageId` | 画像削除 |
| POST | `/admin/products/:id/assets` | 資料アップロード（`asset_type` 指定、multipart） |
| DELETE | `/admin/products/:id/assets/:assetId` | 資料削除 |
| POST | `/admin/uploads` | 署名付きURL発行（大容量CAD/カタログ用の直アップロード） |

### メーカー / カテゴリ / タグ / 施工事例

| メソッド | パス | 説明 |
|---|---|---|
| GET/POST | `/admin/makers` , `/admin/makers/:id`(PUT/DELETE) | メーカーCRUD |
| GET/POST | `/admin/categories` , `/:id`(PUT/DELETE) | カテゴリCRUD |
| GET/POST | `/admin/tags` , `/:id`(PUT/DELETE) | タグCRUD |
| POST/DELETE | `/admin/categories/:id/tags` | カテゴリ⇔タグ紐付け |
| GET/POST | `/admin/cases` , `/:id`(PUT/DELETE) | 施工事例CRUD（画像アップロード含む） |

## 6.3 共通仕様

- **エラー形式**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "name": "必須です" } } }
  ```
- **ステータス**：200/201/204、400（バリデーション）、401/403（認証）、404、409（重複）、422、500
- **レート制限**：公開APIはIP単位、管理APIはトークン単位
- **キャッシュ**：一覧・詳細は CDN/edge キャッシュ（更新時パージ）。`ETag` 対応
- **全文検索**：`q` は `pg_trgm` の類似度＋前方一致。将来 Meilisearch / OpenSearch へ差替可能な抽象化
