import * as FileSystem from 'expo-file-system/legacy';
import { getTtsUrl, getTtsToken } from './api';

const AUDIO_DIR = `${FileSystem.documentDirectory}audio/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
}

export function getAudioPath(topicId: string): string {
  return `${AUDIO_DIR}${topicId}.mp3`;
}

export async function hasLocalAudio(topicId: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(getAudioPath(topicId));
  return info.exists;
}

export async function downloadTopicAudio(
  topicId: string, text: string, language: string = 'en',
): Promise<boolean> {
  try {
    await ensureDir();
    if (await hasLocalAudio(topicId)) return true;

    const token = await getTtsToken();
    // Write JSON body using POST via downloadAsync (send body as param)
    const result = await FileSystem.downloadAsync(
      getTtsUrl(),
      getAudioPath(topicId),
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      } as any
    );
    return result.status === 200;
  } catch { return false; }
}

export async function deleteTopicAudio(topicId: string): Promise<void> {
  try { await FileSystem.deleteAsync(getAudioPath(topicId), { idempotent: true }); } catch {}
}

export async function deleteModuleAudio(topicIds: string[]): Promise<void> {
  for (const id of topicIds) await deleteTopicAudio(id);
}
