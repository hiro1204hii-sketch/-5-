# リポジトリ構成

このリポジトリには、**互いに独立した複数のプロジェクト**が、それぞれ専用フォルダに分離して格納されています。
プロジェクト同士はコード・依存関係・データを一切共有しません。各フォルダ内で完結します。

| フォルダ | プロジェクト | 概要 | 技術 |
|---|---|---|---|
| [`housing-estimate-system/`](./housing-estimate-system) | 住宅概算・原価管理システム | 工務店向け概算見積システム（Phase1 MVP）。概算精度の継続的向上を目的に、単価履歴・標準仕様差額・過去見積を蓄積。 | React + TypeScript + Tailwind / Node + Express / SQLite |
| [`sodateru-eigyo-techo/`](./sodateru-eigyo-techo) | 育てる営業手帳 | 商談録音 → AI分析Webアプリ（SPA）＋モバイルアプリ（React Native）。顧客管理・パイプライン・AIコーチ機能付き。 | HTML/CSS/JS (ゼロ依存) / React Native (Expo) |
| [`jusetsu-search/`](./jusetsu-search) | 住設サーチ | 住宅設備機器に特化した検索・比較サイトの設計ドキュメント一式（サイトマップ/DB設計/画面/ワイヤーフレーム/API/ロードマップ）。建材サーチ参考。 | 設計（Next.js + NestJS/Express + PostgreSQL 想定） |

## 各プロジェクトの始め方

それぞれのフォルダに入り、各 README / SETUP に従ってください。

```bash
# 住宅概算・原価管理システム
cd housing-estimate-system        # README.md を参照

# 育てる営業手帳（Web）
open sodateru-eigyo-techo/index.html   # ブラウザで開くだけ、設定不要

# 育てる営業手帳（モバイル）
cd sodateru-eigyo-techo/mobile && npm install && npx expo start
```

> 各プロジェクトは独立しているため、一方の変更が他方へ影響することはありません。
> 新しいプロジェクトを追加する場合も、必ずルート直下に専用フォルダを作成して分離してください。
