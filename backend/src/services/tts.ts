/**
 * Coqui XTTS v2 TTS Client
 * Connects to the Python TTS microservice running on port 5001.
 * Falls back to Azure OpenAI TTS if Coqui is unavailable.
 */

import { openai } from "../config/llm";

const TTS_URL = process.env.TTS_URL || "http://localhost:5001";

interface TTSOptions {
  text: string;
  language?: string;
  speaker?: string;
  speed?: number;
}

// Check if Coqui TTS service is available
async function isCoquiAvailable(): Promise<boolean> {
  try {
    const resp = await fetch(`${TTS_URL}/health`, { signal: AbortSignal.timeout(2000) });
    const data = await resp.json() as { status?: string };
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Generate speech using Coqui XTTS v2 (primary) or Azure TTS (fallback).
 * Returns audio buffer (WAV from Coqui, MP3 from Azure).
 */
export async function generateSpeech(options: TTSOptions): Promise<{
  audio: Buffer;
  contentType: string;
  engine: "coqui-xtts-v2" | "azure-tts" | "none";
}> {
  const { text, language = "en", speaker, speed = 1.0 } = options;

  if (!text?.trim()) {
    return { audio: Buffer.alloc(0), contentType: "audio/wav", engine: "none" };
  }

  // Try Coqui XTTS v2 first
  if (await isCoquiAvailable()) {
    try {
      const resp = await fetch(`${TTS_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, speaker, speed }),
        signal: AbortSignal.timeout(30000),
      });

      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const ct = resp.headers.get("content-type") || "audio/mpeg";
        return {
          audio: Buffer.from(arrayBuf),
          contentType: ct,
          engine: "coqui-xtts-v2",
        };
      }
    } catch (err: any) {
      console.warn(`[TTS] Coqui failed: ${err.message}`);
    }
  }

  // Fallback: Azure OpenAI TTS
  try {
    const resp = await openai.audio.speech.create({
      model: process.env.AZURE_TTS_DEPLOYMENT || "tts-1",
      voice: "alloy",
      input: text,
    });

    const arrayBuf = await resp.arrayBuffer();
    console.log(`[TTS] Azure TTS fallback: ${text.length} chars`);
    return {
      audio: Buffer.from(arrayBuf),
      contentType: "audio/mpeg",
      engine: "azure-tts",
    };
  } catch (err: any) {
    console.warn(`[TTS] Azure TTS failed: ${err.message}`);
    return { audio: Buffer.alloc(0), contentType: "audio/wav", engine: "none" };
  }
}

/**
 * Stream speech sentence by sentence from Coqui XTTS v2.
 */
export async function streamSpeech(options: TTSOptions): Promise<Response | null> {
  if (!(await isCoquiAvailable())) return null;

  try {
    const resp = await fetch(`${TTS_URL}/tts/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
      signal: AbortSignal.timeout(60000),
    });
    return resp.ok ? (resp as unknown as Response) : null;
  } catch {
    return null;
  }
}

/**
 * Get available voices and languages.
 */
export async function getVoiceInfo(): Promise<any> {
  try {
    const resp = await fetch(`${TTS_URL}/voices`, { signal: AbortSignal.timeout(3000) });
    return await resp.json();
  } catch {
    return { speakers: ["default"], languages: ["en"], coqui_available: false };
  }
}

/**
 * Speech-to-text using Faster Whisper via the Python service.
 */
export async function transcribeAudio(audioBuffer: Buffer, filename = "audio.webm", language?: string): Promise<{
  text: string;
  language: string;
  segments: Array<{ start: number; end: number; text: string }>;
}> {
  if (await isCoquiAvailable()) {
    try {
      const formData = new FormData();
      formData.append("audio", new Blob([audioBuffer]), filename);

      const url = language ? `${TTS_URL}/stt?language=${language}` : `${TTS_URL}/stt`;
      const resp = await fetch(url, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      if (resp.ok) {
        const data = await resp.json() as { text?: string; language?: string; segments?: Array<{ start: number; end: number; text: string }> };
        console.log(`[STT] Faster Whisper: "${data.text?.substring(0, 50)}..." (${data.language})`);
        return { text: data.text || "", language: data.language || "en", segments: data.segments || [] };
      }
    } catch (err: any) {
      console.warn(`[STT] Faster Whisper failed: ${err.message}`);
    }
  }

  return { text: "", language: "en", segments: [] };
}
