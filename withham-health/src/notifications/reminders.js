import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  getLatestMaintenanceSummary,
  getLocalDateString,
  getSetting,
  isValidDateString,
  parseLocalDateString,
  setSetting,
  SETTINGS_KEYS,
} from '../database/db';

const CHANNEL_MAINTENANCE = 'maintenance';
const CHANNEL_DAILY = 'daily-record';

export const NOTIFICATION_IDS = {
  MAINTENANCE: 'withham-maintenance-next',
  DAILY_RECORD: 'withham-daily-record',
};

const MAINTENANCE_HOUR = 10;
const MAINTENANCE_MINUTE = 0;
const DAILY_HOUR = 20;
const DAILY_MINUTE = 0;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function settingEnabled(value, defaultOn = true) {
  if (value == null || value === '') return defaultOn;
  return value !== '0' && value !== 'false';
}

async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_MAINTENANCE, {
    name: 'お手入れ予定',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_DAILY, {
    name: '記録リマインド',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * 通知権限を要求する。
 * @returns {Promise<boolean>} 許可されたら true
 */
export async function requestNotificationPermissions() {
  await ensureAndroidChannels();
  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  const asked = await Notifications.requestPermissionsAsync();
  return Boolean(
    asked.granted ||
      asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function getNotificationPrefs() {
  const [m, d] = await Promise.all([
    getSetting(SETTINGS_KEYS.NOTIFY_MAINTENANCE),
    getSetting(SETTINGS_KEYS.NOTIFY_DAILY_RECORD),
  ]);
  return {
    maintenance: settingEnabled(m, true),
    dailyRecord: settingEnabled(d, true),
  };
}

/**
 * @param {{ maintenance?: boolean, dailyRecord?: boolean }} patch
 */
export async function setNotificationPrefs(patch) {
  if (patch.maintenance != null) {
    await setSetting(
      SETTINGS_KEYS.NOTIFY_MAINTENANCE,
      patch.maintenance ? '1' : '0'
    );
  }
  if (patch.dailyRecord != null) {
    await setSetting(
      SETTINGS_KEYS.NOTIFY_DAILY_RECORD,
      patch.dailyRecord ? '1' : '0'
    );
  }
  await rescheduleAllReminders();
}

async function cancelById(id) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* 未登録でも無視 */
  }
}

/**
 * お手入れ next_scheduled_date の朝 10:00 に一度通知。
 * @param {string|null|undefined} ymd
 */
export async function scheduleMaintenanceReminder(ymd) {
  await cancelById(NOTIFICATION_IDS.MAINTENANCE);
  const prefs = await getNotificationPrefs();
  if (!prefs.maintenance) return;
  if (!ymd || !isValidDateString(ymd)) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const base = parseLocalDateString(ymd);
  const fireAt = new Date(base);
  fireAt.setHours(MAINTENANCE_HOUR, MAINTENANCE_MINUTE, 0, 0);
  if (fireAt.getTime() <= Date.now()) return;

  await ensureAndroidChannels();
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.MAINTENANCE,
    content: {
      title: 'お手入れの予定日です',
      body: `${ymd} のお掃除・お手入れを確認しましょう。`,
      data: { type: 'maintenance', date: ymd },
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_MAINTENANCE } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: CHANNEL_MAINTENANCE,
    },
  });
}

/** 毎日 20:00 の未記録リマインド */
export async function scheduleDailyRecordReminder() {
  await cancelById(NOTIFICATION_IDS.DAILY_RECORD);
  const prefs = await getNotificationPrefs();
  if (!prefs.dailyRecord) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await ensureAndroidChannels();
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.DAILY_RECORD,
    content: {
      title: '今日の記録は済みましたか？',
      body: '体重や安全確認の記録を忘れずに。',
      data: { type: 'daily_record' },
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_DAILY } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: DAILY_HOUR,
      minute: DAILY_MINUTE,
      channelId: CHANNEL_DAILY,
    },
  });
}

/**
 * DB の最新お手入れ予定と設定に基づき、通知を再スケジュール。
 * アプリ起動時・設定変更時・お手入れ保存後に呼ぶ。
 */
export async function rescheduleAllReminders() {
  try {
    await ensureAndroidChannels();
    const { nextScheduledDate } = await getLatestMaintenanceSummary();
    await scheduleMaintenanceReminder(nextScheduledDate);
    await scheduleDailyRecordReminder();
  } catch (e) {
    console.warn('[reminders] reschedule failed', e);
  }
}

/**
 * 初回起動時: 既定 ON を書き込み、権限要求のうえスケジュール。
 */
export async function bootstrapReminders() {
  const m = await getSetting(SETTINGS_KEYS.NOTIFY_MAINTENANCE);
  const d = await getSetting(SETTINGS_KEYS.NOTIFY_DAILY_RECORD);
  if (m == null) await setSetting(SETTINGS_KEYS.NOTIFY_MAINTENANCE, '1');
  if (d == null) await setSetting(SETTINGS_KEYS.NOTIFY_DAILY_RECORD, '1');
  await rescheduleAllReminders();
}

export { getLocalDateString };
