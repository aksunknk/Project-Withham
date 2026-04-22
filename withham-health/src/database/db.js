import { openDatabaseAsync } from 'expo-sqlite';

const DB_NAME = 'withham.db';

/** @type {import('expo-sqlite').SQLiteDatabase | null} */
let dbSingleton = null;

export const SETTINGS_KEYS = {
  ICON_FUNU: 'icon_funu',
  ICON_MUMU: 'icon_mumu',
};

const SCHEMA_KEY = 'schema_version';
const SCHEMA_VER = '3';

const DAILY_LOGS_DDL = `
  CREATE TABLE daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    date TEXT NOT NULL,
    pet_id TEXT NOT NULL,
    weight REAL,
    heyanpo_start TEXT,
    heyanpo_end TEXT,
    gap_block_checked INTEGER NOT NULL DEFAULT 0,
    door_lock_checked INTEGER NOT NULL DEFAULT 0,
    meal_id INTEGER,
    memo TEXT,
    CHECK (pet_id IN ('funu', 'mumu')),
    CHECK (gap_block_checked IN (0, 1)),
    CHECK (door_lock_checked IN (0, 1))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_date_pet
    ON daily_logs (date, pet_id);
`;

const MAINTENANCE_LOGS_DDL = `
  CREATE TABLE IF NOT EXISTS maintenance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    executed_date TEXT,
    content TEXT,
    next_scheduled_date TEXT
  );
`;

/** 端末ローカル日付（YYYY-MM-DD） */
export function getLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
async function ensureMaintenanceLogsTable(db) {
  await db.execAsync(MAINTENANCE_LOGS_DDL);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
async function ensureDoorLockColumn(db) {
  const info = await db.getAllAsync(`PRAGMA table_info(daily_logs)`);
  if (!info || info.length === 0) return;
  const names = new Set(info.map((c) => c.name));
  if (names.has('door_lock_checked')) return;
  await db.execAsync(
    `ALTER TABLE daily_logs ADD COLUMN door_lock_checked INTEGER NOT NULL DEFAULT 0`
  );
  await db.runAsync(
    `UPDATE daily_logs SET door_lock_checked = gap_block_checked`
  );
}

/**
 * SQLite を開き、スキーマを構築する。
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
    if (currentVer === '2') {
      await ensureMaintenanceLogsTable(db);
      await ensureDoorLockColumn(db);
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [SCHEMA_KEY, SCHEMA_VER]
      );
    } else {
      await db.execAsync(`
        PRAGMA foreign_keys = OFF;
        DROP TABLE IF EXISTS daily_logs;
      `);
      await db.execAsync(DAILY_LOGS_DDL);
      await ensureMaintenanceLogsTable(db);
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [SCHEMA_KEY, SCHEMA_VER]
      );
    }
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
    await ensureDoorLockColumn(db);
    await ensureMaintenanceLogsTable(db);
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
            gap_block_checked, door_lock_checked, meal_id, memo
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
 * @param {0|1|boolean} [payload.door_lock_checked]
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
  const door =
    payload.door_lock_checked === undefined || payload.door_lock_checked === null
      ? gap
      : payload.door_lock_checked
        ? 1
        : 0;
  const meal_id =
    payload.meal_id === undefined || payload.meal_id === null || payload.meal_id === ''
      ? null
      : Number(payload.meal_id);
  const memo = payload.memo ?? null;

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
    [date, pet_id, weight, heyanpo_start, heyanpo_end, gap, door, meal_id, memo]
  );
}

function existingRowToPayload(row) {
  if (!row) {
    return {
      weight: null,
      heyanpo_start: null,
      heyanpo_end: null,
      gap_block_checked: 0,
      door_lock_checked: 0,
      meal_id: null,
      memo: null,
    };
  }
  const gap = row.gap_block_checked === 1 ? 1 : 0;
  const doorRaw = row.door_lock_checked;
  const door =
    doorRaw === undefined || doorRaw === null ? gap : doorRaw === 1 ? 1 : 0;
  return {
    weight: row.weight != null ? Number(row.weight) : null,
    heyanpo_start: row.heyanpo_start ?? null,
    heyanpo_end: row.heyanpo_end ?? null,
    gap_block_checked: gap,
    door_lock_checked: door,
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

/**
 * 環境保守ログを追加する。
 * @param {{ content: string, executed_date: string, next_scheduled_date: string|null }} row
 */
export async function insertMaintenanceLog(row) {
  const db = getDatabase();
  const content = String(row.content ?? '').trim();
  const executed_date = row.executed_date ?? '';
  const next_scheduled_date =
    row.next_scheduled_date == null || row.next_scheduled_date === ''
      ? null
      : String(row.next_scheduled_date);
  await db.runAsync(
    `INSERT INTO maintenance_logs (executed_date, content, next_scheduled_date)
     VALUES (?, ?, ?)`,
    [executed_date, content, next_scheduled_date]
  );
}

/**
 * 直近の保守ログと、当該ログに紐づく次回予定日を返す。
 */
export async function getLatestMaintenanceSummary() {
  const db = getDatabase();
  const latest = await db.getFirstAsync(
    `SELECT id, executed_date, content, next_scheduled_date
     FROM maintenance_logs
     ORDER BY id DESC
     LIMIT 1`
  );
  return {
    latest: latest ?? null,
    nextScheduledDate: latest?.next_scheduled_date ?? null,
  };
}

/**
 * 環境保守ログ一覧（新しい id 順）
 * @param {number} limit
 */
export async function getMaintenanceHistory(limit = 120) {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT id, executed_date, content, next_scheduled_date
     FROM maintenance_logs
     ORDER BY id DESC
     LIMIT ?`,
    [limit]
  );
  return rows ?? [];
}

/**
 * 直近 `days` 日間の集計開始日（本日を含む、YYYY-MM-DD）
 * @param {number} days 7 または 30 など
 */
export function getInsightRangeStartDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return getLocalDateString(d);
}

/**
 * 指定期間内の体重推移（日付の昇順）
 * @param {'funu'|'mumu'} pet_id
 * @param {number} days 直近日数（本日含む）
 */
export async function getWeightHistoryInDateRange(pet_id, days) {
  const db = getDatabase();
  const start = getInsightRangeStartDate(days);
  const end = getLocalDateString();
  const rows = await db.getAllAsync(
    `SELECT date, weight FROM daily_logs
     WHERE pet_id = ? AND weight IS NOT NULL
       AND date >= ? AND date <= ?
     ORDER BY date ASC`,
    [pet_id, start, end]
  );
  return rows ?? [];
}

/**
 * へやんぽの平均所要時間（分）。同一日内で終了時刻が開始以降の行のみを AVG。
 * @param {'funu'|'mumu'} pet_id
 * @param {number} days
 * @returns {Promise<number|null>}
 */
export async function getAvgHeyanpoMinutesInDateRange(pet_id, days) {
  const db = getDatabase();
  const start = getInsightRangeStartDate(days);
  const end = getLocalDateString();
  const row = await db.getFirstAsync(
    `SELECT AVG(
         (strftime('%s', date || ' ' || heyanpo_end || ':00')
        - strftime('%s', date || ' ' || heyanpo_start || ':00')) / 60.0
       ) AS avg_min
     FROM daily_logs
     WHERE pet_id = ?
       AND date >= ? AND date <= ?
       AND length(trim(coalesce(heyanpo_start, ''))) >= 4
       AND length(trim(coalesce(heyanpo_end, ''))) >= 4
       AND strftime('%s', date || ' ' || heyanpo_end || ':00')
        >= strftime('%s', date || ' ' || heyanpo_start || ':00')`,
    [pet_id, start, end]
  );
  if (row == null || row.avg_min == null) return null;
  const v = Number(row.avg_min);
  return Number.isFinite(v) ? v : null;
}

/**
 * 食事メニュー別の提供回数（多い順）。`custom_meals` と突合して名称を付与。
 * @param {'funu'|'mumu'} pet_id
 * @param {number} days
 */
export async function getMealServeCountsInDateRange(pet_id, days) {
  const db = getDatabase();
  const start = getInsightRangeStartDate(days);
  const end = getLocalDateString();
  const rows = await db.getAllAsync(
    `SELECT meal_id, COUNT(*) AS cnt
     FROM daily_logs
     WHERE pet_id = ?
       AND date >= ? AND date <= ?
       AND meal_id IS NOT NULL
     GROUP BY meal_id
     ORDER BY cnt DESC`,
    [pet_id, start, end]
  );
  const meals = await getCustomMeals();
  const idToName = new Map(meals.map((m) => [Number(m.id), m.name]));
  return (rows ?? []).map((r) => ({
    meal_id: Number(r.meal_id),
    name: idToName.get(Number(r.meal_id)) ?? `ID ${r.meal_id}`,
    count: Number(r.cnt),
  }));
}
