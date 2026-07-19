import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import {
  backupObjectToJson,
  buildBackupObject,
  buildHeyanpoCsv,
  buildWeightCsv,
  defaultBackupFileName,
  defaultCsvFileName,
  importBackupObject,
  parseBackupJson,
} from '../database/backup';
import { shareTextFile } from '../utils/shareFile';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 22;
const H_PAD = 20;

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('エラー', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }, []);

  const onExportJson = useCallback(() => {
    run(async () => {
      const obj = await buildBackupObject();
      await shareTextFile(
        backupObjectToJson(obj),
        defaultBackupFileName(),
        'application/json'
      );
    });
  }, [run]);

  const onExportWeightCsv = useCallback(() => {
    run(async () => {
      const csv = await buildWeightCsv();
      await shareTextFile(csv, defaultCsvFileName('weight'), 'text/csv');
    });
  }, [run]);

  const onExportHeyanpoCsv = useCallback(() => {
    run(async () => {
      const csv = await buildHeyanpoCsv();
      await shareTextFile(csv, defaultCsvFileName('heyanpo'), 'text/csv');
    });
  }, [run]);

  const doImport = useCallback(
    async (mode) => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]?.uri) return;
      const uri = picked.assets[0].uri;
      const text = await readAsStringAsync(uri, { encoding: 'utf8' });
      const data = parseBackupJson(text);
      await importBackupObject(data, mode);
      Alert.alert(
        'インポート完了',
        mode === 'replace'
          ? '既存データを置き換えました。記録・分析タブを開き直すと反映されます。'
          : 'バックアップをマージしました。記録・分析タブを開き直すと反映されます。'
      );
    },
    []
  );

  const onImport = useCallback(() => {
    Alert.alert('バックアップを取り込む', '取り込み方法を選んでください。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'マージ（既存を残す）',
        onPress: () => run(() => doImport('merge')),
      },
      {
        text: '置換（既存を消す）',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            '本当に置換しますか？',
            '端末内の記録・食事・お手入れ履歴がバックアップ内容で上書きされます。',
            [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '置換する',
                style: 'destructive',
                onPress: () => run(() => doImport('replace')),
              },
            ]
          );
        },
      },
    ]);
  }, [doImport, run]);

  const padTop = Math.max(insets.top, 8);

  return (
    <View style={[styles.screen, { paddingTop: padTop }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>データ</Text>
        <Text style={styles.lead}>
          端末内データのバックアップと CSV
          出力です。機種変更前に JSON バックアップを残してください。
        </Text>

        <Text style={styles.section}>バックアップ</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.btn}
            onPress={onExportJson}
            disabled={busy}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>JSON を書き出す</Text>
            <Text style={styles.btnSub}>
              記録・食事・お手入れ・設定をまとめて共有
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btn}
            onPress={onImport}
            disabled={busy}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>JSON を取り込む</Text>
            <Text style={styles.btnSub}>マージまたは置換を選択</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>CSV エクスポート</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.btn}
            onPress={onExportWeightCsv}
            disabled={busy}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>体重 CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btn}
            onPress={onExportHeyanpoCsv}
            disabled={busy}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>へやんぽ CSV</Text>
          </TouchableOpacity>
        </View>

        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={FG} />
            <Text style={styles.busyText}>処理中…</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingHorizontal: H_PAD,
    paddingBottom: 40,
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
    marginBottom: 20,
    lineHeight: 20,
  },
  section: {
    fontSize: 15,
    fontWeight: '600',
    color: FG,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: R,
    padding: 10,
    marginBottom: 18,
    gap: 8,
  },
  btn: {
    backgroundColor: BG,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: FG,
  },
  btnSub: {
    marginTop: 4,
    fontSize: 12,
    color: FG,
    opacity: 0.7,
    lineHeight: 17,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  busyText: {
    fontSize: 13,
    color: FG,
    opacity: 0.75,
  },
});
