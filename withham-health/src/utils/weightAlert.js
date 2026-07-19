/** 前回比でこの割合以上の減少ならアラート対象 */
export const WEIGHT_DROP_THRESHOLD = 0.05;

/**
 * @param {number|null|undefined} previousWeight
 * @param {number|null|undefined} nextWeight
 * @returns {{ previous: number, next: number, dropPct: number }|null}
 */
export function evaluateWeightDrop(previousWeight, nextWeight) {
  if (previousWeight == null || nextWeight == null) return null;
  const prev = Number(previousWeight);
  const next = Number(nextWeight);
  if (!Number.isFinite(prev) || !Number.isFinite(next) || prev <= 0) return null;
  const dropRatio = (prev - next) / prev;
  if (dropRatio < WEIGHT_DROP_THRESHOLD) return null;
  return {
    previous: prev,
    next,
    dropPct: Math.round(dropRatio * 1000) / 10,
  };
}

/**
 * @param {{ previous: number, next: number, dropPct: number }} alert
 */
export function formatWeightDropMessage(alert) {
  return (
    `前回 ${alert.previous} g → 今回 ${alert.next} g（${alert.dropPct}% 減）です。\n` +
    '体調変化のサインの可能性があるため、様子を確認してください。'
  );
}
