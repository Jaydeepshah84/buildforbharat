"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Maximize2, Minimize2, Volume2, VolumeX, Loader2, ChevronRight } from "lucide-react";

interface Props {
  topic: string;
  classLevel?: string;
  language?: string;
  onNext?: () => void;
}

const BACKEND = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api") : "";
const getTtsUrl = () => {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `http://${host}:5001/tts`;
};

export default function AnimationPlayer({ topic, classLevel = "10", language = "en", onNext }: Props) {
  const [phase, setPhase] = useState<1 | 2>(1);
  const [htmlCode, setHtmlCode] = useState("");
  const [voiceScript, setVoiceScript] = useState("");
  const [title, setTitle] = useState("");
  const [explanation, setExplanation] = useState("");
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState("Preparing your lesson...");
  const [iframeKey, setIframeKey] = useState(0);
  const [speakingText, setSpeakingText] = useState("");
  const [sentenceIdx, setSentenceIdx] = useState(-1);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  const playingRef = useRef(true);
  const sentencesRef = useRef<string[]>([]);
  const currentSentenceRef = useRef(0);
  const speakingRef = useRef(false);
  const cancelSpeakRef = useRef(false);

  const topicTitle = typeof topic === "string" ? topic : (topic as any)?.title || "Topic";
  const langCode = (language === "hi" || language === "hindi") ? "hi" : "en";

  useEffect(() => { mutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);

  // Pre-load voices
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", () => window.speechSynthesis.getVoices());
  }, []);

  // ── Stream animation from pipeline ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setPhase(1); setHtmlCode(""); setVoiceScript(""); setSpeakingText("");
    stopAll();

    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

    fetch(`${BACKEND}/tutor/pipeline/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question: topicTitle, classLevel, language, style: "detailed" }),
    }).then(async resp => {
      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.phase && d.message) setStatus(d.message);
            if (d.visual_code && d.explanation && !d.visual_code.includes("loader")) {
              setHtmlCode(d.visual_code);
              setVoiceScript(d.voice_script || d.explanation || "");
              setTitle(d.title || topicTitle);
              setExplanation(d.explanation || "");
              setDefinitions(d.definitions || []);
              setPhase(2);
              setLoading(false);
            } else if (d.visual_code) {
              setHtmlCode(d.visual_code);
              setTitle(d.title || topicTitle);
              setExplanation(d.explanation || "");
              setDefinitions(d.definitions || []);
              setVoiceScript(d.voice_script || "");
              setLoading(false);
            }
          } catch {}
        }
      }
      if (!cancelled) setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; stopAll(); };
  }, [topicTitle, classLevel, language]);

  const preloadedAudioRef = useRef<HTMLAudioElement[]>([]);
  const preloadingRef = useRef(false);

  // ── When phase 2 loads: preload ALL audio, THEN start animation + voice together ──
  useEffect(() => {
    if (phase !== 2) return;
    const text = voiceScript || explanation;
    if (!text) return;

    const sentences = splitSentences(text);
    sentencesRef.current = sentences;
    currentSentenceRef.current = 0;
    cancelSpeakRef.current = false;
    preloadedAudioRef.current = [];

    if (mutedRef.current) return;

    // Pause animation while we preload audio
    setTimeout(() => sendToIframe("pauseAnimation"), 100);
    setStatus("Loading voice narration...");

    // Preload all sentence audio in parallel
    preloadingRef.current = true;
    console.log(`[Voice] Preloading ${sentences.length} sentences, lang=${langCode}`);

    Promise.all(sentences.map(async (s, idx) => {
      try {
        const resp = await fetch(getTtsUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: s, language: langCode, speed: 1.0 }),
          signal: AbortSignal.timeout(20000),
        });
        if (resp.ok) {
          const blob = await resp.blob();
          if (blob.size > 200) {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            await new Promise<void>((resolve) => {
              audio.oncanplaythrough = () => resolve();
              audio.onerror = () => resolve();
              setTimeout(resolve, 5000); // Safety timeout
              audio.load();
            });
            console.log(`[Voice] Preloaded sentence ${idx + 1}/${sentences.length}`);
            return audio;
          }
        }
        console.warn(`[Voice] TTS failed for sentence ${idx + 1}, status=${resp.status}`);
      } catch (e) {
        console.warn(`[Voice] TTS error for sentence ${idx + 1}:`, e);
      }
      return null; // Will use browser speech as fallback
    })).then((audios) => {
      if (cancelSpeakRef.current) return;
      preloadedAudioRef.current = audios as any[];
      preloadingRef.current = false;

      const loaded = audios.filter(Boolean).length;
      console.log(`[Voice] Preload complete: ${loaded}/${sentences.length} loaded`);

      // NOW start both animation and voice together
      sendToIframe("resumeAnimation");
      setStatus("");
      speakSequential();
    }).catch((err) => {
      console.error("[Voice] Preload failed:", err);
      preloadingRef.current = false;
      sendToIframe("resumeAnimation");
      setStatus("");
    });

    return () => { cancelSpeakRef.current = true; stopAll(); };
  }, [phase, voiceScript, explanation]);

  // ── Split text into sentences (supports Hindi ।, English .!?) ──
  function splitSentences(text: string): string[] {
    const clean = text.replace(/[#*_`\[\]()>]/g, "").replace(/\n+/g, ". ").trim();
    // Split on sentence endings — Hindi uses । (danda), English uses .!?
    const raw = clean.split(/(?<=[.!?।])\s+/).filter(s => s.trim().length > 3);
    // If no splits found (e.g. single paragraph), split by commas or chunks of ~80 chars
    if (raw.length <= 1 && clean.length > 100) {
      const bySemiOrComma = clean.split(/[,;।]+/).filter(s => s.trim().length > 5);
      if (bySemiOrComma.length > 1) return bySemiOrComma.map(s => s.trim());
      // Last resort: chunk by ~80 chars at word boundaries
      const words = clean.split(/\s+/);
      const chunks: string[] = [];
      let current = "";
      for (const w of words) {
        if ((current + " " + w).length > 80 && current) { chunks.push(current.trim()); current = w; }
        else current += " " + w;
      }
      if (current.trim()) chunks.push(current.trim());
      return chunks;
    }
    if (raw.length === 0) return [clean];
    // Group into chunks of ~2 sentences for natural pacing
    const chunks: string[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      chunks.push(raw.slice(i, i + 2).join(" ").trim());
    }
    return chunks.filter(Boolean);
  }

  // ── Speak sentences one by one using pre-loaded audio ──
  async function speakSequential() {
    if (speakingRef.current) return;
    speakingRef.current = true;

    const sentences = sentencesRef.current;
    const preloaded = preloadedAudioRef.current;

    for (let i = currentSentenceRef.current; i < sentences.length; i++) {
      if (cancelSpeakRef.current || mutedRef.current) break;

      // Wait while paused
      while (!playingRef.current && !cancelSpeakRef.current) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (cancelSpeakRef.current) break;

      currentSentenceRef.current = i;
      setSentenceIdx(i);
      setSpeakingText(sentences[i]);

      // Play pre-loaded audio (instant!) or fall back to browser speech
      const audio = preloaded[i];
      if (audio) {
        await playPreloaded(audio);
      } else {
        await speakWithBrowserAsync(sentences[i]);
      }

      // Brief pause between sentences
      if (!cancelSpeakRef.current) await new Promise(r => setTimeout(r, 250));
    }

    speakingRef.current = false;
    setSpeakingText("");
    setSentenceIdx(-1);
  }

  // ── Play a pre-loaded audio element (instant, no network delay) ──
  function playPreloaded(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve) => {
      if (mutedRef.current || cancelSpeakRef.current) { resolve(); return; }
      audioRef.current = audio;
      audio.currentTime = 0;
      audio.onended = () => { audioRef.current = null; resolve(); };
      audio.onerror = () => { audioRef.current = null; resolve(); };
      audio.play().catch(() => resolve());
    });
  }

  // ── Browser speech fallback (async) ──
  function speakWithBrowserAsync(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || mutedRef.current || cancelSpeakRef.current) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.95;
      utt.lang = langCode === "hi" ? "hi-IN" : "en-US";
      const voices = window.speechSynthesis.getVoices();
      const pref = voices.find((v: any) => langCode === "hi" ? v.lang.startsWith("hi") : (v.name.includes("Google") && v.lang.startsWith("en")))
        || voices.find((v: any) => v.lang.startsWith("en"));
      if (pref) utt.voice = pref;
      utt.onend = () => resolve();
      utt.onerror = () => resolve();
      window.speechSynthesis.speak(utt);
    });
  }

  // ── Stop everything ──
  function stopAll() {
    cancelSpeakRef.current = true;
    speakingRef.current = false;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setSpeakingText("");
    setSentenceIdx(-1);
  }

  // ── Iframe controls — use postMessage (works with sandbox) + direct call fallback ──
  const sendToIframe = (fn: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return false;
    // Method 1: postMessage (always works with sandbox)
    try { iframe.contentWindow?.postMessage({ type: "animControl", fn }, "*"); } catch {}
    // Method 2: direct call (works when same-origin)
    try { const w = iframe.contentWindow as any; if (w?.[fn]) { w[fn](); return true; } } catch {}
    return false;
  };

  // ── Play/Pause — syncs both animation AND voice ──
  const handlePlayPause = () => {
    if (isPlaying) {
      sendToIframe("pauseAnimation");
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis?.pause();
      setIsPlaying(false);
    } else {
      sendToIframe("resumeAnimation");
      if (audioRef.current) audioRef.current.play();
      window.speechSynthesis?.resume();
      setIsPlaying(true);
    }
  };

  // ── Restart — reloads animation AND restarts voice from beginning ──
  const handleRestart = () => {
    stopAll();
    setIframeKey(prev => prev + 1);
    setIsPlaying(true);
    currentSentenceRef.current = 0;
    cancelSpeakRef.current = false;
    // Reset all preloaded audio to beginning
    preloadedAudioRef.current.forEach(a => { if (a) a.currentTime = 0; });
    if (!mutedRef.current && phase === 2) {
      // Audio is already preloaded — just restart playback
      setTimeout(() => { cancelSpeakRef.current = false; speakSequential(); }, 800);
    }
  };

  // ── Mute/Unmute ──
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      mutedRef.current = false;
      // Resume voice from current sentence
      if (phase === 2 && (voiceScript || explanation)) {
        cancelSpeakRef.current = false;
        if (!speakingRef.current) {
          setTimeout(() => speakSequential(), 200);
        }
      }
    } else {
      setIsMuted(true);
      mutedRef.current = true;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      window.speechSynthesis?.cancel();
      setSpeakingText("");
    }
  };

  // ── Fullscreen ──
  const toggleFS = () => {
    if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  };
  useEffect(() => {
    const h = () => { if (!document.fullscreenElement) setIsFullscreen(false); };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  useEffect(() => () => { stopAll(); }, []);

  // ── Loading ──
  if (loading && !htmlCode) {
    return (
      <div className="bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center" style={{ minHeight: 500 }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">{status}</p>
          <p className="text-gray-400 text-sm mt-1">"{topicTitle}"</p>
        </div>
      </div>
    );
  }

  const totalSentences = sentencesRef.current.length;

  return (
    <div ref={containerRef} className={`bg-gray-900 rounded-2xl overflow-hidden flex flex-col ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}`}
      style={{ minHeight: isFullscreen ? "100vh" : 500 }}>

      {/* Animation iframe with overlay subtitle */}
      <div className="flex-1 relative bg-[#0f172a]">
        {htmlCode && (
          <iframe key={iframeKey} ref={iframeRef} srcDoc={htmlCode} className="w-full h-full border-0"
            style={{ minHeight: isFullscreen ? "calc(100vh - 80px)" : 420 }}
            sandbox="allow-scripts allow-same-origin" title="Animation" />
        )}

        {/* Title overlay — top left */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10">
          <span className="text-xs text-white/80 font-medium truncate max-w-[60%]">{title || topicTitle}</span>
          <div className="flex items-center gap-2">
            {phase === 1 && <span className="text-xs text-purple-300 animate-pulse">Generating...</span>}
            {phase === 2 && speakingText && (
              <span className="text-xs text-green-300 flex items-center gap-1">
                <span className="flex gap-0.5">{[1,2,3].map(i => <span key={i} className="w-0.5 bg-green-400 rounded-full animate-pulse" style={{ height: 4 + Math.random() * 5, animationDelay: `${i * 150}ms` }} />)}</span>
                {sentenceIdx + 1}/{totalSentences}
              </span>
            )}
            {phase === 2 && preloadingRef.current && <span className="text-xs text-yellow-300 animate-pulse">Loading voice...</span>}
          </div>
        </div>

        {/* Subtitle overlay — bottom, inside animation */}
        {speakingText && (
          <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
            <div className="mx-auto max-w-2xl px-4 pb-3">
              <p className="text-sm text-white text-center leading-relaxed bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2.5 shadow-lg">
                {speakingText}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls — compact bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0f1a]">
        <div className="flex items-center gap-2">
          <button onClick={handleRestart} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition-colors" title="Restart">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={handlePlayPause}
            className={`w-9 h-9 rounded-full text-white flex items-center justify-center shadow-md transition-all ${
              isPlaying ? "bg-gradient-to-r from-purple-500 to-pink-600" : "bg-gradient-to-r from-green-500 to-emerald-600"
            }`}
            title={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleFS} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onNext && (
            <button onClick={() => { stopAll(); onNext(); }} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium flex items-center gap-1 transition-colors">
              Next <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Definitions — inline chips */}
      {definitions.length > 0 && (
        <div className="px-4 py-2 bg-[#0a0f1a] border-t border-white/5">
          <div className="flex flex-wrap gap-1.5">
            {definitions.map((d, i) => (
              <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                <strong>{d.term}:</strong> {d.meaning}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
