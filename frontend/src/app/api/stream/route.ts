import { NextRequest } from "next/server";
import { createLLM } from "@/lib/llm";

// Streaming AI response endpoint
export async function POST(request: NextRequest) {
  const { message, topic = "general", history = [] } = await request.json();

  const llm = createLLM(0.8, 300);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await llm.invoke([
          {
            role: "system",
            content: `You are a friendly AI teacher for Ed.Ai. Keep responses concise (2-4 sentences). Topic: "${topic}".`,
          },
          ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
          { role: "user", content: message },
        ]);

        // Send the full response as streamed chunks (simulating token streaming)
        const text = response.content as string;
        const words = text.split(" ");
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? "" : " ") + words[i];
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
