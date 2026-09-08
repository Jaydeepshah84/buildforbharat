"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Maximize2, Minimize2, ChevronRight, ChevronLeft,
  RotateCcw, Loader2, Settings, ThumbsUp, ThumbsDown,
  Share2, Bookmark, MoreHorizontal,
} from 'lucide-react';


const API = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? `http://${window.location.hostname}:5050/api`
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api');

const COLORS = [
  'from-primary-600 to-primary-700', 'from-primary-600 to-cyan-600',
  'from-primary-600 to-pink-600', 'from-teal-600 to-emerald-600',
  'from-orange-500 to-red-500', 'from-primary-600 to-primary-600',
];

function splitIntoSlides(text: string) {
  if (!text) return [];
  const parts = text.split(/\n\n+/).filter((p: string) => p.trim());
  if (parts.length === 0) return [{ content: text }];
  if (parts.length === 1) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const slides: { content: string }[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      slides.push({ content: sentences.slice(i, i + 2).join(' ').trim() });
    }
    return slides.length > 0 ? slides : [{ content: text }];
  }
  return parts.map((p: string) => ({ content: p.trim() }));
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AdaptiveLesson({ topic, language = 'en', onNext, onPrev, lowBandwidth = false }: any) {
  const [slides, setSlides] = useState<{ content: string }[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(100);
  const [showVolSlider, setShowVolSlider] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef(false);
  const slidesRef = useRef<{ content: string }[]>([]);
  const mutedRef = useRef(false);
  const controlsTimerRef = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const topicTitle = typeof topic === 'string' ? topic : (topic?.title || 'Topic');

  // Keep refs in sync
  useEffect(() => { slidesRef.current = slides; }, [slides]);
  useEffect(() => { mutedRef.current = isMuted; }, [isMuted]);

  // Load voices
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
  }, []);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  function stopCurrentAudio() {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }

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

  // ── Speak one slide ───────────────────────────────────
  function speakText(text: string): Promise<void> {
    return new Promise(async (resolve) => {
      if (!text || mutedRef.current || stopRef.current) { resolve(); return; }
      const clean = text.replace(/[#*_`\[\]()>|]/g, '').replace(/\n+/g, '. ').trim();
      if (!clean) { resolve(); return; }

      stopCurrentAudio();
      setIsSpeaking(true);

      const isHindi = language === 'hi' || language === 'hindi';
      const langCode = isHindi ? 'hi' : 'en';
      const ttsHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const ttsUrl = `http://${ttsHost}:5001/tts`;
      try {
        const resp = await fetch(ttsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean, language: langCode, speed: 1.0 }),
          signal: AbortSignal.timeout(20000),
        });
        if (resp.ok) {
          const blob = await resp.blob();
          if (blob.size > 200 && !stopRef.current) {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.volume = volume / 100;
            currentAudioRef.current = audio;
            audio.onended = () => { currentAudioRef.current = null; setIsSpeaking(false); URL.revokeObjectURL(url); resolve(); };
            audio.onerror = () => { currentAudioRef.current = null; setIsSpeaking(false); URL.revokeObjectURL(url); resolve(); };
            if (!stopRef.current) await audio.play();
            else { URL.revokeObjectURL(url); resolve(); }
            return;
          }
        }
      } catch {}

      // Fallback: browser SpeechSynthesis
      if (!window.speechSynthesis || stopRef.current) { setIsSpeaking(false); resolve(); return; }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(clean);
      utt.rate = 0.95;
      utt.volume = volume / 100;
      utt.lang = isHindi ? 'hi-IN' : 'en-US';
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((x: any) => isHindi ? x.lang.startsWith('hi') : (x.name.includes('Google') && x.lang.startsWith('en')))
        || voices.find((x: any) => x.lang.startsWith('en'));
      if (v) utt.voice = v;
      utt.onend = () => { setIsSpeaking(false); resolve(); };
      utt.onerror = () => { setIsSpeaking(false); resolve(); };
      window.speechSynthesis.speak(utt);
    });
  }

  // ── Fetch content ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSlides([]);
    setCurrentSlide(0);
    stopRef.current = true;
    setIsPlaying(false);
    window.speechSynthesis?.cancel();

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const langMap: Record<string, string> = { hi: 'Hindi', hindi: 'Hindi', gu: 'Gujarati', gujarati: 'Gujarati', es: 'Spanish' };
    const li = langMap[language] ? ` Respond entirely in ${langMap[language]}.` : '';

    fetch(`${API}/voice/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message: `Explain "${topicTitle}" clearly for a student. Use examples. Write 4-5 short paragraphs.${li}`,
        topic: topicTitle, history: [],
      }),
    }).then(async resp => {
      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.text) full += d.text; } catch {}
        }
      }
      if (!cancelled && full) {
        setSlides(splitIntoSlides(full));
        setLoading(false);
        setTimeout(() => {
          if (!mutedRef.current) {
            setIsPlaying(true);
            slidesRef.current = splitIntoSlides(full);
            playFrom(0);
          }
        }, 500);
      }
    }).catch(() => {
      if (!cancelled) { setSlides([{ content: 'Unable to load content.' }]); setLoading(false); }
    });

    return () => { cancelled = true; window.speechSynthesis?.cancel(); };
  }, [topicTitle, language]);

  // ── Play loop ─────────────────────────────────────────
  async function playFrom(idx: number) {
    stopRef.current = false;
    const sl = slidesRef.current;

    for (let i = idx; i < sl.length; i++) {
      if (stopRef.current) return;
      setCurrentSlide(i);
      await speakText(sl[i].content);
      if (stopRef.current) return;
      await new Promise(r => setTimeout(r, 700));
    }
    setIsPlaying(false);
  }

  function handlePlay() {
    if (isPlaying) {
      stopRef.current = true;
      stopCurrentAudio();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playFrom(currentSlide);
    }
  }

  function goTo(idx: number) {
    stopRef.current = true;
    stopCurrentAudio();
    const c = Math.max(0, Math.min(idx, slides.length - 1));
    setCurrentSlide(c);
    if (isPlaying) setTimeout(() => playFrom(c), 200);
  }

  function handleRestart() {
    stopRef.current = true;
    stopCurrentAudio();
    setIsPlaying(false);
    setCurrentSlide(0);
  }

  function toggleFS() {
    if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  }

  useEffect(() => {
    const h = () => { if (!document.fullscreenElement) setIsFullscreen(false); };
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  useEffect(() => () => { stopRef.current = true; stopCurrentAudio(); }, []);

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressBarRef.current || slides.length === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(pct * (slides.length - 1));
    goTo(idx);
  };

  const handleProgressHover = (e: React.MouseEvent) => {
    if (!progressBarRef.current || slides.length === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverProgress(pct);
  };

  const progress = slides.length > 0 ? ((currentSlide + 1) / slides.length) * 100 : 0;
  const progressFraction = slides.length > 0 ? (currentSlide / Math.max(1, slides.length - 1)) : 0;
  const slide = slides[currentSlide] || { content: '' };
  const bg = COLORS[currentSlide % COLORS.length];

  // Estimated time per slide ~15 seconds
  const estimatedCurrentTime = currentSlide * 15;
  const estimatedTotalTime = slides.length * 15;

  if (loading) {
    return (
      <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center aspect-video w-full">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-4" />
          <p className="text-white font-medium text-sm">AI Teacher is preparing your lesson...</p>
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
        className={`bg-black overflow-hidden flex flex-col relative group ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-xl'}`}
        onMouseMove={resetControlsTimer}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        style={{ aspectRatio: isFullscreen ? undefined : '16/9', height: isFullscreen ? '100vh' : undefined }}
      >
        {/* ── Main slide area ── */}
        <div className="flex-1 relative overflow-hidden cursor-pointer" onClick={handlePlay}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`absolute inset-0 bg-gradient-to-br ${bg} flex items-center justify-center p-6 md:p-12`}
            >
              <div className="max-w-3xl w-full">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-base md:text-lg lg:text-xl text-white/95 leading-relaxed bg-black/20 backdrop-blur-sm rounded-xl p-6 md:p-8 max-h-[60vh] overflow-y-auto"
                >
                  <ReactMarkdown components={{
                    p: ({ children }: any) => <p className="mb-3 last:mb-0">{children}</p>,
                    strong: ({ children }: any) => <strong className="text-yellow-300 font-bold">{children}</strong>,
                    li: ({ children }: any) => <li className="ml-4 mb-1 list-disc">{children}</li>,
                  }}>{slide.content}</ReactMarkdown>
                </motion.div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            </motion.div>
          </AnimatePresence>

          {/* Center play button on pause */}
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <div className="flex gap-0.5 items-end">
                {[1,2,3,4].map(i => (
                  <span key={i} className="w-0.5 bg-red-500 rounded-full animate-pulse" style={{ height: 4 + Math.random() * 8, animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
              <span className="text-[10px] text-white/70">LIVE</span>
            </div>
          )}
        </div>

        {/* ── YouTube-style bottom controls ── */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}
        >
          {/* Red progress bar (YouTube style) */}
          <div
            ref={progressBarRef}
            className="relative h-[3px] group/progress hover:h-[5px] transition-all cursor-pointer mx-0"
            onClick={handleProgressClick}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverProgress(null)}
          >
            {/* Buffer / background */}
            <div className="absolute inset-0 bg-white/20" />
            {/* Played progress */}
            <div className="absolute inset-y-0 left-0 bg-red-600 transition-all duration-150" style={{ width: `${progressFraction * 100}%` }} />
            {/* Hover preview */}
            {hoverProgress !== null && (
              <div className="absolute inset-y-0 left-0 bg-white/20" style={{ width: `${hoverProgress * 100}%` }} />
            )}
            {/* Scrubber dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-600 opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-md"
              style={{ left: `${progressFraction * 100}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between px-3 py-2">
            {/* Left controls */}
            <div className="flex items-center gap-1">
              {/* Prev slide */}
              <button
                onClick={(e) => { e.stopPropagation(); goTo(currentSlide - 1); }}
                disabled={currentSlide === 0}
                className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              {/* Play/Pause */}
              <button
                onClick={(e) => { e.stopPropagation(); handlePlay(); }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              {/* Next slide */}
              <button
                onClick={(e) => { e.stopPropagation(); goTo(currentSlide + 1); }}
                disabled={currentSlide >= slides.length - 1}
                className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Volume */}
              <div
                className="relative flex items-center"
                onMouseEnter={() => setShowVolSlider(true)}
                onMouseLeave={() => setShowVolSlider(false)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                  className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                >
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

              {/* Time display */}
              <span className="text-xs text-white/70 ml-2 font-mono tabular-nums">
                {formatTime(estimatedCurrentTime)} / {formatTime(estimatedTotalTime)}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              {/* Slide indicator */}
              <span className="text-xs text-white/50 mr-2 hidden sm:block">
                Slide {currentSlide + 1} of {slides.length}
              </span>
              {/* Restart */}
              <button
                onClick={(e) => { e.stopPropagation(); handleRestart(); }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              {/* Fullscreen */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFS(); }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Below player: YouTube-style info section ── */}
      <div className="mt-3 px-1">
        {/* Title */}
        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
          {topicTitle}
        </h1>

        {/* Actions row */}
        <div className="flex items-center justify-between mt-3 pb-3 border-b border-gray-200">
          {/* Left: slide info */}
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{slides.length} slides</span>
            <span>~{Math.ceil(estimatedTotalTime / 60)} min</span>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLiked(!liked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${liked ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            >
              <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-blue-700' : ''}`} />
              Like
            </button>
            <button
              onClick={() => setSaved(!saved)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${saved ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-blue-700' : ''}`} />
              Save
            </button>
            {onNext && (
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors ml-2"
              >
                Next Topic
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
