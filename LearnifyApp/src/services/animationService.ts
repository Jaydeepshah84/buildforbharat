import { File, Directory, Paths } from 'expo-file-system/next';
import { getTtsUrl, getTtsToken, getApiBaseUrl } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AnimationScene {
  scene_number: number;
  title: string;
  narration: string;
  on_screen_text: string;
  background: string;
  duration: number;
  animationData: {
    svgElements: any[];
    arrows: any[];
    viewBox: string;
    background: string;
  };
}

export interface TopicAnimation {
  topicId: string;
  topic: string;
  scenes: AnimationScene[];
}

// Storage directory
function getAnimDir(): Directory {
  return new Directory(Paths.document, 'animations');
}

function getAnimFile(topicId: string): File {
  return new File(getAnimDir(), `${topicId}.json`);
}

function getAudioDir(): Directory {
  return new Directory(Paths.document, 'audio');
}

function getSceneAudioFile(topicId: string, sceneIndex: number): File {
  return new File(getAudioDir(), `${topicId}_scene_${sceneIndex}.mp3`);
}

export function getSceneAudioPath(topicId: string, sceneIndex: number): string {
  return getSceneAudioFile(topicId, sceneIndex).uri;
}

// Check if animation data exists
export function hasLocalAnimation(topicId: string): boolean {
  try {
    return getAnimFile(topicId).exists;
  } catch { return false; }
}

// Check if scene audio exists
export function hasSceneAudio(topicId: string, sceneIndex: number): boolean {
  try {
    return getSceneAudioFile(topicId, sceneIndex).exists;
  } catch { return false; }
}

// Get saved animation data
export async function getLocalAnimation(topicId: string): Promise<TopicAnimation | null> {
  try {
    const file = getAnimFile(topicId);
    if (!file.exists) return null;
    const text = await file.text();
    return JSON.parse(text);
  } catch { return null; }
}

// Generate animation via backend API and save locally
export async function generateAndSaveAnimation(
  topicId: string,
  topicTitle: string,
  language: string = 'en',
  onProgress?: (msg: string, percent: number) => void,
): Promise<TopicAnimation | null> {
  try {
    // Ensure dirs exist
    const animDir = getAnimDir();
    if (!animDir.exists) animDir.create();
    const audioDir = getAudioDir();
    if (!audioDir.exists) audioDir.create();

    // Check if already exists
    if (hasLocalAnimation(topicId)) {
      return getLocalAnimation(topicId);
    }

    onProgress?.('Generating visual scenes...', 10);

    const token = await getTtsToken();
    const baseUrl = getApiBaseUrl();

    // Call animation generate API (SSE)
    const response = await fetch(`${baseUrl}/api/animation/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ topic: topicTitle, language, sceneCount: 5 }),
    });

    if (!response.ok) throw new Error(`Animation API failed: ${response.status}`);

    // Parse SSE response
    const text = await response.text();
    const scenes: AnimationScene[] = [];

    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.scene_number || data.animationData) {
            scenes.push(data);
          }
        } catch {}
      }
    }

    if (scenes.length === 0) throw new Error('No scenes generated');

    onProgress?.(`Generated ${scenes.length} scenes`, 40);

    // Save animation JSON
    const animation: TopicAnimation = { topicId, topic: topicTitle, scenes };
    const animFile = getAnimFile(topicId);
    if (animFile.exists) animFile.delete();
    animFile.create();
    animFile.write(JSON.stringify(animation));

    // Generate TTS audio for each scene narration
    const ttsUrl = getTtsUrl();
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (!scene.narration) continue;

      onProgress?.(`Generating voice ${i + 1}/${scenes.length}...`, 40 + Math.round((i / scenes.length) * 55));

      try {
        const audioResponse = await fetch(ttsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text: scene.narration, language }),
        });

        if (audioResponse.ok) {
          const blob = await audioResponse.blob();
          const reader = new FileReader();
          await new Promise<void>((resolve) => {
            reader.onload = () => {
              try {
                const base64 = (reader.result as string).split(',')[1];
                if (base64) {
                  const file = getSceneAudioFile(topicId, i);
                  if (file.exists) file.delete();
                  file.create();
                  file.write(base64, { encoding: 'base64' });
                }
              } catch {}
              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(blob);
          });
        }
      } catch {}
    }

    onProgress?.('Animation ready!', 100);
    return animation;
  } catch (e: any) {
    console.error('[Animation] Error:', e.message);
    return null;
  }
}

// Delete animation data + audio for a topic
export function deleteTopicAnimation(topicId: string): void {
  try {
    const animFile = getAnimFile(topicId);
    if (animFile.exists) animFile.delete();
    // Delete scene audio files
    for (let i = 0; i < 10; i++) {
      const audioFile = getSceneAudioFile(topicId, i);
      if (audioFile.exists) audioFile.delete();
    }
  } catch {}
}
