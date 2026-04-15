# Withham デザインシステム（v1 抽出 → RN 移植用）

| ファイル | 内容 |
|----------|------|
| `tokens.ts` | 色・余白・角丸・タイポ・サイズ（Web 非依存の定数） |
| `STRUCTURE.md` | レイアウトツリーとコンポーネント解剖 |
| `LOGIC_BOUNDARY.md` | API / ナビと見た目の分離方針 |

**使い方:** Expo プロジェクトでは `tokens.ts` をコピーまたはパッケージ化し、`StyleSheet.create` で参照する。Tailwind のクラス名は RN では使わない。
