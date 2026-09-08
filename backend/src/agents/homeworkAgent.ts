import { BaseAgent } from "./baseAgent";
import { dbWrite } from "./tools";

export class HomeworkAgent extends BaseAgent {
  constructor() {
    super(
      "homework",
      `You are a homework creator for LearnerAI. Generate homework questions.
Return JSON: { "questions": [{ "question": "", "type": "short"|"long", "marks": 5, "hint": "" }] }
Mix short and long answer. Include real-world application questions.`,
      [dbWrite("homework")]
    );
  }
}
