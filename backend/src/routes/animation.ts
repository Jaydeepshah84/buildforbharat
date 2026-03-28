import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { openai } from "../config/llm";
import { config } from "../config/env";

const router = Router();

router.post("/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { topic, language = "en", sceneCount = 5 } = req.body;
  if (!topic) return res.status(400).json({ error: "Topic is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    send("status", { phase: "planning", message: "AI is creating your visual explanation..." });

    // Single AI call — generate ALL scenes with animation data
    const resp = await openai.chat.completions.create({
      model: config.azure.deployment,
      messages: [
        { role: "system", content: "You create educational animation scenes. Return valid JSON only." },
        {
          role: "user",
          content: `Create ${sceneCount} animation scenes to teach "${topic}".${language !== "en" ? ` Narration in ${language}.` : ""}

Return JSON: { "scenes": [ { "title": "...", "narration": "2-3 sentences", "on_screen_text": "key text", "background": "#EFF6FF", "svgElements": [ { "tag": "circle", "attrs": { "cx": 300, "cy": 100, "r": 40, "fill": "#FCD34D" }, "label": "Sun" }, { "tag": "rect", "attrs": { "x": 200, "y": 200, "width": 100, "height": 60, "fill": "#22C55E" }, "label": "Plant" }, { "tag": "text", "attrs": { "x": 300, "y": 350, "fill": "#111" }, "label": "Key term" } ], "arrows": [ { "from": [300, 140], "to": [300, 200], "label": "Flow", "color": "#F59E0B", "delay": 1 } ] } ] }

Position elements within 0-600 x, 0-400 y. Use bright colors. 3-5 elements per scene.`
        }
      ],
      temperature: 0.7,
      max_completion_tokens: 3000,
      response_format: { type: "json_object" },
    });

    let plan: any;
    try {
      plan = JSON.parse(resp.choices[0].message.content || "{}");
    } catch {
      plan = { topic, scenes: [] };
    }

    const scenes = plan.scenes || [];
    send("plan", { topic: plan.topic || topic, totalScenes: scenes.length });

    // Normalize and stream each scene
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];

      // Normalize svgElements — AI may return different formats
      const rawElements = scene.svgElements || scene.elements || [];
      const svgElements = rawElements.map((el: any) => {
        // If already in { tag, attrs } format, keep it
        if (el.tag && el.attrs) return el;
        // Convert from flat format { type: "circle", cx, cy, r, fill }
        const tag = el.type || el.tag || "circle";
        const { type, label, animateIn, ...rest } = el;
        return {
          tag,
          attrs: rest,
          label: label || el.label || "",
          animateIn: animateIn || { delay: i * 0.3, duration: 0.5 },
        };
      });

      send("scene:ready", {
        scene_number: i + 1,
        title: scene.title || `Scene ${i + 1}`,
        type: "svg",
        duration: scene.duration || 7,
        narration: scene.narration || "",
        on_screen_text: scene.on_screen_text || scene.title || "",
        background: scene.background || "#EFF6FF",
        animationData: {
          svgElements,
          arrows: scene.arrows || [],
          labels: scene.labels || [],
          viewBox: "0 0 600 400",
          background: scene.background || "#EFF6FF",
        },
      });
    }

    send("complete", { totalScenes: scenes.length });
  } catch (err: any) {
    send("error", { message: err.message });
  }
  res.end();
});

export default router;
