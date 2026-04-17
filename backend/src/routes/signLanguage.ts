import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { openai } from "../config/llm";
import { config } from "../config/env";

const router = Router();

/**
 * Generate sign language animation HTML for a given topic/text.
 * The AI creates an interactive HTML/CSS/JS animation showing
 * hand gestures, finger positions, and sign language movements
 * with step-by-step narration.
 */
router.post("/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text, topic, language = "ISL" } = req.body;
    const content = text || topic;
    if (!content) return res.status(400).json({ error: "text or topic is required" });

    const signLanguageMap: Record<string, string> = {
      ISL: "Indian Sign Language (ISL)",
      ASL: "American Sign Language (ASL)",
      BSL: "British Sign Language (BSL)",
    };
    const slName = signLanguageMap[language] || "Indian Sign Language (ISL)";

    const resp = await openai.chat.completions.create({
      model: config.azure.deployment,
      messages: [
        {
          role: "system",
          content: `You are an expert in ${slName} and web animation. Generate a COMPLETE, SELF-CONTAINED HTML page that animates sign language gestures to explain the given concept.

Requirements:
1. Create animated SVG hands/figures showing each sign gesture step by step
2. Use CSS animations and JavaScript for smooth transitions between signs
3. Show the word/phrase being signed above each gesture
4. Include a timeline/progress bar at the bottom
5. Use a dark background (#1a1a2e) with white/yellow text for visibility
6. Each sign should display for 2-3 seconds with smooth transitions
7. Include a play/pause button and restart button
8. Show the English word + Sign description for each gesture
9. Make hands realistic using SVG paths (palm, fingers, wrist)
10. Add subtle motion trails for movement-based signs

The HTML must be COMPLETELY self-contained (inline CSS + JS, no external deps).
Return ONLY the HTML code, no markdown, no explanation.`,
        },
        {
          role: "user",
          content: `Create a sign language animation for: "${content}"

Break it down into individual signs/gestures. For each sign show:
- The word being signed
- Hand shape (using SVG)
- Movement direction (arrows/animation)
- Brief description of the sign

Make it educational and visually clear. The animation should auto-play and loop.`,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 4000,
    });

    const html = resp.choices[0].message.content || "";

    // Extract just the HTML if wrapped in markdown
    let cleanHtml = html;
    const htmlMatch = html.match(/```(?:html)?\s*([\s\S]*?)```/);
    if (htmlMatch) cleanHtml = htmlMatch[1];

    // Ensure it starts with proper HTML
    if (!cleanHtml.trim().startsWith("<!DOCTYPE") && !cleanHtml.trim().startsWith("<html") && !cleanHtml.trim().startsWith("<div")) {
      cleanHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#1a1a2e;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:white;"><div style="text-align:center;padding:40px;"><h2>Sign Language: ${content}</h2><p style="color:#888;">Animation could not be generated. Please try again.</p></div></body></html>`;
    }

    res.json({
      html: cleanHtml,
      topic: content,
      language: slName,
      signs: [], // Could parse signs from AI response
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Stream sign language explanation (SSE) — breaks down a sentence
 * into individual signs and streams them one by one.
 */
router.post("/explain-stream", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { text, topic, language = "ISL" } = req.body;
  const content = text || topic;
  if (!content) return res.status(400).json({ error: "text or topic is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    send({ phase: "analyzing", message: `Breaking down "${content}" into signs...` });

    const resp = await openai.chat.completions.create({
      model: config.azure.deployment,
      messages: [
        {
          role: "system",
          content: `You are an Indian Sign Language (ISL) expert. Break down the given text into individual sign language gestures.

Return JSON: {
  "signs": [
    {
      "word": "the word being signed",
      "gesture": "description of hand shape and movement",
      "handShape": "open palm / fist / pointing / etc",
      "movement": "up / down / circular / none",
      "position": "chest / forehead / side / etc",
      "emoji": "closest emoji representation"
    }
  ],
  "fullSentence": "the complete ISL gloss translation"
}`,
        },
        { role: "user", content: `Break down into ISL signs: "${content}"` },
      ],
      temperature: 0.7,
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
    });

    let parsed: any;
    try {
      parsed = JSON.parse(resp.choices[0].message.content || "{}");
    } catch {
      parsed = { signs: [], fullSentence: content };
    }

    const signs = parsed.signs || [];
    send({ phase: "ready", totalSigns: signs.length, fullSentence: parsed.fullSentence });

    // Send each sign one by one
    for (let i = 0; i < signs.length; i++) {
      send({
        phase: "sign",
        index: i,
        total: signs.length,
        ...signs[i],
      });
    }

    send({ phase: "complete", totalSigns: signs.length });
  } catch (err: any) {
    send({ phase: "error", message: err.message });
  }

  res.end();
});

export default router;
