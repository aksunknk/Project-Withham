import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import {
  getPreviousWeight,
  getTodayCareGaps,
  listActivePets,
} from '../database/db';
import { WIDGET_NAME, WIDGET_SNAPSHOT_KEY } from './constants';
import { WithhamStatusWidget } from './WithhamStatusWidget';

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const p = String(dateStr).split('-');
  if (p.length !== 3) return dateStr;
  return `${Number(p[1])}/${Number(p[2])}`;
}

/**
 * DB からウィジェット用スナップショットを組み立てる。
 */
export async function buildWidgetSnapshot() {
  const pets = await listActivePets();
  const gaps = await getTodayCareGaps();
  const gapMap = new Map(gaps.map((g) => [g.pet_id, g]));

  const lines = [];
  for (const pet of pets.slice(0, 4)) {
    const prev = await getPreviousWeight(pet.id);
    const gap = gapMap.get(pet.id);
    const weightPart =
      prev != null
        ? `前回 ${prev.weight}g（${formatDateShort(prev.date)}）`
        : '前回体重なし';
    if (gap) {
      const miss = [];
      if (gap.missingWeight) miss.push('体重');
      if (gap.missingSafety) miss.push('安全');
      lines.push(`${pet.name}: 未記録(${miss.join('・')}) / ${weightPart}`);
    } else {
      lines.push(`${pet.name}: 本日OK / ${weightPart}`);
    }
  }

  const incomplete = gaps.length;
  return {
    title: 'hunumumuDiary',
    subtitle:
      incomplete > 0
        ? `本日の未記録: ${incomplete}個体`
        : pets.length === 0
          ? '個体が未登録です'
          : '本日の記録は完了しています',
    lines:
      lines.length > 0
        ? lines
        : ['データタブで個体を追加してください'],
    updatedAt: new Date().toISOString(),
  };
}

export async function loadWidgetSnapshot() {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveWidgetSnapshot(snapshot) {
  await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

/**
 * スナップショットを更新し、ホーム画面ウィジェットを再描画する。
 * Expo Go ではネイティブ未対応のため失敗しても握りつぶす。
 */
export async function refreshHomeWidget() {
  if (Platform.OS !== 'android') return;
  try {
    const snapshot = await buildWidgetSnapshot();
    await saveWidgetSnapshot(snapshot);
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () =>
        React.createElement(WithhamStatusWidget, { snapshot }),
      widgetNotFound: () => {},
    });
  } catch (e) {
    console.warn('[refreshHomeWidget]', e);
  }
}
