import { BaseAgent } from "./baseAgent";
import { CourseAgent } from "./courseAgent";
import { NotesAgent } from "./notesAgent";
import { QuizAgent } from "./quizAgent";
import { HomeworkAgent } from "./homeworkAgent";
import { CareerAgent } from "./careerAgent";
import { DoubtAgent } from "./doubtAgent";
import { VisualAgent } from "./visualAgent";
import { ClassroomAgent } from "./classroomAgent";
import { ProgressAgent } from "./progressAgent";

// ── Agent Factory ──────────────────────────────────────────
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

export {
  CourseAgent,
  NotesAgent,
  QuizAgent,
  HomeworkAgent,
  CareerAgent,
  DoubtAgent,
  VisualAgent,
  ClassroomAgent,
  ProgressAgent,
};
