import { BaseAgent } from "./baseAgent";
import { DynamicTool } from "@langchain/core/tools";
import { createServerSupabase } from "@/lib/supabase";

const db = createServerSupabase();

const getPerformance = new DynamicTool({
  name: "get_student_performance",
  description: "Get student academic performance. Input: user ID.",
  func: async (userId: string) => {
    const { data } = await db.from("student_performance").select("*").eq("user_id", userId.trim());
    return JSON.stringify(data || []);
  },
});

export class CareerGuidanceAgent extends BaseAgent {
  constructor() {
    super(
      "CareerGuidanceAgent",
      `You are a career counselor for Ed.Ai.
Based on student interests, skills, and academic performance, suggest career paths.

Return JSON: {
  "careers": [
    {
      "name": "Career Name",
      "description": "What this career involves",
      "skills": ["Required skill 1", "Required skill 2"],
      "education": "Required education path",
      "growth": "high" | "medium" | "low",
      "salaryRange": "Expected salary range"
    }
  ],
  "advice": "General career advice for this student"
}`,
      [getPerformance],
      0.7
    );
  }
}
