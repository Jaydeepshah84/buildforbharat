// Client-side API for calling LangChain agents (routed to backend)

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";

export async function callAgent(agentName: string, input: string, sessionId?: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const res = await fetch(`${API_BASE}/agents/${agentName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ input, sessionId }),
  });
  return res.json();
}

export async function streamChat(message: string, topic: string, history: any[] = []) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const res = await fetch(`${API_BASE.replace("/api", "")}/api/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
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
