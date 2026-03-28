// Client-side API for calling LangChain agents

export async function callAgent(agentName: string, input: string, sessionId?: string) {
  const res = await fetch(`/api/agents/${agentName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, sessionId }),
  });
  return res.json();
}

export async function streamChat(message: string, topic: string, history: any[] = []) {
  const res = await fetch("/api/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, topic, history }),
  });
  return res;
}

// Typed agent callers
export const agents = {
  generateCourse: (input: string, sessionId?: string) => callAgent("course", input, sessionId),
  generateNotes: (input: string, sessionId?: string) => callAgent("notes", input, sessionId),
  generateQuiz: (input: string, sessionId?: string) => callAgent("quiz", input, sessionId),
  generateHomework: (input: string, sessionId?: string) => callAgent("homework", input, sessionId),
  careerGuidance: (input: string, sessionId?: string) => callAgent("career", input, sessionId),
  solveDoubt: (input: string, sessionId?: string) => callAgent("doubt", input, sessionId),
  visualExplanation: (input: string, sessionId?: string) => callAgent("visual", input, sessionId),
  classroomAssist: (input: string, sessionId?: string) => callAgent("classroom", input, sessionId),
  analyzeProgress: (input: string, sessionId?: string) => callAgent("progress", input, sessionId),
};
