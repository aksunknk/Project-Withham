import { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 20;

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

function formatDateJa(dateStr) {
  if (!dateStr) return '';
  const p = dateStr.split('-');
  if (p.length !== 3) return dateStr;
  return `${Number(p[1])}/${Number(p[2])}`;
}

export function WeightSection({
  weightText,
  onChangeWeight,
  historyRows,
  latestRecord,
  recordDateStr,
  onSaveWeight,
  savingWeight,
}) {
  const { width: winW, height: winH } = useWindowDimensions();
  const [detailOpen, setDetailOpen] = useState(false);

  const chartW = Math.max(260, winW - 80);
  const hist = historyRows ?? [];
  const labels = hist.map((r) => {
    const p = r.date.split('-');
    return p.length === 3 ? `${Number(p[1])}/${Number(p[2])}` : r.date;
  });
  const dataPoints = hist.map((r) =>
    r.weight != null ? Number(r.weight) : 0
  );
  const showChart = dataPoints.length >= 2;

  const recentDesc = [...hist].reverse();

  const latestWeightStr =
    latestRecord != null && latestRecord.weight != null
      ? `${Number(latestRecord.weight).toFixed(1)}`
      : null;
  const latestDateStr =
    latestRecord?.date != null ? formatDateJa(latestRecord.date) : null;

  return (
    <View style={styles.block}>
      <Text style={styles.title}>体重（g）</Text>
      <View style={styles.mergedCard}>
        {latestWeightStr != null ? (
          <View style={styles.latestRow}>
            <Text style={styles.latestLabel}>最新</Text>
            <Text style={styles.latestValue}>{latestWeightStr}</Text>
            <Text style={styles.latestUnit}>g</Text>
            {latestDateStr ? (
              <Text style={styles.latestDate}>（{latestDateStr}）</Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.noLatest}>まだ体重の記録がありません</Text>
        )}

        <Text style={styles.recordDateLine}>
          記録日（保存時に自動）: {recordDateStr}
        </Text>

        <TextInput
          style={styles.input}
          value={weightText}
          onChangeText={onChangeWeight}
          keyboardType="decimal-pad"
          placeholder="本日の体重を入力"
          placeholderTextColor={`${FG}88`}
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.saveWeightBtn,
              savingWeight && styles.saveWeightBtnDisabled,
            ]}
            onPress={onSaveWeight}
            disabled={savingWeight}
            activeOpacity={0.9}
          >
            <Text style={styles.saveWeightText}>
              {savingWeight ? '保存中…' : '体重を保存'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => setDetailOpen(true)}
            activeOpacity={0.88}
          >
            <Text style={styles.detailBtnText}>詳細</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={detailOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: winH * 0.78 }]}>
            <Text style={styles.modalTitle}>体重の推移・記録一覧</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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
                <Text style={styles.modalHint}>
                  折れ線グラフは、体重が2日分以上ある場合に表示されます。
                </Text>
              )}

              <Text style={styles.listTitle}>直近の記録</Text>
              {recentDesc.length === 0 ? (
                <Text style={styles.listEmpty}>記録がありません</Text>
              ) : (
                recentDesc.map((r) => (
                  <View key={r.date} style={styles.listRow}>
                    <Text style={styles.listDate}>{r.date}</Text>
                    <Text style={styles.listW}>
                      {r.weight != null ? `${Number(r.weight).toFixed(1)} g` : '—'}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setDetailOpen(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.closeBtnText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: FG,
    marginBottom: 8,
  },
  mergedCard: {
    backgroundColor: BG,
    borderRadius: R,
    padding: 14,
  },
  latestRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 4,
  },
  latestLabel: {
    fontSize: 13,
    color: FG,
    opacity: 0.75,
    marginRight: 4,
  },
  latestValue: {
    fontSize: 22,
    fontWeight: '700',
    color: FG,
  },
  latestUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: FG,
    opacity: 0.85,
  },
  latestDate: {
    fontSize: 13,
    color: FG,
    opacity: 0.65,
  },
  noLatest: {
    fontSize: 13,
    color: FG,
    opacity: 0.65,
    marginBottom: 10,
  },
  recordDateLine: {
    fontSize: 12,
    color: FG,
    opacity: 0.7,
    marginBottom: 8,
  },
  input: {
    backgroundColor: CARD,
    borderRadius: R,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: FG,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  saveWeightBtn: {
    flex: 1,
    backgroundColor: FG,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  saveWeightBtnDisabled: {
    opacity: 0.65,
  },
  saveWeightText: {
    fontSize: 14,
    fontWeight: '700',
    color: BG,
  },
  detailBtn: {
    backgroundColor: CARD,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  detailBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: FG,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: CARD,
    borderRadius: R,
    padding: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: FG,
    marginBottom: 12,
  },
  chart: {
    borderRadius: R,
    marginBottom: 12,
  },
  modalHint: {
    fontSize: 13,
    color: FG,
    opacity: 0.8,
    marginBottom: 12,
    lineHeight: 20,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: FG,
    marginBottom: 8,
    marginTop: 4,
  },
  listEmpty: {
    fontSize: 13,
    color: FG,
    opacity: 0.65,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D4C9BC',
  },
  listDate: {
    fontSize: 14,
    color: FG,
    opacity: 0.85,
  },
  listW: {
    fontSize: 14,
    fontWeight: '600',
    color: FG,
  },
  closeBtn: {
    marginTop: 14,
    backgroundColor: FG,
    borderRadius: R,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: BG,
    fontSize: 15,
    fontWeight: '700',
  },
});
