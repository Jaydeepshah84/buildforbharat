"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Hand } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";

interface Sign {
  word: string;
  gesture: string;
  handShape: string;
  movement: string;
  position: string;
  emoji: string;
}

interface SignLanguagePlayerProps {
  topic: string;
  compact?: boolean;
}

export default function SignLanguagePlayer({ topic, compact = false }: SignLanguagePlayerProps) {
  const [signs, setSigns] = useState<Sign[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fullSentence, setFullSentence] = useState("");
  const [animationHtml, setAnimationHtml] = useState("");
  const [showAnimation, setShowAnimation] = useState(false);
  const [loadingAnimation, setLoadingAnimation] = useState(false);
  const intervalRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch sign breakdown
  const fetchSigns = async () => {
    setLoading(true);
    setSigns([]);
    setCurrentIndex(0);
    setFullSentence("");

    try {
      const token = localStorage.getItem("token") || "";
      const resp = await fetch(`${API}/sign-language/explain-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic }),
      });

      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      const collectedSigns: Sign[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.phase === "ready") setFullSentence(d.fullSentence || "");
            if (d.phase === "sign") {
              collectedSigns.push(d as Sign);
              setSigns([...collectedSigns]);
            }
          } catch {}
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  // Fetch full animation
  const fetchAnimation = async () => {
    setLoadingAnimation(true);
    try {
      const token = localStorage.getItem("token") || "";
      const resp = await fetch(`${API}/sign-language/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic }),
      });
      const data = await resp.json();
      if (data.html) {
        setAnimationHtml(data.html);
        setShowAnimation(true);
      }
    } catch {} finally {
      setLoadingAnimation(false);
    }
  };

  useEffect(() => {
    if (topic) fetchSigns();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [topic]);

  // Auto-play
  useEffect(() => {
    if (playing && signs.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= signs.length - 1) {
            setPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 2500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, signs.length]);

  const currentSign = signs[currentIndex];

  if (loading) {
    return (
      <div className={`bg-[#1a1a2e] rounded-2xl p-8 text-center ${compact ? "p-5" : ""}`}>
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
        <p className="text-white/60 text-sm">Generating sign language breakdown...</p>
      </div>
    );
  }

  if (signs.length === 0) return null;

  return (
    <div className={`bg-[#1a1a2e] rounded-2xl overflow-hidden ${compact ? "" : "shadow-xl"}`}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hand className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-white">Sign Language</span>
          <span className="text-xs text-white/40">ISL</span>
        </div>
        <div className="flex items-center gap-2">
          {!showAnimation && (
            <button
              onClick={fetchAnimation}
              disabled={loadingAnimation}
              className="px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-medium hover:bg-yellow-500/30 transition disabled:opacity-50"
            >
              {loadingAnimation ? "Loading..." : "Full Animation"}
            </button>
          )}
          {showAnimation && (
            <button
              onClick={() => setShowAnimation(false)}
              className="px-3 py-1 rounded-lg bg-white/10 text-white/60 text-xs font-medium hover:bg-white/20 transition"
            >
              Step View
            </button>
          )}
        </div>
      </div>

      {showAnimation && animationHtml ? (
        /* Full animation iframe */
        <div className="relative" style={{ height: compact ? 300 : 400 }}>
          <iframe
            ref={iframeRef}
            srcDoc={animationHtml}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Sign Language Animation"
          />
        </div>
      ) : (
        /* Step-by-step view */
        <>
          {/* Main sign display */}
          <div className="px-6 py-8 text-center" style={{ minHeight: compact ? 200 : 280 }}>
            <AnimatePresence mode="wait">
              {currentSign && (
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Emoji */}
                  <motion.div
                    className="text-6xl mb-4"
                    animate={{ rotateY: [0, 10, -10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  >
                    {currentSign.emoji || "🤟"}
                  </motion.div>

                  {/* Word */}
                  <h3 className="text-2xl font-extrabold text-white mb-2">
                    {currentSign.word}
                  </h3>

                  {/* Gesture description */}
                  <p className="text-white/60 text-sm max-w-md mx-auto mb-4">
                    {currentSign.gesture}
                  </p>

                  {/* Details */}
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
                      Hand: {currentSign.handShape}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300">
                      Move: {currentSign.movement}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300">
                      Position: {currentSign.position}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 pb-4">
            {signs.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIndex(i); setPlaying(false); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? "bg-yellow-400 w-6" : i < currentIndex ? "bg-white/40" : "bg-white/15"
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={() => { setCurrentIndex(0); setPlaying(false); }}
              className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setPlaying(!playing)}
                className="w-10 h-10 rounded-full bg-yellow-500 text-black flex items-center justify-center hover:bg-yellow-400 transition"
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => setCurrentIndex(Math.min(signs.length - 1, currentIndex + 1))}
                disabled={currentIndex === signs.length - 1}
                className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs text-white/40">
              {currentIndex + 1}/{signs.length}
            </span>
          </div>
        </>
      )}

      {/* ISL Gloss */}
      {fullSentence && (
        <div className="px-5 py-2.5 border-t border-white/10 bg-white/5">
          <p className="text-xs text-white/40">
            <span className="font-semibold text-white/60">ISL Gloss:</span> {fullSentence}
          </p>
        </div>
      )}
    </div>
  );
}
