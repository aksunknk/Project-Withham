/**
 * Withham v1 デザイントークン（React Native / Expo 向け）
 * ─ Web の Tailwind クラスを再現するための単一ソース。UI に依存しない純データ。
 */

/** ブランド・サーフェス（ウォームトーン） */
export const colors = {
  background: '#fcfaf8',
  surface: '#f4ede7',
  primary: '#f2800d',
  primaryHover: '#e67300',
  textMain: '#1c140d',
  textSub: '#9c7349',
  /** オーバーレイ（モーダル背景など） */
  overlay: 'rgba(0, 0, 0, 0.5)',
  /** 投稿カード：ユーザー本人・一般投稿 */
  cardBackground: '#ffffff',
  cardBorder: '#e5e7eb',
  /** 投稿カード：ハムスター紐付き（PostsList で orange 系） */
  hamsterPostBackground: '#fff7ed',
  hamsterPostBorder: '#fed7aa',
  avatarPlaceholderHamster: '#ffedd5',
  badgeHamsterBackground: '#ffedd5',
  badgeHamsterText: '#9a3412',
  /** 右サイドバー・補助 */
  rowHover: '#f9fafb',
  borderSubtle: '#f3f4f6',
  /** エラー（共通） */
  error: '#ef4444',
} as const;

/** 角丸（px）。RN では borderRadius にそのまま数値で渡せる */
export const radii = {
  /** ナビ項目・主ボタン・サムネイル */
  pill: 9999,
  /** 投稿カード・検索バー・トレンドカード */
  card: 12,
  /** タグ行・小パーツ */
  md: 8,
  /** モーダルパネル（EditProfileModal は Web で rounded-lg = 8px） */
  sheet: 8,
} as const;

/**
 * 余白（4px グリッド想定）。RN の padding / margin / gap に使用。
 * 名称は Tailwind の意味に近いが、数値は固定 px。
 */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  /** レイアウト：コンテナ横パディング（px-4 sm:px-6 の基準） */
  containerX: 16,
  containerXWide: 24,
  /** 左ナビ列幅の目安（Web lg: 250px） */
  sidebarWidth: 250,
  /** 右サイドバー幅の目安（Web w-80 = 320px） */
  rightRailWidth: 320,
} as const;

/** タイポグラフィ（RN: fontFamily は expo-google-fonts 等で別途読み込み） */
export const typography = {
  fontFamilies: {
    /** Web では Plus Jakarta Sans を優先 */
    sans: ['Plus Jakarta Sans', 'Noto Sans', 'System'],
  },
  fontSize: {
    /** ロゴ「withham」: text-2xl */
    brand: 24,
    /** ナビラベル: text-sm */
    navLabel: 14,
    /** 本文・投稿テキスト: デフォルト 16 */
    body: 16,
    /** メタ（日時）: text-xs */
    meta: 12,
    /** トレンド見出し: text-sm */
    caption: 14,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

/** アバター・タッチターゲット */
export const sizes = {
  /** 投稿一覧の著者/ハムスターアイコン: w-12 h-12 */
  avatarMd: 48,
  /** アイコンボタン: p-2 + icon ~20px */
  iconButton: 40,
  /** 主CTA 高さ: h-10 */
  primaryButtonHeight: 40,
} as const;

/** エレベーション（RN: Android elevation / iOS shadow を別実装） */
export const elevation = {
  card: { android: 2, ios: { shadowOpacity: 0.06, shadowRadius: 4 } },
} as const;

export type Colors = typeof colors;
export type Radii = typeof radii;
