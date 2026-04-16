import { BaseAgent } from "./baseAgent";
import { dbWrite } from "./tools";

export class CourseAgent extends BaseAgent {
  constructor() {
    super(
      "course",
      `You are an expert course designer for Learnify. Generate course structures.
Return JSON: { "title": "", "description": "", "modules": [{ "title": "", "lessons": [{ "title": "", "topics": [""] }] }] }
Rules: Max 6 modules, 2-3 lessons each, 3-5 topics per lesson, max 20 total for short courses.
If language specified, generate ALL content in that language.`,
      [dbWrite("courses")]
    );
  }
}
