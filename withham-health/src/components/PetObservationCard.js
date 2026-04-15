import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
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
  getWeightHistory,
  mergeUpsertDailyLog,
} from '../database/db';
import { WeightSection } from './WeightSection';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 22;
const R_IN = 20;

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
  const [gapChecked, setGapChecked] = useState(false);
  const [mealId, setMealId] = useState(null);
  const [memoText, setMemoText] = useState('');
  const [meals, setMeals] = useState([]);
  const [history, setHistory] = useState([]);
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
    const [row, ml, hist, hyHist] = await Promise.all([
      getTodayLog(petId),
      getCustomMeals(),
      getWeightHistory(petId, 14),
      getHeyanpoHistory(petId, 60),
    ]);
    setMeals(ml);
    setHistory(hist);
    setHeyanpoHistory(hyHist);
    if (row) {
      setWeightText(row.weight != null ? String(row.weight) : '');
      const hs = row.heyanpo_start;
      const he = row.heyanpo_end;
      setStartDate(
        hs != null && String(hs).trim() ? timeStrToDate(hs) : null
      );
      setEndDate(he != null && String(he).trim() ? timeStrToDate(he) : null);
      setGapChecked(row.gap_block_checked === 1);
      setMealId(row.meal_id != null ? Number(row.meal_id) : null);
      setMemoText(row.memo ?? '');
    } else {
      setWeightText('');
      setStartDate(null);
      setEndDate(null);
      setGapChecked(false);
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
      const hist = await getWeightHistory(petId, 14);
      setHistory(hist);
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
      }
      await mergeUpsertDailyLog(petId, partial);
      if (endDate != null) {
        setGapChecked(false);
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

  const onGapChange = useCallback(
    async (v) => {
      const prev = gapChecked;
      setGapChecked(v);
      try {
        await mergeUpsertDailyLog(petId, { gap_block_checked: v ? 1 : 0 });
      } catch (e) {
        setGapChecked(prev);
        Alert.alert('保存エラー', String(e?.message ?? e));
      }
    },
    [petId, gapChecked]
  );

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

  const latestRecord =
    history.length > 0 ? history[history.length - 1] : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{petId === 'funu' ? 'ふぬ' : 'むむ'}</Text>
      <Text style={styles.cardSub}>
        項目ごとに保存できます。隙間遮断は切り替えと同時に保存されます。
      </Text>

      <WeightSection
        weightText={weightText}
        onChangeWeight={setWeightText}
        historyRows={history}
        latestRecord={latestRecord}
        recordDateStr={recordDateStr}
        onSaveWeight={saveWeight}
        savingWeight={savingWeight}
      />

      <Text style={styles.sectionTitle}>へやんぽ（室内散歩）</Text>
      <View style={styles.timeRow}>
        <Text style={styles.timeLbl}>開始</Text>
        <TouchableOpacity
          style={styles.timeBtn}
          onPress={() => setShowStart(true)}
          activeOpacity={0.88}
        >
          <Text style={styles.timeBtnText}>{dateToTimeLabel(startDate)}</Text>
        </TouchableOpacity>
      </View>
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

      <View style={styles.timeRow}>
        <Text style={styles.timeLbl}>終了</Text>
        <TouchableOpacity
          style={styles.timeBtn}
          onPress={() => setShowEnd(true)}
          activeOpacity={0.88}
        >
          <Text style={styles.timeBtnText}>{dateToTimeLabel(endDate)}</Text>
        </TouchableOpacity>
      </View>
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

      <View style={styles.gapRow}>
        <Text style={styles.sectionTitle}>隙間遮断</Text>
        <Switch
          value={gapChecked}
          onValueChange={onGapChange}
          trackColor={{ false: '#D4C9BC', true: '#B8A99A' }}
          thumbColor={gapChecked ? '#FDFBF7' : '#f4f3f4'}
        />
      </View>

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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  timeLbl: {
    width: 44,
    fontSize: 14,
    color: FG,
    opacity: 0.85,
  },
  timeBtn: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: R_IN,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  timeBtnText: {
    fontSize: 16,
    color: FG,
    fontWeight: '600',
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
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
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
