import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { WithhamHomeScreen } from './src/components/WithhamHomeScreen';
import { initDB } from './src/database/db';

SplashScreen.preventAutoHideAsync().catch(() => {});

function rejectAfter(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [retryTick, setRetryTick] = useState(0);

  useLayoutEffect(() => {
    SplashScreen.hideAsync().catch((e) => {
      console.warn('[SplashScreen.hideAsync]', e);
    });
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await Promise.race([
          initDB(),
          rejectAfter(
            15000,
            'DB 初期化がタイムアウトしました（SQLite が応答しません）。アプリを再起動するか、Expo Go を最新に更新してください。'
          ),
        ]);
        if (active) setDbError(null);
      } catch (e) {
        console.error('[initDB]', e);
        if (active) setDbError(String(e?.message ?? e));
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [retryTick]);

  const onRetry = useCallback(() => {
    setReady(false);
    setDbError(null);
    setRetryTick((n) => n + 1);
  }, []);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#4A4A4A" />
        <Text style={styles.hint}>データベースを準備しています…</Text>
        <Text style={styles.subHint}>15 秒以上かかる場合はタイムアウトします</Text>
      </View>
    );
  }

  if (dbError) {
    return (
      <View style={styles.boot}>
        <Text style={styles.errTitle}>DB 初期化に失敗しました</Text>
        <Text style={styles.errBody}>{dbError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
          <Text style={styles.retryText}>再試行</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <WithhamHomeScreen />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDFBF7',
    paddingHorizontal: 24,
  },
  hint: {
    marginTop: 16,
    fontSize: 15,
    color: '#4A4A4A',
    textAlign: 'center',
  },
  subHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#4A4A4A',
    opacity: 0.7,
    textAlign: 'center',
  },
  errTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 8,
    textAlign: 'center',
  },
  errBody: {
    fontSize: 13,
    color: '#4A4A4A',
    opacity: 0.85,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#F5EFE6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A4A4A',
  },
});
