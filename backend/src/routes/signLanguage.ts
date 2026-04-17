import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { openai } from "../config/llm";
import { config } from "../config/env";

const router = Router();

/**
 * Generate sign language animation keyframes for a phrase.
 * AI returns exact arm, hand, finger positions as keyframe sequences.
 */
router.post("/animate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { phrase } = req.body;
    if (!phrase) return res.status(400).json({ error: "phrase required" });

    const resp = await openai.chat.completions.create({
      model: config.azure.deployment,
      messages: [
        {
          role: "system",
          content: `You are an Indian Sign Language (ISL) animation expert. Given a phrase, generate keyframe animation data for a sign language avatar.

For each word in the phrase, return a sequence of keyframes that represent the ISL sign for that word. Each keyframe is a snapshot of the avatar's pose.

Return JSON:
{
  "signs": [
    {
      "word": "the word",
      "keyframes": [
        {
          "duration": 0.4,
          "leftArm": { "shoulder": -45, "elbow": -30, "wrist": 10 },
          "rightArm": { "shoulder": -50, "elbow": -40, "wrist": -5 },
          "leftHand": { "shape": "open|fist|point|peace|thumbsUp|claw|flat|cup", "fingers": [0,0,0,0,0] },
          "rightHand": { "shape": "open|fist|point|peace|thumbsUp|claw|flat|cup", "fingers": [0,0,0,0,0] },
          "head": { "tilt": 0, "nod": 0 },
          "body": { "lean": 0 },
          "expression": "neutral|smile|surprise|thinking|serious"
        }
      ]
    }
  ]
}

Rules:
- shoulder: -90 to 90 (negative = raise arm up, positive = lower)
- elbow: -90 to 0 (negative = bend more)
- wrist: -30 to 30 (rotation)
- fingers: array of 5 values [thumb,index,middle,ring,pinky], each 0 (straight) to 1 (curled)
- Each word should have 2-4 keyframes showing the motion of the sign
- Signs should flow naturally from one to the next
- Use realistic ISL gestures — not random movements
- Common signs: namaste (palms together at chest), hello (wave), yes (head nod + fist), no (head shake + finger wag)
- duration is in seconds (0.3-0.8 per keyframe)`,
        },
        { role: "user", content: `Generate ISL sign animation keyframes for: "${phrase}"` },
      ],
      temperature: 0.5,
      max_completion_tokens: 2000,
      response_format: { type: "json_object" },
    });

    let data: any;
    try { data = JSON.parse(resp.choices[0].message.content || "{}"); } catch { data = { signs: [] }; }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generate sign language animation HTML (full visual).
 */
router.post("/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text, topic, language = "ISL" } = req.body;
    const content = text || topic;
    if (!content) return res.status(400).json({ error: "text or topic required" });

    const resp = await openai.chat.completions.create({
      model: config.azure.deployment,
      messages: [
        {
          role: "system",
          content: `You are an expert in Indian Sign Language (ISL) and CSS/JS animation. Generate a COMPLETE self-contained HTML page showing a realistic animated human avatar performing the ISL sign.

REQUIREMENTS:
1. Draw a realistic upper-body human using CSS (not SVG) — head, face, neck, shoulders, chest, arms, hands with 5 fingers each
2. Use skin-colored divs with border-radius for body parts
3. The avatar must perform the ACTUAL ISL sign for the given word/phrase:
   - Show the correct hand shape (open palm, fist, point, etc.)
   - Show the correct arm position and movement
   - Show the correct hand location relative to the body
   - Animate through the sign's movement smoothly
4. Use CSS @keyframes animations with multiple steps for fluid motion
5. Each finger should be individually visible and positioned correctly
6. Dark background: #0f1628
7. Avatar should be centered and large (fill 80% of the viewport)
8. Show the word being signed at the bottom in a caption
9. Animation should loop seamlessly
10. Use transform: rotate() for joint movements, translate() for positioning
11. The hand/arm movement must look like ACTUAL sign language, not just waving
12. Add subtle breathing animation to the chest
13. Eyes should blink occasionally
14. Head should move naturally with the signing

STYLE: Modern, clean, the avatar should look like a 3D character rendered in CSS (use box-shadow for depth, gradients for volume). Shirt color: #284ce3.

Return ONLY the complete HTML. No markdown. No explanation.`,
        },
        { role: "user", content: `Create a realistic ISL sign language animation for the word/phrase: "${content}". The avatar must perform the EXACT Indian Sign Language sign for this word with correct hand shapes, positions, and movements.` },
      ],
      temperature: 0.7,
      max_completion_tokens: 4000,
    });

    let html = resp.choices[0].message.content || "";
    const match = html.match(/```(?:html)?\s*([\s\S]*?)```/);
    if (match) html = match[1];

    res.json({ html, topic: content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Stream sign breakdown (SSE).
 */
router.post("/explain-stream", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { text, topic } = req.body;
  const content = text || topic;
  if (!content) return res.status(400).json({ error: "text or topic required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    send({ phase: "analyzing", message: `Breaking down "${content}" into signs...` });

    const resp = await openai.chat.completions.create({
      model: config.azure.deployment,
      messages: [
        { role: "system", content: `Break down text into ISL signs. Return JSON: { "signs": [{ "word": "", "gesture": "", "handShape": "", "movement": "", "position": "", "emoji": "" }], "fullSentence": "" }` },
        { role: "user", content: `ISL signs for: "${content}"` },
      ],
      temperature: 0.7, max_completion_tokens: 1500, response_format: { type: "json_object" },
    });

    let parsed: any;
    try { parsed = JSON.parse(resp.choices[0].message.content || "{}"); } catch { parsed = { signs: [] }; }

    send({ phase: "ready", totalSigns: parsed.signs?.length || 0, fullSentence: parsed.fullSentence });
    for (const [i, sign] of (parsed.signs || []).entries()) {
      send({ phase: "sign", index: i, total: parsed.signs.length, ...sign });
    }
    send({ phase: "complete" });
  } catch (err: any) {
    send({ phase: "error", message: err.message });
  }
  res.end();
});

export default router;
