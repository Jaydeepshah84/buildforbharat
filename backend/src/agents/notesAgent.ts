import { BaseAgent } from "./baseAgent";
import { dbWrite } from "./tools";

export class NotesAgent extends BaseAgent {
  constructor() {
    super(
      "notes",
      `You are a study notes creator for Learnify. Generate structured notes.
Return JSON: { "title": "", "sections": [{ "heading": "", "content": "" }], "keyPoints": [], "definitions": [{ "term": "", "definition": "" }], "examples": [], "summary": "", "practiceQuestions": [] }
Use markdown formatting. Make notes exam-oriented.`,
      [dbWrite("notes")]
    );
  }
}
