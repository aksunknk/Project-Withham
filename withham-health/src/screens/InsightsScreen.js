import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  clearDailyLogHeyanpo,
  clearDailyLogMemo,
  clearDailyLogWeight,
  getAvgHeyanpoMinutesInDateRange,
  getHeyanpoDurationHistory,
  getHeyanpoHistory,
  getInsightRangeStartDate,
  getLocalDateString,
  getMealServeCountsInDateRange,
  getMemoHistory,
  getWeightHistory,
  listActivePets,
  mergeUpsertDailyLog,
  parseLocalDateString,
} from '../database/db';
import { CompareWeightChart } from '../components/CompareWeightChart';
import { MonthCalendar } from '../components/MonthCalendar';
import { getInsightRange, INSIGHT_RANGES } from '../utils/insightRange';
import { refreshHomeWidget } from '../widget/snapshot';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 22;
const H_PAD = 20;
const HISTORY_LIMIT = 90;

const chartBase = {
  backgroundColor: CARD,
  backgroundGradientFrom: CARD,
  backgroundGradientTo: CARD,
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(74, 74, 74, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(74, 74, 74, ${opacity})`,
  propsForDots: { r: '4' },
  propsForBackgroundLines: { stroke: '#D4C9BC', strokeDasharray: '' },
};

function formatAvgMinutes(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  if (v < 60) return `${Math.round(v)} 分`;
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  return m > 0 ? `${h} 時間 ${m} 分` : `${h} 時間`;
}

function formatChartLabel(dateStr) {
  const p = String(dateStr ?? '').split('-');
  return p.length === 3 ? `${Number(p[1])}/${Number(p[2])}` : dateStr;
}

function formatListDate(dateStr) {
  const p = String(dateStr ?? '').split('-');
  if (p.length !== 3) return dateStr;
  return `${Number(p[0])}/${Number(p[1])}/${Number(p[2])}`;
}

function heyanpoDurationLabel(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = String(start).split(':').map((x) => parseInt(x, 10));
  const [eh, em] = String(end).split(':').map((x) => parseInt(x, 10));
  if (![sh, sm, eh, em].every((n) => Number.isFinite(n))) return null;
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) return null;
  return formatAvgMinutes(mins);
}

function normalizeTimeInput(text) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error('時刻は HH:mm 形式で入力してください');
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) {
    throw new Error('時刻の範囲が不正です');
  }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function HistoryModal({ visible, title, onClose, children }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalHint}>行をタップして編集・削除できます</Text>
          <ScrollView
            style={styles.historyScroll}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={onClose}
            activeOpacity={0.9}
          >
            <Text style={styles.modalCloseText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PetInsightBlock({ petId, petName, rangeKey, winW, reloadToken }) {
  const range = getInsightRange(rangeKey);
  const [weights, setWeights] = useState([]);
  const [heyanpoDurations, setHeyanpoDurations] = useState([]);
  const [weightList, setWeightList] = useState([]);
  const [heyanpoList, setHeyanpoList] = useState([]);
  const [memoList, setMemoList] = useState([]);
  const [avgHey, setAvgHey] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weightModal, setWeightModal] = useState(false);
  const [heyanpoModal, setHeyanpoModal] = useState(false);
  const [memoModal, setMemoModal] = useState(false);

  const [editKind, setEditKind] = useState(null);
  const [editOriginalDate, setEditOriginalDate] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [showEditDate, setShowEditDate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const limit = range.chartLimit;
      const [w, heyDur, h, m, wList, hyList, memoHist] = await Promise.all([
        getWeightHistory(petId, limit),
        getHeyanpoDurationHistory(petId, limit),
        getAvgHeyanpoMinutesInDateRange(petId, range.days),
        getMealServeCountsInDateRange(petId, range.days),
        getWeightHistory(petId, HISTORY_LIMIT),
        getHeyanpoHistory(petId, HISTORY_LIMIT),
        getMemoHistory(petId, HISTORY_LIMIT),
      ]);
      setWeights(w);
      setHeyanpoDurations(heyDur);
      setAvgHey(h);
      setMeals(m);
      setWeightList([...wList].reverse());
      setHeyanpoList(hyList);
      setMemoList(memoHist);
    } catch (e) {
      console.error('[InsightsScreen]', petId, e);
      setWeights([]);
      setHeyanpoDurations([]);
      setAvgHey(null);
      setMeals([]);
      setWeightList([]);
      setHeyanpoList([]);
      setMemoList([]);
    } finally {
      setLoading(false);
    }
  }, [petId, range.chartLimit, range.days]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const openWeightEdit = (row) => {
    setEditKind('weight');
    setEditOriginalDate(row.date);
    setEditDate(row.date);
    setEditWeight(row.weight != null ? String(row.weight) : '');
  };

  const openHeyanpoEdit = (row) => {
    setEditKind('heyanpo');
    setEditOriginalDate(row.date);
    setEditDate(row.date);
    setEditStart(row.heyanpo_start ?? '');
    setEditEnd(row.heyanpo_end ?? '');
  };

  const openMemoEdit = (row) => {
    setEditKind('memo');
    setEditOriginalDate(row.date);
    setEditDate(row.date);
    setEditMemo(row.memo ?? '');
  };

  const closeEdit = () => {
    setEditKind(null);
    setShowEditDate(false);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      if (editKind === 'weight') {
        const t = editWeight.trim();
        const n = t === '' ? null : parseFloat(t.replace(',', '.'));
        if (t !== '' && !Number.isFinite(n)) {
          throw new Error('体重の数値が不正です');
        }
        await mergeUpsertDailyLog(petId, { date: editDate, weight: n });
        if (editOriginalDate && editOriginalDate !== editDate) {
          await clearDailyLogWeight(petId, editOriginalDate);
        }
      } else if (editKind === 'heyanpo') {
        await mergeUpsertDailyLog(petId, {
          date: editDate,
          heyanpo_start: normalizeTimeInput(editStart),
          heyanpo_end: normalizeTimeInput(editEnd),
        });
        if (editOriginalDate && editOriginalDate !== editDate) {
          await clearDailyLogHeyanpo(petId, editOriginalDate);
        }
      } else if (editKind === 'memo') {
        await mergeUpsertDailyLog(petId, {
          date: editDate,
          memo: editMemo.trim() || null,
        });
        if (editOriginalDate && editOriginalDate !== editDate) {
          await clearDailyLogMemo(petId, editOriginalDate);
        }
      }
      closeEdit();
      await load();
      refreshHomeWidget().catch((e) =>
        console.warn('[refreshHomeWidget]', e)
      );
    } catch (e) {
      Alert.alert('保存エラー', String(e?.message ?? e));
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteEdit = () => {
    Alert.alert('削除確認', `${editDate} の記録を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            if (editKind === 'weight') {
              await clearDailyLogWeight(petId, editDate);
            } else if (editKind === 'heyanpo') {
              await clearDailyLogHeyanpo(petId, editDate);
            } else if (editKind === 'memo') {
              await clearDailyLogMemo(petId, editDate);
            }
            closeEdit();
            await load();
            refreshHomeWidget().catch((e) =>
              console.warn('[refreshHomeWidget]', e)
            );
          } catch (e) {
            Alert.alert('削除エラー', String(e?.message ?? e));
          }
        },
      },
    ]);
  };

  const chartW = Math.max(260, winW - H_PAD * 2 - 36);
  const labels = weights.map((r) => formatChartLabel(r.date));
  const dataPoints = weights.map((r) =>
    r.weight != null ? Number(r.weight) : 0
  );
  const showChart = dataPoints.length >= 2;
  const heyLabels = heyanpoDurations.map((r) => formatChartLabel(r.date));
  const heyPoints = heyanpoDurations.map((r) => r.minutes);
  const showHeyChart = heyPoints.length >= 2;

  const label = petName || petId;
  const endStr = getLocalDateString();
  const startStr =
    range.days != null ? getInsightRangeStartDate(range.days) : '開始〜';

  return (
    <View style={styles.petCard}>
      <Text style={styles.petTitle}>{label}</Text>
      {loading ? (
        <ActivityIndicator color={FG} style={styles.loader} />
      ) : (
        <>
          <Text style={styles.rangeNote}>{range.detailLabel}</Text>
          <Text style={styles.rangeNote}>
            平均・食事: {startStr} 〜 {endStr}
          </Text>

          <Text style={styles.sectionHeading}>体重の推移</Text>
          <Text style={styles.chartCaption}>
            直近 {range.chartLimit}{' '}
            回の計測を日付順に表示します（計測日が離れていても結線します）。
          </Text>
          {showChart ? (
            <LineChart
              data={{
                labels,
                datasets: [{ data: dataPoints }],
              }}
              width={chartW}
              height={200}
              chartConfig={chartBase}
              bezier
              style={styles.chart}
              withInnerLines
              withOuterLines
              fromZero={false}
            />
          ) : (
            <Text style={styles.hint}>
              体重が2回以上記録されると、折れ線グラフを表示します。
            </Text>
          )}

          <Text style={styles.sectionHeading}>へやんぽ時間の推移</Text>
          <Text style={styles.chartCaption}>
            直近 {range.chartLimit}{' '}
            回（開始・終了が揃った記録）を分単位で表示します。
          </Text>
          {showHeyChart ? (
            <LineChart
              data={{
                labels: heyLabels,
                datasets: [{ data: heyPoints }],
              }}
              width={chartW}
              height={200}
              chartConfig={{ ...chartBase, decimalPlaces: 0 }}
              bezier
              style={styles.chart}
              withInnerLines
              withOuterLines
              fromZero={false}
              yAxisSuffix="分"
            />
          ) : (
            <Text style={styles.hint}>
              へやんぽが2回以上記録されると、折れ線グラフを表示します。
            </Text>
          )}

          <Text style={styles.sectionHeading}>記録カレンダー</Text>
          <MonthCalendar petId={petId} reloadToken={reloadToken} />

          <View style={styles.historyBtnRow}>
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => setWeightModal(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.historyBtnText}>体重履歴</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => setHeyanpoModal(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.historyBtnText}>へやんぽ履歴</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.historyBtn, styles.historyBtnFull]}
            onPress={() => setMemoModal(true)}
            activeOpacity={0.88}
          >
            <Text style={styles.historyBtnText}>メモ履歴</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeading}>平均へやんぽ時間</Text>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatAvgMinutes(avgHey)}</Text>
            <Text style={styles.statCaption}>
              開始・終了を同一日内で記録した日のみを平均しています。
            </Text>
          </View>

          <Text style={styles.sectionHeading}>食事メニュー提供回数</Text>
          {meals.length === 0 ? (
            <Text style={styles.hint}>この期間の記録はありません</Text>
          ) : (
            meals.map((row, idx) => (
              <View key={row.meal_id} style={styles.rankRow}>
                <Text style={styles.rankNum}>{idx + 1}</Text>
                <View style={styles.rankBody}>
                  <Text style={styles.rankName}>{row.name}</Text>
                  <Text style={styles.rankCount}>{row.count} 回</Text>
                </View>
              </View>
            ))
          )}

          <HistoryModal
            visible={weightModal}
            title={`${label} · 体重履歴`}
            onClose={() => setWeightModal(false)}
          >
            {weightList.length === 0 ? (
              <Text style={styles.historyEmpty}>記録がありません</Text>
            ) : (
              weightList.map((r) => (
                <TouchableOpacity
                  key={r.date}
                  style={styles.historyRow}
                  onPress={() => openWeightEdit(r)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.historyDate}>
                    {formatListDate(r.date)}
                  </Text>
                  <Text style={styles.historyValue}>{r.weight} g</Text>
                </TouchableOpacity>
              ))
            )}
          </HistoryModal>

          <HistoryModal
            visible={heyanpoModal}
            title={`${label} · へやんぽ履歴`}
            onClose={() => setHeyanpoModal(false)}
          >
            {heyanpoList.length === 0 ? (
              <Text style={styles.historyEmpty}>記録がありません</Text>
            ) : (
              heyanpoList.map((r) => {
                const dur = heyanpoDurationLabel(
                  r.heyanpo_start,
                  r.heyanpo_end
                );
                return (
                  <TouchableOpacity
                    key={r.date}
                    style={styles.historyRow}
                    onPress={() => openHeyanpoEdit(r)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.historyRowBody}>
                      <Text style={styles.historyDate}>
                        {formatListDate(r.date)}
                      </Text>
                      <Text style={styles.historyTimes}>
                        開始 {r.heyanpo_start ?? '—'} ／ 終了{' '}
                        {r.heyanpo_end ?? '—'}
                        {dur ? `（${dur}）` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </HistoryModal>

          <HistoryModal
            visible={memoModal}
            title={`${label} · メモ履歴`}
            onClose={() => setMemoModal(false)}
          >
            {memoList.length === 0 ? (
              <Text style={styles.historyEmpty}>記録がありません</Text>
            ) : (
              memoList.map((r) => (
                <TouchableOpacity
                  key={r.date}
                  style={styles.historyRow}
                  onPress={() => openMemoEdit(r)}
                  activeOpacity={0.85}
                >
                  <View style={styles.historyRowBody}>
                    <Text style={styles.historyDate}>
                      {formatListDate(r.date)}
                    </Text>
                    <Text style={styles.historyTimes} numberOfLines={3}>
                      {r.memo}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </HistoryModal>

          <Modal
            visible={editKind != null}
            transparent
            animationType="fade"
            onRequestClose={closeEdit}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>
                  {editKind === 'weight'
                    ? '体重を編集'
                    : editKind === 'heyanpo'
                      ? 'へやんぽを編集'
                      : 'メモを編集'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowEditDate(true)}
                  activeOpacity={0.85}
                  style={styles.editDateBtn}
                >
                  <Text style={styles.editDateText}>日付: {editDate}</Text>
                  <Text style={styles.modalHint}>タップで変更</Text>
                </TouchableOpacity>
                {showEditDate && (
                  <DateTimePicker
                    value={parseLocalDateString(editDate)}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={(_, date) => {
                      setShowEditDate(false);
                      if (date) setEditDate(getLocalDateString(date));
                    }}
                  />
                )}

                {editKind === 'weight' ? (
                  <TextInput
                    style={styles.editInput}
                    value={editWeight}
                    onChangeText={setEditWeight}
                    keyboardType="decimal-pad"
                    placeholder="体重 (g)"
                    placeholderTextColor={`${FG}88`}
                  />
                ) : null}
                {editKind === 'heyanpo' ? (
                  <>
                    <TextInput
                      style={styles.editInput}
                      value={editStart}
                      onChangeText={setEditStart}
                      placeholder="開始 HH:mm"
                      placeholderTextColor={`${FG}88`}
                    />
                    <TextInput
                      style={styles.editInput}
                      value={editEnd}
                      onChangeText={setEditEnd}
                      placeholder="終了 HH:mm"
                      placeholderTextColor={`${FG}88`}
                    />
                  </>
                ) : null}
                {editKind === 'memo' ? (
                  <TextInput
                    style={[styles.editInput, styles.editMemo]}
                    value={editMemo}
                    onChangeText={setEditMemo}
                    multiline
                    placeholder="メモ"
                    placeholderTextColor={`${FG}88`}
                  />
                ) : null}

                <TouchableOpacity
                  style={[styles.modalCloseBtn, savingEdit && styles.btnDisabled]}
                  onPress={saveEdit}
                  disabled={savingEdit}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modalCloseText}>
                    {savingEdit ? '保存中…' : '保存'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={deleteEdit}
                  activeOpacity={0.9}
                >
                  <Text style={styles.deleteBtnText}>この項目を削除</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={closeEdit}
                  activeOpacity={0.9}
                >
                  <Text style={styles.cancelBtnText}>キャンセル</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

export function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [rangeKey, setRangeKey] = useState('short');
  const [reloadToken, setReloadToken] = useState(0);
  const [pets, setPets] = useState([]);
  const skipFirstFocus = useRef(true);
  const activeRange = getInsightRange(rangeKey);

  useFocusEffect(
    useCallback(() => {
      listActivePets()
        .then(setPets)
        .catch((e) => console.error('[Insights pets]', e));
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      setReloadToken((t) => t + 1);
    }, [])
  );

  const padTop = Math.max(insets.top, 8);

  return (
    <View style={[styles.screen, { paddingTop: padTop }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.padded}>
          <Text style={styles.headline}>分析</Text>
          <Text style={styles.lead}>
            グラフは計測回数ベース、平均・食事はカレンダー期間です。履歴はタップで編集できます。
          </Text>

          <View style={styles.toggleRow}>
            {Object.values(INSIGHT_RANGES).map((preset) => {
              const on = rangeKey === preset.key;
              return (
                <TouchableOpacity
                  key={preset.key}
                  style={[styles.toggleBtn, on && styles.toggleBtnOn]}
                  onPress={() => setRangeKey(preset.key)}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.toggleText, on && styles.toggleTextOn]}>
                    {preset.toggleLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.rangeDetail}>{activeRange.detailLabel}</Text>
        </View>

        <View style={styles.padded}>
          <CompareWeightChart
            pets={pets}
            rangeKey={rangeKey}
            reloadToken={reloadToken}
          />
          {pets.length === 0 ? (
            <Text style={styles.hint}>
              有効な個体がありません。データタブで追加してください。
            </Text>
          ) : (
            pets.map((pet) => (
              <PetInsightBlock
                key={pet.id}
                petId={pet.id}
                petName={pet.name}
                rangeKey={rangeKey}
                winW={winW}
                reloadToken={reloadToken}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  padded: {
    paddingHorizontal: H_PAD,
  },
  headline: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: FG,
    marginBottom: 8,
    fontFamily: 'serif',
    includeFontPadding: false,
  },
  lead: {
    fontSize: 14,
    color: FG,
    opacity: 0.78,
    marginBottom: 16,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 20,
    paddingVertical: 11,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  toggleBtnOn: {
    backgroundColor: '#E8DDD4',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: FG,
    opacity: 0.75,
  },
  toggleTextOn: {
    opacity: 1,
  },
  rangeDetail: {
    fontSize: 12,
    color: FG,
    opacity: 0.65,
    marginBottom: 8,
    lineHeight: 17,
  },
  petCard: {
    backgroundColor: CARD,
    borderRadius: R,
    padding: 16,
    marginBottom: 16,
  },
  petTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: FG,
    marginBottom: 8,
  },
  rangeNote: {
    fontSize: 12,
    color: FG,
    opacity: 0.65,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: FG,
    marginTop: 8,
    marginBottom: 8,
  },
  chartCaption: {
    fontSize: 12,
    color: FG,
    opacity: 0.7,
    lineHeight: 17,
    marginBottom: 10,
  },
  chart: {
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'center',
  },
  historyBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  historyBtn: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  historyBtnFull: {
    marginBottom: 8,
  },
  historyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: FG,
  },
  hint: {
    fontSize: 13,
    color: FG,
    opacity: 0.78,
    lineHeight: 20,
    marginBottom: 8,
  },
  statBox: {
    backgroundColor: BG,
    borderRadius: 20,
    padding: 14,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: FG,
    marginBottom: 6,
  },
  statCaption: {
    fontSize: 12,
    color: FG,
    opacity: 0.7,
    lineHeight: 17,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rankNum: {
    width: 28,
    fontSize: 15,
    fontWeight: '800',
    color: FG,
    opacity: 0.55,
  },
  rankBody: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankName: {
    fontSize: 15,
    fontWeight: '600',
    color: FG,
    flex: 1,
    paddingRight: 8,
  },
  rankCount: {
    fontSize: 14,
    fontWeight: '700',
    color: FG,
    opacity: 0.85,
  },
  loader: {
    marginVertical: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 74, 74, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: BG,
    borderRadius: R,
    padding: 18,
    maxHeight: '78%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: FG,
    marginBottom: 6,
  },
  modalHint: {
    fontSize: 12,
    color: FG,
    opacity: 0.65,
    marginBottom: 10,
  },
  historyScroll: {
    maxHeight: 360,
  },
  historyEmpty: {
    fontSize: 14,
    color: FG,
    opacity: 0.7,
    paddingVertical: 12,
  },
  historyRow: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyRowBody: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '700',
    color: FG,
  },
  historyValue: {
    fontSize: 15,
    fontWeight: '700',
    color: FG,
  },
  historyTimes: {
    fontSize: 13,
    color: FG,
    opacity: 0.8,
    marginTop: 4,
    lineHeight: 18,
  },
  modalCloseBtn: {
    marginTop: 12,
    backgroundColor: FG,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: BG,
  },
  editDateBtn: {
    marginBottom: 10,
  },
  editDateText: {
    fontSize: 15,
    fontWeight: '700',
    color: FG,
  },
  editInput: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: FG,
    marginBottom: 10,
  },
  editMemo: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  deleteBtn: {
    marginTop: 10,
    backgroundColor: CARD,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: FG,
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: FG,
    opacity: 0.7,
  },
  btnDisabled: {
    opacity: 0.65,
  },
});
