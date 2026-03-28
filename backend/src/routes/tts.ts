import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { generateSpeech, getVoiceInfo, transcribeAudio } from "../services/tts";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

/**
 * POST /api/tts
 * Generate speech from text using Coqui XTTS v2 (primary) or Azure TTS (fallback).
 *
 * Body: { text: string, language?: string, speaker?: string, speed?: number }
 * Returns: audio file (WAV or MP3)
 */
router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text, language, speaker, speed } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const result = await generateSpeech({ text, language, speaker, speed });

    if (result.engine === "none") {
      return res.status(503).json({ error: "TTS unavailable. Use browser speech synthesis." });
    }

    res.set({
      "Content-Type": result.contentType,
      "Content-Length": result.audio.length.toString(),
      "X-TTS-Engine": result.engine,
    });
    res.send(result.audio);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tts/voices
 * List available voices and languages.
 */
router.get("/voices", async (_req, res: Response) => {
  const info = await getVoiceInfo();
  res.json(info);
});

/**
 * GET /api/tts/health
 * Check TTS service status.
 */
router.get("/health", async (_req, res: Response) => {
  const info = await getVoiceInfo();
  res.json({
    coqui_available: !!info.speakers,
    engine: info.speakers ? "coqui-xtts-v2" : "browser-fallback",
    ...info,
  });
});

/**
 * POST /api/tts/stt
 * Speech-to-text using Faster Whisper.
 * Accepts multipart audio file.
 */
router.post("/stt", authMiddleware, upload.single("audio"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file" });
    const language = req.body.language || undefined;
    const result = await transcribeAudio(req.file.buffer, req.file.originalname, language);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
