import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

if (Platform.OS === 'android') {
  // ホーム画面ウィジェット用（Expo Go では no-op / 開発ビルドで有効）
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./src/widget/widget-task-handler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (e) {
    console.warn('[widget] register skipped', e);
  }
}

registerRootComponent(App);
