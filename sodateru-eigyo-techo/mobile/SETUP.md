# 育てる営業手帳 — セットアップガイド

## 必要なもの

| サービス | 用途 | 費用 |
|---|---|---|
| [Anthropic](https://console.anthropic.com/) | Claude APIキー（商談分析） | 従量課金 |
| [OpenAI](https://platform.openai.com/) | Whisper APIキー（音声文字起こし） | 従量課金 |
| [RevenueCat](https://www.revenuecat.com/) | サブスク管理 | 月$150未満は無料 |
| Apple Developer Program | App Store配信 | $99/年 |
| Google Play Console | Play Store配信 | $25（一回） |
| [Expo EAS](https://expo.dev/) | ビルド | 無料プランあり |

---

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
cd mobile
npm install
```

### 2. RevenueCat の設定

1. [RevenueCat ダッシュボード](https://app.revenuecat.com/) でアプリを作成
2. iOS / Android それぞれのAPIキーを取得
3. `hooks/useSubscription.ts` の以下を書き換え：
   ```ts
   const RC_API_KEY_IOS = 'appl_YOUR_REVENUECAT_IOS_KEY';
   const RC_API_KEY_ANDROID = 'goog_YOUR_REVENUECAT_ANDROID_KEY';
   ```
4. `app.json` の `"react-native-purchases"` プラグインの `apiKey` も更新
5. RevenueCat ダッシュボードで Entitlement `pro` を作成
6. Product ID `sodateru_pro_monthly_980` で月額商品を設定

### 3. App Store Connect / Google Play での商品設定

**App Store:**
1. App Store Connect でアプリを作成
2. 「App内課金」→「サブスクリプション」で月額¥980の商品を作成
3. Product ID: `sodateru_pro_monthly_980`

**Google Play:**
1. Google Play Console でアプリを作成
2. 「サブスクリプション」で同様に設定

### 4. Expo EAS ビルド

```bash
# EAS CLIをインストール
npm install -g eas-cli

# ログイン
eas login

# プロジェクトを初期化
eas init

# iOSビルド（App Store向け）
eas build --platform ios --profile production

# Androidビルド（Play Store向け）
eas build --platform android --profile production
```

### 5. ストア申請

```bash
# App Store
eas submit --platform ios

# Google Play
eas submit --platform android
```

---

## アプリの使い方

1. アプリを起動 → 「設定」タブでAPIキーを入力
2. 「録音」タブで商談開始時に録音ボタンをタップ
3. 商談終了後に停止ボタンをタップ
4. AIが自動で分析（議事録・アクション・温度感）
5. 「履歴」タブで過去の商談を確認

---

## 料金プラン

| | フリー | プロ（¥980/月） |
|---|---|---|
| 月間分析回数 | 5回 | 無制限 |
| 議事録生成 | ✓ | ✓ |
| アクション提案 | ✓ | ✓ |
| 温度感判定 | ✓ | ✓ |
| 履歴・共有 | ✓ | ✓ |
| 優先サポート | - | ✓ |

---

## ファイル構成

```
mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx      # 録音画面
│   │   ├── history.tsx    # 履歴画面
│   │   └── settings.tsx   # 設定画面
│   ├── results.tsx        # 分析結果画面
│   └── paywall.tsx        # サブスク購入画面
├── components/
│   ├── ResultCard.tsx
│   ├── TemperatureBadge.tsx
│   └── UsageBadge.tsx
├── hooks/
│   ├── useRecording.ts    # 録音ロジック
│   ├── useSubscription.ts # RevenueCat連携
│   └── useStorage.ts      # AsyncStorage
├── services/
│   ├── anthropicService.ts  # Claude API
│   └── transcriptionService.ts # Whisper API
└── constants/
    └── theme.ts           # カラー定義
```
