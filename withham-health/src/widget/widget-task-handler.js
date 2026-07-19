import React from 'react';
import { loadWidgetSnapshot } from './snapshot';
import { WithhamStatusWidget } from './WithhamStatusWidget';

/**
 * Android ランチャーからのウィジェット更新要求を処理する。
 * @type {import('react-native-android-widget').WidgetTaskHandlerProps extends never ? any : Function}
 */
export async function widgetTaskHandler(props) {
  const snapshot = await loadWidgetSnapshot();
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK':
      props.renderWidget(
        <WithhamStatusWidget snapshot={snapshot} />
      );
      break;
    default:
      break;
  }
}
