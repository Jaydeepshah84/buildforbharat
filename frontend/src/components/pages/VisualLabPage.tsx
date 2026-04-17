"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Play, RotateCcw, X, ArrowRight, Hand } from "lucide-react";
import ReactMarkdown from "react-markdown";
import AnimationPlayer from "@/components/animation/AnimationPlayer";
import SignLanguagePlayer from "@/components/SignLanguagePlayer";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";

const SUGGESTIONS = [
  { label: "Photosynthesis", emoji: "🌱" },
  { label: "Solar System", emoji: "🪐" },
  { label: "Newton's Laws", emoji: "🍎" },
  { label: "Water Cycle", emoji: "💧" },
  { label: "DNA Structure", emoji: "🧬" },
  { label: "Sorting Algorithm", emoji: "📊" },
  { label: "Electric Circuit", emoji: "⚡" },
  { label: "Food Chain", emoji: "🦁" },
];

export default function VisualLabPage() {
  const [topic, setTopic] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showSignLang, setShowSignLang] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Force stop all speech/audio
  const killAllAudio = () => {
    try { window.speechSynthesis?.cancel(); } catch {}
    try { document.querySelectorAll("audio").forEach(a => { a.pause(); a.src = ""; }); } catch {}
  };

  const handleGenerate = (t?: string) => {
    const val = (t || topic).trim();
    if (!val) return;
    killAllAudio();
    setActiveTopic("");
    setTimeout(() => { setTopic(val); setActiveTopic(val); setChatHistory([]); }, 50);
  };

  const handleReset = () => {
    killAllAudio();
    setActiveTopic("");
    setTopic("");
    setChatHistory([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => killAllAudio();
  }, []);

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
          try {
            const d = JSON.parse(line.slice(6));
            if (d.text) full += d.text;
          } catch {}
        }
      }

      if (full) setChatHistory(prev => [...prev, { role: "assistant", content: full }]);
    } catch {} finally {
      setChatLoading(false);
    }

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        {!activeTopic ? (
          /* ══ Landing ══ */
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#284ce3] via-[#4a6cf7] to-[#7c8ff7] px-10 py-16 text-center">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-10 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
              <div className="absolute top-10 left-24 w-14 h-14 bg-white/10 rounded-2xl rotate-12" />
              <div className="absolute bottom-10 right-28 w-10 h-10 bg-yellow-300/20 rounded-xl -rotate-6" />

              <div className="relative z-10">
                <motion.p
                  className="text-white/50 text-sm font-medium mb-2 uppercase tracking-wider"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                >
                  AI-Powered Visual Learning
                </motion.p>
                <motion.h1
                  className="text-4xl lg:text-5xl font-extrabold text-white mb-4"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                >
                  Visual Lab
                </motion.h1>
                <motion.p
                  className="text-white/50 text-sm max-w-lg mx-auto mb-10"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                >
                  Type any topic and watch AI generate animated visual explanations with diagrams, flowcharts, and step-by-step narration.
                </motion.p>

                {/* Input */}
                <motion.div
                  className="max-w-2xl mx-auto"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleGenerate()}
                      placeholder="What do you want to visualize?"
                      className="w-full px-6 py-[18px] rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white text-lg font-medium placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-white/30 transition pr-36"
                    />
                    <button
                      onClick={() => handleGenerate()}
                      disabled={!topic.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 rounded-xl bg-white text-[#284ce3] font-bold text-sm hover:bg-white/90 disabled:opacity-30 transition-all flex items-center gap-1.5"
                    >
                      Visualize <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Suggestions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            >
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Try a topic</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.04 }}
                    onClick={() => handleGenerate(s.label)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-gray-100 text-left hover:border-[#284ce3]/30 hover:shadow-md transition-all group"
                  >
                    <span className="text-4xl">{s.emoji}</span>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-[#284ce3] transition-colors">{s.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Features */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            >
              {[
                { n: "01", title: "AI Animations", desc: "Generates interactive HTML/CSS/JS animations for any concept in seconds." },
                { n: "02", title: "Voice Narration", desc: "Synchronized voice explains each step as the animation plays in real time." },
                { n: "03", title: "Ask Follow-ups", desc: "Chat with AI to go deeper into any part of the visual explanation." },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                  <span className="text-3xl font-extrabold text-gray-100">{c.n}</span>
                  <h3 className="text-sm font-bold text-gray-800 mt-2 mb-1">{c.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          /* ══ Active Player ══ */
          <motion.div
            key="player"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#284ce3] flex items-center justify-center shadow-md shadow-blue-200/40">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{activeTopic}</h2>
                  <p className="text-xs text-gray-400">Visual explanation</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setActiveTopic(""); setTimeout(() => setActiveTopic(topic), 50); }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> New Topic
                </button>
              </div>
            </div>

            {/* Mode toggle: Visual / Sign Language */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setShowSignLang(false)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  !showSignLang ? "bg-[#284ce3] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Visual Animation
              </button>
              <button
                onClick={() => setShowSignLang(true)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
                  showSignLang ? "bg-[#284ce3] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Hand className="w-3.5 h-3.5" /> Sign Language
              </button>
            </div>

            {/* Animation or Sign Language */}
            {showSignLang ? (
              <SignLanguagePlayer topic={activeTopic} />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <AnimationPlayer
                  topic={activeTopic}
                  classLevel="10"
                  language={localStorage.getItem("app_language") || "en"}
                />
              </div>
            )}

            {/* Chat */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-800 mb-4">
                Ask follow-up questions about &ldquo;{activeTopic}&rdquo;
              </h3>

              {chatHistory.length > 0 && (
                <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
                  {chatHistory.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
                        m.role === "user" ? "bg-[#284ce3]" : "bg-gray-100"
                      }`}>
                        {m.role === "user"
                          ? <User className="w-4 h-4 text-white" />
                          : <Bot className="w-4 h-4 text-gray-500" />}
                      </div>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                        m.role === "user"
                          ? "bg-[#284ce3] text-white"
                          : "bg-gray-50 text-gray-700 border border-gray-100"
                      }`}>
                        <ReactMarkdown components={{
                          p: ({ children }: any) => <p className="mb-1 last:mb-0">{children}</p>,
                          strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
                        }}>{m.content}</ReactMarkdown>
                      </div>
                    </motion.div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              <form onSubmit={e => { e.preventDefault(); handleChat(); }} className="flex gap-2.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask anything about this topic..."
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#284ce3]/20 focus:border-[#284ce3] transition"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-4 py-3 bg-[#284ce3] text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
