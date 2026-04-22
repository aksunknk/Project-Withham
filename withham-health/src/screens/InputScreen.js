import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { copyAsync, documentDirectory } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { getSetting, SETTINGS_KEYS, setSetting } from '../database/db';
import { MaintenanceSection } from '../components/MaintenanceSection';
import { PetHeader } from '../components/PetHeader';
import { PetObservationCard } from '../components/PetObservationCard';

const BG = '#FDFBF7';
const FG = '#4A4A4A';
const H_PAD = 20;

export function InputScreen() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const pagerRef = useRef(null);
  const petRef = useRef('funu');
  const [pet, setPet] = useState('funu');
  const [iconFunu, setIconFunu] = useState(null);
  const [iconMumu, setIconMumu] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, b] = await Promise.all([
          getSetting(SETTINGS_KEYS.ICON_FUNU),
          getSetting(SETTINGS_KEYS.ICON_MUMU),
        ]);
        if (cancelled) return;
        setIconFunu(a);
        setIconMumu(b);
      } catch (e) {
        console.error('[icons load]', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    petRef.current = pet;
  }, [pet]);

  const goToPet = useCallback(
    (p) => {
      const index = p === 'funu' ? 0 : 1;
      setPet(p);
      requestAnimationFrame(() => {
        pagerRef.current?.scrollTo({
          x: index * winW,
          animated: true,
        });
      });
    },
    [winW]
  );

  useEffect(() => {
    const index = petRef.current === 'funu' ? 0 : 1;
    pagerRef.current?.scrollTo({
      x: index * winW,
      animated: false,
    });
  }, [winW]);

  const onPagerMomentumEnd = useCallback(
    (e) => {
      const x = e.nativeEvent.contentOffset.x;
      const page = Math.round(x / winW);
      const next = page === 0 ? 'funu' : 'mumu';
      setPet(next);
    },
    [winW]
  );

  const onRequestIcon = useCallback(async (pid) => {
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
      const key =
        pid === 'funu' ? SETTINGS_KEYS.ICON_FUNU : SETTINGS_KEYS.ICON_MUMU;
      await setSetting(key, dest);
      if (pid === 'funu') setIconFunu(dest);
      else setIconMumu(dest);
    } catch (e) {
      Alert.alert('画像の保存に失敗しました', String(e?.message ?? e));
    }
  }, []);

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

        <View style={styles.padded}>
          <PetHeader
            activePet={pet}
            onSelectPet={goToPet}
            iconFunuUri={iconFunu}
            iconMumuUri={iconMumu}
            onRequestIcon={onRequestIcon}
          />
        </View>

        <Text style={[styles.swipeHint, styles.padded]}>
          左右にスワイプして個体を切り替えられます
        </Text>

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
          <View style={[styles.page, { width: winW }]}>
            <View style={styles.pageInner}>
              <PetObservationCard petId="funu" />
            </View>
          </View>
          <View style={[styles.page, { width: winW }]}>
            <View style={styles.pageInner}>
              <PetObservationCard petId="mumu" />
            </View>
          </View>
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
