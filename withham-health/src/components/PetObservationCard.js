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
import { Picker } from '@react-native-picker/picker';
import {
  addCustomMeal,
  getCustomMeals,
  getHeyanpoHistory,
  getLocalDateString,
  getTodayLog,
  mergeUpsertDailyLog,
} from '../database/db';
import { WeightSection } from './WeightSection';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 22;
const R_IN = 20;
const SEAL_ON = '#D8CEC2';
const SEAL_OFF = '#FDFBF7';
const HEYANPO_IDLE = '#FDFBF7';
const HEYANPO_ACTIVE = '#EDE6DC';

function timeStrToDate(s) {
  const d = new Date();
  if (!s || typeof s !== 'string') {
    d.setHours(9, 0, 0, 0);
    return d;
  }
  const parts = s.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/** DB 用 HH:mm または未設定は null */
function dateToTimeDb(dt) {
  if (dt == null) return null;
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

/** ボタン表示（未設定は —） */
function dateToTimeLabel(dt) {
  if (dt == null) return '—';
  return dateToTimeDb(dt);
}

function parseWeightInput(text) {
  const t = text.trim();
  if (t === '') return null;
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function PetObservationCard({ petId }) {
  const [weightText, setWeightText] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sealed, setSealed] = useState(false);
  const [mealId, setMealId] = useState(null);
  const [memoText, setMemoText] = useState('');
  const [meals, setMeals] = useState([]);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [mealModal, setMealModal] = useState(false);
  const [heyanpoHistoryModal, setHeyanpoHistoryModal] = useState(false);
  const [heyanpoHistory, setHeyanpoHistory] = useState([]);
  const [newMealName, setNewMealName] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [savingHeyanpo, setSavingHeyanpo] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [savingMemo, setSavingMemo] = useState(false);

  const recordDateStr = getLocalDateString();

  const load = useCallback(async () => {
    const [row, ml, hyHist] = await Promise.all([
      getTodayLog(petId),
      getCustomMeals(),
      getHeyanpoHistory(petId, 60),
    ]);
    setMeals(ml);
    setHeyanpoHistory(hyHist);
    if (row) {
      setWeightText(row.weight != null ? String(row.weight) : '');
      const hs = row.heyanpo_start;
      const he = row.heyanpo_end;
      setStartDate(
        hs != null && String(hs).trim() ? timeStrToDate(hs) : null
      );
      setEndDate(he != null && String(he).trim() ? timeStrToDate(he) : null);
      const gapOn = row.gap_block_checked === 1;
      const doorRaw = row.door_lock_checked;
      const doorOn =
        doorRaw === undefined || doorRaw === null ? gapOn : doorRaw === 1;
      setSealed(gapOn && doorOn);
      setMealId(row.meal_id != null ? Number(row.meal_id) : null);
      setMemoText(row.memo ?? '');
    } else {
      setWeightText('');
      setStartDate(null);
      setEndDate(null);
      setSealed(false);
      setMealId(null);
      setMemoText('');
    }
  }, [petId]);

  useEffect(() => {
    load().catch((e) => console.error('[PetObservationCard load]', e));
  }, [load]);

  const saveWeight = useCallback(async () => {
    setSavingWeight(true);
    try {
      await mergeUpsertDailyLog(petId, {
        weight: parseWeightInput(weightText),
      });
      setWeightText('');
      Alert.alert(
        '保存しました',
        `体重を記録しました。\n記録日（自動）: ${getLocalDateString()}`
      );
    } catch (e) {
      Alert.alert('保存エラー', String(e?.message ?? e));
    } finally {
      setSavingWeight(false);
    }
  }, [petId, weightText]);

  const saveHeyanpo = useCallback(async () => {
    setSavingHeyanpo(true);
    try {
      const partial = {
        heyanpo_start: dateToTimeDb(startDate),
        heyanpo_end: dateToTimeDb(endDate),
      };
      if (endDate != null) {
        partial.gap_block_checked = 0;
        partial.door_lock_checked = 0;
      }
      await mergeUpsertDailyLog(petId, partial);
      if (endDate != null) {
        setSealed(false);
      }
      const hyHist = await getHeyanpoHistory(petId, 60);
      setHeyanpoHistory(hyHist);
      setStartDate(null);
      setEndDate(null);
      Alert.alert('保存しました', 'へやんぽの時刻を保存しました。');
    } catch (e) {
      Alert.alert('保存エラー', String(e?.message ?? e));
    } finally {
      setSavingHeyanpo(false);
    }
  }, [petId, startDate, endDate]);

  const onSealedToggle = useCallback(async () => {
    const prev = sealed;
    const next = !sealed;
    setSealed(next);
    try {
      await mergeUpsertDailyLog(petId, {
        gap_block_checked: next ? 1 : 0,
        door_lock_checked: next ? 1 : 0,
      });
    } catch (e) {
      setSealed(prev);
      Alert.alert('保存エラー', String(e?.message ?? e));
    }
  }, [petId, sealed]);

  const onHeyanpoMegaTap = useCallback(() => {
    const now = new Date();
    if (startDate == null || (startDate != null && endDate != null)) {
      setStartDate(now);
      setEndDate(null);
      return;
    }
    if (startDate != null && endDate == null) {
      setEndDate(now);
    }
  }, [startDate, endDate]);

  const saveMeal = useCallback(async () => {
    setSavingMeal(true);
    try {
      await mergeUpsertDailyLog(petId, { meal_id: mealId });
      await load();
      Alert.alert('保存しました', '食事メニューを保存しました。');
    } catch (e) {
      Alert.alert('保存エラー', String(e?.message ?? e));
    } finally {
      setSavingMeal(false);
    }
  }, [petId, mealId, load]);

  const saveMemo = useCallback(async () => {
    setSavingMemo(true);
    try {
      await mergeUpsertDailyLog(petId, {
        memo: memoText.trim() || null,
      });
      await load();
      Alert.alert('保存しました', 'メモを保存しました。');
    } catch (e) {
      Alert.alert('保存エラー', String(e?.message ?? e));
    } finally {
      setSavingMemo(false);
    }
  }, [petId, memoText, load]);

  const onPickerChange = (v) => {
    if (v === '__add__') {
      setNewMealName('');
      setMealModal(true);
      return;
    }
    setMealId(v === '' || v == null ? null : Number(v));
  };

  const submitNewMeal = async () => {
    try {
      const id = await addCustomMeal(newMealName);
      const ml = await getCustomMeals();
      setMeals(ml);
      setMealId(id);
      setMealModal(false);
      setNewMealName('');
      await mergeUpsertDailyLog(petId, { meal_id: id });
      await load();
      Alert.alert('保存しました', 'メニューを追加し、選択状態を保存しました。');
    } catch (e) {
      Alert.alert('追加できませんでした', String(e?.message ?? e));
    }
  };

  const pickerVal = mealId == null ? '' : String(mealId);

  const heyanpoPhaseLabel =
    startDate == null || (startDate != null && endDate != null)
      ? 'タップで開始時刻を記録'
      : '進行中 · タップで終了時刻を記録';

  const heyanpoDetail =
    startDate == null && endDate == null
      ? 'ストップウォッチ形式で本日のへやんぽを記録します。'
      : `開始 ${dateToTimeLabel(startDate)} ／ 終了 ${dateToTimeLabel(endDate)}`;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{petId === 'funu' ? 'ふぬ' : 'むむ'}</Text>
      <Text style={styles.cardSub}>
        各ブロックの「保存」で確定します。安全確認はタップと同時に保存されます。
      </Text>

      <WeightSection
        weightText={weightText}
        onChangeWeight={setWeightText}
        recordDateStr={recordDateStr}
        onSaveWeight={saveWeight}
        savingWeight={savingWeight}
      />

      <Text style={styles.sectionTitle}>安全確認（隙間・戸締まり）</Text>
      <TouchableOpacity
        style={[
          styles.sealMega,
          { backgroundColor: sealed ? SEAL_ON : SEAL_OFF },
        ]}
        onPress={onSealedToggle}
        activeOpacity={0.92}
      >
        <Text style={styles.sealMegaTitle}>
          {sealed ? '安全確保' : '開放中'}
        </Text>
        <Text style={styles.sealMegaSub}>
          {sealed
            ? '隙間と戸締まりの安全を確認しました'
            : '隙間・出入口の状態を確認のうえ、タップで安全確保に切り替えてください'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>へやんぽ（室内散歩）</Text>
      <TouchableOpacity
        style={[
          styles.heyanpoMega,
          {
            backgroundColor:
              startDate != null && endDate == null
                ? HEYANPO_ACTIVE
                : HEYANPO_IDLE,
          },
        ]}
        onPress={onHeyanpoMegaTap}
        activeOpacity={0.9}
      >
        <Text style={styles.heyanpoMegaPhase}>{heyanpoPhaseLabel}</Text>
        <Text style={styles.heyanpoMegaDetail}>{heyanpoDetail}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.manualLink}
        onPress={() => setShowStart(true)}
        activeOpacity={0.88}
      >
        <Text style={styles.manualLinkText}>開始時刻を手動で調整</Text>
      </TouchableOpacity>
      {showStart && (
        <DateTimePicker
          value={startDate ?? timeStrToDate(null)}
          mode="time"
          is24Hour
          display="default"
          onChange={(_, date) => {
            setShowStart(false);
            if (date) setStartDate(date);
          }}
        />
      )}

      <TouchableOpacity
        style={styles.manualLink}
        onPress={() => setShowEnd(true)}
        activeOpacity={0.88}
      >
        <Text style={styles.manualLinkText}>終了時刻を手動で調整</Text>
      </TouchableOpacity>
      {showEnd && (
        <DateTimePicker
          value={endDate ?? timeStrToDate(null)}
          mode="time"
          is24Hour
          display="default"
          onChange={(_, date) => {
            setShowEnd(false);
            if (date) setEndDate(date);
          }}
        />
      )}

      <TouchableOpacity
        style={[styles.sectionSave, savingHeyanpo && styles.sectionSaveDisabled]}
        onPress={saveHeyanpo}
        disabled={savingHeyanpo}
        activeOpacity={0.9}
      >
        <Text style={styles.sectionSaveText}>
          {savingHeyanpo ? '保存中…' : 'へやんぽを保存'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.historyLink}
        onPress={() => setHeyanpoHistoryModal(true)}
        activeOpacity={0.88}
      >
        <Text style={styles.historyLinkText}>へやんぽの履歴を見る</Text>
      </TouchableOpacity>

      <Modal
        visible={heyanpoHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setHeyanpoHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>へやんぽの履歴</Text>
            <ScrollView
              style={styles.historyScroll}
              keyboardShouldPersistTaps="handled"
            >
              {heyanpoHistory.length === 0 ? (
                <Text style={styles.historyEmpty}>記録がありません</Text>
              ) : (
                heyanpoHistory.map((r) => (
                  <View key={r.date} style={styles.historyRow}>
                    <Text style={styles.historyDate}>{r.date}</Text>
                    <Text style={styles.historyTimes}>
                      開始 {r.heyanpo_start ?? '—'} ／ 終了 {r.heyanpo_end ?? '—'}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalBtn, styles.historyModalClose]}
              onPress={() => setHeyanpoHistoryModal(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.modalBtnText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text style={styles.sectionTitle}>食事メニュー</Text>
      <View style={styles.pickerOuter}>
        <Picker
          selectedValue={pickerVal}
          onValueChange={onPickerChange}
          style={styles.picker}
          mode="dropdown"
          dropdownIconColor={FG}
        >
          <Picker.Item label="（なし）" value="" color={FG} />
          {meals.map((m) => (
            <Picker.Item
              key={m.id}
              label={m.name}
              value={String(m.id)}
              color={FG}
            />
          ))}
          <Picker.Item label="＋新しいメニューを追加" value="__add__" color={FG} />
        </Picker>
      </View>

      <TouchableOpacity
        style={[styles.sectionSave, savingMeal && styles.sectionSaveDisabled]}
        onPress={saveMeal}
        disabled={savingMeal}
        activeOpacity={0.9}
      >
        <Text style={styles.sectionSaveText}>
          {savingMeal ? '保存中…' : '食事を保存'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>メモ</Text>
      <TextInput
        style={styles.memo}
        value={memoText}
        onChangeText={setMemoText}
        placeholder="自由記述（複数行）"
        placeholderTextColor={`${FG}88`}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.sectionSave, savingMemo && styles.sectionSaveDisabled]}
        onPress={saveMemo}
        disabled={savingMemo}
        activeOpacity={0.9}
      >
        <Text style={styles.sectionSaveText}>
          {savingMemo ? '保存中…' : 'メモを保存'}
        </Text>
      </TouchableOpacity>

      <Modal visible={mealModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>新しいメニュー</Text>
            <TextInput
              style={styles.modalInput}
              value={newMealName}
              onChangeText={setNewMealName}
              placeholder="メニュー名"
              placeholderTextColor={`${FG}88`}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnGhost}
                onPress={() => setMealModal(false)}
              >
                <Text style={styles.modalBtnGhostText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={submitNewMeal}
              >
                <Text style={styles.modalBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
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
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: FG,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: FG,
    opacity: 0.78,
    marginBottom: 16,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: FG,
    marginTop: 8,
    marginBottom: 8,
  },
  sealMega: {
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  sealMegaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: FG,
    marginBottom: 8,
  },
  sealMegaSub: {
    fontSize: 14,
    color: FG,
    opacity: 0.82,
    lineHeight: 20,
  },
  heyanpoMega: {
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  heyanpoMegaPhase: {
    fontSize: 17,
    fontWeight: '700',
    color: FG,
    marginBottom: 8,
  },
  heyanpoMegaDetail: {
    fontSize: 15,
    color: FG,
    opacity: 0.88,
  },
  manualLink: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginBottom: 4,
  },
  manualLinkText: {
    fontSize: 14,
    color: FG,
    textDecorationLine: 'underline',
    opacity: 0.88,
  },
  sectionSave: {
    alignSelf: 'flex-start',
    backgroundColor: FG,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionSaveDisabled: {
    opacity: 0.65,
  },
  sectionSaveText: {
    color: BG,
    fontSize: 14,
    fontWeight: '700',
  },
  historyLink: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 4,
  },
  historyLinkText: {
    fontSize: 14,
    color: FG,
    textDecorationLine: 'underline',
    opacity: 0.88,
  },
  historyScroll: {
    maxHeight: 320,
    marginBottom: 12,
  },
  historyEmpty: {
    fontSize: 14,
    color: FG,
    opacity: 0.65,
    paddingVertical: 8,
  },
  historyRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${FG}33`,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '700',
    color: FG,
    marginBottom: 4,
  },
  historyTimes: {
    fontSize: 14,
    color: FG,
    opacity: 0.9,
  },
  historyModalClose: {
    alignSelf: 'flex-end',
  },
  pickerOuter: {
    backgroundColor: BG,
    borderRadius: R_IN,
    overflow: 'hidden',
    marginBottom: 8,
  },
  picker: {
    color: FG,
  },
  memo: {
    backgroundColor: BG,
    borderRadius: R_IN,
    minHeight: 100,
    padding: 14,
    fontSize: 15,
    color: FG,
    marginBottom: 8,
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
  modalInput: {
    backgroundColor: BG,
    borderRadius: R_IN,
    padding: 12,
    fontSize: 16,
    color: FG,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  modalBtnGhostText: {
    color: FG,
    fontSize: 15,
  },
  modalBtn: {
    backgroundColor: FG,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  modalBtnText: {
    color: '#FDFBF7',
    fontSize: 15,
    fontWeight: '600',
  },
});
