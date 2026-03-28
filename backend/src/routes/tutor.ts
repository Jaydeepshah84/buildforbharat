import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { runTutorPipeline, generatePhase1 } from "../pipelines";
import type { TutorRequest, ClassLevel, Language, ExplanationStyle } from "../types/tutor";

const router = Router();

// Map frontend class levels to pipeline levels
function mapClassLevel(level: string): ClassLevel {
  const n = parseInt(level);
  if (n <= 5) return "primary";
  if (n <= 8) return "middle";
  if (n <= 12) return "high_school";
  return "college";
}

/**
 * POST /api/tutor/generate
 * Two-phase animation generation:
 * Phase 1: Quick text explanation (sent immediately)
 * Phase 2: Full HTML animation (sent when ready)
 *
 * Body: { question, classLevel?, language?, style? }
 * Returns SSE stream with phase1 and phase2 events
 */
router.post("/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { question, classLevel = "10", language = "en", style = "detailed" } = req.body;

  if (!question) return res.status(400).json({ error: "Question is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const request: TutorRequest = {
    question,
    class_level: mapClassLevel(classLevel),
    language: language as Language,
    style: (style as ExplanationStyle) || "detailed",
  };

  try {
    // Phase 1: Quick text + loading animation (fast, ~3s)
    send("status", { phase: 1, message: "Generating quick explanation..." });
    const phase1 = await generatePhase1(request);
    send("phase1", phase1);

    // Phase 2: Full HTML animation (slower, ~15-30s)
    send("status", { phase: 2, message: "Creating full animation..." });
    const phase2 = await runTutorPipeline(request);
    send("phase2", phase2);

    send("complete", { title: phase2.title });
  } catch (err: any) {
    send("error", { message: err.message });
  }
  res.end();
});

/**
 * POST /api/tutor/quick
 * Phase 1 only — instant text explanation
 */
router.post("/quick", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { question, classLevel = "10", language = "en" } = req.body;
    const request: TutorRequest = {
      question,
      class_level: mapClassLevel(classLevel),
      language: language as Language,
      style: "short",
    };
    const result = await generatePhase1(request);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
