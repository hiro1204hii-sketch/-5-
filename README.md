# リポジトリ構成

このリポジトリには、**互いに独立した複数のプロジェクト**が、それぞれ専用フォルダに分離して格納されています。
プロジェクト同士はコード・依存関係・データを一切共有しません。各フォルダ内で完結します。

| フォルダ | プロジェクト | 概要 | 技術 |
|---|---|---|---|
| [`housing-estimate-system/`](./housing-estimate-system) | 住宅概算システム（スタンドアロン版） | 住宅会社向けの高精度な概算見積。`standalone/住宅概算システム.html` をダブルクリックで起動。 | HTML 1ファイル / バニラJS / localStorage |
| [`sodateru-eigyo-techo/`](./sodateru-eigyo-techo) | 育てる営業手帳 | 商談録音 → AI分析アプリ。Web版ワイヤーフレーム（HTML）とモバイルアプリ（React Native）。 | HTML / React Native (Expo) |

## 各プロジェクトの始め方

```bash
# 住宅概算システム（スタンドアロン版）
# housing-estimate-system/standalone/住宅概算システム.html をブラウザで開くだけ

# 育てる営業手帳（モバイル）
cd sodateru-eigyo-techo/mobile    # SETUP.md を参照
```

> 各プロジェクトは独立しているため、一方の変更が他方へ影響することはありません。
> 新しいプロジェクトを追加する場合も、必ずルート直下に専用フォルダを作成して分離してください。
