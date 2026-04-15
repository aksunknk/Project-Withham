# ロジックとプレゼンテーションの境界（Withham 2 / RN）

Web の `PostsList.tsx` を分解したときの責務分担。

## データ取得・状態

| 処理 | 現状（Web） | RN 側の置き場 |
|------|-------------|----------------|
| 投稿一覧の取得 | 親ページの `useEffect` + `api` | `usePostsFeed()` 等の hook、または React Query |
| いいねの楽観更新 + API | `handleLikeToggle` 内 | `useLikePost(postId)` または `postsService.toggleLike` |
| 削除 | `handleDeletePost` | 同上 |
| 編集遷移 | `window.location.href` | `navigation.navigate('PostEdit', { id })` |

## 純粋プレゼンテーション

以下は **`tokens.ts` の値のみ**で表現し、API を知らない。

- `PostCard` のレイアウト（アバター 48px、ヘッダー行、本文、フッター）
- ハムスター投稿時の背景・枠・バッジ色
- 空状態メッセージのカード（白背景 + radii.card + border）

## 型

`Post` 型（`types`）はそのまま共有するか、RN プロジェクトで同名フィールドを再定義。UI コンポーネントは **`Post` のサブセット**（表示に必要なフィールドだけ）を props で受け取るとテストしやすい。
