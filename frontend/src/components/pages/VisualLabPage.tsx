"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send, Loader2, Beaker, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import AnimationPlayer from "@/components/animation/AnimationPlayer";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function VisualLabPage() {
  const [topic, setTopic] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleGenerate = () => {
    if (!topic.trim()) return;
    setActiveTopic(topic.trim());
    setChatHistory([]);
  };

  // Chat follow-up
  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);

    try {
      const token = localStorage.getItem("token") || "";
      const resp = await fetch(`${API}/voice/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg, topic: activeTopic, history: chatHistory.slice(-6) }),
      });

      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.text) full += d.text; } catch {}
        }
      }

      if (full) setChatHistory(prev => [...prev, { role: "assistant", content: full }]);
    } catch {} finally {
      setChatLoading(false);
    }

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visual Lab</h1>
          <p className="text-sm text-gray-500">Learn any topic with AI-generated visual animations</p>
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Beaker className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleGenerate()}
            placeholder="Enter a topic: Photosynthesis, Sorting Algorithm, Newton's Laws..."
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <button onClick={handleGenerate} disabled={!topic.trim()}
          className="px-6 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Explain Visually
        </button>
      </div>

      {/* Animation Player — same engine as course visual explanations */}
      {activeTopic && (
        <AnimationPlayer
          topic={activeTopic}
          classLevel="10"
          language={localStorage.getItem("app_language") || "en"}
        />
      )}

      {/* Follow-up chat */}
      {activeTopic && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Ask follow-up questions about "{activeTopic}"</h3>

          {chatHistory.length > 0 && (
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${m.role === "user" ? "bg-indigo-500" : "bg-gray-200"}`}>
                    {m.role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-gray-600" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                    <ReactMarkdown components={{
                      p: ({ children }: any) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
                    }}>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-gray-600" /></div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-2.5"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          <form onSubmit={e => { e.preventDefault(); handleChat(); }} className="flex gap-2">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder="Ask anything about this topic..."
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button type="submit" disabled={chatLoading || !chatInput.trim()}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
