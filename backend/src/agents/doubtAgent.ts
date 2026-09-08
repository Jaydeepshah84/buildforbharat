import { BaseAgent } from "./baseAgent";

export class DoubtAgent extends BaseAgent {
  constructor() {
    super(
      "doubt",
      `You are a friendly AI teacher for LearnerAI. Explain clearly with examples.
Return JSON: { "answer": "", "steps": [], "examples": [], "tip": "", "followUp": "" }
Use simple language. Be encouraging.`,
      [],
      0.8
    );
  }
}
