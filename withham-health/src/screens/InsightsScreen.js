import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { StatusBar } from 'expo-status-bar';
import {
  getAvgHeyanpoMinutesInDateRange,
  getInsightRangeStartDate,
  getLocalDateString,
  getMealServeCountsInDateRange,
  getWeightHistoryInDateRange,
} from '../database/db';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 22;
const H_PAD = 20;

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

function PetInsightBlock({ petId, days, winW, reloadToken }) {
  const [weights, setWeights] = useState([]);
  const [avgHey, setAvgHey] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, h, m] = await Promise.all([
        getWeightHistoryInDateRange(petId, days),
        getAvgHeyanpoMinutesInDateRange(petId, days),
        getMealServeCountsInDateRange(petId, days),
      ]);
      setWeights(w);
      setAvgHey(h);
      setMeals(m);
    } catch (e) {
      console.error('[InsightsScreen]', petId, e);
      setWeights([]);
      setAvgHey(null);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }, [petId, days]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const chartW = Math.max(260, winW - H_PAD * 2 - 36);
  const labels = weights.map((r) => {
    const p = r.date.split('-');
    return p.length === 3 ? `${Number(p[1])}/${Number(p[2])}` : r.date;
  });
  const dataPoints = weights.map((r) =>
    r.weight != null ? Number(r.weight) : 0
  );
  const showChart = dataPoints.length >= 2;

  const label = petId === 'funu' ? 'ふぬ' : 'むむ';
  const startStr = getInsightRangeStartDate(days);
  const endStr = getLocalDateString();

  return (
    <View style={styles.petCard}>
      <Text style={styles.petTitle}>{label}</Text>
      {loading ? (
        <ActivityIndicator color={FG} style={styles.loader} />
      ) : (
        <>
          <Text style={styles.rangeNote}>
            対象期間: {startStr} 〜 {endStr}
          </Text>

          <Text style={styles.sectionHeading}>体重の推移</Text>
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
              この期間に体重が2日分以上あると、折れ線グラフを表示します。
            </Text>
          )}

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
        </>
      )}
    </View>
  );
}

export function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [days, setDays] = useState(7);
  const [reloadToken, setReloadToken] = useState(0);
  const skipFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
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
            直近の記録から傾向を確認できます。
          </Text>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, days === 7 && styles.toggleBtnOn]}
              onPress={() => setDays(7)}
              activeOpacity={0.88}
            >
              <Text
                style={[styles.toggleText, days === 7 && styles.toggleTextOn]}
              >
                直近7日間
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, days === 30 && styles.toggleBtnOn]}
              onPress={() => setDays(30)}
              activeOpacity={0.88}
            >
              <Text
                style={[styles.toggleText, days === 30 && styles.toggleTextOn]}
              >
                直近30日間
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.padded}>
          <PetInsightBlock
            petId="funu"
            days={days}
            winW={winW}
            reloadToken={reloadToken}
          />
          <PetInsightBlock
            petId="mumu"
            days={days}
            winW={winW}
            reloadToken={reloadToken}
          />
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleBtnOn: {
    backgroundColor: '#E8DDD4',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: FG,
    opacity: 0.75,
  },
  toggleTextOn: {
    opacity: 1,
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
  chart: {
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'center',
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
});
