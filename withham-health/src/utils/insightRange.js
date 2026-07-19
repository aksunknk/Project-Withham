/** @typedef {'short'|'medium'|'all'} InsightRangeKey */

/**
 * 分析タブの期間プリセット。
 * - chartLimit: 体重・へやんぽグラフの計測点数
 * - days: 平均・食事のカレンダー日数（null = 全期間）
 */
export const INSIGHT_RANGES = {
  short: {
    key: 'short',
    chartLimit: 14,
    days: 7,
    toggleLabel: '計測14回',
    detailLabel: 'グラフ: 直近14回 / 平均・食事: 直近7日',
  },
  medium: {
    key: 'medium',
    chartLimit: 30,
    days: 30,
    toggleLabel: '計測30回',
    detailLabel: 'グラフ: 直近30回 / 平均・食事: 直近30日',
  },
  all: {
    key: 'all',
    chartLimit: 120,
    days: null,
    toggleLabel: '全期間',
    detailLabel: 'グラフ: 最大120回 / 平均・食事: 全期間',
  },
};

/** @param {InsightRangeKey} key */
export function getInsightRange(key) {
  return INSIGHT_RANGES[key] ?? INSIGHT_RANGES.short;
}
