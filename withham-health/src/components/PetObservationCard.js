import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import { copyAsync, documentDirectory } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import {
  addCustomMeal,
  getCustomMeals,
  getHeyanpoHistory,
  getLocalDateString,
  getLogByDate,
  getPhotoHistory,
  getPreviousWeight,
  mergeUpsertDailyLog,
  parseLocalDateString,
  toggleMealPinned,
  touchMealUsed,
} from '../database/db';
import {
  evaluateWeightDrop,
  formatWeightDropMessage,
} from '../utils/weightAlert';
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

/**
 * @param {{
 *   petId: string,
 *   petName?: string,
 *   onLogChanged?: () => void,
 *   onSaveSnack?: (payload: { message: string, onUndo?: (() => void | Promise<void>) | null }) => void,
 *   focusRequest?: { petId: string, section: 'weight' | 'safety', token: number } | null,
 * }} props
 */
export function PetObservationCard({
  petId,
  petName,
  onLogChanged,
  onSaveSnack,
  focusRequest = null,
}) {
  const [recordDateStr, setRecordDateStr] = useState(getLocalDateString());
  /** @type {['weight' | 'safety' | null, Function]} */
  const [focusPulse, setFocusPulse] = useState(null);
  const [showRecordDate, setShowRecordDate] = useState(false);
  const [weightText, setWeightText] = useState('');
  const [previousWeight, setPreviousWeight] = useState(null);
  const [weightDropAlert, setWeightDropAlert] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sealed, setSealed] = useState(false);
  const [mealId, setMealId] = useState(null);
  const [memoText, setMemoText] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [photoHistory, setPhotoHistory] = useState([]);
  const [meals, setMeals] = useState([]);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [mealModal, setMealModal] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [photoGalleryModal, setPhotoGalleryModal] = useState(false);
  const [heyanpoHistoryModal, setHeyanpoHistoryModal] = useState(false);
  const [heyanpoHistory, setHeyanpoHistory] = useState([]);
  const [newMealName, setNewMealName] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [savingHeyanpo, setSavingHeyanpo] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [savingMemo, setSavingMemo] = useState(false);

  const load = useCallback(async () => {
    const [row, ml, hyHist, prevW, photos] = await Promise.all([
      getLogByDate(petId, recordDateStr),
      getCustomMeals(),
      getHeyanpoHistory(petId, 60),
      getPreviousWeight(petId, recordDateStr),
      getPhotoHistory(petId, 60),
    ]);
    setMeals(ml);
    setHeyanpoHistory(hyHist);
    setPreviousWeight(prevW);
    setPhotoHistory(photos);
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
      setPhotoUri(row.photo_uri ?? null);
      if (
        row.weight != null &&
        prevW != null &&
        prevW.date !== recordDateStr
      ) {
        setWeightDropAlert(evaluateWeightDrop(prevW.weight, Number(row.weight)));
      } else {
        setWeightDropAlert(null);
      }
    } else {
      setWeightText('');
      setStartDate(null);
      setEndDate(null);
      setSealed(false);
      setMealId(null);
      setMemoText('');
      setPhotoUri(null);
      setWeightDropAlert(null);
    }
  }, [petId, recordDateStr]);

  useEffect(() => {
    load().catch((e) => console.error('[PetObservationCard load]', e));
  }, [load]);

  useEffect(() => {
    if (!focusRequest || focusRequest.petId !== petId) return undefined;
    setFocusPulse(focusRequest.section);
    const t = setTimeout(() => setFocusPulse(null), 1800);
    return () => clearTimeout(t);
  }, [focusRequest?.token, focusRequest?.petId, focusRequest?.section, petId]);

  const saveWeight = useCallback(async () => {
    setSavingWeight(true);
    try {
      const before = await getLogByDate(petId, recordDateStr);
      const prevWeight = before?.weight != null ? Number(before.weight) : null;
      const nextWeight = parseWeightInput(weightText);
      const priorRef = await getPreviousWeight(petId, recordDateStr);
      const priorForAlert =
        priorRef && priorRef.date !== recordDateStr ? priorRef.weight : null;
      const drop = evaluateWeightDrop(priorForAlert, nextWeight);

      await mergeUpsertDailyLog(petId, {
        date: recordDateStr,
        weight: nextWeight,
      });
      setWeightText(nextWeight != null ? String(nextWeight) : '');
      setPreviousWeight(await getPreviousWeight(petId, recordDateStr));
      setWeightDropAlert(drop);

      const undoWeight = async () => {
        try {
          await mergeUpsertDailyLog(petId, {
            date: recordDateStr,
            weight: prevWeight,
          });
          await load();
          onLogChanged?.();
        } catch (e) {
          Alert.alert('アンドゥ失敗', String(e?.message ?? e));
        }
      };

      onLogChanged?.();
      if (drop) {
        Alert.alert('体重が急に減っています', formatWeightDropMessage(drop), [
          {
            text: 'アンドゥ',
            style: 'destructive',
            onPress: undoWeight,
          },
          { text: '了解' },
        ]);
      } else {
        onSaveSnack?.({
          message: `体重を保存しました（${recordDateStr}）`,
          onUndo: undoWeight,
        });
      }
    } catch (e) {
      Alert.alert('保存エラー', String(e?.message ?? e));
    } finally {
      setSavingWeight(false);
    }
  }, [petId, weightText, recordDateStr, load, onLogChanged, onSaveSnack]);

  /**
   * へやんぽを即 DB 反映する（メガタップ / 手動時刻 / 再保存で共通）。
   * @param {Date | null} nextStart
   * @param {Date | null} nextEnd
   * @param {'start' | 'end' | 'adjust'} kind
   */
  const persistHeyanpo = useCallback(
    async (nextStart, nextEnd, kind = 'adjust') => {
      setSavingHeyanpo(true);
      try {
        const before = await getLogByDate(petId, recordDateStr);
        const prevStart = before?.heyanpo_start ?? null;
        const prevEnd = before?.heyanpo_end ?? null;
        const partial = {
          date: recordDateStr,
          heyanpo_start: dateToTimeDb(nextStart),
          heyanpo_end: dateToTimeDb(nextEnd),
        };
        if (nextEnd != null) {
          partial.gap_block_checked = 0;
          partial.door_lock_checked = 0;
        }
        await mergeUpsertDailyLog(petId, partial);
        if (nextEnd != null) {
          setSealed(false);
        }
        const hyHist = await getHeyanpoHistory(petId, 60);
        setHeyanpoHistory(hyHist);
        onLogChanged?.();

        const message =
          kind === 'start'
            ? `へやんぽ開始を記録しました（${recordDateStr}）`
            : kind === 'end'
              ? `へやんぽを保存しました（${recordDateStr}）`
              : `へやんぽ時刻を保存しました（${recordDateStr}）`;

        onSaveSnack?.({
          message,
          onUndo: async () => {
            try {
              await mergeUpsertDailyLog(petId, {
                date: recordDateStr,
                heyanpo_start: prevStart,
                heyanpo_end: prevEnd,
              });
              await load();
              onLogChanged?.();
            } catch (e) {
              Alert.alert('アンドゥ失敗', String(e?.message ?? e));
            }
          },
        });
      } catch (e) {
        Alert.alert('保存エラー', String(e?.message ?? e));
        await load();
      } finally {
        setSavingHeyanpo(false);
      }
    },
    [petId, recordDateStr, load, onLogChanged, onSaveSnack]
  );

  const onSealedToggle = useCallback(async () => {
    const prev = sealed;
    const next = !sealed;
    setSealed(next);
    try {
      await mergeUpsertDailyLog(petId, {
        date: recordDateStr,
        gap_block_checked: next ? 1 : 0,
        door_lock_checked: next ? 1 : 0,
      });
      onLogChanged?.();
    } catch (e) {
      setSealed(prev);
      Alert.alert('保存エラー', String(e?.message ?? e));
    }
  }, [petId, sealed, recordDateStr, onLogChanged]);

  const onHeyanpoMegaTap = useCallback(() => {
    if (savingHeyanpo) return;
    const now = new Date();
    if (startDate == null || (startDate != null && endDate != null)) {
      setStartDate(now);
      setEndDate(null);
      persistHeyanpo(now, null, 'start');
      return;
    }
    if (startDate != null && endDate == null) {
      setEndDate(now);
      persistHeyanpo(startDate, now, 'end');
    }
  }, [startDate, endDate, savingHeyanpo, persistHeyanpo]);

  const saveMeal = useCallback(async () => {
    setSavingMeal(true);
    try {
      await mergeUpsertDailyLog(petId, { date: recordDateStr, meal_id: mealId });
      if (mealId != null) await touchMealUsed(mealId);
      await load();
      onSaveSnack?.({ message: '食事メニューを保存しました' });
    } catch (e) {
      Alert.alert('保存エラー', String(e?.message ?? e));
    } finally {
      setSavingMeal(false);
    }
  }, [petId, mealId, load, recordDateStr, onSaveSnack]);

  const pickDayPhoto = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '許可が必要です',
          '写真ライブラリへのアクセスを許可してください。'
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (res.canceled) return;
      if (!documentDirectory) {
        Alert.alert('保存できません', 'アプリのドキュメント領域を利用できません。');
        return;
      }
      const uri = res.assets[0].uri;
      const rawExt = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const ext = /^[a-zA-Z0-9]+$/.test(rawExt) ? rawExt : 'jpg';
      const dest = `${documentDirectory}day_${petId}_${recordDateStr}_${Date.now()}.${ext}`;
      await copyAsync({ from: uri, to: dest });
      await mergeUpsertDailyLog(petId, {
        date: recordDateStr,
        photo_uri: dest,
      });
      setPhotoUri(dest);
      await load();
      onLogChanged?.();
    } catch (e) {
      Alert.alert('写真の保存に失敗しました', String(e?.message ?? e));
    }
  }, [petId, recordDateStr, load, onLogChanged]);

  const clearDayPhoto = useCallback(async () => {
    try {
      await mergeUpsertDailyLog(petId, {
        date: recordDateStr,
        photo_uri: null,
      });
      setPhotoUri(null);
      await load();
    } catch (e) {
      Alert.alert('削除エラー', String(e?.message ?? e));
    }
  }, [petId, recordDateStr, load]);

  const onTogglePin = useCallback(
    async (id) => {
      try {
        await toggleMealPinned(id);
        setMeals(await getCustomMeals());
      } catch (e) {
        Alert.alert('更新エラー', String(e?.message ?? e));
      }
    },
    []
  );

  const saveMemo = useCallback(async () => {
    setSavingMemo(true);
    try {
      const before = await getLogByDate(petId, recordDateStr);
      const prevMemo = before?.memo ?? null;
      await mergeUpsertDailyLog(petId, {
        date: recordDateStr,
        memo: memoText.trim() || null,
      });
      await load();
      onSaveSnack?.({
        message: `メモを保存しました（${recordDateStr}）`,
        onUndo: async () => {
          try {
            await mergeUpsertDailyLog(petId, {
              date: recordDateStr,
              memo: prevMemo,
            });
            await load();
          } catch (e) {
            Alert.alert('アンドゥ失敗', String(e?.message ?? e));
          }
        },
      });
    } catch (e) {
      Alert.alert('保存エラー', String(e?.message ?? e));
    } finally {
      setSavingMemo(false);
    }
  }, [petId, memoText, load, recordDateStr, onSaveSnack]);

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
      await mergeUpsertDailyLog(petId, { date: recordDateStr, meal_id: id });
      await touchMealUsed(id);
      await load();
      onSaveSnack?.({
        message: 'メニューを追加し、選択状態を保存しました',
      });
    } catch (e) {
      Alert.alert('追加できませんでした', String(e?.message ?? e));
    }
  };

  const pickerVal = mealId == null ? '' : String(mealId);
  const isToday = recordDateStr === getLocalDateString();

  const heyanpoInProgress = startDate != null && endDate == null;

  const heyanpoPhaseLabel = savingHeyanpo
    ? '保存中…'
    : startDate == null || (startDate != null && endDate != null)
      ? 'タップで開始（自動保存）'
      : '進行中 · タップで終了して保存';

  const heyanpoDetail =
    startDate == null && endDate == null
      ? isToday
        ? '開始・終了のたびに自動で保存されます。'
        : `${recordDateStr} のへやんぽを記録します。開始・終了で自動保存されます。`
      : `開始 ${dateToTimeLabel(startDate)} ／ 終了 ${dateToTimeLabel(endDate)}${
          heyanpoInProgress ? '（進行中・端末に保存済み）' : ''
        }`;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{petName || petId}</Text>
      <Text style={styles.cardSub}>
        各ブロックの「保存」で確定します。成功時は画面下に短く表示され、体重・へやんぽ・メモはアンドゥできます。安全確認はタップと同時に保存されます。
      </Text>

      <View
        style={focusPulse === 'weight' ? styles.focusPulse : null}
        accessibilityLiveRegion="polite"
      >
        <WeightSection
          weightText={weightText}
          onChangeWeight={setWeightText}
          recordDateStr={recordDateStr}
          onPressRecordDate={() => setShowRecordDate(true)}
          onSaveWeight={saveWeight}
          savingWeight={savingWeight}
          previousWeight={previousWeight}
          weightDropAlert={weightDropAlert}
        />
      </View>
      {showRecordDate && (
        <DateTimePicker
          value={parseLocalDateString(recordDateStr)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_, date) => {
            setShowRecordDate(false);
            if (date) setRecordDateStr(getLocalDateString(date));
          }}
        />
      )}

      <View style={focusPulse === 'safety' ? styles.focusPulse : null}>
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
      </View>

      <Text style={styles.sectionTitle}>へやんぽ（室内散歩）</Text>
      <TouchableOpacity
        style={[
          styles.heyanpoMega,
          {
            backgroundColor: heyanpoInProgress
              ? HEYANPO_ACTIVE
              : HEYANPO_IDLE,
          },
          savingHeyanpo && styles.sectionSaveDisabled,
        ]}
        onPress={onHeyanpoMegaTap}
        disabled={savingHeyanpo}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={heyanpoPhaseLabel}
      >
        <Text style={styles.heyanpoMegaPhase}>{heyanpoPhaseLabel}</Text>
        <Text style={styles.heyanpoMegaDetail}>{heyanpoDetail}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.manualLink}
        onPress={() => setShowStart(true)}
        activeOpacity={0.88}
        disabled={savingHeyanpo}
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
            if (!date) return;
            setStartDate(date);
            persistHeyanpo(date, endDate, 'adjust');
          }}
        />
      )}

      <TouchableOpacity
        style={styles.manualLink}
        onPress={() => setShowEnd(true)}
        activeOpacity={0.88}
        disabled={savingHeyanpo}
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
            if (!date) return;
            const nextStart = startDate ?? date;
            if (startDate == null) setStartDate(date);
            setEndDate(date);
            persistHeyanpo(nextStart, date, 'end');
          }}
        />
      )}

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
      <Text style={styles.mealHint}>
        表示順: ピン留め → 最近使った順 → 名前
      </Text>
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
              label={`${m.pinned ? '★ ' : ''}${m.name}`}
              value={String(m.id)}
              color={FG}
            />
          ))}
          <Picker.Item label="＋新しいメニューを追加" value="__add__" color={FG} />
        </Picker>
      </View>
      <TouchableOpacity
        style={styles.historyLink}
        onPress={() => setPinModal(true)}
        activeOpacity={0.88}
      >
        <Text style={styles.historyLinkText}>ピン留めを編集</Text>
      </TouchableOpacity>

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

      <Text style={styles.sectionTitle}>写真</Text>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.dayPhoto} />
      ) : (
        <Text style={styles.mealHint}>この日の写真は未設定です</Text>
      )}
      <View style={styles.photoBtnRow}>
        <TouchableOpacity
          style={styles.photoBtn}
          onPress={pickDayPhoto}
          activeOpacity={0.88}
        >
          <Text style={styles.photoBtnText}>
            {photoUri ? '写真を変更' : '写真を追加'}
          </Text>
        </TouchableOpacity>
        {photoUri ? (
          <TouchableOpacity
            style={styles.photoBtnGhost}
            onPress={clearDayPhoto}
            activeOpacity={0.88}
          >
            <Text style={styles.historyLinkText}>削除</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.historyLink}
        onPress={() => setPhotoGalleryModal(true)}
        activeOpacity={0.88}
      >
        <Text style={styles.historyLinkText}>写真ギャラリーを見る</Text>
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

      <Modal
        visible={pinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ピン留め</Text>
            <ScrollView style={styles.historyScroll}>
              {meals.length === 0 ? (
                <Text style={styles.historyEmpty}>メニューがありません</Text>
              ) : (
                meals.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.pinRow}
                    onPress={() => onTogglePin(m.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.pinStar}>{m.pinned ? '★' : '☆'}</Text>
                    <Text style={styles.pinName}>{m.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalBtn, styles.historyModalClose]}
              onPress={() => setPinModal(false)}
            >
              <Text style={styles.modalBtnText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={photoGalleryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoGalleryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>写真ギャラリー</Text>
            <ScrollView style={styles.historyScroll}>
              {photoHistory.length === 0 ? (
                <Text style={styles.historyEmpty}>写真がありません</Text>
              ) : (
                photoHistory.map((r) => (
                  <View key={r.date} style={styles.galleryRow}>
                    <Text style={styles.historyDate}>{r.date}</Text>
                    <Image
                      source={{ uri: r.photo_uri }}
                      style={styles.galleryImg}
                    />
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalBtn, styles.historyModalClose]}
              onPress={() => setPhotoGalleryModal(false)}
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
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: FG,
    marginBottom: 4,
  },
  focusPulse: {
    borderWidth: 2,
    borderColor: FG,
    borderRadius: R_IN,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginHorizontal: -8,
    marginBottom: 4,
    backgroundColor: 'rgba(74,74,74,0.06)',
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
  mealHint: {
    fontSize: 12,
    color: FG,
    opacity: 0.65,
    marginBottom: 8,
  },
  dayPhoto: {
    width: '100%',
    height: 180,
    borderRadius: R_IN,
    marginBottom: 8,
    backgroundColor: BG,
  },
  photoBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  photoBtn: {
    backgroundColor: FG,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  photoBtnText: {
    color: BG,
    fontSize: 14,
    fontWeight: '700',
  },
  photoBtnGhost: {
    paddingVertical: 8,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${FG}33`,
    gap: 10,
  },
  pinStar: {
    fontSize: 18,
    color: FG,
    width: 24,
  },
  pinName: {
    fontSize: 15,
    fontWeight: '600',
    color: FG,
    flex: 1,
  },
  galleryRow: {
    marginBottom: 12,
  },
  galleryImg: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginTop: 6,
    backgroundColor: BG,
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
