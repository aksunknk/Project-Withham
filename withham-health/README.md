# Withham Health（hunumumuDiary）

ハムスター **ふぬ** と **むむ** の日々の記録・分析を、Android 端末ローカル（SQLite）で行う Expo アプリです。

## 主な機能

| タブ | 内容 |
|------|------|
| **記録** | 体重・安全確認（隙間・戸締まり）・へやんぽ・食事・メモ・お掃除・お手入れ |
| **分析** | 体重グラフ・平均へやんぽ時間・食事メニュー提供回数（7日 / 30日切替） |

- 個体は **左右スワイプ** で切り替え
- 各ブロックごとに **独立した保存**（安全確認はタップ即保存）
- データは端末内 SQLite に保存（オフライン動作）

## 画面イメージ

### 記録（Input）

体重入力、安全確認、へやんぽなどの入力画面。

![記録画面](docs/screenshots/01-record-input.png)

### 分析（Insights）

直近 7 日 / 30 日の集計とグラフ表示。

![分析画面](docs/screenshots/02-insights.png)

### お掃除・お手入れ

床材交換やトイレ掃除などの保守記録と履歴。

![お掃除・お手入れ](docs/screenshots/03-maintenance.png)

## 技術スタック

- **Expo SDK 54** / React Native 0.81
- **expo-sqlite** — ローカル DB
- **React Navigation** — ボトムタブ（記録 / 分析）
- **react-native-chart-kit** — 体重推移グラフ
- **EAS Build** — Android APK ビルド

## ディレクトリ構成（抜粋）

```
withham-health/
├── App.js                 # DB 初期化・タブナビゲーション
├── src/
│   ├── screens/
│   │   ├── InputScreen.js      # 記録タブ
│   │   └── InsightsScreen.js   # 分析タブ
│   ├── components/             # 入力 UI 各種
│   └── database/db.js          # スキーマ・CRUD・集計 SQL
├── docs/screenshots/           # 画面キャプチャ
└── eas.json                    # EAS ビルド設定（preview = APK）
```

## 開発環境のセットアップ

```bash
cd withham-health
npm install
npm run start
```

Expo Go または開発用ビルドで Android 実機 / エミュレータに接続してください。

## Android ビルド（EAS）

```bash
npx eas-cli build --platform android --profile preview
```

`preview` プロファイルは **APK** を出力します（`eas.json` 参照）。

## デザイン

- 背景 `#FDFBF7` / カード `#F5EFE6` / 文字 `#4A4A4A`
- 角丸 20px 以上のウォームトーン UI
- **Android 専用**（iOS は想定外）

## ライセンス

Private — 個人利用向けプロジェクト。
