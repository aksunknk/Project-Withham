import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const R = 22;

/**
 * @param {{
 *   pets: Array<{ id: string, name: string, icon_uri?: string|null }>,
 *   activePetId: string,
 *   onSelectPet: (id: string) => void,
 *   onRequestIcon: (id: string) => void,
 * }} props
 */
export function PetHeader({
  pets,
  activePetId,
  onSelectPet,
  onRequestIcon,
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.segment}
    >
      {pets.map((pet) => {
        const on = activePetId === pet.id;
        const initial = (pet.name || '?').slice(0, 1);
        return (
          <View key={pet.id} style={[styles.segHalf, on && styles.segHalfOn]}>
            <TouchableOpacity
              style={styles.roundIconBtn}
              onPress={() => onRequestIcon(pet.id)}
              activeOpacity={0.85}
              accessibilityLabel={`${pet.name}のアイコンを変更`}
            >
              {pet.icon_uri ? (
                <Image source={{ uri: pet.icon_uri }} style={styles.iconImg} />
              ) : (
                <View style={styles.iconPlaceholder}>
                  <Text style={styles.iconPhText}>{initial}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.labelArea}
              onPress={() => onSelectPet(pet.id)}
              activeOpacity={0.88}
            >
              <Text style={[styles.segLabel, on && styles.segLabelOn]}>
                {pet.name}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
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
    minWidth: '100%',
  },
  segHalf: {
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
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
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingRight: 4,
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
