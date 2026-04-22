import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getLatestMaintenanceSummary,
  getLocalDateString,
  getMaintenanceHistory,
  insertMaintenanceLog,
} from '../database/db';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 22;
const R_IN = 20;

function stripTime(d) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

/** @param {Date} d */
function formatExecutedDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
  const mo = d.getMonth() + 1;
  const da = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mo}/${da} ${h}:${mi}`;
}

/** @param {string|null|undefined} ymd */
function formatNextLabel(ymd) {
  if (!ymd || typeof ymd !== 'string') return '—';
  const p = ymd.split('-');
  if (p.length === 3) return `${p[0]}年${Number(p[1])}月${Number(p[2])}日`;
  return ymd;
}

/** @param {string|null|undefined} iso */
function formatExecutedStored(iso) {
  if (!iso || typeof iso !== 'string') return '—';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) {
    return `${m[1]}/${Number(m[2])}/${Number(m[3])} ${m[4]}:${m[5]}`;
  }
  return iso;
}

export function MaintenanceSection() {
  const [content, setContent] = useState('');
  const [executedAt, setExecutedAt] = useState(() => new Date());
  const [nextDate, setNextDate] = useState(() => stripTime(new Date()));
  const [displayNext, setDisplayNext] = useState(null);
  /** 実施日時: 日付 → 時刻（mode=datetime は非推奨のため分離） */
  const [execPickerStep, setExecPickerStep] = useState(null);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);

  const refreshSummary = useCallback(async () => {
    const { nextScheduledDate } = await getLatestMaintenanceSummary();
    setDisplayNext(nextScheduledDate ?? null);
  }, []);

  useEffect(() => {
    refreshSummary().catch((e) => console.error('[MaintenanceSection]', e));
  }, [refreshSummary]);

  const onSave = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }
    setSaving(true);
    try {
      const y = executedAt.getFullYear();
      const mo = String(executedAt.getMonth() + 1).padStart(2, '0');
      const da = String(executedAt.getDate()).padStart(2, '0');
      const h = String(executedAt.getHours()).padStart(2, '0');
      const mi = String(executedAt.getMinutes()).padStart(2, '0');
      const executed_date = `${y}-${mo}-${da}T${h}:${mi}:00`;
      const next_scheduled_date = getLocalDateString(nextDate);

      await insertMaintenanceLog({
        content: trimmed,
        executed_date,
        next_scheduled_date,
      });
      setContent('');
      setExecutedAt(new Date());
      setNextDate(stripTime(new Date()));
      await refreshSummary();
      Alert.alert('保存しました', 'お掃除・お手入れを記録しました。');
    } catch (e) {
      console.error('[MaintenanceSection save]', e);
      Alert.alert('保存エラー', String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }, [content, executedAt, nextDate, refreshSummary]);

  const openHistory = useCallback(async () => {
    setHistoryModal(true);
    try {
      const rows = await getMaintenanceHistory(120);
      setHistoryRows(rows);
    } catch (e) {
      console.error('[MaintenanceSection history]', e);
      setHistoryRows([]);
    }
  }, []);

  const closeAfterNative = (fn) => setTimeout(fn, 0);

  const onExecDateChange = (event, date) => {
    if (event?.type === 'dismissed') {
      closeAfterNative(() => setExecPickerStep(null));
      return;
    }
    if (date) {
      const d = new Date(executedAt);
      d.setFullYear(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      setExecutedAt(d);
      closeAfterNative(() => setExecPickerStep('time'));
    } else {
      closeAfterNative(() => setExecPickerStep(null));
    }
  };

  const onExecTimeChange = (event, date) => {
    if (event?.type === 'dismissed') {
      closeAfterNative(() => setExecPickerStep(null));
      return;
    }
    if (date) {
      const d = new Date(executedAt);
      d.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setExecutedAt(d);
    }
    closeAfterNative(() => setExecPickerStep(null));
  };

  const onNextDateChange = (event, date) => {
    if (event?.type === 'dismissed') {
      closeAfterNative(() => setShowNext(false));
      return;
    }
    if (date) {
      setNextDate(stripTime(date));
    }
    closeAfterNative(() => setShowNext(false));
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>お掃除・お手入れ</Text>
      <Text style={styles.sub}>
        床材の交換やトイレ掃除などを記録します。
      </Text>

      {displayNext ? (
        <View style={styles.nextBanner}>
          <Text style={styles.nextBannerLabel}>次回の予定日</Text>
          <Text style={styles.nextBannerValue}>
            {formatNextLabel(displayNext)}
          </Text>
        </View>
      ) : (
        <Text style={styles.nextEmpty}>次回予定は保存後に表示されます</Text>
      )}

      <Text style={styles.fieldLabel}>内容</Text>
      <TextInput
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder="例：床材交換／砂の補充"
        placeholderTextColor={`${FG}88`}
      />

      <Text style={styles.fieldLabel}>実施日時</Text>
      <TouchableOpacity
        style={styles.pickerBtn}
        onPress={() => setExecPickerStep('date')}
        activeOpacity={0.88}
      >
        <Text style={styles.pickerBtnText}>
          {formatExecutedDate(executedAt)}
        </Text>
      </TouchableOpacity>
      {execPickerStep === 'date' ? (
        <DateTimePicker
          value={executedAt}
          mode="date"
          display="default"
          onChange={onExecDateChange}
        />
      ) : null}
      {execPickerStep === 'time' ? (
        <DateTimePicker
          value={executedAt}
          mode="time"
          display="default"
          is24Hour
          onChange={onExecTimeChange}
        />
      ) : null}

      <Text style={styles.fieldLabel}>次回予定日</Text>
      <TouchableOpacity
        style={styles.pickerBtn}
        onPress={() => setShowNext(true)}
        activeOpacity={0.88}
      >
        <Text style={styles.pickerBtnText}>{formatNextLabel(getLocalDateString(nextDate))}</Text>
      </TouchableOpacity>
      {showNext ? (
        <DateTimePicker
          value={nextDate}
          mode="date"
          display="default"
          onChange={onNextDateChange}
        />
      ) : null}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={onSave}
        disabled={saving || !content.trim()}
        activeOpacity={0.9}
      >
        <Text style={styles.saveBtnText}>
          {saving ? '保存中…' : 'お掃除・お手入れを保存'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.historyLink}
        onPress={openHistory}
        activeOpacity={0.88}
      >
        <Text style={styles.historyLinkText}>お掃除・お手入れの履歴を見る</Text>
      </TouchableOpacity>

      <Modal
        visible={historyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>お掃除・お手入れの履歴</Text>
            <ScrollView
              style={styles.historyScroll}
              keyboardShouldPersistTaps="handled"
            >
              {historyRows.length === 0 ? (
                <Text style={styles.historyEmpty}>記録がありません</Text>
              ) : (
                historyRows.map((r) => (
                  <View key={r.id} style={styles.historyRow}>
                    <Text style={styles.historyExecuted}>
                      {formatExecutedStored(r.executed_date)}
                    </Text>
                    <Text style={styles.historyContent}>{r.content ?? '—'}</Text>
                    <Text style={styles.historyNext}>
                      次回予定 {formatNextLabel(r.next_scheduled_date)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalBtn, styles.historyModalClose]}
              onPress={() => setHistoryModal(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.modalBtnText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: R,
    padding: 18,
    marginTop: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: FG,
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: FG,
    opacity: 0.78,
    marginBottom: 14,
    lineHeight: 18,
  },
  nextBanner: {
    backgroundColor: BG,
    borderRadius: R_IN,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  nextBannerLabel: {
    fontSize: 12,
    color: FG,
    opacity: 0.65,
    marginBottom: 4,
  },
  nextBannerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: FG,
  },
  nextEmpty: {
    fontSize: 12,
    color: FG,
    opacity: 0.55,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: FG,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: BG,
    borderRadius: R_IN,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: FG,
    marginBottom: 8,
  },
  pickerBtn: {
    backgroundColor: BG,
    borderRadius: R_IN,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  pickerBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: FG,
  },
  saveBtn: {
    alignSelf: 'stretch',
    backgroundColor: FG,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: {
    color: BG,
    fontSize: 15,
    fontWeight: '700',
  },
  historyLink: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginTop: 4,
  },
  historyLinkText: {
    fontSize: 14,
    color: FG,
    textDecorationLine: 'underline',
    opacity: 0.88,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: CARD,
    borderRadius: R,
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: FG,
    marginBottom: 12,
  },
  historyScroll: {
    maxHeight: 360,
    marginBottom: 12,
  },
  historyEmpty: {
    fontSize: 14,
    color: FG,
    opacity: 0.65,
    paddingVertical: 8,
  },
  historyRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${FG}33`,
  },
  historyExecuted: {
    fontSize: 14,
    fontWeight: '700',
    color: FG,
    marginBottom: 4,
  },
  historyContent: {
    fontSize: 15,
    color: FG,
    lineHeight: 21,
    marginBottom: 4,
  },
  historyNext: {
    fontSize: 13,
    color: FG,
    opacity: 0.75,
  },
  modalBtn: {
    backgroundColor: FG,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  historyModalClose: {
    alignSelf: 'flex-end',
  },
  modalBtnText: {
    color: BG,
    fontSize: 15,
    fontWeight: '600',
  },
});
