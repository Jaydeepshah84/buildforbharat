import { DynamicTool } from "@langchain/core/tools";
import { openai } from "../config/llm";
import { config } from "../config/env";

// Simple in-memory conversation history per session
const histories = new Map<string, Array<{ role: string; content: string }>>();

function getHistory(id: string): Array<{ role: string; content: string }> {
  if (!histories.has(id)) histories.set(id, []);
  return histories.get(id)!;
}

export interface AgentResult {
  success: boolean;
  data: any;
  agent: string;
  message?: string;
}

export abstract class BaseAgent {
  name: string;
  systemPrompt: string;
  tools: DynamicTool[];
  temperature: number;

  constructor(name: string, systemPrompt: string, tools: DynamicTool[] = [], temp = 0.7) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.temperature = temp;
  }

  async run(input: string, sessionId = "default"): Promise<AgentResult> {
    try {
      const history = getHistory(`${this.name}:${sessionId}`);

      // Build messages in OpenAI chat format. We call the raw OpenAI-compatible
      // client directly (Google Gemini via its OpenAI-compat endpoint) rather than
      // LangChain's ChatOpenAI, which sends parameters Gemini rejects.
      const messages = [
        { role: "system", content: this.systemPrompt + "\n\nReturn ONLY valid JSON. No markdown code blocks, no extra text." },
        ...history.slice(-8).map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
        { role: "user", content: input },
      ];

      const completion = await openai.chat.completions.create({
        model: config.azure.deployment,
        messages: messages as any,
        temperature: this.temperature,
        // Cap kept under Groq free-tier TPM (8000) once the prompt is added.
        max_completion_tokens: 6000,
      });

      const output = completion.choices[0]?.message?.content || "";

      // Save to memory
      history.push({ role: "user", content: input });
      history.push({ role: "assistant", content: output });
      if (history.length > 20) history.splice(0, history.length - 16);

      return { success: true, data: this.parseJSON(output), agent: this.name };
    } catch (err: any) {
      return { success: false, data: null, agent: this.name, message: err.message };
    }
  }

  protected parseJSON(text: string): any {
    if (!text) return {};
    try { return JSON.parse(text); } catch {}
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) { try { return JSON.parse(m[1]); } catch {} }
    return { text };
  }
}
