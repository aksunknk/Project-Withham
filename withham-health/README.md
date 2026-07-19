# Withham Health（hunumumuDiary）

ハムスターの日々の記録・分析を、Android 端末ローカル（SQLite）で行う Expo アプリです。  
個体はデータタブで追加・改名・引退できます（初期シード: ふぬ / むむ）。

## 主な機能

| タブ | 内容 |
|------|------|
| **記録** | 体重・安全確認・へやんぽ・食事・メモ・写真・お掃除・お手入れ。記録日の指定可 |
| **分析** | 体重 / へやんぽグラフ、カレンダー、期間トグル、履歴の編集・削除、個体比較 |
| **データ** | JSON バックアップ、体重・へやんぽ CSV、個体管理、通知設定 |

- ローカル通知（お手入れ予定・本日未記録）、体重急変アラート（前回比 −5%）
- Android ホームウィジェット（本日未記録 / 前回体重）※ EAS / 開発ビルド必須
- データは端末内 SQLite（オフライン）。クラウド同期は [設計のみ](docs/cloud-sync-design.md)

## Changelog（v1.1.0）

- Phase 1–4: バックアップ / 記録訂正 / 通知・体重アラート / 分析拡張 / 個体可変・写真・食事ピン
- Phase 5: Android ホームウィジェット（`react-native-android-widget`）
- 方針文書: [クラウド同期](docs/cloud-sync-design.md) / [プラットフォーム（Android 専用）](docs/platform-scope.md)

## 実機スモーク（出荷確認）

1. 記録: 体重保存 → 前回値表示、記録日変更、安全確認、アンドゥ
2. 分析: 疎な体重グラフ、へやんぽ折れ線、カレンダー、履歴編集・削除
3. データ: JSON エクスポート → マージ/置換インポート、CSV、個体追加
4. 通知: 許可後に設定トグル、お手入れ予定日を入れて再スケジュール
5. ウィジェット: ホームに「hunumumuDiary 記録状況」を追加し、記録後に内容が更新されること

## 技術スタック

- **Expo SDK 54** / React Native 0.81
- **expo-sqlite** / **expo-notifications** / **react-native-android-widget**
- **EAS Build** — Android APK（`preview` プロファイル）

## ディレクトリ構成（抜粋）

```
withham-health/
├── App.js
├── index.js                 # ウィジェット task handler 登録
├── src/
│   ├── screens/             # 記録 / 分析 / データ
│   ├── components/
│   ├── database/            # db.js / backup.js
│   ├── notifications/
│   └── widget/              # ホームウィジェット
├── docs/                    # 設計メモ・スクリーンショット
└── eas.json
```

## 開発

```bash
cd withham-health
npm install
npm run start
```

ウィジェット検証は Expo Go では不可です。`npx expo run:android` または EAS ビルドを使ってください。

## Android ビルド（EAS）

```bash
npx eas-cli build --platform android --profile preview
```

## デザイン / スコープ

- 背景 `#FDFBF7` / カード `#F5EFE6` / 文字 `#4A4A4A`
- **Android 専用**（iOS は [スコープ外](docs/platform-scope.md)）
- SNS / アカウント認証は対象外

## ライセンス

Private — 個人利用向けプロジェクト。
