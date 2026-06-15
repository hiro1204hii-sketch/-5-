# 住宅概算・原価管理システム

工務店向けの「概算見積システム」。
単に見積を作るのではなく、**過去見積データ・実行予算データを蓄積し、概算見積の精度を継続的に向上させること**を目的とする。

本リポジトリは **Phase1（概算見積作成）を MVP** として実装したもの。

---

## 目次

1. [システム構成図](#1-システム構成図)
2. [データベース設計](#2-データベース設計)
3. [画面設計](#3-画面設計)
4. [MVP実装 / セットアップ](#4-mvp実装--セットアップ)
5. [API一覧](#5-api一覧)
6. [開発ロードマップ](#6-開発ロードマップ)

---

## 1. システム構成図

```
┌───────────────────────────────────────────────────────────────┐
│                         ブラウザ (PC優先)                       │
│  React + TypeScript + Tailwind CSS (Vite)                       │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │ダッシュ  │ 物件     │ 各種     │ 概算見積 │ 過去見積/    │  │
│  │ボード    │ 管理     │ マスター │ 作成     │ 分析         │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
└───────────────────────────┬───────────────────────────────────┘
                            │ REST / JSON (HTTP)
┌───────────────────────────▼───────────────────────────────────┐
│                      API サーバー                               │
│  Node.js + TypeScript + Express                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Routes  : properties / work-items / equipment / options  │  │
│  │           standard-specs / estimates / past-estimates    │  │
│  │           analytics / dashboard / price-history          │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ 概算計算エンジン (calc engine)                            │  │
│  │  - 計算方式 × 補正係数(部屋数/階数/SW/GX/グレード)        │  │
│  │  - 標準仕様との差額計算                                   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ 分析エンジン (平均/中央値/最大/最小/最新/上昇率)         │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────┘
                            │ SQL (標準SQLのみ / PG移行可能)
┌───────────────────────────▼───────────────────────────────────┐
│   データベース  SQLite で開始 → PostgreSQL へ移行可能な設計    │
│   物件 / 工事項目 / 単価履歴 / 住設 / オプション /             │
│   標準仕様 / 概算見積 / 過去見積(CSV取込) / 補正係数           │
└───────────────────────────────────────────────────────────────┘
```

### 設計上のポイント（精度向上のための蓄積）

| 蓄積対象 | テーブル | 精度向上への寄与 |
|---|---|---|
| 単価更新履歴 | `price_history` | いつ・何が・いくら変わったかを追跡し単価の鮮度を担保 |
| 標準仕様との差額 | `estimate_equipment_lines.diff` | 物件ごとの差額を蓄積しオプション傾向を把握 |
| 過去見積比較 | `past_estimates` | CSV取込した実績を工事項目別に分析へ供給 |
| 実績との差額分析 | `analytics` (将来 `actual_budgets`) | 概算と実績の乖離を測定し係数を補正（Phase3以降） |

### PostgreSQL 移行方針

- SQLite 固有の型・関数は使わず、整数主キー＋標準 SQL のみを使用。
- 真偽値は `INTEGER (0/1)` で保持（PG では `BOOLEAN` へ変換可能）。
- 日時は ISO8601 文字列（`TEXT`）で保持（PG では `timestamptz` へ）。
- DB アクセスは `lib/db.ts` の 1 ファイルに集約。クエリは標準 SQL。
  移行時はドライバ差し替え＋型マッピングのみで対応可能。

---

## 2. データベース設計

### ER概要

```
properties ──< estimates ──< estimate_work_lines
                  │       └─< estimate_equipment_lines ──< estimate_option_lines
                  └─ spec_sets ──< spec_set_items ─── equipment
work_items (自己参照: 大>中>小) ──< price_history
options
past_estimates   coefficients
```

### テーブル定義

#### properties（物件）
| カラム | 型 | 説明 |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | 物件名 |
| total_floor_area | REAL | 延床面積(㎡) |
| building_area | REAL | 建築面積(㎡) |
| site_area | REAL | 敷地面積(㎡) |
| floors | INTEGER | 階数 |
| rooms | INTEGER | 部屋数 |
| is_two_household | INTEGER | 二世帯住宅 (0/1) |
| is_sw | INTEGER | SW工法 (0/1) |
| insulation_grade | INTEGER | 断熱等級 |
| seismic_grade | INTEGER | 耐震等級 |
| is_long_life | INTEGER | 長期優良住宅 (0/1) |
| is_gx | INTEGER | GX志向型住宅 (0/1) |
| note | TEXT | 備考 |
| created_at / updated_at | TEXT | ISO8601 |

#### work_items（工事項目マスター：大項目>中項目>小項目）
| カラム | 型 | 説明 |
|---|---|---|
| id | INTEGER PK | |
| parent_id | INTEGER NULL | 親項目（自己参照で階層を表現） |
| level | INTEGER | 1=大項目 2=中項目 3=小項目 |
| name | TEXT | 工事項目名 |
| unit | TEXT | 単位 |
| standard_price | REAL | 標準単価 |
| cost | REAL | 原価 |
| sale_price | REAL | 売価 |
| calc_method | TEXT | 計算方式コード（後述） |
| sort_order | INTEGER | 並び順 |
| note | TEXT | 備考 |
| updated_at | TEXT | 更新日 |

#### price_history（単価更新履歴）
| カラム | 型 | 説明 |
|---|---|---|
| id | INTEGER PK | |
| work_item_id | INTEGER FK | |
| old_price / new_price | REAL | 標準単価の変更前後 |
| old_cost / new_cost | REAL | 原価の変更前後 |
| reason | TEXT | 変更理由 |
| changed_at | TEXT | 変更日時 |

#### equipment（住設マスター）
| カラム | 型 | 説明 |
|---|---|---|
| id | INTEGER PK | |
| category | TEXT | キッチン/浴室/洗面/トイレ/給湯器/換気/エアコン/建具/フローリング/外壁/屋根 |
| maker | TEXT | メーカー |
| product_name | TEXT | 商品名 |
| grade | TEXT | グレード |
| is_standard | INTEGER | 標準仕様フラグ (0/1) |
| list_price | REAL | 定価 |
| cost | REAL | 原価 |
| sale_price | REAL | 売価 |
| install_cost | REAL | 施工費 |
| note | TEXT | 備考 |
| updated_at | TEXT | |

#### options（オプションマスター）
| カラム | 型 | 説明 |
|---|---|---|
| id | INTEGER PK | |
| category | TEXT | 紐づく住設カテゴリ（キッチン等） |
| name | TEXT | オプション名 |
| cost | REAL | 原価 |
| sale_price | REAL | 売価 |
| note | TEXT | 備考 |

#### spec_sets / spec_set_items（標準仕様管理：住宅タイプごと）
- `spec_sets`: id, name（例: SW標準仕様）, note
- `spec_set_items`: id, spec_set_id FK, category, equipment_id FK
  → 概算作成時にこのセットを選ぶと、カテゴリ別の標準住設が自動選択される。

#### estimates（概算見積）と明細
- `estimates`: id, property_id FK, spec_set_id FK NULL, name, status, total_cost, total_sale, created_at
- `estimate_work_lines`（工事項目明細）: id, estimate_id, work_item_id, work_item_name, unit, quantity, unit_price, amount, calc_method, calc_formula(計算式文字列), coefficient(補正係数), note
- `estimate_equipment_lines`（住設明細・差額）: id, estimate_id, category, equipment_id, equipment_name, standard_equipment_id, standard_price, selected_price, option_total, diff（差額）
- `estimate_option_lines`（オプション明細）: id, estimate_id, equipment_line_id, option_id, option_name, cost, sale_price

#### past_estimates（過去見積データベース：CSV取込）
| カラム | 型 | 説明 |
|---|---|---|
| id | INTEGER PK | |
| property_name | TEXT | 物件名 |
| total_floor_area | REAL | 延床面積 |
| work_item | TEXT | 工事項目 |
| detail | TEXT | 明細 |
| quantity | REAL | 数量 |
| unit_price | REAL | 単価 |
| amount | REAL | 金額 |
| created_date | TEXT | 作成日 |
| imported_at | TEXT | 取込日時 |

#### coefficients（補正係数マスター）
| カラム | 型 | 説明 |
|---|---|---|
| id | INTEGER PK | |
| type | TEXT | room/floor/sw/gx/grade |
| key | TEXT | 係数キー（階数値・グレード名など。SW/GXは on/off） |
| value | REAL | 乗率 |
| note | TEXT | |

### 計算方式コード（calc_method）

| コード | 表示名 | 数量の決め方 |
|---|---|---|
| `floor_area` | 延床面積 × 単価 | 数量 = 延床面積 |
| `building_area` | 建築面積 × 単価 | 数量 = 建築面積 |
| `quantity` | 数量 × 単価 | 数量 = 手入力 |
| `lump_sum` | 一式 | 数量 = 1 |
| `room_factor` | 部屋数係数 | 延床面積 × 部屋数補正係数 |
| `floor_factor` | 階数係数 | 延床面積 × 階数補正係数 |
| `sw_factor` | SW係数 | 延床面積 × SW補正係数 |
| `gx_factor` | GX係数 | 延床面積 × GX補正係数 |
| `grade_factor` | グレード係数 | 延床面積 × グレード補正係数 |
| `manual` | 手入力補正 | 数量・金額を手入力で上書き |

> **拡張性**: `calc_method` は文字列コードで管理し、計算ロジックを `lib/calc.ts` の
> ディスパッチテーブルに集約。将来「自由な計算式」を追加する場合は式評価器
> （安全な式パーサ）を 1 件追加し、`work_items.calc_method='formula'` と
> 式文字列カラムを足すだけで対応できる構造とした。

---

## 3. 画面設計

UIは **SmartHR / freee / Notion** を参考に、社内業務ツールらしい整理されたレイアウト。
左サイドナビ＋メインコンテンツの2ペイン。PC利用優先。落ち着いた配色・余白・カード/テーブル中心。

| # | 画面 | パス | 主な内容 |
|---|---|---|---|
| 1 | ダッシュボード | `/` | 最近作成した物件 / 単価更新履歴 / 概算作成件数 / 工事項目別単価推移 / 過去見積件数 |
| 2 | 物件管理 | `/properties` | 物件一覧・登録/編集（延床・建築・敷地面積、階数、部屋数、各種フラグ、等級） |
| 3 | 工事項目マスター | `/work-items` | 大>中>小の階層ツリー、単価/原価/売価/計算方式の編集、単価更新で履歴記録 |
| 4 | 住設マスター | `/equipment` | カテゴリ別の住設一覧・登録（メーカー/商品/グレード/定価/原価/売価/施工費） |
| 5 | オプションマスター | `/options` | カテゴリ別オプション一覧・登録 |
| 6 | 標準仕様管理 | `/standard-specs` | 仕様セット（SW標準仕様等）とカテゴリ別の標準住設の登録 |
| 7 | 概算見積作成 | `/estimates/new` | 物件選択→標準仕様適用→住設/オプション選択→工事明細自動計算→差額表示 |
| 8 | 概算見積詳細 | `/estimates/:id` | 工事項目/数量/単位/単価/金額/計算式/補正係数/差額の確認 |
| 9 | 過去見積DB | `/past-estimates` | 一覧＋CSV取込（テンプレートに沿って一括登録） |
| 10 | 分析 | `/analytics` | 工事項目別の平均/中央値/最大/最小/最新単価/上昇率 |

### 概算見積作成のフロー

```
物件を選択
  └ 標準仕様セットを選択 → カテゴリ別に標準住設が自動セット
       └ 住設を変更 / オプションを追加
            └ 工事項目を計算方式に従い自動計算（補正係数を反映）
                 └ 出力: 工事明細(数量/単位/単価/金額/計算式/係数) ＋ 住設差額
```

### 差額表示の例（標準仕様との差額）

```
標準キッチン      800,000円
選択キッチン    1,100,000円   (+300,000)
深型食洗機       +120,000円
─────────────────────────
差額            +420,000円
```

---

## 4. MVP実装 / セットアップ

### 構成
```
housing-estimate-system/
├── backend/    Node.js + TypeScript + Express + better-sqlite3
└── frontend/   React + TypeScript + Vite + Tailwind CSS
```

### 起動手順

```bash
# 1) バックエンド（初回はDB作成＋初期データ投入が自動実行される）
cd backend
npm install
npm run dev          # http://localhost:4000

# 2) フロントエンド（別ターミナル）
cd frontend
npm install
npm run dev          # http://localhost:5173 （/api は 4000 へプロキシ）
```

ブラウザで http://localhost:5173 を開く。
初期データとして工事項目・住設・オプション・標準仕様・過去見積サンプルが投入される。

### ビルド検証
```bash
cd backend && npm run build      # tsc 型チェック＋出力
cd frontend && npm run build     # vite build
```

### 単一サービスで起動（本番/デプロイ向け）
バックエンドがビルド済みフロントも配信するため、**1ポートで画面もAPIも動く**。
```bash
npm run build    # フロント→バックの配信ディレクトリへ取り込み
npm start        # http://localhost:4000 で画面もAPIも提供
```
クラウド(Render)へのデプロイ手順・スマホ/PCからの閲覧方法は **[DEPLOY.md](./DEPLOY.md)** を参照。

---

## 5. API一覧

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/dashboard` | ダッシュボード集計 |
| GET/POST | `/api/properties` | 物件 一覧/登録 |
| GET/PUT/DELETE | `/api/properties/:id` | 物件 取得/更新/削除 |
| GET | `/api/work-items/tree` | 工事項目を階層ツリーで取得 |
| GET/POST | `/api/work-items` | 工事項目 一覧/登録 |
| PUT | `/api/work-items/:id` | 工事項目更新（単価変更時は履歴自動記録） |
| GET | `/api/work-items/:id/history` | 単価更新履歴 |
| GET/POST | `/api/equipment` | 住設 一覧/登録 |
| PUT/DELETE | `/api/equipment/:id` | 住設 更新/削除 |
| GET/POST | `/api/options` | オプション 一覧/登録 |
| PUT/DELETE | `/api/options/:id` | オプション 更新/削除 |
| GET/POST | `/api/standard-specs` | 標準仕様セット 一覧/登録 |
| GET | `/api/standard-specs/:id` | セット詳細（カテゴリ別住設） |
| POST | `/api/estimates/calculate` | 概算を計算（保存せずプレビュー） |
| GET/POST | `/api/estimates` | 概算 一覧/保存 |
| GET | `/api/estimates/:id` | 概算詳細（明細・差額込み） |
| GET/POST | `/api/past-estimates` | 過去見積 一覧/登録 |
| POST | `/api/past-estimates/import` | CSV取込（行配列をPOST） |
| GET | `/api/analytics/work-items` | 工事項目別 平均/中央値/最大/最小/最新/上昇率 |

---

## 6. 開発ロードマップ

| Phase | 内容 | 状態 |
|---|---|---|
| Phase1 | 概算見積作成（本MVP） | ✅ 実装 |
| Phase2 | 住設・オプション差額管理（差額の高度化・採用率） | 設計反映済 |
| Phase3 | 実行予算作成（`actual_budgets` を追加、概算との差額分析） | 設計反映済 |
| Phase4 | 発注管理 | 予定 |
| Phase5 | 原価分析（利益率/メーカー別） | 予定 |
| Phase6 | AIによる概算提案（蓄積データで単価予測） | 予定 |

> 本MVPは Phase3 以降の「実績との差額分析」を見据え、単価履歴・差額・過去見積を
> すべて構造化して保存している。これが本システムの中核価値である。
