# 1. サイトマップ

## 1.1 全体構造

```
住設サーチ (kenzai-search 参考)
│
├─ トップページ                         /
│
├─ 商品                                 /products
│   ├─ 商品一覧（検索・絞り込み）        /products?category=&maker=&price=&tag=&q=
│   ├─ カテゴリ別一覧                    /categories/:categorySlug
│   └─ 商品詳細                          /products/:productId
│       └─ （タブ）概要 / 仕様 / 資料DL / 施工事例
│
├─ メーカー                             /makers
│   ├─ メーカー一覧                      /makers
│   └─ メーカー詳細                      /makers/:makerId
│       └─ 概要 / 主要商品 / 商品一覧 / 公式サイトリンク
│
├─ 比較                                 /compare?ids=1,2,3,4
│
├─ 施工事例                             /cases
│   ├─ 施工事例一覧                      /cases?category=&maker=&tag=
│   └─ 施工事例詳細                      /cases/:caseId
│
├─ お気に入り                           /favorites
│
├─ 検索結果                             /search?q=
│
├─ 静的ページ
│   ├─ サービスについて                  /about
│   ├─ 利用規約                          /terms
│   ├─ プライバシーポリシー              /privacy
│   └─ お問い合わせ                      /contact
│
└─ 管理画面 (要認証)                     /admin
    ├─ ダッシュボード                    /admin
    ├─ 商品管理                          /admin/products
    │   ├─ 商品一覧                      /admin/products
    │   ├─ 商品登録                      /admin/products/new
    │   └─ 商品編集                      /admin/products/:id/edit
    ├─ メーカー管理                      /admin/makers
    │   ├─ メーカー一覧                  /admin/makers
    │   ├─ メーカー登録                  /admin/makers/new
    │   └─ メーカー編集                  /admin/makers/:id/edit
    ├─ カテゴリ・タグ管理                /admin/taxonomies
    ├─ 資料（カタログ等）管理            /admin/assets
    ├─ 施工事例管理                      /admin/cases
    └─ ログイン                          /admin/login
```

## 1.2 グローバルナビゲーション（ヘッダー）

| 項目 | リンク先 | 備考 |
|---|---|---|
| ロゴ | `/` | トップへ |
| 検索バー | `/search` | 全ページ共通で常設 |
| 商品から探す | `/products` | カテゴリのメガメニュー展開 |
| メーカーから探す | `/makers` | 主要メーカーのメガメニュー |
| 施工事例 | `/cases` | |
| 比較 | `/compare` | 比較中件数バッジ表示 |
| お気に入り | `/favorites` | お気に入り件数バッジ表示 |

## 1.3 フッター

- カテゴリ一覧（11カテゴリへのリンク）
- メーカー一覧（主要メーカー）
- サービスについて / 利用規約 / プライバシーポリシー / お問い合わせ
- コピーライト

## 1.4 主要な回遊導線

```
トップ → 人気カテゴリ → 商品一覧（絞り込み）→ 商品詳細 → 比較に追加 → 比較ページ
                                              └→ 資料DL（カタログ/CAD/仕様書）
                                              └→ 施工事例タブ → 施工事例詳細
トップ → 人気メーカー → メーカー詳細 → 商品一覧
全ページ → 検索バー → 検索結果 → 商品詳細
全ページ → お気に入り（♡）→ お気に入りページ → 比較
```
