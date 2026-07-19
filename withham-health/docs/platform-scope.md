# プラットフォーム方針（F15 / Android 専用）

**状態:** 確定。iOS はスコープ外。

## 方針

- 本番ターゲットは **Android のみ**（`app.json` の `platforms: ["android"]`）。
- App Store / iOS ビルド・WidgetKit・通知の iOS 差分は **実装しない**。
- ホーム画面ウィジェット（F11）は `react-native-android-widget` による Android 専用機能。Expo Go では動作せず、**EAS / 開発ビルド**が必要。

## iOS を後回しにする理由

- 個人利用・現行端末が Android
- Store 審査・署名・課金・権限文言の固定費が大きい
- ウィジェット・通知まわりの実装分岐が増え、コア（記録・分析・バックアップ）の速度を落とす

## 再開条件

実機として iPhone が主端末になった、または配布要件が変わった場合に限り、別マイルストーンとして切り出す。
