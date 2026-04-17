import * as FileSystem from 'expo-file-system/legacy';
import { getApiBaseUrl, getTtsToken } from './api';

const VIDEO_DIR = `${FileSystem.documentDirectory}videos/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(VIDEO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true });
}

export function getVideoPath(topicId: string): string {
  return `${VIDEO_DIR}${topicId}.mp4`;
}

export async function hasLocalVideo(topicId: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(getVideoPath(topicId));
  return info.exists;
}

/**
 * Generate a video on server by POSTing to /api/video/generate/:topicId,
 * then download the resulting mp4 via GET /api/video/:topicId
 */
export async function downloadTopicVideo(
  topicId: string,
  language: string = 'en',
  onProgress?: (msg: string) => void,
): Promise<boolean> {
  try {
    await ensureDir();
    if (await hasLocalVideo(topicId)) return true;

    const token = await getTtsToken();
    const baseUrl = getApiBaseUrl();

    // Step 1: Trigger video generation (POST with JSON body)
    onProgress?.('Generating video on server...');
    const genResp = await fetch(`${baseUrl}/api/video/generate/${topicId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ language }),
    });

    if (!genResp.ok) {
      console.log('[Video] Generation failed:', genResp.status);
      return false;
    }

    // The backend returns the video bytes directly in POST response
    // We need to stream it to file. Use the Blob approach but wrap safely.
    onProgress?.('Saving video...');

    // Alternative: use downloadAsync on GET /api/video/:topicId (video is already cached server-side)
    const downloadUrl = `${baseUrl}/api/video/${topicId}`;
    const result = await FileSystem.downloadAsync(downloadUrl, getVideoPath(topicId));

    if (result.status === 200) {
      const info = await FileSystem.getInfoAsync(getVideoPath(topicId));
      if (info.exists && 'size' in info && info.size && info.size > 1000) {
        onProgress?.('Video saved!');
        return true;
      }
    }

    await FileSystem.deleteAsync(getVideoPath(topicId), { idempotent: true });
    return false;
  } catch (e: any) {
    console.error('[Video]', e.message);
    await FileSystem.deleteAsync(getVideoPath(topicId), { idempotent: true }).catch(() => {});
    return false;
  }
}

export async function deleteTopicVideo(topicId: string): Promise<void> {
  try { await FileSystem.deleteAsync(getVideoPath(topicId), { idempotent: true }); } catch {}
}

export async function deleteModuleVideos(topicIds: string[]): Promise<void> {
  for (const id of topicIds) await deleteTopicVideo(id);
}
