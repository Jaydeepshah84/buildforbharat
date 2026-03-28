import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { DynamicTool } from "@langchain/core/tools";
import { createLLM } from "../config/llm";

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
      const llm = createLLM(this.temperature);
      const history = getHistory(`${this.name}:${sessionId}`);

      // Build messages
      const messages = [
        new SystemMessage(this.systemPrompt + "\n\nReturn ONLY valid JSON. No markdown code blocks, no extra text."),
        ...history.slice(-8).map(h =>
          h.role === "user" ? new HumanMessage(h.content) : new AIMessage(h.content)
        ),
        new HumanMessage(input),
      ];

      // Call LLM directly
      const result = await llm.invoke(messages);
      const output = result.content as string;

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
