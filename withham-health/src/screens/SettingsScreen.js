import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { useFocusEffect } from '@react-navigation/native';
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
import {
  createPet,
  listPets,
  updatePet,
} from '../database/db';
import {
  getNotificationPrefs,
  requestNotificationPermissions,
  rescheduleAllReminders,
  setNotificationPrefs,
} from '../notifications/reminders';
import { shareTextFile } from '../utils/shareFile';
import { refreshHomeWidget } from '../widget/snapshot';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 22;
const H_PAD = 20;

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [notifyMaintenance, setNotifyMaintenance] = useState(true);
  const [notifyDaily, setNotifyDaily] = useState(true);
  const [pets, setPets] = useState([]);
  const [petModal, setPetModal] = useState(false);
  const [editingPetId, setEditingPetId] = useState(null);
  const [petNameDraft, setPetNameDraft] = useState('');

  const loadPrefs = useCallback(async () => {
    try {
      const prefs = await getNotificationPrefs();
      setNotifyMaintenance(prefs.maintenance);
      setNotifyDaily(prefs.dailyRecord);
    } catch (e) {
      console.warn('[SettingsScreen prefs]', e);
    }
  }, []);

  const loadPets = useCallback(async () => {
    try {
      setPets(await listPets(true));
    } catch (e) {
      console.warn('[SettingsScreen pets]', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPrefs();
      loadPets();
    }, [loadPrefs, loadPets])
  );

  const openNewPet = () => {
    setEditingPetId(null);
    setPetNameDraft('');
    setPetModal(true);
  };

  const openEditPet = (pet) => {
    setEditingPetId(pet.id);
    setPetNameDraft(pet.name);
    setPetModal(true);
  };

  const savePetModal = () => {
    run(async () => {
      if (editingPetId) {
        await updatePet(editingPetId, { name: petNameDraft });
      } else {
        await createPet({ name: petNameDraft });
      }
      setPetModal(false);
      await loadPets();
      await refreshHomeWidget();
    });
  };

  const toggleRetire = (pet) => {
    const next = !pet.retired;
    Alert.alert(
      next ? '個体を引退させる' : '個体を復帰させる',
      next
        ? `${pet.name} を記録対象から外します（データは残ります）。`
        : `${pet.name} を再び記録対象にします。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: next ? '引退' : '復帰',
          onPress: () =>
            run(async () => {
              await updatePet(pet.id, { retired: next });
              await loadPets();
              await refreshHomeWidget();
            }),
        },
      ]
    );
  };

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

  const onToggleMaintenance = useCallback(
    (value) => {
      setNotifyMaintenance(value);
      run(async () => {
        if (value) {
          const ok = await requestNotificationPermissions();
          if (!ok) {
            setNotifyMaintenance(false);
            Alert.alert(
              '通知が許可されていません',
              '端末の設定から通知を許可してください。'
            );
            await setNotificationPrefs({ maintenance: false });
            return;
          }
        }
        await setNotificationPrefs({ maintenance: value });
      });
    },
    [run]
  );

  const onToggleDaily = useCallback(
    (value) => {
      setNotifyDaily(value);
      run(async () => {
        if (value) {
          const ok = await requestNotificationPermissions();
          if (!ok) {
            setNotifyDaily(false);
            Alert.alert(
              '通知が許可されていません',
              '端末の設定から通知を許可してください。'
            );
            await setNotificationPrefs({ dailyRecord: false });
            return;
          }
        }
        await setNotificationPrefs({ dailyRecord: value });
      });
    },
    [run]
  );

  const onReschedule = useCallback(() => {
    run(async () => {
      const ok = await requestNotificationPermissions();
      if (!ok) {
        Alert.alert(
          '通知が許可されていません',
          '端末の設定から通知を許可してください。'
        );
        return;
      }
      await rescheduleAllReminders();
      Alert.alert('完了', '通知スケジュールを更新しました。');
    });
  }, [run]);

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

  const doImport = useCallback(async (mode) => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    const uri = picked.assets[0].uri;
    const text = await readAsStringAsync(uri, { encoding: 'utf8' });
    const data = parseBackupJson(text);
    await importBackupObject(data, mode);
    await rescheduleAllReminders();
    await refreshHomeWidget();
    Alert.alert(
      'インポート完了',
      mode === 'replace'
        ? '既存データを置き換えました。記録・分析タブを開き直すと反映されます。'
        : 'バックアップをマージしました。記録・分析タブを開き直すと反映されます。'
    );
  }, []);

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
          個体・通知・バックアップの設定です。機種変更前に JSON
          バックアップを残してください。
        </Text>

        <Text style={styles.section}>個体</Text>
        <View style={styles.card}>
          {pets.map((pet) => (
            <View key={pet.id} style={styles.petRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.btnText}>
                  {pet.name}
                  {pet.retired ? '（引退）' : ''}
                </Text>
                <Text style={styles.btnSub}>ID: {pet.id}</Text>
              </View>
              <TouchableOpacity
                onPress={() => openEditPet(pet)}
                activeOpacity={0.85}
              >
                <Text style={styles.linkBtn}>改名</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => toggleRetire(pet)}
                activeOpacity={0.85}
              >
                <Text style={styles.linkBtn}>
                  {pet.retired ? '復帰' : '引退'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.btn}
            onPress={openNewPet}
            disabled={busy}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>個体を追加</Text>
            <Text style={styles.btnSub}>新しい同居個体を登録</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>通知</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.btnText}>お手入れ予定</Text>
              <Text style={styles.btnSub}>次回予定日の朝 10:00 に通知</Text>
            </View>
            <Switch
              value={notifyMaintenance}
              onValueChange={onToggleMaintenance}
              trackColor={{ false: '#D4C9BC', true: '#C4B5A5' }}
              thumbColor={notifyMaintenance ? FG : '#F5EFE6'}
              disabled={busy}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.btnText}>記録リマインド</Text>
              <Text style={styles.btnSub}>毎日 20:00 に未記録を促す</Text>
            </View>
            <Switch
              value={notifyDaily}
              onValueChange={onToggleDaily}
              trackColor={{ false: '#D4C9BC', true: '#C4B5A5' }}
              thumbColor={notifyDaily ? FG : '#F5EFE6'}
              disabled={busy}
            />
          </View>
          <TouchableOpacity
            style={styles.btn}
            onPress={onReschedule}
            disabled={busy}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>通知を再スケジュール</Text>
            <Text style={styles.btnSub}>
              再起動後や許可変更後に押してください
            </Text>
          </TouchableOpacity>
        </View>

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

      <Modal
        visible={petModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingPetId ? '個体名を変更' : '個体を追加'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={petNameDraft}
              onChangeText={setPetNameDraft}
              placeholder="名前"
              placeholderTextColor={`${FG}88`}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnGhost}
                onPress={() => setPetModal(false)}
              >
                <Text style={styles.modalBtnGhostText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={savePetModal}>
                <Text style={styles.modalBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  switchRow: {
    backgroundColor: BG,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchCopy: {
    flex: 1,
    paddingRight: 8,
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
  petRow: {
    backgroundColor: BG,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: FG,
    textDecorationLine: 'underline',
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
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: FG,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: FG,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    backgroundColor: FG,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  modalBtnText: {
    color: BG,
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalBtnGhostText: {
    color: FG,
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
});
