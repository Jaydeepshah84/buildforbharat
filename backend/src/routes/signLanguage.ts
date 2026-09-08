import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { openai } from "../config/llm";
import { config } from "../config/env";
import { glossToSiGML, KNOWN_WORDS, countSigns, estimateSignMs, fallbackGloss, analyseGloss } from "../services/sigml";

const router = Router();

/**
 * Sign-language routes.
 *
 * In sign mode the 3D CWASA avatar is the lesson's only "voice": every narration sentence of
 * the animated lesson, and every answer to a student's question, comes through here:
 *
 *     text → short ISL gloss (LLM, cached) → SiGML (dictionary signs + digits + fingerspelling)
 *
 * The frontend feeds the SiGML to CWASA.playSiGMLText() and advances the animation when the
 * avatar finishes signing. The old step-by-step "sign breakdown" and the CSS-avatar HTML
 * generator were removed: the 3D avatar is the single signing surface.
 */

// Narration sentences repeat across replays and regenerations, so glosses are cached in memory.
const MAX_CACHE = 3000;
const glossCache = new Map<string, string>();
function remember(key: string, gloss: string) {
  if (glossCache.size >= MAX_CACHE) glossCache.delete(glossCache.keys().next().value as string);
  glossCache.set(key, gloss);
}

function glossPrompt(maxWords: number): string {
  return [
    "You convert one sentence of a teacher's narration into a short Indian Sign Language (ISL) GLOSS for a 3D signing avatar.",
    `Reply with ONLY 2-${maxWords} UPPERCASE English words separated by single spaces. No punctuation, no explanation.`,
    "Keep only the words that carry the meaning: things, actions, numbers, key qualities. Drop articles, auxiliaries, filler and teacher chatter (\"let's\", \"now watch\", \"see how\", \"great\").",
    "Use base forms (RUN not RUNNING, CHILD not CHILDREN). Keep numbers as digits and use + - = × ÷ for operations.",
    "Order: topic first, then comment (e.g. PLANT SUNLIGHT USE FOOD MAKE).",
    "The sentence may be in Hindi, Gujarati or Spanish: still answer with English gloss words.",
    "Prefer these words whenever the meaning fits, because the avatar has real signs for them (everything else is fingerspelled, which is slow): " +
      KNOWN_WORDS.join(", ") + ".",
  ].join("\n");
}

function cleanGloss(raw: string, maxWords: number): string {
  return (raw || "")
    .replace(/[^A-Za-z0-9+=×÷%\-\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ")
    .toUpperCase();
}

type GlossSource = "cache" | "llm" | "fallback";

async function textToGloss(text: string, maxWords: number): Promise<{ gloss: string; source: GlossSource }> {
  const key = `${maxWords}|${text}`;
  const hit = glossCache.get(key);
  if (hit) return { gloss: hit, source: "cache" };

  try {
    const resp = await Promise.race([
      openai.chat.completions.create({
        model: config.azure.deployment,
        messages: [
          { role: "system", content: glossPrompt(maxWords) },
          { role: "user", content: text },
        ],
        temperature: 0.2,
        max_completion_tokens: 80,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("gloss timeout")), 20000)),
    ]);
    const gloss = cleanGloss(resp.choices?.[0]?.message?.content || "", maxWords);
    if (gloss) {
      remember(key, gloss);
      return { gloss, source: "llm" };
    }
  } catch (err: any) {
    console.warn("[sign] gloss LLM failed, using keyword fallback:", err?.message || err);
  }
  // Fallback results are deliberately NOT cached so a transient LLM failure doesn't stick.
  const gloss = fallbackGloss(text, maxWords) || cleanGloss(text, maxWords);
  return { gloss, source: "fallback" };
}

function signPayload(text: string, gloss: string) {
  const sigml = glossToSiGML(gloss);
  const signCount = countSigns(sigml);
  const { known, spelled } = analyseGloss(gloss);
  return { text, gloss, sigml, signCount, estimatedMs: estimateSignMs(signCount), known, spelled };
}

function clampWords(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.max(2, Math.min(14, Math.round(n))) : 8;
}

/**
 * POST /api/sign-language/sigml   { text, maxWords?, raw? }
 * One sentence → { gloss, sigml, signCount, estimatedMs, known, spelled, source }.
 * raw=true skips the LLM and signs the given words literally (useful for testing signs).
 */
router.post("/sigml", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text, topic, maxWords, raw } = req.body || {};
    const content = String(text || topic || "").trim();
    if (!content) return res.status(400).json({ error: "text or topic required" });

    const { gloss, source } = raw
      ? { gloss: cleanGloss(content, 60), source: "fallback" as GlossSource }
      : await textToGloss(content, clampWords(maxWords));

    res.json({ ...signPayload(content, gloss), source });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sign-language/sigml/batch   { texts: string[], maxWords? }
 * Up to 20 sentences at once (used to pre-sign a whole answer).
 */
router.post("/sigml/batch", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const texts: string[] = Array.isArray(req.body?.texts)
      ? req.body.texts.map((t: unknown) => String(t ?? "").trim()).filter(Boolean).slice(0, 20)
      : [];
    if (!texts.length) return res.status(400).json({ error: "texts[] required" });
    const max = clampWords(req.body?.maxWords);
    const items = await Promise.all(
      texts.map(async (t) => {
        const { gloss, source } = await textToGloss(t, max);
        return { ...signPayload(t, gloss), source };
      }),
    );
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/sign-language/dictionary — words the avatar signs from the dictionary (rest are fingerspelled). */
router.get("/dictionary", authMiddleware, (_req: AuthRequest, res: Response) => {
  res.json({ words: KNOWN_WORDS, count: KNOWN_WORDS.length });
});

export default router;
