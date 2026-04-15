import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 22;

export function PetHeader({
  activePet,
  onSelectPet,
  iconFunuUri,
  iconMumuUri,
  onRequestIcon,
}) {
  return (
    <View style={styles.segment}>
      <View
        style={[
          styles.segHalf,
          activePet === 'funu' && styles.segHalfOn,
        ]}
      >
        <TouchableOpacity
          style={styles.roundIconBtn}
          onPress={() => onRequestIcon('funu')}
          activeOpacity={0.85}
          accessibilityLabel="ふぬのアイコンを変更"
        >
          {iconFunuUri ? (
            <Image source={{ uri: iconFunuUri }} style={styles.iconImg} />
          ) : (
            <View style={styles.iconPlaceholder}>
              <Text style={styles.iconPhText}>ふ</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.labelArea}
          onPress={() => onSelectPet('funu')}
          activeOpacity={0.88}
        >
          <Text
            style={[
              styles.segLabel,
              activePet === 'funu' && styles.segLabelOn,
            ]}
          >
            ふぬ
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.segHalf,
          activePet === 'mumu' && styles.segHalfOn,
        ]}
      >
        <TouchableOpacity
          style={styles.roundIconBtn}
          onPress={() => onRequestIcon('mumu')}
          activeOpacity={0.85}
          accessibilityLabel="むむのアイコンを変更"
        >
          {iconMumuUri ? (
            <Image source={{ uri: iconMumuUri }} style={styles.iconImg} />
          ) : (
            <View style={styles.iconPlaceholder}>
              <Text style={styles.iconPhText}>む</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.labelArea}
          onPress={() => onSelectPet('mumu')}
          activeOpacity={0.88}
        >
          <Text
            style={[
              styles.segLabel,
              activePet === 'mumu' && styles.segLabelOn,
            ]}
          >
            むむ
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: R,
    padding: 6,
    marginBottom: 18,
    gap: 6,
  },
  segHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 8,
  },
  segHalfOn: {
    backgroundColor: BG,
  },
  roundIconBtn: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  iconImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8DFD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPhText: {
    fontSize: 18,
    fontWeight: '700',
    color: FG,
    opacity: 0.55,
  },
  labelArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  segLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: FG,
    opacity: 0.5,
  },
  segLabelOn: {
    opacity: 1,
  },
});
