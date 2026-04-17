import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { openai } from "../config/llm";
import { config } from "../config/env";
import { generateSpeech } from "../services/tts";
import * as db from "../services/db";
import { supabase } from "../config/supabase";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";

ffmpeg.setFfmpegPath(ffmpegPath.path);

const router = Router();

const VIDEOS_DIR = path.join(os.tmpdir(), "learnify-videos");
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });

/**
 * POST /api/video/generate/:topicId
 * Generates a full MP4 video for a topic with:
 * - AI-generated content slides (text on colored backgrounds)
 * - Google TTS voice narration
 * Returns the MP4 file
 */
router.post("/generate/:topicId", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { topicId } = req.params;
  const { language = "en" } = req.body;

  try {
    // Check if video already exists
    const videoPath = path.join(VIDEOS_DIR, `${topicId}.mp4`);
    if (fs.existsSync(videoPath)) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="${topicId}.mp4"`);
      return fs.createReadStream(videoPath).pipe(res);
    }

    // Get topic info
    const topic = await db.getById("topics", topicId);
    if (!topic) return res.status(404).json({ error: "Topic not found" });

    const topicTitle = topic.title || "Topic";

    // Step 1: Generate explanation content via AI
    const contentResp = await openai.chat.completions.create({
      model: config.azure.deployment,
      messages: [
        {
          role: "system",
          content: `You are an expert teacher creating video lesson scripts. Return valid JSON only.`,
        },
        {
          role: "user",
          content: `Create a video lesson script for "${topicTitle}".

Return JSON: {
  "slides": [
    {
      "title": "slide heading",
      "content": "2-3 sentences explanation shown on screen",
      "narration": "What the teacher says (3-4 sentences, conversational)",
      "bg_color": "#hex color"
    }
  ]
}

Create 5-7 slides. Use bright educational colors. Narration should be friendly and clear.${language !== "en" ? ` All text in ${language}.` : ""}`,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 2000,
      response_format: { type: "json_object" },
    });

    let script: any;
    try {
      script = JSON.parse(contentResp.choices[0].message.content || "{}");
    } catch {
      script = { slides: [{ title: topicTitle, content: "Learn about " + topicTitle, narration: "Let us learn about " + topicTitle, bg_color: "#4F46E5" }] };
    }

    const slides = script.slides || [];
    if (slides.length === 0) {
      return res.status(500).json({ error: "Failed to generate content" });
    }

    // Step 2: Generate TTS audio for each slide
    const tmpDir = path.join(os.tmpdir(), `learnify-vid-${topicId}`);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const slideAudioPaths: string[] = [];
    const slideDurations: number[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const audioPath = path.join(tmpDir, `slide_${i}.mp3`);

      const { audio, engine } = await generateSpeech({
        text: slide.narration || slide.content || slide.title,
        language,
      });

      if (engine !== "none" && audio.length > 0) {
        fs.writeFileSync(audioPath, audio);
        slideAudioPaths.push(audioPath);

        // Estimate duration from audio size (mp3 ~16kbps for speech)
        const durationSec = Math.max(3, Math.ceil(audio.length / 2000));
        slideDurations.push(durationSec);
      } else {
        // No audio — use 5 second slide
        slideDurations.push(5);
        slideAudioPaths.push("");
      }
    }

    // Step 3: Create slide images using ffmpeg (text on colored background)
    // Generate a concat file for ffmpeg
    const slideVideoPaths: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const duration = slideDurations[i];
      const slideVideoPath = path.join(tmpDir, `slide_${i}.mp4`);
      const audioPath = slideAudioPaths[i];
      const bgColor = (slide.bg_color || "#4F46E5").replace("#", "");

      // Escape text for ffmpeg drawtext
      const title = (slide.title || "").replace(/'/g, "'\\''").replace(/:/g, "\\:").slice(0, 60);
      const content = (slide.content || "").replace(/'/g, "'\\''").replace(/:/g, "\\:").slice(0, 200);

      await new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg()
          .input(`color=c=0x${bgColor}:s=720x480:d=${duration}`)
          .inputFormat("lavfi")
          .outputOptions(["-pix_fmt", "yuv420p", "-r", "24"]);

        if (audioPath && fs.existsSync(audioPath)) {
          cmd.input(audioPath);
          cmd.outputOptions(["-c:a", "aac", "-b:a", "128k", "-shortest"]);
        } else {
          cmd.noAudio();
        }

        cmd
          .output(slideVideoPath)
          .on("end", () => {
            slideVideoPaths.push(slideVideoPath);
            resolve();
          })
          .on("error", (err: any) => {
            console.error(`[Video] Slide ${i} failed:`, err.message);
            reject(err);
          })
          .run();
      });
    }

    // Step 4: Concatenate all slide videos into one
    const concatFile = path.join(tmpDir, "concat.txt");
    const concatContent = slideVideoPaths.map((p) => `file '${p}'`).join("\n");
    fs.writeFileSync(concatFile, concatContent);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .output(videoPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Cleanup temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}

    console.log(`[Video] Generated ${videoPath} (${slides.length} slides)`);

    // Return video
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${topicId}.mp4"`);
    fs.createReadStream(videoPath).pipe(res);
  } catch (err: any) {
    console.error("[Video] Error:", err.message);
    res.status(500).json({ error: err.message || "Video generation failed" });
  }
});

/**
 * GET /api/video/:topicId
 * Stream/download an already generated video
 */
router.get("/:topicId", async (req, res: Response) => {
  const videoPath = path.join(VIDEOS_DIR, `${req.params.topicId}.mp4`);
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: "Video not found. Generate it first." });
  }

  const stat = fs.statSync(videoPath);
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Length", stat.size);
  fs.createReadStream(videoPath).pipe(res);
});

export default router;
