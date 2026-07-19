import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getWeightHistory } from '../database/db';
import { getInsightRange } from '../utils/insightRange';

const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const COLOR_A = (o = 1) => `rgba(74, 74, 74, ${o})`;
const COLOR_B = (o = 1) => `rgba(160, 130, 100, ${o})`;

function formatChartLabel(dateStr) {
  const p = String(dateStr ?? '').split('-');
  return p.length === 3 ? `${Number(p[1])}/${Number(p[2])}` : dateStr;
}

/**
 * 先頭2個体の同日体重を重ねて表示。
 * @param {{ pets: Array<{id:string,name:string}>, rangeKey: string, reloadToken?: number }} props
 */
export function CompareWeightChart({ pets, rangeKey, reloadToken = 0 }) {
  const { width: winW } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState([]);
  const [seriesA, setSeriesA] = useState([]);
  const [seriesB, setSeriesB] = useState([]);
  const petA = pets[0] ?? null;
  const petB = pets[1] ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!petA || !petB) {
        setLabels([]);
        setSeriesA([]);
        setSeriesB([]);
        return;
      }
      const { chartLimit } = getInsightRange(rangeKey);
      const [a, b] = await Promise.all([
        getWeightHistory(petA.id, chartLimit),
        getWeightHistory(petB.id, chartLimit),
      ]);
      const mapA = new Map(a.map((r) => [r.date, Number(r.weight)]));
      const mapB = new Map(b.map((r) => [r.date, Number(r.weight)]));
      const common = [...mapA.keys()].filter((d) => mapB.has(d)).sort();
      setLabels(common.map(formatChartLabel));
      setSeriesA(common.map((d) => mapA.get(d)));
      setSeriesB(common.map((d) => mapB.get(d)));
    } catch (e) {
      console.error('[CompareWeightChart]', e);
      setLabels([]);
      setSeriesA([]);
      setSeriesB([]);
    } finally {
      setLoading(false);
    }
  }, [rangeKey, petA?.id, petB?.id]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const chartW = Math.max(260, winW - 40 - 36);
  const show = seriesA.length >= 2;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {petA && petB
          ? `${petA.name} × ${petB.name} 体重比較`
          : '個体比較'}
      </Text>
      <Text style={styles.caption}>
        有効な個体のうち先頭2匹について、同日計測だけを重ねて表示します。
      </Text>
      {!petA || !petB ? (
        <Text style={styles.hint}>比較には有効な個体が2匹以上必要です。</Text>
      ) : loading ? (
        <ActivityIndicator color={FG} style={styles.loader} />
      ) : show ? (
        <>
          <LineChart
            data={{
              labels,
              datasets: [
                { data: seriesA, color: COLOR_A, strokeWidth: 2 },
                { data: seriesB, color: COLOR_B, strokeWidth: 2 },
              ],
              legend: [petA.name, petB.name],
            }}
            width={chartW}
            height={210}
            chartConfig={{
              backgroundColor: CARD,
              backgroundGradientFrom: CARD,
              backgroundGradientTo: CARD,
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(74, 74, 74, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(74, 74, 74, ${opacity})`,
              propsForDots: { r: '3' },
              propsForBackgroundLines: {
                stroke: '#D4C9BC',
                strokeDasharray: '',
              },
            }}
            bezier
            style={styles.chart}
            withInnerLines
            withOuterLines
            fromZero={false}
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: FG }]} />
              <Text style={styles.legendText}>{petA.name}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: '#A08264' }]} />
              <Text style={styles.legendText}>{petB.name}</Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.hint}>
          同日計測が2日分以上あると、比較グラフを表示します。
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: FG,
    marginBottom: 6,
  },
  caption: {
    fontSize: 12,
    color: FG,
    opacity: 0.7,
    lineHeight: 17,
    marginBottom: 10,
  },
  chart: {
    borderRadius: 20,
    alignSelf: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: FG,
  },
  hint: {
    fontSize: 13,
    color: FG,
    opacity: 0.78,
    lineHeight: 20,
  },
  loader: {
    marginVertical: 20,
  },
});
