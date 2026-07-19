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
const FUNU_COLOR = (o = 1) => `rgba(74, 74, 74, ${o})`;
const MUMU_COLOR = (o = 1) => `rgba(160, 130, 100, ${o})`;

function formatChartLabel(dateStr) {
  const p = String(dateStr ?? '').split('-');
  return p.length === 3 ? `${Number(p[1])}/${Number(p[2])}` : dateStr;
}

/**
 * 同日に両方の体重がある日付だけを重ねて表示。
 */
export function CompareWeightChart({ rangeKey, reloadToken = 0 }) {
  const { width: winW } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState([]);
  const [funuData, setFunuData] = useState([]);
  const [mumuData, setMumuData] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { chartLimit } = getInsightRange(rangeKey);
      const [funu, mumu] = await Promise.all([
        getWeightHistory('funu', chartLimit),
        getWeightHistory('mumu', chartLimit),
      ]);
      const mapF = new Map(funu.map((r) => [r.date, Number(r.weight)]));
      const mapM = new Map(mumu.map((r) => [r.date, Number(r.weight)]));
      const common = [...mapF.keys()]
        .filter((d) => mapM.has(d))
        .sort();
      setLabels(common.map(formatChartLabel));
      setFunuData(common.map((d) => mapF.get(d)));
      setMumuData(common.map((d) => mapM.get(d)));
    } catch (e) {
      console.error('[CompareWeightChart]', e);
      setLabels([]);
      setFunuData([]);
      setMumuData([]);
    } finally {
      setLoading(false);
    }
  }, [rangeKey]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const chartW = Math.max(260, winW - 40 - 36);
  const show = funuData.length >= 2;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>ふぬ × むむ 体重比較</Text>
      <Text style={styles.caption}>
        同じ日に両方の体重がある点だけを重ねて表示します。
      </Text>
      {loading ? (
        <ActivityIndicator color={FG} style={styles.loader} />
      ) : show ? (
        <>
          <LineChart
            data={{
              labels,
              datasets: [
                {
                  data: funuData,
                  color: FUNU_COLOR,
                  strokeWidth: 2,
                },
                {
                  data: mumuData,
                  color: MUMU_COLOR,
                  strokeWidth: 2,
                },
              ],
              legend: ['ふぬ', 'むむ'],
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
              <Text style={styles.legendText}>ふぬ</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.swatch, { backgroundColor: '#A08264' }]}
              />
              <Text style={styles.legendText}>むむ</Text>
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
