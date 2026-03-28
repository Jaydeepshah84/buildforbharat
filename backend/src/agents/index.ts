import { BaseAgent } from "./baseAgent";
import { DynamicTool } from "@langchain/core/tools";
import { supabase } from "../config/supabase";

// ── Supabase Tools ──────────────────────────────────────────
const dbRead = (table: string, userId?: boolean) => new DynamicTool({
  name: `get_${table}`,
  description: `Get ${table} data. Input: user ID or course ID.`,
  func: async (id: string) => {
    const { data } = await supabase.from(table).select("*")
      .eq(userId ? "user_id" : "id", id.trim()).limit(20);
    return JSON.stringify(data || []);
  },
});

const dbWrite = (table: string) => new DynamicTool({
  name: `save_${table}`,
  description: `Save data to ${table}. Input: JSON string.`,
  func: async (input: string) => {
    const { data, error } = await supabase.from(table).insert(JSON.parse(input)).select().single();
    return JSON.stringify(error ? { error: error.message } : data);
  },
});

// ── 9 Agents ────────────────────────────────────────────────

class CourseAgent extends BaseAgent {
  constructor() {
    super("course", `You are an expert course designer. Generate course structures.
Return JSON: { "title": "", "description": "", "modules": [{ "title": "", "lessons": [{ "title": "", "topics": [""] }] }] }
Rules: Max 6 modules, 2-3 lessons each, 3-5 topics per lesson, max 20 total for short courses.
If language specified, generate ALL content in that language.`, [dbWrite("courses")]);
  }
}

class NotesAgent extends BaseAgent {
  constructor() {
    super("notes", `You are a study notes creator. Generate structured notes.
Return JSON: { "title": "", "sections": [{ "heading": "", "content": "" }], "keyPoints": [], "definitions": [{ "term": "", "definition": "" }], "examples": [], "summary": "", "practiceQuestions": [] }
Use markdown formatting. Make notes exam-oriented.`, [dbWrite("notes")]);
  }
}

class QuizAgent extends BaseAgent {
  constructor() {
    super("quiz", `You are a quiz generator. Create MCQ questions.
Return JSON: { "questions": [{ "question": "", "options": ["A","B","C","D"], "correct": 0, "explanation": "" }] }
Mix easy/medium/hard. Make options plausible.`, [dbWrite("quizzes")]);
  }
}

class HomeworkAgent extends BaseAgent {
  constructor() {
    super("homework", `You are a homework creator. Generate homework questions.
Return JSON: { "questions": [{ "question": "", "type": "short"|"long", "marks": 5, "hint": "" }] }
Mix short and long answer. Include real-world application questions.`, [dbWrite("homework")]);
  }
}

class CareerAgent extends BaseAgent {
  constructor() {
    super("career", `You are a career counselor. Suggest career paths.
Return JSON: { "careers": [{ "name": "", "description": "", "skills": [], "education": "", "growth": "high"|"medium"|"low" }], "advice": "" }`,
    [dbRead("student_performance", true)]);
  }
}

class DoubtAgent extends BaseAgent {
  constructor() {
    super("doubt", `You are a friendly AI teacher. Explain clearly with examples.
Return JSON: { "answer": "", "steps": [], "examples": [], "tip": "", "followUp": "" }
Use simple language. Be encouraging.`, [], 0.8);
  }
}

class VisualAgent extends BaseAgent {
  constructor() {
    super("visual", `You are a visual learning creator. Generate step-by-step visual explanations.
Return JSON: { "title": "", "steps": [{ "stepNumber": 1, "title": "", "narration": "", "visual": { "type": "svg"|"diagram"|"flowchart", "elements": [{ "type": "shape"|"arrow"|"label", "label": "", "color": "" }], "description": "" }, "highlight": "" }], "summary": "" }
5-7 steps. Each builds on previous. Use diagrams, arrows, labels.`, []);
  }
}

class ClassroomAgent extends BaseAgent {
  constructor() {
    super("classroom", `You are a classroom assistant. Help facilitate group learning.
For questions: { "answer": "", "discussion": "" }
For activities: { "activity": { "name": "", "instructions": "", "duration": "", "type": "discussion"|"quiz"|"brainstorm" } }
For summaries: { "summary": "", "keyTakeaways": [], "homework": "" }`, [], 0.8);
  }
}

class ProgressAgent extends BaseAgent {
  constructor() {
    super("progress", `You are a student progress analyst. Analyze performance and give insights.
Return JSON: { "overallScore": 0, "level": "", "strengths": [], "weaknesses": [], "recommendations": [], "improvementAreas": [{ "topic": "", "score": 0, "suggestion": "" }], "studyPlan": { "daily_hours": 0, "focus_topics": [], "strategy": "" } }`,
    [dbRead("student_performance", true), dbRead("quizzes", true), dbRead("emotion_logs", true)]);
  }
}

// ── Factory ─────────────────────────────────────────────────
const agentMap: Record<string, () => BaseAgent> = {
  course: () => new CourseAgent(),
  notes: () => new NotesAgent(),
  quiz: () => new QuizAgent(),
  homework: () => new HomeworkAgent(),
  career: () => new CareerAgent(),
  doubt: () => new DoubtAgent(),
  visual: () => new VisualAgent(),
  classroom: () => new ClassroomAgent(),
  progress: () => new ProgressAgent(),
};

export const agentNames = Object.keys(agentMap);

export function getAgent(name: string): BaseAgent {
  const factory = agentMap[name];
  if (!factory) throw new Error(`Agent "${name}" not found`);
  return factory();
}
