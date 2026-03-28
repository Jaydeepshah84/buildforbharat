import { BaseAgent } from "./baseAgent";
import { DynamicTool } from "@langchain/core/tools";
import { createServerSupabase } from "@/lib/supabase";

const db = createServerSupabase();

const saveCourse = new DynamicTool({
  name: "save_course",
  description: "Save course to database. Input: JSON with title, subject, class, duration_days, difficulty_level, syllabus.",
  func: async (input: string) => {
    const data = JSON.parse(input);
    const { data: result, error } = await db.from("courses").insert(data).select().single();
    return JSON.stringify(error ? { error: error.message } : result);
  },
});

const saveModule = new DynamicTool({
  name: "save_module",
  description: "Save module. Input: JSON with course_id, title, order_index.",
  func: async (input: string) => {
    const data = JSON.parse(input);
    const { data: result, error } = await db.from("modules").insert(data).select().single();
    return JSON.stringify(error ? { error: error.message } : result);
  },
});

export class CourseGenerationAgent extends BaseAgent {
  constructor() {
    super(
      "CourseGenerationAgent",
      `You are an expert course curriculum designer for Ed.Ai platform.
Given a subject, class level, and duration, generate a complete course structure.

Return JSON: {
  "title": "Course Title",
  "description": "Brief description",
  "modules": [
    {
      "title": "Module Title",
      "lessons": [
        { "title": "Lesson Title", "topics": ["Topic 1", "Topic 2"] }
      ]
    }
  ]
}

Rules:
- Max 6 modules for short courses (3-7 days), up to 10 for longer
- 2-3 lessons per module
- 3-5 topics per lesson
- Max 20 total topics for 3-day courses
- Topic names should be specific and teachable
- If language is specified, generate ALL content in that language`,
      [saveCourse, saveModule],
      0.7
    );
  }
}
