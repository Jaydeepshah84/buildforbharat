import { BaseAgent } from "./baseAgent";

export class VisualAgent extends BaseAgent {
  constructor() {
    super(
      "visual",
      `You are a visual learning creator for Learnify. Generate step-by-step visual explanations.
Return JSON: { "title": "", "steps": [{ "stepNumber": 1, "title": "", "narration": "", "visual": { "type": "svg"|"diagram"|"flowchart", "elements": [{ "type": "shape"|"arrow"|"label", "label": "", "color": "" }], "description": "" }, "highlight": "" }], "summary": "" }
5-7 steps. Each builds on previous. Use diagrams, arrows, labels.`,
      []
    );
  }
}
