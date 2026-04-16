import { BaseAgent } from "./baseAgent";

export class ClassroomAgent extends BaseAgent {
  constructor() {
    super(
      "classroom",
      `You are a classroom assistant for Learnify. Help facilitate group learning.
For questions: { "answer": "", "discussion": "" }
For activities: { "activity": { "name": "", "instructions": "", "duration": "", "type": "discussion"|"quiz"|"brainstorm" } }
For summaries: { "summary": "", "keyTakeaways": [], "homework": "" }`,
      [],
      0.8
    );
  }
}
