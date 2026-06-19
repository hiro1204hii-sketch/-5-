# 1. サイトマップ

建材サーチのURL構成（`/products/categories`・`/makers`・`/portfolios`・`/mypage`）に揃える。

## 1.1 全体構造

```
住設サーチ（建材サーチの住設版）
│
├─ トップページ                         /
│
├─ 商品                                 /products
│   ├─ 商品一覧（検索・絞り込み）        /products?category=&maker=&price=&tag=&q=
│   ├─ カテゴリ一覧                      /products/categories
│   ├─ カテゴリ別一覧                    /products/categories/:slug
│   └─ 商品詳細                          /products/:id
│       └─（タブ）概要 / 仕様 / 資料DL / 施工例
│
├─ メーカー                             /makers
│   ├─ メーカー一覧                      /makers
│   └─ メーカー詳細                      /makers/:id
│       └─ 概要 / 主要商品 / 商品一覧 / 公式サイトリンク
│
├─ 施工例（空間イメージ＝主役の入口）    /portfolios
│   ├─ 施工例一覧                        /portfolios?category=&maker=&style=
│   └─ 施工例詳細                        /portfolios/:id
│       └─ 写真 / コメント / ★使用設備一覧（複数）→ 各商品詳細
│
├─ 比較                                 /compare?ids=1,2,3,4
│
├─ 検索結果                             /search?q=
│
├─ マイページ（任意登録・同期用）        /mypage
│   ├─ ログイン / 新規登録               /mypage/login, /mypage/register
│   ├─ お気に入り一覧                    /mypage/favorites
│   └─ 比較リスト                        /mypage/compare
│
├─ 静的ページ
│   ├─ サービスについて                  /about
│   ├─ 利用規約 / プライバシー           /terms, /privacy
│   └─ お問い合わせ                      /contact
│
├─ メーカーポータル（要認証：メーカー担当者）   /maker
│   ├─ ログイン                          /maker/login
│   ├─ ダッシュボード（自社の入稿状況）   /maker
│   ├─ 自社商品 一覧 / 入稿 / 編集        /maker/products, /new, /:id/edit
│   └─ 入稿（下書き → 申請）             status: draft → submitted
│
└─ 管理画面（要認証：運営）              /admin
    ├─ ログイン                          /admin/login
    ├─ ダッシュボード                    /admin
    ├─ ★入稿承認キュー                   /admin/reviews   (submitted を承認/差戻し)
    ├─ 商品管理（登録/編集/公開）         /admin/products, /new, /:id/edit
    ├─ メーカー管理                      /admin/makers, /new, /:id/edit
    ├─ メーカー担当者アカウント管理       /admin/maker-users
    ├─ カテゴリ・タグ管理                /admin/taxonomies
    ├─ 資料（カタログ等）管理            /admin/assets
    └─ 施工例管理                        /admin/portfolios
```

## 1.2 グローバルナビゲーション（ヘッダー）

| 項目 | リンク先 | 備考 |
|---|---|---|
| ロゴ | `/` | トップへ |
| 検索バー | `/search` | 全ページ常設。**入力サジェスト**（メーカー/商品/シリーズ） |
| 商品から探す | `/products` | カテゴリのメガメニュー展開 |
| メーカーから探す | `/makers` | 主要メーカーのメガメニュー |
| **施工例から探す** | `/portfolios` | 空間イメージ＝逆引きの主入口 |
| 比較 | `/compare` | 比較中件数バッジ（**ログイン不要**） |
| お気に入り | `/mypage/favorites` | お気に入り件数バッジ（**匿名で利用可**） |

> お気に入り・比較は登録不要（匿名 `anon_id`）で利用でき、任意ログイン時にマイページへ同期される。

## 1.3 フッター

- カテゴリ一覧（11カテゴリへのリンク）
- メーカー一覧（主要メーカー）
- 施工例 / サービスについて / 利用規約 / プライバシーポリシー / お問い合わせ
- メーカー様へ（入稿のご案内 → `/maker/login`）
- コピーライト

## 1.4 主要な回遊導線

```
【主線：施工例からの逆引き（建材サーチの肝）】
トップ → 施工例 → 施工例詳細 → 使用設備一覧 → 商品詳細 → 比較 / 資料DL

【検索線】
全ページ → 検索バー（サジェスト）→ 検索結果 → 商品詳細 → 比較

【カテゴリ/メーカー線】
トップ → 人気カテゴリ → 商品一覧（絞り込み）→ 商品詳細 → 資料DL（カタログ/CAD/仕様書）
トップ → 人気メーカー → メーカー詳細 → 商品一覧

【保存線（登録不要）】
各ページ → ♡お気に入り → お気に入り一覧 → まとめて比較
```
