export { CourseGenerationAgent } from "./courseAgent";
export { NotesGenerationAgent } from "./notesAgent";
export { QuizGeneratorAgent } from "./quizAgent";
export { HomeworkGenerationAgent } from "./homeworkAgent";
export { CareerGuidanceAgent } from "./careerAgent";
export { DoubtSolverAgent } from "./doubtAgent";
export { VisualExplanationAgent } from "./visualAgent";
export { ClassroomAssistantAgent } from "./classroomAgent";
export { StudentProgressAgent } from "./progressAgent";

// Agent factory
import { BaseAgent } from "./baseAgent";

const agents: Record<string, () => BaseAgent> = {
  course: () => new (require("./courseAgent").CourseGenerationAgent)(),
  notes: () => new (require("./notesAgent").NotesGenerationAgent)(),
  quiz: () => new (require("./quizAgent").QuizGeneratorAgent)(),
  homework: () => new (require("./homeworkAgent").HomeworkGenerationAgent)(),
  career: () => new (require("./careerAgent").CareerGuidanceAgent)(),
  doubt: () => new (require("./doubtAgent").DoubtSolverAgent)(),
  visual: () => new (require("./visualAgent").VisualExplanationAgent)(),
  classroom: () => new (require("./classroomAgent").ClassroomAssistantAgent)(),
  progress: () => new (require("./progressAgent").StudentProgressAgent)(),
};

export function getAgent(name: string): BaseAgent {
  const factory = agents[name];
  if (!factory) throw new Error(`Agent "${name}" not found`);
  return factory();
}

export const agentNames = Object.keys(agents);
