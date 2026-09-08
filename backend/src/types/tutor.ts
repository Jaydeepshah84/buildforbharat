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
  // Narration sentences keyed 1:1 to animation steps. Length === window.numSteps in visual_code.
  narration_steps?: string[];
  // Structured animation description rendered deterministically by the frontend canvas.
  animation_spec?: AnimationSpec;
}

export interface AnimationSpec {
  totalDuration: number;             // total ms across all steps (informational)
  canvas: { width: number; height: number; bg?: string };
  steps: AnimationStepSpec[];
}

export interface AnimationStepSpec {
  narration: string;                 // single sentence spoken during this step
  duration?: number;                 // optional ms, defaults to TTS length
  scene: SceneObject[];              // declarative objects shown in this step
}

export interface SceneObject {
  id: string;                        // stable across steps; same id → tween between steps
  type: "text" | "emoji" | "image" | "shape" | "arrow";
  x: number;                         // 0..1 normalized to canvas
  y: number;                         // 0..1 normalized to canvas
  w?: number;                        // 0..1 width (optional)
  h?: number;                        // 0..1 height (optional)
  rotation?: number;                 // degrees
  scale?: number;                    // 1.0 = natural
  opacity?: number;                  // 0..1
  color?: string;                    // any CSS color
  bg?: string;                       // background for shapes/text
  // type=text
  text?: string;
  fontSize?: number;                 // px at canvas height 720
  fontWeight?: number | string;
  // type=emoji
  emoji?: string;
  // type=image
  src?: string;                      // url
  // type=shape
  shape?: "rect" | "circle" | "line";
  // type=arrow
  to?: { x: number; y: number };
  // entry animation when first appearing
  enter?: "fade" | "scale" | "pop" | "slide-up" | "slide-down" | "slide-left" | "slide-right";
  highlight?: boolean;               // pulse/glow
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
