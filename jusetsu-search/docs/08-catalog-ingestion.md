# 8. カタログ取り込み（インジェスト）設計

各業者（メーカー）のWebカタログ・商品情報・資料（カタログ/仕様書/CAD/取説）を
住設サーチへ集約するための**取り込み基盤**の設計。建材サーチの「情報を一箇所に集約」を支える要。

## 8.1 大原則（コンプライアンス）

> **無断の自動クロール/スクレイピングは行わない。** メーカーの利用規約・著作権・ロボット規約を尊重する。

取り込みは、以下の **許諾を得たデータ** を基本とする：

1. **メーカー入稿**（`/maker` ポータル）… 各社が自社データを直接登録（最も望ましい）
2. **データ提供フィード**（CSV/Excel/JSON/API）… 各社・代理店から提供される商品マスタ
3. **運営による手動登録**（許諾済みのカタログPDF・公式公開情報をもとに登録）
4. **公式の許可がある範囲での自動取得**（メーカーと合意した公開フィード/サイトマップのみ）

各データには**出典（source）と掲載許諾フラグ**を保持し、商品ページでは原則として
**メーカー公式の商品URLへ誘導**する（情報の正確性と権利の尊重）。

## 8.2 取り込み方式の比較

| 方式 | 入力 | 主な用途 | 自動/手動 | 優先度 |
|---|---|---|---|---|
| メーカー入稿 | フォーム＋ファイル | 継続更新・新色追加 | 手動（メーカー） | ◎ 中核 |
| CSV/Excel一括 | テンプレ表＋資料ZIP | 初期大量投入・移行 | 半自動（運営） | ◎ Phase2 |
| 提供API/JSONフィード | HTTP取得 | 定期同期・差分更新 | 自動 | ○ Phase4 |
| 許諾済みクロール | サイトマップ/公開フィード | 補完（合意済のみ） | 自動（限定） | △ 合意時のみ |

## 8.3 取り込みパイプライン

```
[1] 受領        CSV/Excel・資料ZIP・APIフィード・入稿フォーム
      │
[2] 取り込みジョブ生成   import_jobs（source, type, status=pending）
      │
[3] バリデーション      必須項目/型/カテゴリ・メーカー存在/重複キー
      │   ├─ NG → import_errors に行単位で記録（行番号・理由）
      │   └─ OK
[4] 名寄せ・マッピング   メーカー名→maker_id、カテゴリ→category_id、
      │                  タグ正規化、価格区分(price_kind)判定
[5] 資料ひも付け        PDF/CAD/取説を product_assets へ（種別自動判定 or 指定）
      │                  大容量は署名付きURLで直アップロード
[6] ステージング保存    status='draft' で products に保存（即公開しない）
      │
[7] レビュー/承認        運営が内容確認 → published（or メーカー入稿なら submit→承認）
      │
[8] 公開・パージ        published_at 設定、CDNキャッシュをパージ
```

ジョブは**冪等**（同じ外部キー `external_id` は upsert）。再取り込みで重複を作らない。

## 8.4 CSV/Excel 取り込みテンプレート

商品マスタ（1行＝1商品）。資料は別ZIP（ファイル名で `external_id` を突き合わせ）。

| 列 | 必須 | 例 | 対応カラム |
|---|---|---|---|
| `external_id` | ◎ | `LIXIL-RICHELLE-SI-I` | 名寄せ/冪等キー |
| `maker` | ◎ | `LIXIL` | makers.name（→maker_id 解決） |
| `category` | ◎ | `キッチン` | categories.name |
| `series_name` |  | `リシェルSI` | products.series_name |
| `name` | ◎ | `システムキッチン リシェルSI I型` | products.name |
| `description` |  | … | products.description |
| `price_kind` | ◎ | `fixed`/`open`/`inquiry` | products.price_kind |
| `price` | △ | `850000` | products.price（fixed時必須） |
| `size_label` |  | `W2550` | products.size_label |
| `color_count` |  | `12` | products.color_count |
| `color_label` |  | `ホワイト ほか12色` | products.color_label |
| `product_url` |  | `https://...` | products.product_url |
| `tags` |  | `I型;セラミック天板;食洗機対応` | product_tags（`;`区切り、無ければ自動作成候補） |
| `spec_*` |  | `spec_天板素材=セラミック` | product_specs（`spec_`接頭辞でkey/value） |
| `image_files` |  | `richelle_1.jpg;richelle_2.jpg` | product_images（ZIP内ファイル名） |
| `catalog_file` |  | `richelle_catalog.pdf` | product_assets(catalog) |
| `spec_file` |  | `richelle_spec.pdf` | product_assets(spec_sheet) |
| `cad_file` |  | `richelle_cad.zip` | product_assets(cad) |
| `manual_file` |  | `richelle_manual.pdf` | product_assets(manual) |
| `source` |  | `maker_feed_2026Q2` | 取り込み元の記録 |

> CSVは UTF-8(BOM可)。Excelは1シート目を読む。資料ZIPはファイル名で行と突き合わせる。

## 8.5 取り込み用テーブル（追加DDL）

```sql
-- 取り込みジョブ
CREATE TYPE import_source AS ENUM ('csv', 'excel', 'api', 'maker_form', 'crawl');
CREATE TYPE import_status AS ENUM ('pending', 'validating', 'staged', 'partially_failed', 'completed', 'failed');

CREATE TABLE import_jobs (
  id            BIGSERIAL PRIMARY KEY,
  source        import_source NOT NULL,
  source_label  VARCHAR(255),                 -- 例 "LIXIL 2026Q2 マスタ"
  maker_id      BIGINT REFERENCES makers(id) ON DELETE SET NULL,
  file_url      TEXT,                          -- 取り込んだ元ファイル
  status        import_status NOT NULL DEFAULT 'pending',
  total_rows    INT NOT NULL DEFAULT 0,
  success_rows  INT NOT NULL DEFAULT 0,
  error_rows    INT NOT NULL DEFAULT 0,
  created_by    BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ
);

-- 行単位エラー
CREATE TABLE import_errors (
  id            BIGSERIAL PRIMARY KEY,
  job_id        BIGINT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number    INT,
  external_id   VARCHAR(255),
  field         VARCHAR(120),
  message       TEXT,
  raw           JSONB                          -- 元行データ
);
CREATE INDEX idx_import_errors_job ON import_errors(job_id);

-- 外部ID対応（冪等な再取り込み・差分更新のための名寄せ）
CREATE TABLE product_external_refs (
  id            BIGSERIAL PRIMARY KEY,
  product_id    BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source        VARCHAR(80) NOT NULL,          -- 'maker_feed_2026Q2' 等
  external_id   VARCHAR(255) NOT NULL,
  source_url    TEXT,                          -- 出典URL（公式）
  license_note  VARCHAR(255),                  -- 掲載許諾の記録
  last_synced_at TIMESTAMPTZ,
  UNIQUE (source, external_id)
);
CREATE INDEX idx_ext_refs_product ON product_external_refs(product_id);
```

> 既存の `products` には取り込み由来でも `status='draft'` で入り、承認を経て公開。
> `product_external_refs` により、同一 `(source, external_id)` は **upsert**（重複作成を防止・差分更新）。

## 8.6 取り込みAPI（運営）

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/admin/imports` | 取り込みジョブ作成（CSV/ExcelをアップロードまたはファイルURL指定） |
| POST | `/admin/imports/:id/assets` | 資料ZIPを添付（ファイル名で行と突き合わせ） |
| POST | `/admin/imports/:id/run` | バリデーション＋ステージング実行 |
| GET  | `/admin/imports/:id` | 進捗・結果サマリ（total/success/error） |
| GET  | `/admin/imports/:id/errors` | 行単位エラー一覧（DL可） |
| POST | `/admin/imports/:id/publish` | ステージング分を一括公開（または個別承認へ） |
| GET  | `/admin/imports/template.csv` | 取り込みテンプレートのダウンロード |

## 8.7 取り込み管理画面（A-12：`/admin/imports`）

```
┌──────────── 管理ヘッダー ─────────────────────────────────────────────┐
│ カタログ取り込み                          [ + 新規取り込み ] [テンプレDL]│
├──────────────────────────────────────────────────────────────────────┤
│ ジョブ        | 元      | 行数  | 成功 | エラー | 状態      | 操作       │
│ LIXIL 2026Q2 | CSV     | 240  | 232 | 8     | ｽﾃｰｼﾞﾝｸﾞ  | [確認][公開]│
│ TOTO 春版    | Excel   | 180  | 180 | 0     | 完了      | [詳細]     │
├──────────────────────────────────────────────────────────────────────┤
│ ▼ エラー詳細（行単位）                                                 │
│   row 12  external_id=TOTO-XXX  price: fixedだが価格が空です           │
│   row 41  category "浴室" が見つかりません（候補: ユニットバス）        │
│   [ エラーCSVをダウンロード ]                                          │
└──────────────────────────────────────────────────────────────────────┘
```

## 8.8 名寄せ・正規化ルール

- **メーカー/カテゴリ** … 完全一致 → 別名辞書（alias）→ 候補提示（自動作成はしない）
- **タグ** … 既存タグに一致しなければ「未登録タグ」として保留し、運営が承認後に作成
- **価格** … `price_kind=fixed` は `price` 必須、`open/inquiry` は `price=NULL`（テーブルのCHECK制約に整合）
- **資料種別** … 拡張子・ファイル名から自動推定（`*_cad.zip`→cad、`*spec*`→spec_sheet）＋手動修正可
- **重複** … `(source, external_id)` でupsert。画像・資料は差分のみ反映

## 8.9 自動同期（Phase4・合意済フィードのみ）

- メーカー提供の CSV/JSON/API を定期取得（cron/worker）→ `import_jobs(source='api')`
- 差分のみ更新（`last_synced_at`、ハッシュ比較）。価格・在庫・廃番フラグを反映
- 廃番は論理的に非公開化（`status` を `published`→`draft`、または `is_published=FALSE`）
- 取得は **robots/利用規約に従い、許可された範囲のみ**。レート制御・User-Agent明示・問い合わせ窓口記載
