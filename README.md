# リポジトリ構成

このリポジトリには、**互いに独立した複数のプロジェクト**が、それぞれ専用フォルダに分離して格納されています。
プロジェクト同士はコード・依存関係・データを一切共有しません。各フォルダ内で完結します。

| フォルダ | プロジェクト | 概要 | 技術 |
|---|---|---|---|
| [`housing-estimate-system/`](./housing-estimate-system) | 住宅概算・原価管理システム | 工務店向け概算見積システム（Phase1 MVP）。概算精度の継続的向上を目的に、単価履歴・標準仕様差額・過去見積を蓄積。 | React + TypeScript + Tailwind / Node + Express / SQLite |
| [`sodateru-eigyo-techo/`](./sodateru-eigyo-techo) | 育てる営業手帳 | 商談録音 → AI分析アプリ。Web版ワイヤーフレーム（HTML）とモバイルアプリ（React Native）。 | HTML / React Native (Expo) |

## 各プロジェクトの始め方

それぞれのフォルダに入り、各 README / SETUP に従ってください。

```bash
# 住宅概算・原価管理システム
cd housing-estimate-system        # README.md を参照

# 育てる営業手帳（モバイル）
cd sodateru-eigyo-techo/mobile    # SETUP.md を参照
```

> 各プロジェクトは独立しているため、一方の変更が他方へ影響することはありません。
> 新しいプロジェクトを追加する場合も、必ずルート直下に専用フォルダを作成して分離してください。
