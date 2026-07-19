import { openDatabaseAsync } from 'expo-sqlite';

const DB_NAME = 'withham.db';

/** @type {import('expo-sqlite').SQLiteDatabase | null} */
let dbSingleton = null;

export const SETTINGS_KEYS = {
  ICON_FUNU: 'icon_funu',
  ICON_MUMU: 'icon_mumu',
  /** '1' | '0' — お手入れ予定のローカル通知 */
  NOTIFY_MAINTENANCE: 'notify_maintenance',
  /** '1' | '0' — 本日未記録の夕方リマインド */
  NOTIFY_DAILY_RECORD: 'notify_daily_record',
};

const SCHEMA_KEY = 'schema_version';
const SCHEMA_VER = '4';
const DAILY_LOGS_FLEX_KEY = 'daily_logs_flexible_pet';

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
    photo_uri TEXT,
    CHECK (gap_block_checked IN (0, 1)),
    CHECK (door_lock_checked IN (0, 1))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_date_pet
    ON daily_logs (date, pet_id);
`;

const PETS_DDL = `
  CREATE TABLE IF NOT EXISTS pets (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon_uri TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    retired INTEGER NOT NULL DEFAULT 0,
    CHECK (retired IN (0, 1))
  );
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
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
async function setSchemaVersion(db, ver) {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [SCHEMA_KEY, ver]
  );
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
async function ensurePetsTableAndSeed(db) {
  await db.execAsync(PETS_DDL);
  const row = await db.getFirstAsync(`SELECT COUNT(*) AS c FROM pets`);
  if (Number(row?.c ?? 0) > 0) return;

  const iconFunu = await db.getFirstAsync(
    `SELECT value FROM settings WHERE key = ?`,
    [SETTINGS_KEYS.ICON_FUNU]
  );
  const iconMumu = await db.getFirstAsync(
    `SELECT value FROM settings WHERE key = ?`,
    [SETTINGS_KEYS.ICON_MUMU]
  );
  await db.runAsync(
    `INSERT INTO pets (id, name, icon_uri, sort_order, retired) VALUES (?, ?, ?, ?, 0)`,
    ['funu', 'ふぬ', iconFunu?.value ?? null, 0]
  );
  await db.runAsync(
    `INSERT INTO pets (id, name, icon_uri, sort_order, retired) VALUES (?, ?, ?, ?, 0)`,
    ['mumu', 'むむ', iconMumu?.value ?? null, 1]
  );
}

/**
 * pet_id 制約を外し photo_uri を持つ daily_logs へ移行。
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
async function ensureDailyLogsV4(db) {
  const flex = await db.getFirstAsync(
    `SELECT value FROM settings WHERE key = ?`,
    [DAILY_LOGS_FLEX_KEY]
  );
  const info = await db.getAllAsync(`PRAGMA table_info(daily_logs)`);
  if (!info || info.length === 0) {
    await db.execAsync(DAILY_LOGS_DDL);
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [DAILY_LOGS_FLEX_KEY, '1']
    );
    return;
  }
  const names = new Set(info.map((c) => c.name));
  if (names.has('photo_uri')) {
    if (flex?.value !== '1') {
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [DAILY_LOGS_FLEX_KEY, '1']
      );
    }
    return;
  }

  await ensureDoorLockColumn(db);
  const info2 = await db.getAllAsync(`PRAGMA table_info(daily_logs)`);
  const names2 = new Set((info2 ?? []).map((c) => c.name));
  const hasPhoto = names2.has('photo_uri');
  const hasDoor = names2.has('door_lock_checked');

  await db.execAsync(`
    CREATE TABLE daily_logs_v4 (
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
      photo_uri TEXT,
      CHECK (gap_block_checked IN (0, 1)),
      CHECK (door_lock_checked IN (0, 1))
    );
  `);

  if (hasPhoto && hasDoor) {
    await db.execAsync(`
      INSERT INTO daily_logs_v4 (
        id, date, pet_id, weight, heyanpo_start, heyanpo_end,
        gap_block_checked, door_lock_checked, meal_id, memo, photo_uri
      )
      SELECT id, date, pet_id, weight, heyanpo_start, heyanpo_end,
             gap_block_checked, door_lock_checked, meal_id, memo, photo_uri
      FROM daily_logs
    `);
  } else if (hasDoor) {
    await db.execAsync(`
      INSERT INTO daily_logs_v4 (
        id, date, pet_id, weight, heyanpo_start, heyanpo_end,
        gap_block_checked, door_lock_checked, meal_id, memo, photo_uri
      )
      SELECT id, date, pet_id, weight, heyanpo_start, heyanpo_end,
             gap_block_checked, door_lock_checked, meal_id, memo, NULL
      FROM daily_logs
    `);
  } else {
    await db.execAsync(`
      INSERT INTO daily_logs_v4 (
        id, date, pet_id, weight, heyanpo_start, heyanpo_end,
        gap_block_checked, door_lock_checked, meal_id, memo, photo_uri
      )
      SELECT id, date, pet_id, weight, heyanpo_start, heyanpo_end,
             gap_block_checked, gap_block_checked, meal_id, memo, NULL
      FROM daily_logs
    `);
  }

  await db.execAsync(`
    DROP TABLE daily_logs;
    ALTER TABLE daily_logs_v4 RENAME TO daily_logs;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_date_pet
      ON daily_logs (date, pet_id);
  `);
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [DAILY_LOGS_FLEX_KEY, '1']
  );
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
async function ensureMealPinColumns(db) {
  const info = await db.getAllAsync(`PRAGMA table_info(custom_meals)`);
  const names = new Set((info ?? []).map((c) => c.name));
  if (!names.has('pinned')) {
    await db.execAsync(
      `ALTER TABLE custom_meals ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0`
    );
  }
  if (!names.has('last_used_at')) {
    await db.execAsync(
      `ALTER TABLE custom_meals ADD COLUMN last_used_at TEXT`
    );
  }
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

  if (currentVer === '' || currentVer === '0') {
    await db.execAsync(DAILY_LOGS_DDL);
    await ensureMaintenanceLogsTable(db);
  } else if (currentVer === '2') {
    await ensureMaintenanceLogsTable(db);
    await ensureDoorLockColumn(db);
  } else if (currentVer === '3' || currentVer === '4') {
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
        CHECK (gap_block_checked IN (0, 1))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_date_pet
        ON daily_logs (date, pet_id);
    `);
    await ensureDoorLockColumn(db);
    await ensureMaintenanceLogsTable(db);
  } else {
    await db.execAsync(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS daily_logs;
    `);
    await db.execAsync(DAILY_LOGS_DDL);
    await ensureMaintenanceLogsTable(db);
  }

  await ensurePetsTableAndSeed(db);
  await ensureDailyLogsV4(db);
  await ensureMealPinColumns(db);
  await setSchemaVersion(db, SCHEMA_VER);

  return db;
}

export function getDatabase() {
  if (!dbSingleton) {
    throw new Error('データベースが未初期化です。先に initDB() を呼び出してください。');
  }
  return dbSingleton;
}

/** YYYY-MM-DD 形式か */
export function isValidDateString(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

/** @param {string} dateStr YYYY-MM-DD */
export function parseLocalDateString(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map((x) => Number(x));
  return new Date(y, m - 1, d);
}

/**
 * @param {string} pet_id
 * @param {string} date YYYY-MM-DD
 */
export async function getLogByDate(pet_id, date) {
  const db = getDatabase();
  const row = await db.getFirstAsync(
    `SELECT id, date, pet_id, weight, heyanpo_start, heyanpo_end,
            gap_block_checked, door_lock_checked, meal_id, memo, photo_uri
     FROM daily_logs WHERE date = ? AND pet_id = ?`,
    [date, pet_id]
  );
  return row ?? null;
}

/** @param {string} pet_id */
export async function getTodayLog(pet_id) {
  return getLogByDate(pet_id, getLocalDateString());
}

/**
 * 本日の体重未記録 / 安全確認未完了を個体ごとに返す。
 * @returns {Promise<Array<{ pet_id: string, label: string, missingWeight: boolean, missingSafety: boolean }>>}
 */
export async function getTodayCareGaps() {
  const today = getLocalDateString();
  const pets = await listActivePets();
  const out = [];
  for (const pet of pets) {
    const row = await getLogByDate(pet.id, today);
    const missingWeight = row == null || row.weight == null;
    const gapOn = row?.gap_block_checked === 1;
    const doorRaw = row?.door_lock_checked;
    const doorOn =
      doorRaw === undefined || doorRaw === null ? gapOn : doorRaw === 1;
    const sealed = Boolean(gapOn && doorOn);
    const missingSafety = !sealed;
    if (missingWeight || missingSafety) {
      out.push({
        pet_id: pet.id,
        label: pet.name,
        missingWeight,
        missingSafety,
      });
    }
  }
  return out;
}

/**
 * @param {string} pet_id
 * @param {object} payload
 * @param {string} [payload.date]
 * @param {number|null} [payload.weight]
 * @param {string|null} [payload.heyanpo_start]
 * @param {string|null} [payload.heyanpo_end]
 * @param {0|1|boolean} [payload.gap_block_checked]
 * @param {0|1|boolean} [payload.door_lock_checked]
 * @param {number|null} [payload.meal_id]
 * @param {string|null} [payload.memo]
 * @param {string|null} [payload.photo_uri]
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
  const photo_uri =
    payload.photo_uri == null || payload.photo_uri === ''
      ? null
      : String(payload.photo_uri);

  await db.runAsync(
    `INSERT INTO daily_logs (
       date, pet_id, weight, heyanpo_start, heyanpo_end,
       gap_block_checked, door_lock_checked, meal_id, memo, photo_uri
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date, pet_id) DO UPDATE SET
       weight = excluded.weight,
       heyanpo_start = excluded.heyanpo_start,
       heyanpo_end = excluded.heyanpo_end,
       gap_block_checked = excluded.gap_block_checked,
       door_lock_checked = excluded.door_lock_checked,
       meal_id = excluded.meal_id,
       memo = excluded.memo,
       photo_uri = excluded.photo_uri`,
    [
      date,
      pet_id,
      weight,
      heyanpo_start,
      heyanpo_end,
      gap,
      door,
      meal_id,
      memo,
      photo_uri,
    ]
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
      photo_uri: null,
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
    photo_uri: row.photo_uri ?? null,
  };
}

/**
 * 指定日（未指定なら本日）の既存値とマージして UPSERT（項目単位の保存用）
 * @param {'funu'|'mumu'} pet_id
 * @param {object} partial upsertDailyLog と同形。`date` で対象日を指定可
 */
export async function mergeUpsertDailyLog(pet_id, partial) {
  const date = partial?.date ?? getLocalDateString();
  if (!isValidDateString(date)) {
    throw new Error(`不正な日付です: ${date}`);
  }
  const { date: _ignored, ...fields } = partial ?? {};
  const existing = await getLogByDate(pet_id, date);
  const base = existingRowToPayload(existing);
  const merged = { ...base, ...fields, date };
  await upsertDailyLog(pet_id, merged);
}

/**
 * @param {'funu'|'mumu'} pet_id
 * @param {string} date
 */
export async function deleteDailyLog(pet_id, date) {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM daily_logs WHERE pet_id = ? AND date = ?`, [
    pet_id,
    date,
  ]);
}

/**
 * 実質空の日次行を削除する。
 * @param {'funu'|'mumu'} pet_id
 * @param {string} date
 */
export async function pruneEmptyDailyLog(pet_id, date) {
  const row = await getLogByDate(pet_id, date);
  if (!row) return;
  const p = existingRowToPayload(row);
  const empty =
    p.weight == null &&
    !p.heyanpo_start &&
    !p.heyanpo_end &&
    !p.gap_block_checked &&
    !p.door_lock_checked &&
    p.meal_id == null &&
    (p.memo == null || String(p.memo).trim() === '') &&
    (p.photo_uri == null || String(p.photo_uri).trim() === '');
  if (empty) await deleteDailyLog(pet_id, date);
}

/**
 * 体重フィールドのみクリア（空行なら削除）
 * @param {'funu'|'mumu'} pet_id
 * @param {string} date
 */
export async function clearDailyLogWeight(pet_id, date) {
  await mergeUpsertDailyLog(pet_id, { date, weight: null });
  await pruneEmptyDailyLog(pet_id, date);
}

/**
 * へやんぽ時刻のみクリア（空行なら削除）
 * @param {'funu'|'mumu'} pet_id
 * @param {string} date
 */
export async function clearDailyLogHeyanpo(pet_id, date) {
  await mergeUpsertDailyLog(pet_id, {
    date,
    heyanpo_start: null,
    heyanpo_end: null,
  });
  await pruneEmptyDailyLog(pet_id, date);
}

/**
 * メモのみクリア（空行なら削除）
 * @param {'funu'|'mumu'} pet_id
 * @param {string} date
 */
export async function clearDailyLogMemo(pet_id, date) {
  await mergeUpsertDailyLog(pet_id, { date, memo: null });
  await pruneEmptyDailyLog(pet_id, date);
}

/**
 * メモがある日の履歴（新しい日付順）
 * @param {'funu'|'mumu'} pet_id
 * @param {number} limit
 */
export async function getMemoHistory(pet_id, limit = 90) {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT date, memo FROM daily_logs
     WHERE pet_id = ?
       AND length(trim(coalesce(memo, ''))) > 0
     ORDER BY date DESC
     LIMIT ?`,
    [pet_id, limit]
  );
  return rows ?? [];
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
 * 入力欄の参考用。原則「基準日より前」の最新体重。
 * 過去が無い場合のみ基準日当日の記録へフォールバック。
 * @param {'funu'|'mumu'} pet_id
 * @param {string} [asOfDate] YYYY-MM-DD（省略時は本日）
 * @returns {Promise<{ date: string, weight: number }|null>}
 */
export async function getPreviousWeight(pet_id, asOfDate = getLocalDateString()) {
  const db = getDatabase();
  const before = await db.getFirstAsync(
    `SELECT date, weight FROM daily_logs
     WHERE pet_id = ? AND weight IS NOT NULL AND date < ?
     ORDER BY date DESC
     LIMIT 1`,
    [pet_id, asOfDate]
  );
  if (before?.weight != null) {
    return { date: before.date, weight: Number(before.weight) };
  }
  const latest = await db.getFirstAsync(
    `SELECT date, weight FROM daily_logs
     WHERE pet_id = ? AND weight IS NOT NULL AND date <= ?
     ORDER BY date DESC
     LIMIT 1`,
    [pet_id, asOfDate]
  );
  if (latest?.weight == null) return null;
  return { date: latest.date, weight: Number(latest.weight) };
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

/**
 * HH:mm → 分（不正なら null）
 * @param {string|null|undefined} start
 * @param {string|null|undefined} end
 */
export function heyanpoMinutesBetween(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = String(start).split(':').map((x) => parseInt(x, 10));
  const [eh, em] = String(end).split(':').map((x) => parseInt(x, 10));
  if (![sh, sm, eh, em].every((n) => Number.isFinite(n))) return null;
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins >= 0 ? mins : null;
}

/**
 * へやんぽ所要時間の推移（古い日付 → 新しい日付）。開始・終了が揃った日のみ。
 * @param {'funu'|'mumu'} pet_id
 * @param {number} limit
 * @returns {Promise<Array<{ date: string, minutes: number }>>}
 */
export async function getHeyanpoDurationHistory(pet_id, limit = 14) {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT date, heyanpo_start, heyanpo_end FROM daily_logs
     WHERE pet_id = ?
       AND length(trim(coalesce(heyanpo_start, ''))) >= 4
       AND length(trim(coalesce(heyanpo_end, ''))) >= 4
     ORDER BY date DESC
     LIMIT ?`,
    [pet_id, limit]
  );
  const out = [];
  for (const r of [...(rows ?? [])].reverse()) {
    const minutes = heyanpoMinutesBetween(r.heyanpo_start, r.heyanpo_end);
    if (minutes == null) continue;
    out.push({ date: r.date, minutes });
  }
  return out;
}

/**
 * 指定月の日次マーク（カレンダー用）
 * @param {'funu'|'mumu'} pet_id
 * @param {number} year
 * @param {number} month 1-12
 * @returns {Promise<Record<string, { hasWeight: boolean, hasActivity: boolean, weight: number|null }>>}
 *   キーは YYYY-MM-DD
 */
export async function getMonthDayMarks(pet_id, year, month) {
  const db = getDatabase();
  const y = Number(year);
  const m = Number(month);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const rows = await db.getAllAsync(
    `SELECT date, weight, heyanpo_start, heyanpo_end,
            gap_block_checked, door_lock_checked, meal_id, memo, photo_uri
     FROM daily_logs
     WHERE pet_id = ? AND date >= ? AND date <= ?`,
    [pet_id, start, end]
  );
  /** @type {Record<string, { hasWeight: boolean, hasActivity: boolean, weight: number|null }>} */
  const marks = {};
  for (const r of rows ?? []) {
    const hasWeight = r.weight != null;
    const hasHey =
      lengthTrim(r.heyanpo_start) > 0 || lengthTrim(r.heyanpo_end) > 0;
    const hasMemo = lengthTrim(r.memo) > 0;
    const hasMeal = r.meal_id != null;
    const hasPhoto = lengthTrim(r.photo_uri) > 0;
    const hasSafety =
      r.gap_block_checked === 1 || r.door_lock_checked === 1;
    const hasActivity =
      hasWeight || hasHey || hasMemo || hasMeal || hasSafety || hasPhoto;
    marks[r.date] = {
      hasWeight,
      hasActivity,
      weight: hasWeight ? Number(r.weight) : null,
    };
  }
  return marks;
}

function lengthTrim(v) {
  return String(v ?? '').trim().length;
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
    `INSERT INTO custom_meals (name, pinned, last_used_at) VALUES (?, 0, NULL)`,
    [trimmed]
  );
  return Number(result.lastInsertRowId);
}

/** ピン留め優先 → 最近使用 → 名前 */
export async function getCustomMeals() {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT id, name, pinned, last_used_at FROM custom_meals
     ORDER BY pinned DESC,
              CASE WHEN last_used_at IS NULL THEN 1 ELSE 0 END,
              last_used_at DESC,
              name ASC`
  );
  return (rows ?? []).map((r) => ({
    id: Number(r.id),
    name: r.name,
    pinned: r.pinned === 1,
    last_used_at: r.last_used_at ?? null,
  }));
}

/** @param {number} mealId */
export async function touchMealUsed(mealId) {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE custom_meals SET last_used_at = ? WHERE id = ?`,
    [new Date().toISOString(), Number(mealId)]
  );
}

/** @param {number} mealId */
export async function toggleMealPinned(mealId) {
  const db = getDatabase();
  const row = await db.getFirstAsync(
    `SELECT pinned FROM custom_meals WHERE id = ?`,
    [Number(mealId)]
  );
  if (!row) throw new Error('メニューが見つかりません');
  const next = row.pinned === 1 ? 0 : 1;
  await db.runAsync(`UPDATE custom_meals SET pinned = ? WHERE id = ?`, [
    next,
    Number(mealId),
  ]);
  return next === 1;
}

/**
 * 写真付き日次ログ（新しい日付順）
 * @param {string} pet_id
 * @param {number} limit
 */
export async function getPhotoHistory(pet_id, limit = 60) {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT date, photo_uri FROM daily_logs
     WHERE pet_id = ?
       AND length(trim(coalesce(photo_uri, ''))) > 0
     ORDER BY date DESC
     LIMIT ?`,
    [pet_id, limit]
  );
  return rows ?? [];
}

/** @param {boolean} [includeRetired=false] */
export async function listPets(includeRetired = false) {
  const db = getDatabase();
  const rows = includeRetired
    ? await db.getAllAsync(
        `SELECT id, name, icon_uri, sort_order, retired FROM pets
         ORDER BY retired ASC, sort_order ASC, name ASC`
      )
    : await db.getAllAsync(
        `SELECT id, name, icon_uri, sort_order, retired FROM pets
         WHERE retired = 0
         ORDER BY sort_order ASC, name ASC`
      );
  return (rows ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    icon_uri: r.icon_uri ?? null,
    sort_order: Number(r.sort_order ?? 0),
    retired: r.retired === 1,
  }));
}

export async function listActivePets() {
  return listPets(false);
}

/**
 * @param {{ name: string, icon_uri?: string|null }} input
 */
export async function createPet(input) {
  const db = getDatabase();
  const name = String(input.name ?? '').trim();
  if (!name) throw new Error('名前が空です');
  const id = `pet_${Date.now().toString(36)}`;
  const maxRow = await db.getFirstAsync(
    `SELECT MAX(sort_order) AS m FROM pets WHERE retired = 0`
  );
  const sort_order = Number(maxRow?.m ?? -1) + 1;
  await db.runAsync(
    `INSERT INTO pets (id, name, icon_uri, sort_order, retired) VALUES (?, ?, ?, ?, 0)`,
    [id, name, input.icon_uri ?? null, sort_order]
  );
  return id;
}

/**
 * @param {string} id
 * @param {{ name?: string, icon_uri?: string|null, retired?: boolean, sort_order?: number }} patch
 */
export async function updatePet(id, patch) {
  const db = getDatabase();
  const row = await db.getFirstAsync(
    `SELECT id, name, icon_uri, sort_order, retired FROM pets WHERE id = ?`,
    [id]
  );
  if (!row) throw new Error('個体が見つかりません');
  const name =
    patch.name !== undefined ? String(patch.name).trim() : row.name;
  if (!name) throw new Error('名前が空です');
  const icon_uri =
    patch.icon_uri !== undefined ? patch.icon_uri : row.icon_uri;
  const retired =
    patch.retired !== undefined ? (patch.retired ? 1 : 0) : row.retired;
  const sort_order =
    patch.sort_order !== undefined
      ? Number(patch.sort_order)
      : Number(row.sort_order);
  await db.runAsync(
    `UPDATE pets SET name = ?, icon_uri = ?, retired = ?, sort_order = ? WHERE id = ?`,
    [name, icon_uri ?? null, retired, sort_order, id]
  );
}

/** @param {string} id */
export async function getPet(id) {
  const pets = await listPets(true);
  return pets.find((p) => p.id === id) ?? null;
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
/**
 * @param {'funu'|'mumu'} pet_id
 * @param {number|null} days null なら全期間
 */
export async function getAvgHeyanpoMinutesInDateRange(pet_id, days) {
  const db = getDatabase();
  const params = [pet_id];
  let dateClause = '';
  if (days != null) {
    dateClause = ' AND date >= ? AND date <= ?';
    params.push(getInsightRangeStartDate(days), getLocalDateString());
  }
  const row = await db.getFirstAsync(
    `SELECT AVG(
         (strftime('%s', date || ' ' || heyanpo_end || ':00')
        - strftime('%s', date || ' ' || heyanpo_start || ':00')) / 60.0
       ) AS avg_min
     FROM daily_logs
     WHERE pet_id = ?
       ${dateClause}
       AND length(trim(coalesce(heyanpo_start, ''))) >= 4
       AND length(trim(coalesce(heyanpo_end, ''))) >= 4
       AND strftime('%s', date || ' ' || heyanpo_end || ':00')
        >= strftime('%s', date || ' ' || heyanpo_start || ':00')`,
    params
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
/**
 * @param {'funu'|'mumu'} pet_id
 * @param {number|null} days null なら全期間
 */
export async function getMealServeCountsInDateRange(pet_id, days) {
  const db = getDatabase();
  const params = [pet_id];
  let dateClause = '';
  if (days != null) {
    dateClause = ' AND date >= ? AND date <= ?';
    params.push(getInsightRangeStartDate(days), getLocalDateString());
  }
  const rows = await db.getAllAsync(
    `SELECT meal_id, COUNT(*) AS cnt
     FROM daily_logs
     WHERE pet_id = ?
       ${dateClause}
       AND meal_id IS NOT NULL
     GROUP BY meal_id
     ORDER BY cnt DESC`,
    params
  );
  const meals = await getCustomMeals();
  const idToName = new Map(meals.map((m) => [Number(m.id), m.name]));
  return (rows ?? []).map((r) => ({
    meal_id: Number(r.meal_id),
    name: idToName.get(Number(r.meal_id)) ?? `ID ${r.meal_id}`,
    count: Number(r.cnt),
  }));
}
