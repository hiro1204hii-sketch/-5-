# 2. データベース設計（論理）

建材サーチの住設版として、(1) 登録不要・匿名お気に入り、(2) 施工例の逆引き（1事例＝複数設備）、
(3) メーカー入稿＋運営承認、(4) 価格非公開運用 を表現できる論理モデルを定義する。

## 2.1 ER図

```
┌──────────────┐        ┌──────────────────┐        ┌──────────────┐
│   makers     │1      *│     products      │*      1│  categories  │
│ (メーカー)    │────────│    (商品/status)  │────────│ (カテゴリ)    │
└──────────────┘        └──────────────────┘        └──────────────┘
      │ 1                     │ 1   │ 1   │ 1              │ 1
      │ *                     │ *   │ *   │ *              │ *
┌──────────────┐   ┌──────────┐┌──────────┐┌──────────┐ ┌──────────────┐
│ maker_users  │   │ product_ ││ product_ ││ product_ │ │ category_    │
│(ﾒｰｶｰ担当者)  │   │ images   ││ assets   ││ specs    │ │ tags         │
└──────────────┘   └──────────┘└──────────┘└──────────┘ └──────────────┘
                                                              │ *  (tag_id)
                        products *──┐  ┌──* tags ◀────────────┘
                                    │  │   (特徴タグ)
                              ┌─────────────┐
                              │ product_tags │ (N:N)
                              └─────────────┘

【施工例の逆引き：1事例に複数設備（N:N）】
┌──────────────┐ 1   * ┌────────────────┐ *   1 ┌──────────┐
│ portfolios   │───────│portfolio_products│───────│ products │
│ (施工例)      │       │   (N:N 中間)     │       └──────────┘
└──────────────┘       └────────────────┘
   │ 1        │ *                                 portfolios *──┐
   │ *        ▼                                                 │
┌──────────┐ ┌────────────────┐                          ┌────────────┐
│portfolio_│ │ portfolio_tags  │*──────────────* tags     │（styleタグ）│
│ images   │ │  (スタイル等)    │ ─────────────────────────┘
└──────────┘ └────────────────┘

【お気に入り：登録不要（匿名）／任意ログインで同期】
┌──────────────┐ 0..1  * ┌──────────────────┐ *   1   products
│   users      │─────────│   favorites       │──────────┘
│(任意登録)     │         │ user_id|anon_id   │
└──────────────┘         └──────────────────┘

【運営】
┌──────────────┐   ┌──────────────────────┐
│ admin_users  │   │ product_review_logs   │ (承認/差戻し履歴)
│(運営:権限)    │   └──────────────────────┘
└──────────────┘
```

## 2.2 エンティティ一覧

| エンティティ | 役割 |
|---|---|
| `makers` | メーカー（概要・公式サイトURL・ロゴ） |
| `maker_users` | メーカー担当者アカウント（自社商品を入稿） |
| `categories` | 商品カテゴリ（11種。`parent_id` で小分類も可） |
| `products` | 商品（中心エンティティ。`status` で入稿〜公開を管理） |
| `product_images` | 商品画像（複数・表示順） |
| `product_assets` | 商品資料（カタログ/仕様書/CAD/取説） |
| `product_specs` | 商品仕様（キー・バリュー型） |
| `tags` | タグ（特徴タグ＋施工例スタイルタグを種別で共用） |
| `category_tags` | カテゴリ別に使える特徴タグ（絞り込みUI生成用） |
| `product_tags` | 商品⇔特徴タグ（N:N） |
| `portfolios` | 施工例（空間イメージ） |
| `portfolio_images` | 施工例の写真 |
| `portfolio_products` | **施工例⇔商品（N:N）＝逆引きの核** |
| `portfolio_tags` | 施工例⇔スタイルタグ（モダン/ナチュラル等） |
| `users` | 一般ユーザー（任意登録・お気に入り同期用、最小構成） |
| `favorites` | お気に入り（`user_id` または匿名 `anon_id`） |
| `admin_users` | 運営アカウント（admin / editor） |
| `product_review_logs` | 入稿の承認・差戻し履歴 |

## 2.3 主要な関連（カーディナリティ）

- `makers (1) — (N) products` / `makers (1) — (N) maker_users`
- `categories (1) — (N) products`（`parent_id` で自己参照ツリー）
- `products (1) — (N) product_images / product_assets / product_specs`
- `products (N) — (N) tags`（`product_tags`）
- `categories (N) — (N) tags`（`category_tags`：カテゴリ別の絞り込み候補）
- **`portfolios (N) — (N) products`（`portfolio_products`）= 1事例に複数設備**
- `portfolios (1) — (N) portfolio_images` / `portfolios (N) — (N) tags`（`portfolio_tags`）
- `users (0..1) — (N) favorites`、`products (1) — (N) favorites`

## 2.4 状態（ステータス）設計

商品の入稿〜公開ワークフロー（`products.status`）：

```
draft（下書き：メーカー or 運営が作成）
  └─ submitted（申請：メーカーが公開申請）
        ├─ published（公開：運営が承認）── 一般ユーザーに表示
        └─ rejected（差戻し：運営が却下／コメント付）→ 修正して再 submitted
```

- 一般向けAPI/画面は `status='published'` のみを返す。
- `product_review_logs` に「誰が・いつ・どの状態へ・コメント」を記録（監査）。
- 運営直接登録の場合は `draft → published` を即時遷移可能。

## 2.5 設計上のポイント

1. **登録不要・匿名お気に入り**
   `favorites` は `user_id`（NULL可）と `anon_id`（ブラウザ生成UUID）の両対応。
   比較は状態をクライアント（URLクエリ/ローカル）で保持し、サーバ保存はマイページ任意。
   後からアカウント登録した際に `anon_id` の行を `user_id` へマージできる。

2. **施工例の逆引き（建材サーチの肝）**
   実際の住宅写真は「キッチン＋洗面＋トイレ…」と複数設備が写るため、
   `portfolio_products`（N:N）で複数商品を紐付け、各紐付けに `caption` と表示順を持たせる。
   施工例詳細では「この空間で使われている設備一覧」を提示し、商品詳細へ送客する。

3. **メーカー入稿＋運営承認**
   `maker_users`（`maker_id` に属する担当者）が自社商品を `draft/submitted` で入稿。
   運営（`admin_users`）が `published/rejected` を決定。情報の鮮度と網羅性をスケールさせる。

4. **仕様はキー・バリュー（`product_specs`）**
   カテゴリで項目が大きく異なる（キッチンの天板素材 vs 給湯のタンク容量）ため固定カラム化しない。
   主要比較項目（価格・サイズ・カラー）は `products` 本体に代表値を持ち、一覧・比較を高速化。

5. **タグは種別で共用**
   `tags.type` を `feature`（特徴タグ）/`style`（施工例スタイル）で区別し、UIを出し分け。
   特徴タグはカテゴリ別（`category_tags`）に提示し、絞り込みUIを動的生成。

6. **価格運用**
   `products.price`（メーカー希望小売価格・税抜, NULL可）と `price_note`（'オープン価格'/'要問合せ'）。
   価格帯絞り込み（`price_band`）は **price がある商品のみ** を対象とし、NULLは除外（UIに注記）。

7. **人気・新着の指標（簡素）**
   人気は `products.view_count`、新着は `published_at` で算出。詳細なアクセス解析は将来拡張とし、
   初期は集計テーブルを置かない（過剰設計を避ける）。
