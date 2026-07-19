import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { copyAsync, documentDirectory } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import {
  getTodayCareGaps,
  listActivePets,
  updatePet,
} from '../database/db';
import { MaintenanceSection } from '../components/MaintenanceSection';
import { PetHeader } from '../components/PetHeader';
import { PetObservationCard } from '../components/PetObservationCard';
import { refreshHomeWidget } from '../widget/snapshot';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const H_PAD = 20;

function formatCareGapLine(gap) {
  const parts = [];
  if (gap.missingWeight) parts.push('体重');
  if (gap.missingSafety) parts.push('安全確認');
  return `${gap.label}: ${parts.join('・')}`;
}

export function InputScreen() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const pagerRef = useRef(null);
  const petIdRef = useRef(null);
  const [pets, setPets] = useState([]);
  const [activePetId, setActivePetId] = useState(null);
  const [careGaps, setCareGaps] = useState([]);

  const refreshPets = useCallback(async () => {
    const list = await listActivePets();
    setPets(list);
    setActivePetId((prev) => {
      if (prev && list.some((p) => p.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, []);

  const refreshCareGaps = useCallback(async () => {
    try {
      setCareGaps(await getTodayCareGaps());
      refreshHomeWidget().catch((e) =>
        console.warn('[refreshHomeWidget]', e)
      );
    } catch (e) {
      console.error('[careGaps]', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshPets().catch((e) => console.error('[pets load]', e));
      refreshCareGaps();
    }, [refreshPets, refreshCareGaps])
  );

  useEffect(() => {
    petIdRef.current = activePetId;
  }, [activePetId]);

  const goToPet = useCallback(
    (id) => {
      const index = pets.findIndex((p) => p.id === id);
      if (index < 0) return;
      setActivePetId(id);
      requestAnimationFrame(() => {
        pagerRef.current?.scrollTo({
          x: index * winW,
          animated: true,
        });
      });
    },
    [pets, winW]
  );

  useEffect(() => {
    if (!activePetId || pets.length === 0) return;
    const index = pets.findIndex((p) => p.id === activePetId);
    if (index < 0) return;
    pagerRef.current?.scrollTo({
      x: index * winW,
      animated: false,
    });
  }, [winW, pets, activePetId]);

  const onPagerMomentumEnd = useCallback(
    (e) => {
      const x = e.nativeEvent.contentOffset.x;
      const page = Math.round(x / winW);
      const next = pets[page];
      if (next) setActivePetId(next.id);
    },
    [winW, pets]
  );

  const onRequestIcon = useCallback(
    async (pid) => {
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
          allowsEditing: true,
          aspect: [1, 1],
        });

        if (res.canceled) return;
        if (!documentDirectory) {
          Alert.alert(
            '保存できません',
            'アプリのドキュメント領域を利用できません。'
          );
          return;
        }
        const uri = res.assets[0].uri;
        const rawExt = uri.split('.').pop()?.split('?')[0] || 'jpg';
        const ext = /^[a-zA-Z0-9]+$/.test(rawExt) ? rawExt : 'jpg';
        const dest = `${documentDirectory}pet_${pid}_${Date.now()}.${ext}`;
        await copyAsync({ from: uri, to: dest });
        await updatePet(pid, { icon_uri: dest });
        await refreshPets();
      } catch (e) {
        Alert.alert('画像の保存に失敗しました', String(e?.message ?? e));
      }
    },
    [refreshPets]
  );

  const padTop = Math.max(insets.top, 8);

  return (
    <View style={[styles.screen, { paddingTop: padTop }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.padded}>
          <Text style={styles.headline}>hunumumuDiary</Text>
        </View>

        {careGaps.length > 0 ? (
          <View style={[styles.padded, styles.gapWrap]}>
            <View style={styles.gapBanner}>
              <Text style={styles.gapTitle}>本日まだの記録があります</Text>
              {careGaps.map((g) => (
                <Text key={g.pet_id} style={styles.gapLine}>
                  {formatCareGapLine(g)}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.padded}>
          {pets.length > 0 ? (
            <PetHeader
              pets={pets}
              activePetId={activePetId}
              onSelectPet={goToPet}
              onRequestIcon={onRequestIcon}
            />
          ) : (
            <Text style={styles.emptyPets}>
              個体がありません。データタブで追加してください。
            </Text>
          )}
        </View>

        {pets.length > 1 ? (
          <Text style={[styles.swipeHint, styles.padded]}>
            左右にスワイプして個体を切り替えられます
          </Text>
        ) : null}

        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={onPagerMomentumEnd}
          nestedScrollEnabled
          style={styles.pager}
        >
          {pets.map((pet) => (
            <View key={pet.id} style={[styles.page, { width: winW }]}>
              <View style={styles.pageInner}>
                <PetObservationCard
                  petId={pet.id}
                  petName={pet.name}
                  onLogChanged={refreshCareGaps}
                />
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.padded}>
          <MaintenanceSection />
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
    paddingBottom: 24,
  },
  padded: {
    paddingHorizontal: H_PAD,
  },
  headline: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: FG,
    marginBottom: 12,
    fontFamily: 'serif',
    includeFontPadding: false,
  },
  gapWrap: {
    marginBottom: 10,
  },
  gapBanner: {
    backgroundColor: CARD,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  gapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: FG,
    marginBottom: 6,
  },
  gapLine: {
    fontSize: 13,
    color: FG,
    opacity: 0.85,
    lineHeight: 19,
  },
  emptyPets: {
    fontSize: 14,
    color: FG,
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 20,
  },
  swipeHint: {
    fontSize: 12,
    color: FG,
    opacity: 0.55,
    marginBottom: 10,
    marginTop: 2,
  },
  pager: {
    width: '100%',
  },
  page: {
    flexShrink: 0,
  },
  pageInner: {
    paddingHorizontal: H_PAD,
  },
});
