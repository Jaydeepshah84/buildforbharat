import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { openai } from "../config/llm";
import { config } from "../config/env";

const router = Router();

// Voice streaming endpoint
router.post("/stream", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { message, topic = "general", history = [] } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = await openai.chat.completions.create({
      model: config.azure.deployment,
      messages: [
        { role: "system", content: `You are a friendly AI teacher. Topic: "${topic}". Keep responses concise (2-4 sentences).` },
        ...history.slice(-6).map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: message },
      ],
      temperature: 0.8,
      max_completion_tokens: 300,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  res.end();
});

export default router;
