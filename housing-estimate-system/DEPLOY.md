# デプロイ / 動かし方ガイド

このアプリは **バックエンドがフロントエンドも配信する「単一サービス構成」** です。
ビルドすると `frontend/dist` が `backend/dist/public` に取り込まれ、**1つのサーバー・1つのURL**で
画面もAPIも提供されます（CORS設定不要）。

> 前提の確認: Claude の作業環境（サンドボックス）は一時的で消えます。GitHub にあるのは
> 「コード」であって「動いているアプリ」ではありません。**ブラウザでURLを開くだけで見る**には、
> 下記いずれかで一度デプロイ／起動する必要があります。

---

## 方法1【おすすめ・クラウド常時稼働】Render に無料デプロイ（PCのブラウザだけで完結）

明日PCから「URLを開くだけ」で見たい場合はこれ。GitHubと連携してクラウドに常時稼働させます。

1. PCのブラウザで https://render.com を開き、**GitHubアカウントでサインイン**。
2. ダッシュボードで **New → Blueprint** を選択。
3. このリポジトリ `hiro1204hii-sketch/-5-` を選ぶ。
   - ルートの `render.yaml` を自動検出し、`housing-estimate-system` を単一Webサービスとして構成します。
   - デプロイするブランチは、PR #1 を main にマージ後はデフォルトブランチ、
     マージ前なら `claude/housing-estimate-system-0d7neb` を指定。
4. **Apply / Deploy** を押す。数分のビルド後、`https://housing-estimate-system-xxxx.onrender.com` のような
   **公開URL**が発行されます。スマホでもPCでもこのURLを開けばOK。

> Blueprint がうまく出ない場合は手動でも可:
> **New → Web Service** → リポジトリ選択 → **Root Directory** に `housing-estimate-system`、
> **Build Command** `npm run build`、**Start Command** `npm start`、Runtime `Node` を設定して Deploy。

**無料プランの注意**
- 15分アクセスが無いとスリープし、次アクセスの初回だけ起動に30〜60秒かかります（2回目以降は快適）。
- ディスクが非永続のため、再起動すると入力データは初期サンプルに戻ります（デモ用途では問題なし）。
  永続化したい場合は有料プランで Disk を追加し、`DB_PATH` をそのマウント先に変更してください。

---

## 方法2【最速・確実】PCのローカルで起動して見る

PCに Node.js 20+ が入っていれば、アカウント不要・数コマンドで動きます（PCのブラウザで開く）。

```bash
# リポジトリを取得
git clone https://github.com/hiro1204hii-sketch/-5-.git
cd -5-/housing-estimate-system

# ビルドして単一サービスで起動
npm run build
npm start
# → ブラウザで http://localhost:4000 を開く（画面もAPIも同じポート）
```

開発しながら見たい場合（自動リロード）は2つ起動:

```bash
cd housing-estimate-system/backend  && npm install && npm run dev   # http://localhost:4000
cd housing-estimate-system/frontend && npm install && npm run dev   # http://localhost:5173
```

### 同じWi-Fiのスマホからも見たい場合（任意）
PCで `cd backend && npm install && npm run build && PORT=4000 node dist/index.js` で起動後、
スマホで `http://<PCのローカルIP>:4000`（例 `http://192.168.0.5:4000`）を開く。
※ PCのファイアウォールでポート4000の許可が必要な場合があります。

---

## どちらを選ぶ？

| | 方法1 Render | 方法2 ローカル |
|---|---|---|
| 必要なもの | GitHubアカウント | PC + Node.js |
| 結果 | **常時稼働の公開URL**（スマホ可） | PC上で `localhost:4000` |
| 手間 | 数クリック＋数分ビルド | 数コマンド |
| 永続URL | ◯（生き続ける） | ✕（PC起動中のみ） |

明日PCから「URLを開くだけ」で見たいなら **方法1（Render）** がおすすめです。
