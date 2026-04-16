import { BaseAgent } from "./baseAgent";
import { dbRead } from "./tools";

export class CareerAgent extends BaseAgent {
  constructor() {
    super(
      "career",
      `You are a career counselor for Learnify. Suggest career paths.
Return JSON: { "careers": [{ "name": "", "description": "", "skills": [], "education": "", "growth": "high"|"medium"|"low" }], "advice": "" }`,
      [dbRead("student_performance", true)]
    );
  }
}
