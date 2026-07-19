import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * 文字列を一時ファイルに書いて共有シートを開く。
 * @param {string} contents
 * @param {string} fileName
 * @param {string} mimeType
 */
export async function shareTextFile(contents, fileName, mimeType) {
  if (!cacheDirectory) {
    throw new Error('一時ディレクトリを利用できません');
  }
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('この端末では共有機能を利用できません');
  }
  const uri = `${cacheDirectory}${fileName}`;
  await writeAsStringAsync(uri, contents, { encoding: 'utf8' });
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: fileName,
    UTI: mimeType === 'application/json' ? 'public.json' : 'public.comma-separated-values-text',
  });
}
