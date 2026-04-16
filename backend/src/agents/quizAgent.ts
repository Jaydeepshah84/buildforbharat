import { BaseAgent } from "./baseAgent";
import { dbWrite } from "./tools";

export class QuizAgent extends BaseAgent {
  constructor() {
    super(
      "quiz",
      `You are a quiz generator for Learnify. Create MCQ questions.
Return JSON: { "questions": [{ "question": "", "options": ["A","B","C","D"], "correct": 0, "explanation": "" }] }
Mix easy/medium/hard. Make options plausible.`,
      [dbWrite("quizzes")]
    );
  }
}
