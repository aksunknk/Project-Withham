import { openDatabaseAsync } from 'expo-sqlite';

const DB_NAME = 'withham.db';

/** @type {import('expo-sqlite').SQLiteDatabase | null} */
let dbSingleton = null;

export const SETTINGS_KEYS = {
  ICON_FUNU: 'icon_funu',
  ICON_MUMU: 'icon_mumu',
};

const SCHEMA_KEY = 'schema_version';
const SCHEMA_VER = '2';

/** 端末ローカル日付（YYYY-MM-DD） */
export function getLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * SQLite を開き、スキーマを構築する。
 * 旧 daily_logs からの破壊的移行は schema_version のみで一度だけ実行する。
 */
export async function initDB() {
  dbSingleton = null;
  const db = await openDatabaseAsync(DB_NAME);
  dbSingleton = db;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name TEXT NOT NULL UNIQUE
    );
  `);

  const verRow = await db.getFirstAsync(
    `SELECT value FROM settings WHERE key = ?`,
    [SCHEMA_KEY]
  );
  const currentVer = verRow?.value ?? '';

  if (currentVer !== SCHEMA_VER) {
    await db.execAsync(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS daily_logs;
    `);
    await db.execAsync(`
      CREATE TABLE daily_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        date TEXT NOT NULL,
        pet_id TEXT NOT NULL,
        weight REAL,
        heyanpo_start TEXT,
        heyanpo_end TEXT,
        gap_block_checked INTEGER NOT NULL DEFAULT 0,
        meal_id INTEGER,
        memo TEXT,
        CHECK (pet_id IN ('funu', 'mumu')),
        CHECK (gap_block_checked IN (0, 1))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_date_pet
        ON daily_logs (date, pet_id);
    `);
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [SCHEMA_KEY, SCHEMA_VER]
    );
  } else {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS daily_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        date TEXT NOT NULL,
        pet_id TEXT NOT NULL,
        weight REAL,
        heyanpo_start TEXT,
        heyanpo_end TEXT,
        gap_block_checked INTEGER NOT NULL DEFAULT 0,
        meal_id INTEGER,
        memo TEXT,
        CHECK (pet_id IN ('funu', 'mumu')),
        CHECK (gap_block_checked IN (0, 1))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_date_pet
        ON daily_logs (date, pet_id);
    `);
  }

  return db;
}

export function getDatabase() {
  if (!dbSingleton) {
    throw new Error('データベースが未初期化です。先に initDB() を呼び出してください。');
  }
  return dbSingleton;
}

/** @param {'funu'|'mumu'} pet_id */
export async function getTodayLog(pet_id) {
  const db = getDatabase();
  const date = getLocalDateString();
  const row = await db.getFirstAsync(
    `SELECT id, date, pet_id, weight, heyanpo_start, heyanpo_end,
            gap_block_checked, meal_id, memo
     FROM daily_logs WHERE date = ? AND pet_id = ?`,
    [date, pet_id]
  );
  return row ?? null;
}

/**
 * @param {'funu'|'mumu'} pet_id
 * @param {object} payload
 * @param {string} [payload.date]
 * @param {number|null} [payload.weight]
 * @param {string|null} [payload.heyanpo_start]
 * @param {string|null} [payload.heyanpo_end]
 * @param {0|1|boolean} [payload.gap_block_checked]
 * @param {number|null} [payload.meal_id]
 * @param {string|null} [payload.memo]
 */
export async function upsertDailyLog(pet_id, payload) {
  const db = getDatabase();
  const date = payload.date ?? getLocalDateString();
  const weight =
    payload.weight === undefined || payload.weight === null || payload.weight === ''
      ? null
      : Number(payload.weight);
  const heyanpo_start = payload.heyanpo_start ?? null;
  const heyanpo_end = payload.heyanpo_end ?? null;
  const gap = payload.gap_block_checked ? 1 : 0;
  const meal_id =
    payload.meal_id === undefined || payload.meal_id === null || payload.meal_id === ''
      ? null
      : Number(payload.meal_id);
  const memo = payload.memo ?? null;

  await db.runAsync(
    `INSERT INTO daily_logs (
       date, pet_id, weight, heyanpo_start, heyanpo_end,
       gap_block_checked, meal_id, memo
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date, pet_id) DO UPDATE SET
       weight = excluded.weight,
       heyanpo_start = excluded.heyanpo_start,
       heyanpo_end = excluded.heyanpo_end,
       gap_block_checked = excluded.gap_block_checked,
       meal_id = excluded.meal_id,
       memo = excluded.memo`,
    [date, pet_id, weight, heyanpo_start, heyanpo_end, gap, meal_id, memo]
  );
}

function existingRowToPayload(row) {
  if (!row) {
    return {
      weight: null,
      heyanpo_start: null,
      heyanpo_end: null,
      gap_block_checked: 0,
      meal_id: null,
      memo: null,
    };
  }
  return {
    weight: row.weight != null ? Number(row.weight) : null,
    heyanpo_start: row.heyanpo_start ?? null,
    heyanpo_end: row.heyanpo_end ?? null,
    gap_block_checked: row.gap_block_checked === 1 ? 1 : 0,
    meal_id: row.meal_id != null ? Number(row.meal_id) : null,
    memo: row.memo ?? null,
  };
}

/**
 * 本日行の既存値とマージして UPSERT（項目単位の保存用）
 * @param {'funu'|'mumu'} pet_id
 * @param {object} partial upsertDailyLog と同形の部分オブジェクト
 */
export async function mergeUpsertDailyLog(pet_id, partial) {
  const existing = await getTodayLog(pet_id);
  const base = existingRowToPayload(existing);
  const merged = { ...base, ...partial };
  await upsertDailyLog(pet_id, merged);
}

/**
 * 体重推移（古い日付 → 新しい日付）
 * @param {'funu'|'mumu'} pet_id
 * @param {number} limit 最大件数
 */
export async function getWeightHistory(pet_id, limit = 14) {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT date, weight FROM daily_logs
     WHERE pet_id = ? AND weight IS NOT NULL
     ORDER BY date DESC
     LIMIT ?`,
    [pet_id, limit]
  );
  return (rows ?? []).reverse();
}

/**
 * へやんぽ記録（新しい日付順）
 * @param {'funu'|'mumu'} pet_id
 * @param {number} limit
 */
export async function getHeyanpoHistory(pet_id, limit = 60) {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT date, heyanpo_start, heyanpo_end FROM daily_logs
     WHERE pet_id = ?
       AND (
         length(trim(coalesce(heyanpo_start, ''))) > 0
         OR length(trim(coalesce(heyanpo_end, ''))) > 0
       )
     ORDER BY date DESC
     LIMIT ?`,
    [pet_id, limit]
  );
  return rows ?? [];
}

export async function getSetting(key) {
  const db = getDatabase();
  const row = await db.getFirstAsync(
    `SELECT value FROM settings WHERE key = ?`,
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key, value) {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value ?? '']
  );
}

export async function getAllSettings() {
  const db = getDatabase();
  const rows = await db.getAllAsync(`SELECT key, value FROM settings`);
  const out = {};
  for (const r of rows ?? []) {
    out[r.key] = r.value;
  }
  return out;
}

export async function addCustomMeal(name) {
  const db = getDatabase();
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new Error('メニュー名が空です');
  const result = await db.runAsync(
    `INSERT INTO custom_meals (name) VALUES (?)`,
    [trimmed]
  );
  return Number(result.lastInsertRowId);
}

export async function getCustomMeals() {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT id, name FROM custom_meals ORDER BY name ASC`
  );
  return rows ?? [];
}
