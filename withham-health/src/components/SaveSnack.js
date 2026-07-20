import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BAR = '#4A4A4A';
const ON_BAR = '#FDFBF7';

/**
 * 保存成功の短いフィードバック。モーダル Alert の代替。
 *
 * @param {{
 *   message: string | null | undefined,
 *   onUndo?: (() => void | Promise<void>) | null,
 *   onDismiss: () => void,
 *   durationMs?: number,
 * }} props
 */
export function SaveSnack({
  message,
  onUndo = null,
  onDismiss,
  durationMs = 3500,
}) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;

  return (
    <View
      style={styles.bar}
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
    >
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
      {onUndo ? (
        <TouchableOpacity
          onPress={() => {
            Promise.resolve(onUndo()).finally(onDismiss);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="アンドゥ"
        >
          <Text style={styles.undo}>アンドゥ</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BAR,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: ON_BAR,
    lineHeight: 20,
  },
  undo: {
    fontSize: 14,
    fontWeight: '700',
    color: ON_BAR,
    textDecorationLine: 'underline',
  },
});
