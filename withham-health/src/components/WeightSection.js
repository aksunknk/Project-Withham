import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 20;

export function WeightSection({
  weightText,
  onChangeWeight,
  recordDateStr,
  onSaveWeight,
  savingWeight,
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.title}>体重（g）</Text>
      <View style={styles.mergedCard}>
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
