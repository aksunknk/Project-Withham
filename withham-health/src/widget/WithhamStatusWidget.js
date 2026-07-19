import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

/**
 * @param {{ snapshot?: {
 *   title: string,
 *   subtitle: string,
 *   lines: string[],
 * } | null }} props
 */
export function WithhamStatusWidget({ snapshot }) {
  const title = snapshot?.title ?? 'hunumumuDiary';
  const subtitle = snapshot?.subtitle ?? 'アプリを開いて記録を同期してください';
  const lines = snapshot?.lines?.length
    ? snapshot.lines
    : ['データ未取得'];

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#FDFBF7',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text={title}
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: '#4A4A4A',
          marginBottom: 4,
        }}
      />
      <TextWidget
        text={subtitle}
        style={{
          fontSize: 12,
          color: '#4A4A4A',
          opacity: 0.75,
          marginBottom: 8,
        }}
      />
      {lines.slice(0, 4).map((line, idx) => (
        <TextWidget
          key={`${idx}-${line}`}
          text={line}
          style={{
            fontSize: 12,
            color: '#4A4A4A',
            marginBottom: 2,
          }}
        />
      ))}
    </FlexWidget>
  );
}
