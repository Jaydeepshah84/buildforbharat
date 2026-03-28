import { BaseAgent } from "./baseAgent";
import { DynamicTool } from "@langchain/core/tools";
import { createServerSupabase } from "@/lib/supabase";

const db = createServerSupabase();

const getFullStudentData = new DynamicTool({
  name: "get_full_student_data",
  description: "Get all student data: profile, performance, quizzes, homework, emotion logs. Input: user ID.",
  func: async (userId: string) => {
    const id = userId.trim();
    const [profile, perf, quizzes, homework, emotions] = await Promise.all([
      db.from("student_profile").select("*").eq("user_id", id).single(),
      db.from("student_performance").select("*").eq("user_id", id),
      db.from("quizzes").select("score, total, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
      db.from("homework").select("score, total, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
      db.from("emotion_logs").select("emotion, attention_level, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    return JSON.stringify({
      profile: profile.data, performance: perf.data || [],
      quizzes: quizzes.data || [], homework: homework.data || [],
      emotions: emotions.data || [],
    });
  },
});

export class StudentProgressAgent extends BaseAgent {
  constructor() {
    super(
      "StudentProgressAgent",
      `You are a student progress analyst for Ed.Ai.
Analyze student performance data and provide insights.

Return JSON: {
  "overallScore": 75,
  "level": "medium",
  "strengths": ["Topic 1 is strong"],
  "weaknesses": ["Needs improvement in Topic 2"],
  "recommendations": ["Study recommendation 1"],
  "improvementAreas": [
    { "topic": "Topic name", "score": 45, "suggestion": "What to do" }
  ],
  "studyPlan": {
    "daily_hours": 2,
    "focus_topics": ["Topic 1", "Topic 2"],
    "strategy": "Study strategy description"
  },
  "emotionInsights": {
    "dominant_emotion": "focused",
    "avg_attention": 0.72,
    "suggestion": "Emotion-based suggestion"
  }
}

Use the student data tools to fetch real data before analyzing.`,
      [getFullStudentData],
      0.7
    );
  }
}
