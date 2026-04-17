import { File, Directory, Paths } from 'expo-file-system/next';
import { getTtsUrl, getTtsToken } from './api';

// Audio stored in documents/audio/ directory
function getAudioDir(): Directory {
  return new Directory(Paths.document, 'audio');
}

function getAudioFile(topicId: string): File {
  return new File(getAudioDir(), `${topicId}.mp3`);
}

// Get the URI for playback
export function getAudioPath(topicId: string): string {
  return getAudioFile(topicId).uri;
}

// Check if audio exists locally
export async function hasLocalAudio(topicId: string): Promise<boolean> {
  try {
    return getAudioFile(topicId).exists;
  } catch {
    return false;
  }
}

// Generate and download TTS audio for a topic
export async function downloadTopicAudio(
  topicId: string,
  text: string,
  language: string = 'en',
): Promise<boolean> {
  try {
    // Skip if already downloaded
    if (await hasLocalAudio(topicId)) return true;

    // Ensure directory exists
    const dir = getAudioDir();
    if (!dir.exists) {
      dir.create();
    }

    // Limit text length
    const truncated = text.slice(0, 2000);
    const token = await getTtsToken();
    const ttsUrl = getTtsUrl();

    // Use fetch to POST and get audio binary
    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text: truncated, language }),
    });

    if (!response.ok) {
      console.log('[Audio] TTS returned', response.status);
      return false;
    }

    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise<boolean>((resolve) => {
      reader.onload = () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          if (base64) {
            const file = getAudioFile(topicId);
            file.create();
            file.write(base64, { encoding: 'base64' });
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (e) {
          console.error('[Audio] Write error:', e);
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('[Audio] Download failed:', e);
    return false;
  }
}

// Delete audio for a topic
export async function deleteTopicAudio(topicId: string): Promise<void> {
  try {
    const file = getAudioFile(topicId);
    if (file.exists) file.delete();
  } catch {}
}

// Delete all audio for a module's topics
export async function deleteModuleAudio(topicIds: string[]): Promise<void> {
  for (const id of topicIds) {
    await deleteTopicAudio(id);
  }
}
