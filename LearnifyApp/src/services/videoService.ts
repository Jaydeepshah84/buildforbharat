import { File, Directory, Paths } from 'expo-file-system/next';
import { getApiBaseUrl, getTtsToken } from './api';

function getVideoDir(): Directory {
  const dir = new Directory(Paths.document, 'videos');
  if (!dir.exists) dir.create();
  return dir;
}

function getVideoFile(topicId: string): File {
  return new File(getVideoDir(), `${topicId}.mp4`);
}

export function getVideoPath(topicId: string): string {
  return getVideoFile(topicId).uri;
}

export function hasLocalVideo(topicId: string): boolean {
  try {
    return getVideoFile(topicId).exists;
  } catch { return false; }
}

/**
 * Generate + download MP4 video for a topic from backend.
 * Backend creates the video (AI content + TTS voice + ffmpeg render).
 */
export async function downloadTopicVideo(
  topicId: string,
  language: string = 'en',
  onProgress?: (msg: string) => void,
): Promise<boolean> {
  try {
    if (hasLocalVideo(topicId)) return true;

    onProgress?.('Generating video on server...');

    const token = await getTtsToken();
    const baseUrl = getApiBaseUrl();

    // POST /api/video/generate/:topicId — backend generates MP4 and returns it
    const response = await fetch(`${baseUrl}/api/video/generate/${topicId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ language }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.log('[Video] Server error:', err);
      return false;
    }

    onProgress?.('Downloading video...');

    // Read response as blob and save to file
    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise<boolean>((resolve) => {
      reader.onload = () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          if (base64 && base64.length > 100) {
            const file = getVideoFile(topicId);
            if (file.exists) file.delete();
            file.create();
            file.write(base64, { encoding: 'base64' });
            onProgress?.('Video saved!');
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (e) {
          console.error('[Video] Save error:', e);
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(blob);
    });
  } catch (e: any) {
    console.error('[Video] Download failed:', e.message);
    return false;
  }
}

export function deleteTopicVideo(topicId: string): void {
  try {
    const file = getVideoFile(topicId);
    if (file.exists) file.delete();
  } catch {}
}

export function deleteModuleVideos(topicIds: string[]): void {
  for (const id of topicIds) deleteTopicVideo(id);
}
