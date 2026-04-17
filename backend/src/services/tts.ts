/**
 * TTS Service using Google Translate TTS (free, always available)
 * Supports multiple languages including Hindi, Gujarati, etc.
 */

import * as googleTTS from "google-tts-api";

const LANG_MAP: Record<string, string> = {
  en: "en", hi: "hi", gu: "gu", es: "es", ta: "ta",
  te: "te", bn: "bn", mr: "mr", fr: "fr", de: "de",
};

interface TTSOptions {
  text: string;
  language?: string;
  speaker?: string;
  speed?: number;
}

export async function generateSpeech(options: TTSOptions): Promise<{
  audio: Buffer;
  contentType: string;
  engine: "google-tts" | "none";
}> {
  const { text, language = "en", speed = 1.0 } = options;

  if (!text?.trim()) {
    return { audio: Buffer.alloc(0), contentType: "audio/mpeg", engine: "none" };
  }

  try {
    const lang = LANG_MAP[language] || "en";
    const slow = speed < 0.8;

    // Google TTS splits long text into chunks automatically
    const audioUrls = googleTTS.getAllAudioUrls(text.slice(0, 2000), { lang, slow });

    // Download and concatenate all audio chunks
    const chunks: Buffer[] = [];
    for (const item of audioUrls) {
      const resp = await fetch(item.url);
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        chunks.push(Buffer.from(buf));
      }
    }

    if (chunks.length === 0) {
      return { audio: Buffer.alloc(0), contentType: "audio/mpeg", engine: "none" };
    }

    const audioBuffer = Buffer.concat(chunks);
    console.log(`[TTS] Google TTS: ${text.length} chars, lang=${lang}, size=${audioBuffer.length}, chunks=${chunks.length}`);

    return {
      audio: audioBuffer,
      contentType: "audio/mpeg",
      engine: "google-tts",
    };
  } catch (err: any) {
    console.error(`[TTS] Google TTS failed: ${err.message}`);
    return { audio: Buffer.alloc(0), contentType: "audio/mpeg", engine: "none" };
  }
}

export async function getVoiceInfo(): Promise<any> {
  return {
    engine: "google-tts",
    languages: Object.keys(LANG_MAP),
  };
}

export async function transcribeAudio(audioBuffer: Buffer, filename = "audio.webm", language?: string): Promise<{
  text: string; language: string;
  segments: Array<{ start: number; end: number; text: string }>;
}> {
  return { text: "", language: language || "en", segments: [] };
}
