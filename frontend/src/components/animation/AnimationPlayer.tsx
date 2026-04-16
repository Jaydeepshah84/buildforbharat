"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Maximize2, Minimize2, Volume2, VolumeX, Loader2, ChevronRight, SkipForward, ThumbsUp, Bookmark } from "lucide-react";

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
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(100);
  const [showVolSlider, setShowVolSlider] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  const playingRef = useRef(true);
  const sentencesRef = useRef<string[]>([]);
  const currentSentenceRef = useRef(0);
  const speakingRef = useRef(false);
  const cancelSpeakRef = useRef(false);
  const controlsTimerRef = useRef<any>(null);

  const topicTitle = typeof topic === "string" ? topic : (topic as any)?.title || "Topic";
  const langCode = (language === "hi" || language === "hindi") ? "hi" : "en";

  useEffect(() => { mutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) setShowControls(true);
    else resetControlsTimer();
  }, [isPlaying]);

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

    setTimeout(() => sendToIframe("pauseAnimation"), 100);
    setStatus("Loading voice narration...");

    preloadingRef.current = true;

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
              setTimeout(resolve, 5000);
              audio.load();
            });
            return audio;
          }
        }
      } catch (e) {}
      return null;
    })).then((audios) => {
      if (cancelSpeakRef.current) return;
      preloadedAudioRef.current = audios as any[];
      preloadingRef.current = false;

      sendToIframe("resumeAnimation");
      setStatus("");
      speakSequential();
    }).catch(() => {
      preloadingRef.current = false;
      sendToIframe("resumeAnimation");
      setStatus("");
    });

    return () => { cancelSpeakRef.current = true; stopAll(); };
  }, [phase, voiceScript, explanation]);

  function splitSentences(text: string): string[] {
    const clean = text.replace(/[#*_`\[\]()>]/g, "").replace(/\n+/g, ". ").trim();
    const raw = clean.split(/(?<=[.!?।])\s+/).filter(s => s.trim().length > 3);
    if (raw.length <= 1 && clean.length > 100) {
      const bySemiOrComma = clean.split(/[,;।]+/).filter(s => s.trim().length > 5);
      if (bySemiOrComma.length > 1) return bySemiOrComma.map(s => s.trim());
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
    const chunks: string[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      chunks.push(raw.slice(i, i + 2).join(" ").trim());
    }
    return chunks.filter(Boolean);
  }

  async function speakSequential() {
    if (speakingRef.current) return;
    speakingRef.current = true;

    const sentences = sentencesRef.current;
    const preloaded = preloadedAudioRef.current;

    for (let i = currentSentenceRef.current; i < sentences.length; i++) {
      if (cancelSpeakRef.current || mutedRef.current) break;
      while (!playingRef.current && !cancelSpeakRef.current) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (cancelSpeakRef.current) break;

      currentSentenceRef.current = i;
      setSentenceIdx(i);
      setSpeakingText(sentences[i]);

      const audio = preloaded[i];
      if (audio) {
        await playPreloaded(audio);
      } else {
        await speakWithBrowserAsync(sentences[i]);
      }

      if (!cancelSpeakRef.current) await new Promise(r => setTimeout(r, 250));
    }

    speakingRef.current = false;
    setSpeakingText("");
    setSentenceIdx(-1);
  }

  function playPreloaded(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve) => {
      if (mutedRef.current || cancelSpeakRef.current) { resolve(); return; }
      audioRef.current = audio;
      audio.currentTime = 0;
      audio.volume = volume / 100;
      audio.onended = () => { audioRef.current = null; resolve(); };
      audio.onerror = () => { audioRef.current = null; resolve(); };
      audio.play().catch(() => resolve());
    });
  }

  function speakWithBrowserAsync(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || mutedRef.current || cancelSpeakRef.current) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.95;
      utt.volume = volume / 100;
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

  function stopAll() {
    cancelSpeakRef.current = true;
    speakingRef.current = false;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setSpeakingText("");
    setSentenceIdx(-1);
  }

  const sendToIframe = (fn: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return false;
    try { iframe.contentWindow?.postMessage({ type: "animControl", fn }, "*"); } catch {}
    try { const w = iframe.contentWindow as any; if (w?.[fn]) { w[fn](); return true; } } catch {}
    return false;
  };

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

  const handleRestart = () => {
    stopAll();
    setIframeKey(prev => prev + 1);
    setIsPlaying(true);
    currentSentenceRef.current = 0;
    cancelSpeakRef.current = false;
    preloadedAudioRef.current.forEach(a => { if (a) a.currentTime = 0; });
    if (!mutedRef.current && phase === 2) {
      setTimeout(() => { cancelSpeakRef.current = false; speakSequential(); }, 800);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      mutedRef.current = false;
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

  const totalSentences = sentencesRef.current.length;
  const voiceProgress = totalSentences > 0 ? ((sentenceIdx + 1) / totalSentences) * 100 : 0;

  // ── Loading ──
  if (loading && !htmlCode) {
    return (
      <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center aspect-video w-full">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-4" />
          <p className="text-white font-medium text-sm">{status}</p>
          <p className="text-gray-400 text-xs mt-1">"{topicTitle}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* ── YouTube-style Player ── */}
      <div
        ref={containerRef}
        className={`bg-black overflow-hidden flex flex-col relative group ${isFullscreen ? "fixed inset-0 z-50" : "rounded-xl"}`}
        onMouseMove={resetControlsTimer}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        style={{ aspectRatio: isFullscreen ? undefined : "16/9", height: isFullscreen ? "100vh" : undefined }}
      >
        {/* Animation iframe */}
        <div className="flex-1 relative bg-[#0f172a] cursor-pointer" onClick={handlePlayPause}>
          {htmlCode && (
            <iframe
              key={iframeKey}
              ref={iframeRef}
              srcDoc={htmlCode}
              className="w-full h-full border-0"
              style={{ minHeight: isFullscreen ? "calc(100vh - 56px)" : undefined }}
              sandbox="allow-scripts allow-same-origin"
              title="Animation"
            />
          )}

          {/* Center play button on pause */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />
              </div>
            </div>
          )}

          {/* Speaking indicator */}
          {speakingText && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <div className="flex gap-0.5 items-end">
                {[1,2,3,4].map(i => (
                  <span key={i} className="w-0.5 bg-red-500 rounded-full animate-pulse" style={{ height: 4 + Math.random() * 8, animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
              <span className="text-[10px] text-white/70">{sentenceIdx + 1}/{totalSentences}</span>
            </div>
          )}

          {/* Subtitle overlay */}
          {speakingText && (
            <div className="absolute bottom-12 left-0 right-0 z-10 pointer-events-none">
              <div className="mx-auto max-w-2xl px-4">
                <p className="text-sm text-white text-center leading-relaxed bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2.5 shadow-lg">
                  {speakingText}
                </p>
              </div>
            </div>
          )}

          {/* Loading voice overlay */}
          {phase === 2 && preloadingRef.current && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
              <span className="text-[10px] text-yellow-300">Loading voice...</span>
            </div>
          )}
        </div>

        {/* ── YouTube-style bottom controls ── */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}`}
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}
        >
          {/* Red progress bar */}
          <div className="relative h-[3px] group/progress hover:h-[5px] transition-all cursor-pointer mx-0">
            <div className="absolute inset-0 bg-white/20" />
            <div className="absolute inset-y-0 left-0 bg-red-600 transition-all duration-300" style={{ width: `${voiceProgress}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-600 opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-md"
              style={{ left: `${voiceProgress}%`, transform: "translate(-50%, -50%)" }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between px-3 py-2">
            {/* Left controls */}
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>

              {/* Volume */}
              <div className="relative flex items-center"
                onMouseEnter={() => setShowVolSlider(true)}
                onMouseLeave={() => setShowVolSlider(false)}>
                <button onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                  className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                {showVolSlider && (
                  <div className="flex items-center ml-0">
                    <input
                      type="range" min={0} max={100} value={isMuted ? 0 : volume}
                      onChange={(e) => { setVolume(Number(e.target.value)); if (Number(e.target.value) > 0) setIsMuted(false); }}
                      className="w-16 h-1 appearance-none bg-white/30 rounded-full cursor-pointer accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>

              {/* Sentence counter as time */}
              {totalSentences > 0 && (
                <span className="text-xs text-white/70 ml-2 font-mono tabular-nums">
                  {sentenceIdx >= 0 ? sentenceIdx + 1 : 0}:{totalSentences.toString().padStart(2, "0")}
                </span>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); handleRestart(); }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors" title="Restart">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleFS(); }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Below player: YouTube-style info ── */}
      <div className="mt-3 px-1">
        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
          {title || topicTitle}
        </h1>

        {/* Actions row */}
        <div className="flex items-center justify-between mt-3 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>Visual Explanation</span>
            {totalSentences > 0 && <span>{totalSentences} narration segments</span>}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setLiked(!liked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${liked ? "bg-blue-100 text-blue-700" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
              <ThumbsUp className={`w-4 h-4 ${liked ? "fill-blue-700" : ""}`} />
              Like
            </button>
            <button onClick={() => setSaved(!saved)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${saved ? "bg-blue-100 text-blue-700" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
              <Bookmark className={`w-4 h-4 ${saved ? "fill-blue-700" : ""}`} />
              Save
            </button>
            {onNext && (
              <button onClick={() => { stopAll(); onNext(); }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors ml-2">
                Next Topic
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Definitions */}
        {definitions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {definitions.map((d, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700">
                <strong>{d.term}:</strong> {d.meaning}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
