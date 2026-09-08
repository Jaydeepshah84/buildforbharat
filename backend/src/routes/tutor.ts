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
  const { question, classLevel = "10", language = "en", style = "detailed", regenerate = false } = req.body;

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

  // Emit the title the instant it's parsed (before any steps finish).
  (request as any)._onTitle = (title: string) => {
    send("meta", { type: "meta", title });
  };

  // Emit each step as soon as it's parsed from the Azure stream so the frontend
  // can start showing/playing step 0 while later steps are still generating.
  (request as any)._onStep = (stepIndex: number, step: any) => {
    send("step", { type: "step", stepIndex, step });
  };

  try {
    send("status", { phase: 1, message: "Generating quick explanation..." });

    // Phase 1 and Phase 2 are independent — kick both off immediately and
    // emit each as it lands so the user sees Phase 1 within ~3s instead of
    // waiting for the (much slower) Phase 2 call to start.
    const phase1Promise = generatePhase1(request)
      .then((phase1) => {
        send("phase1", phase1);
        send("status", { phase: 2, message: "Creating full animation..." });
        return phase1;
      });

    const phase2Promise = runTutorPipeline(request, { bypassCache: !!regenerate })
      .then((phase2) => {
        send("phase2", phase2);
        return phase2;
      });

    const [, phase2] = await Promise.all([phase1Promise, phase2Promise]);
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
