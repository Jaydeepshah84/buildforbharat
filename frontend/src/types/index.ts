// ── LearnerAI Type Definitions ──────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  class?: string;
  language: string;
  avatar_url?: string;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  class?: string;
  subject: string;
  duration_days: number;
  difficulty_level: "easy" | "medium" | "hard";
  generated_by?: string;
  syllabus?: any;
  modules?: Module[];
  created_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  order_index: number;
  topics?: Topic[];
}

export interface Topic {
  id: string;
  lesson_id: string;
  title: string;
  description?: string;
  order_index: number;
  content?: TopicContent[];
  completed?: boolean;
}

export interface TopicContent {
  id: string;
  topic_id: string;
  mode: "text" | "diagram" | "animation";
  content_text?: string;
  animation_json?: any;
  diagram_json?: any;
  language: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  level: "weak" | "medium" | "strong";
  learning_speed: number;
  preferred_mode: string;
  interests?: string[];
  strengths?: string[];
  weaknesses?: string[];
}

export interface StudentPerformance {
  id: string;
  user_id: string;
  course_id: string;
  subject?: string;
  quiz_avg: number;
  homework_avg: number;
  exam_avg: number;
  attention_avg: number;
  emotion_avg: number;
  performance_score: number;
}

export interface Quiz {
  id: string;
  user_id: string;
  topic_id?: string;
  course_id?: string;
  questions: any[];
  answers?: any;
  score?: number;
  total?: number;
  time_taken?: number;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title?: string;
  original_text?: string;
  summary?: string;
  flashcards?: any;
  source_type?: "pdf" | "image" | "manual" | "voice" | "topic" | "questions";
  created_at: string;
}

export interface Classroom {
  id: string;
  name: string;
  course_id?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
}

export interface EmotionLog {
  id: string;
  user_id: string;
  session_id?: string;
  emotion: "happy" | "confused" | "bored" | "focused" | "frustrated" | "neutral";
  attention_level: number;
  created_at: string;
}

// ── Agent Response Types ────────────────────────────────────

export interface AgentResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  agent: string;
}

export interface CourseGenerationResult {
  title: string;
  description: string;
  modules: { title: string; lessons: { title: string; topics: string[] }[] }[];
}

export interface QuizGenerationResult {
  questions: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }[];
}

export interface NotesGenerationResult {
  title: string;
  sections: { heading: string; content: string }[];
  keyPoints: string[];
  summary: string;
  practiceQuestions: string[];
}

export interface HomeworkResult {
  questions: { question: string; type: "short" | "long"; marks: number; hint?: string }[];
}

export interface CareerResult {
  careers: { name: string; description: string; skills: string[]; education: string; growth: string }[];
}

export interface ProgressAnalysis {
  overallScore: number;
  level: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  improvementAreas: { topic: string; score: number; suggestion: string }[];
}
