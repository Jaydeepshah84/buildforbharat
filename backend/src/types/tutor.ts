export type ClassLevel = "primary" | "middle" | "high_school" | "college";
export type Language = "en" | "hi" | "gu" | "es";
export type ExplanationStyle = "short" | "detailed" | "exam_focused";

export interface TutorRequest {
  question: string;
  class_level: ClassLevel;
  language: Language;
  style: ExplanationStyle;
}

export interface TutorResponse {
  title: string;
  steps: any[];
  visual_code: string;
  voice_script: string;
  explanation: string;
  definitions: { term: string; meaning: string }[];
  language: string;
  subject: string;
  question_type: string;
  difficulty: number;
}

export interface InputAnalysis {
  subject: string;
  question_type: string;
  difficulty: number;
  keywords: string[];
  requires_visual: boolean;
}

export interface VisualTemplate {
  type: string;
  framework: string;
  description: string;
}

export interface TutorStep {
  step_number: number;
  title: string;
  explanation: string;
  visual_hint: string;
}
