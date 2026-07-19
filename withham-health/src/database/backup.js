import {
  getAllSettings,
  getCustomMeals,
  getDatabase,
  getLocalDateString,
  SETTINGS_KEYS,
} from './db';

export const BACKUP_FORMAT = 'withham-health-backup';
export const BACKUP_VERSION = 1;

const SCHEMA_KEY = 'schema_version';

/**
 * @returns {Promise<object>}
 */
export async function buildBackupObject() {
  const db = getDatabase();
  const [daily_logs, custom_meals, maintenance_logs, settings] =
    await Promise.all([
      db.getAllAsync(
        `SELECT date, pet_id, weight, heyanpo_start, heyanpo_end,
                gap_block_checked, door_lock_checked, meal_id, memo
         FROM daily_logs
         ORDER BY date ASC, pet_id ASC`
      ),
      getCustomMeals(),
      db.getAllAsync(
        `SELECT executed_date, content, next_scheduled_date
         FROM maintenance_logs
         ORDER BY id ASC`
      ),
      getAllSettings(),
    ]);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    daily_logs: daily_logs ?? [],
    custom_meals: custom_meals ?? [],
    maintenance_logs: maintenance_logs ?? [],
    settings: settings ?? {},
  };
}

export function backupObjectToJson(obj) {
  return `${JSON.stringify(obj, null, 2)}\n`;
}

/**
 * @param {unknown} raw
 */
export function parseBackupJson(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || data.format !== BACKUP_FORMAT) {
    throw new Error('対応していないバックアップ形式です');
  }
  if (Number(data.version) !== BACKUP_VERSION) {
    throw new Error(`未対応のバックアップ版です: ${data.version}`);
  }
  if (!Array.isArray(data.daily_logs) || !Array.isArray(data.custom_meals)) {
    throw new Error('バックアップの内容が不正です');
  }
  return data;
}

async function upsertMealByName(name) {
  const db = getDatabase();
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return null;
  const existing = await db.getFirstAsync(
    `SELECT id FROM custom_meals WHERE name = ?`,
    [trimmed]
  );
  if (existing?.id != null) return Number(existing.id);
  const result = await db.runAsync(
    `INSERT INTO custom_meals (name) VALUES (?)`,
    [trimmed]
  );
  return Number(result.lastInsertRowId);
}

/**
 * @param {object} data parseBackupJson 済み
 * @param {'replace'|'merge'} mode
 */
export async function importBackupObject(data, mode) {
  const db = getDatabase();
  const replace = mode === 'replace';

  await db.withTransactionAsync(async () => {
    if (replace) {
      await db.execAsync(`
        DELETE FROM daily_logs;
        DELETE FROM custom_meals;
        DELETE FROM maintenance_logs;
      `);
    }

    /** @type {Map<number, number>} */
    const mealIdMap = new Map();

    for (const meal of data.custom_meals ?? []) {
      const name = String(meal.name ?? '').trim();
      if (!name) continue;
      const oldId = meal.id != null ? Number(meal.id) : null;

      if (replace && oldId != null && Number.isFinite(oldId)) {
        await db.runAsync(
          `INSERT INTO custom_meals (id, name) VALUES (?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
          [oldId, name]
        );
        mealIdMap.set(oldId, oldId);
      } else {
        const newId = await upsertMealByName(name);
        if (oldId != null && newId != null) mealIdMap.set(oldId, newId);
      }
    }

    for (const row of data.daily_logs ?? []) {
      const pet_id = row.pet_id;
      const date = row.date;
      if (pet_id !== 'funu' && pet_id !== 'mumu') continue;
      if (!date) continue;

      let meal_id = null;
      if (row.meal_id != null && row.meal_id !== '') {
        const old = Number(row.meal_id);
        meal_id = mealIdMap.has(old) ? mealIdMap.get(old) : old;
      }

      const weight =
        row.weight === undefined || row.weight === null || row.weight === ''
          ? null
          : Number(row.weight);
      const gap = row.gap_block_checked ? 1 : 0;
      const door =
        row.door_lock_checked === undefined || row.door_lock_checked === null
          ? gap
          : row.door_lock_checked
            ? 1
            : 0;

      await db.runAsync(
        `INSERT INTO daily_logs (
           date, pet_id, weight, heyanpo_start, heyanpo_end,
           gap_block_checked, door_lock_checked, meal_id, memo
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(date, pet_id) DO UPDATE SET
           weight = excluded.weight,
           heyanpo_start = excluded.heyanpo_start,
           heyanpo_end = excluded.heyanpo_end,
           gap_block_checked = excluded.gap_block_checked,
           door_lock_checked = excluded.door_lock_checked,
           meal_id = excluded.meal_id,
           memo = excluded.memo`,
        [
          date,
          pet_id,
          weight,
          row.heyanpo_start ?? null,
          row.heyanpo_end ?? null,
          gap,
          door,
          meal_id,
          row.memo ?? null,
        ]
      );
    }

    for (const m of data.maintenance_logs ?? []) {
      await db.runAsync(
        `INSERT INTO maintenance_logs (executed_date, content, next_scheduled_date)
         VALUES (?, ?, ?)`,
        [
          m.executed_date ?? '',
          String(m.content ?? ''),
          m.next_scheduled_date ?? null,
        ]
      );
    }

    const settings = data.settings ?? {};
    for (const [key, value] of Object.entries(settings)) {
      if (key === SCHEMA_KEY) continue;
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value ?? '']
      );
    }
  });
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * 体重 CSV（全個体）
 */
export async function buildWeightCsv() {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT date, pet_id, weight FROM daily_logs
     WHERE weight IS NOT NULL
     ORDER BY date ASC, pet_id ASC`
  );
  const lines = ['date,pet_id,weight_g'];
  for (const r of rows ?? []) {
    lines.push(
      [csvEscape(r.date), csvEscape(r.pet_id), csvEscape(r.weight)].join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}

/**
 * へやんぽ CSV（全個体）
 */
export async function buildHeyanpoCsv() {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT date, pet_id, heyanpo_start, heyanpo_end FROM daily_logs
     WHERE length(trim(coalesce(heyanpo_start, ''))) > 0
        OR length(trim(coalesce(heyanpo_end, ''))) > 0
     ORDER BY date ASC, pet_id ASC`
  );
  const lines = ['date,pet_id,heyanpo_start,heyanpo_end'];
  for (const r of rows ?? []) {
    lines.push(
      [
        csvEscape(r.date),
        csvEscape(r.pet_id),
        csvEscape(r.heyanpo_start),
        csvEscape(r.heyanpo_end),
      ].join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}

export function defaultBackupFileName() {
  return `withham-backup-${getLocalDateString()}.json`;
}

export function defaultCsvFileName(kind) {
  return `withham-${kind}-${getLocalDateString()}.csv`;
}

/** アイコン設定キー（インポート後の再読込用） */
export { SETTINGS_KEYS };
