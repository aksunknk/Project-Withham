import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 20;

function formatPrevDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr ?? '';
  const p = dateStr.split('-');
  if (p.length !== 3) return dateStr;
  return `${Number(p[0])}/${Number(p[1])}/${Number(p[2])}`;
}

export function WeightSection({
  weightText,
  onChangeWeight,
  recordDateStr,
  onPressRecordDate,
  onSaveWeight,
  savingWeight,
  previousWeight,
}) {
  const prevLabel =
    previousWeight != null && Number.isFinite(previousWeight.weight)
      ? `前回計測: ${previousWeight.weight} g（${formatPrevDate(previousWeight.date)}）`
      : '前回計測: まだ記録がありません';

  return (
    <View style={styles.block}>
      <Text style={styles.title}>体重（g）</Text>
      <View style={styles.mergedCard}>
        <TouchableOpacity
          onPress={onPressRecordDate}
          activeOpacity={0.85}
          style={styles.dateBtn}
        >
          <Text style={styles.recordDateLine}>記録日: {recordDateStr}</Text>
          <Text style={styles.dateHint}>タップで日付を変更</Text>
        </TouchableOpacity>

        <Text style={styles.prevWeightLine}>{prevLabel}</Text>

        <TextInput
          style={styles.input}
          value={weightText}
          onChangeText={onChangeWeight}
          keyboardType="decimal-pad"
          placeholder="体重を入力"
          placeholderTextColor={`${FG}88`}
        />

        <TouchableOpacity
          style={[styles.saveWeightBtn, savingWeight && styles.saveWeightBtnDisabled]}
          onPress={onSaveWeight}
          disabled={savingWeight}
          activeOpacity={0.9}
        >
          <Text style={styles.saveWeightText}>
            {savingWeight ? '保存中…' : '体重を保存'}
          </Text>
        </TouchableOpacity>
      </View>
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
  dateBtn: {
    marginBottom: 8,
  },
  recordDateLine: {
    fontSize: 14,
    fontWeight: '700',
    color: FG,
  },
  dateHint: {
    marginTop: 2,
    fontSize: 11,
    color: FG,
    opacity: 0.65,
  },
  prevWeightLine: {
    fontSize: 13,
    fontWeight: '600',
    color: FG,
    opacity: 0.88,
    marginBottom: 10,
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
  saveWeightBtn: {
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
});
