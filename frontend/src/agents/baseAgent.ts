import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { BufferWindowMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { DynamicTool } from "@langchain/core/tools";
import { createLLM } from "@/lib/llm";
import type { AgentResponse } from "@/types";

// Session memory store
const memories = new Map<string, BufferWindowMemory>();

function getMemory(sessionId: string): BufferWindowMemory {
  if (!memories.has(sessionId)) {
    memories.set(sessionId, new BufferWindowMemory({
      k: 8,
      memoryKey: "chat_history",
      returnMessages: true,
      chatHistory: new ChatMessageHistory(),
    }));
  }
  return memories.get(sessionId)!;
}

export abstract class BaseAgent {
  protected name: string;
  protected systemPrompt: string;
  protected tools: DynamicTool[];
  protected temperature: number;

  constructor(name: string, systemPrompt: string, tools: DynamicTool[] = [], temperature = 0.7) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.temperature = temperature;
  }

  async run(input: string, sessionId = "default"): Promise<AgentResponse> {
    try {
      const llm = createLLM(this.temperature);
      const memory = getMemory(`${this.name}:${sessionId}`);

      if (this.tools.length > 0) {
        // Agent with tools
        const prompt = ChatPromptTemplate.fromMessages([
          ["system", this.systemPrompt],
          new MessagesPlaceholder("chat_history"),
          ["human", "{input}"],
          new MessagesPlaceholder("agent_scratchpad"),
        ]);

        const agent = await createOpenAIToolsAgent({ llm, tools: this.tools, prompt });
        const executor = new AgentExecutor({ agent, tools: this.tools, memory, verbose: false });
        const result = await executor.invoke({ input });

        return {
          success: true,
          data: this.parseOutput(result.output),
          agent: this.name,
        };
      } else {
        // Simple chain without tools
        const prompt = ChatPromptTemplate.fromMessages([
          ["system", this.systemPrompt + "\n\nReturn ONLY valid JSON. No markdown code blocks."],
          new MessagesPlaceholder("chat_history"),
          ["human", "{input}"],
        ]);

        const chain = prompt.pipe(llm);
        const history = await memory.loadMemoryVariables({});
        const result = await chain.invoke({
          input,
          chat_history: history.chat_history || [],
        });

        // Save to memory
        await memory.saveContext({ input }, { output: result.content as string });

        return {
          success: true,
          data: this.parseOutput(result.content as string),
          agent: this.name,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: error.message,
        agent: this.name,
      };
    }
  }

  protected parseOutput(output: string): any {
    if (!output) return {};
    try {
      // Try direct JSON parse
      return JSON.parse(output);
    } catch {
      // Try extracting JSON from text
      const match = output.match(/```(?:json)?\s*([\s\S]*?)```/) || output.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        try { return JSON.parse(match[1]); } catch {}
      }
      return { text: output };
    }
  }
}
