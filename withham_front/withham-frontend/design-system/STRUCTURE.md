# Withham UI 構造仕様（React Native 移植用）

Web の DOM は使わず、**情報設計とレイアウト意図**だけを記す。`aksunk (for ふぬ)` のような表示名はデータ上の `username` / `displayName` として **投稿者行・プロフィール行**に載せる想定。

---

## 1. アプリシェル（`Layout`）

```
Screen (背景: colors.background)
└─ Container (maxWidth 約 1280 / モバイルは全幅)
    └─ Row | Column (ブレークポイントで切替)
        ├─ LeftNav (幅 ~250, デスクトップのみ)
        │   ├─ BrandLink（「withham」 typography.brand / bold）
        │   ├─ NavItem[]（アイコン + ラベル、角丸 pill、active で surface 背景）
        │   └─ PrimaryButton（Sign out: 背景 primary、文字白、角丸 pill）
        ├─ Main（flex 1）
        │   └─ (子は画面ごと)
        └─ RightRail (幅 ~320, タブレット以上)
            └─ RightSidebar 相当
```

**余白:** 外周 `space.containerX` / `space.5`（py-5 に相当）。

---

## 2. 投稿カード（`PostsList` 1 件）

ユーザー名・アバター表示（ふぬ／一般ユーザー共通パターン）。

```
PostCard (rounded: radii.card, border 1px, shadow 軽)
├─ HeaderRow (padding space.4, flex row, gap space.4, align center)
│   ├─ AvatarLink
│   │   └─ Avatar (sizes.avatarMd, 円形 radii.pill) | Placeholder (surface または hamster 用オレンジ薄)
│   └─ MetaColumn (flex 1)
│       ├─ TitleRow
│       │   ├─ PrimaryName（textMain, font medium）← ここに表示名
│       │   └─ OptionalSecondary（textSub, text-xs）← 日時・副名
│       └─ [Optional] Badge「ハムスター投稿」
├─ [Optional] MediaBlock（背景 surface、画像 contain）
├─ Body (padding space.4)
│   └─ PostText（textMain, pre-wrap）
└─ ActionRow (borderTop borderSubtle, padding x space.4, y space.3)
    ├─ Comment action
    └─ Like action（liked 時は primary 色）
```

**ハムスター投稿時:** カード背景 `hamsterPostBackground`、枠 `hamsterPostBorder`。  
**人間のみ投稿:** 背景 `cardBackground`、枠 `cardBorder`。

---

## 3. 検索 + トレンド（`RightSidebar`）

```
Column space-y space.4
├─ SearchField
│   └─ Row（左: アイコン領域 surface + rounded-l radii.card、右: 入力域同じく rounded-r）
└─ TrendCard（白背景、radii.card、border、軽 shadow）
    ├─ Heading（textSub, semibold, text-sm）
    └─ TagRow[]（hover で rowHover、padding space.2, rounded radii.md）
```

---

## 4. ロジックと見た目の分離

| 関心事 | Web での所在 | RN では |
|--------|----------------|---------|
| トークン（色・余白・角丸） | `tailwind.config` + クラス名 | **`design-system/tokens.ts`** のみ参照 |
| 一覧のいいね・削除 API | `PostsList` 内 handler | **hooks または ViewModel**（例: `usePostActions`） |
| ナビ項目の定義 | `Layout` 内ハードコード | **設定配列**（`{ key, label, icon }[]`）でマップ |

---

## 5. フォント（Expo）

Web は Google Fonts で **Plus Jakarta Sans** / **Noto Sans**。RN では:

- `expo-font` + `@expo-google-fonts/plus-jakarta-sans` 等で読み込み
- `typography.fontFamilies.sans` を `StyleSheet` の `fontFamily` に反映

---

## 6. EditProfileModal の注意

Web 実装のフォーム一部は **Tailwind 既定の gray/blue**（編集モーダル）。**ブランドの主軸は primary オレンジ**（Layout / 投稿カード）。RN 再実装時はボタンを `colors.primary` に揃えると一貫します。
