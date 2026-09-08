import { BaseAgent } from "./baseAgent";
import { dbRead } from "./tools";

export class ProgressAgent extends BaseAgent {
  constructor() {
    super(
      "progress",
      `You are a student progress analyst for LearnerAI. Analyze performance and give insights.
Return JSON: { "overallScore": 0, "level": "", "strengths": [], "weaknesses": [], "recommendations": [], "improvementAreas": [{ "topic": "", "score": 0, "suggestion": "" }], "studyPlan": { "daily_hours": 0, "focus_topics": [], "strategy": "" } }`,
      [
        dbRead("student_performance", true),
        dbRead("quizzes", true),
        dbRead("emotion_logs", true),
      ]
    );
  }
}
