"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Maximize2, Minimize2, ChevronRight, ChevronLeft,
  RotateCcw, Loader2,
} from 'lucide-react';


const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const COLORS = [
  'from-indigo-600 to-purple-700', 'from-blue-600 to-cyan-600',
  'from-purple-600 to-pink-600', 'from-teal-600 to-emerald-600',
  'from-orange-500 to-red-500', 'from-violet-600 to-indigo-600',
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

export default function AdaptiveLesson({ topic, language = 'en', onNext, onPrev, lowBandwidth = false }: any) {
  const [slides, setSlides] = useState<{ content: string }[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef(false);
  const slidesRef = useRef<{ content: string }[]>([]);
  const mutedRef = useRef(false);

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

  // ── Speak one slide ───────────────────────────────────
  function speakText(text: string): Promise<void> {
    return new Promise(async (resolve) => {
      if (!text || mutedRef.current || stopRef.current) { resolve(); return; }
      const clean = text.replace(/[#*_`\[\]()>|]/g, '').replace(/\n+/g, '. ').trim();
      if (!clean) { resolve(); return; }

      // Stop any previous audio first
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
        // Auto-play voice when content loads
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

  useEffect(() => () => { stopRef.current = true; stopCurrentAudio(); }, []);

  const progress = slides.length > 0 ? ((currentSlide + 1) / slides.length) * 100 : 0;
  const slide = slides[currentSlide] || { content: '' };
  const bg = COLORS[currentSlide % COLORS.length];

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center" style={{ minHeight: 500 }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">AI Teacher is preparing your lesson...</p>
          <p className="text-gray-400 text-sm mt-1">"{topicTitle}"</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`bg-gray-900 rounded-2xl overflow-hidden flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
      style={{ minHeight: isFullscreen ? '100vh' : 500 }}>

      <div className="flex items-center justify-between px-4 py-2 bg-black/50 z-20">
        <span className="text-xs text-gray-300 truncate max-w-[250px]">{topicTitle}</span>
        <span className="text-xs text-gray-500">{currentSlide + 1}/{slides.length}</span>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={currentSlide} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.35 }} className={`absolute inset-0 bg-gradient-to-br ${bg} flex items-center justify-center p-6 md:p-10`}>
            <div className="max-w-2xl w-full">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="text-base md:text-lg text-white/90 leading-relaxed bg-white/10 backdrop-blur-sm rounded-xl p-5 md:p-8 max-h-[320px] overflow-y-auto">
                <ReactMarkdown components={{
                  p: ({ children }: any) => <p className="mb-3 last:mb-0">{children}</p>,
                  strong: ({ children }: any) => <strong className="text-yellow-300">{children}</strong>,
                  li: ({ children }: any) => <li className="ml-4 mb-1 list-disc">{children}</li>,
                }}>{slide.content}</ReactMarkdown>
              </motion.div>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          </motion.div>
        </AnimatePresence>

        {currentSlide > 0 && (
          <button onClick={() => goTo(currentSlide - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white z-10 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {currentSlide < slides.length - 1 && (
          <button onClick={() => goTo(currentSlide + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white z-10 flex items-center justify-center">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="h-1 bg-gray-800">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center justify-between px-4 py-3 bg-black/60">
        <div className="flex items-center gap-2">
          <button onClick={handleRestart} className="p-2 rounded-lg hover:bg-white/10 text-gray-400"><RotateCcw className="w-4 h-4" /></button>
          <button onClick={() => goTo(currentSlide - 1)} disabled={currentSlide === 0} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-30"><SkipBack className="w-4 h-4" /></button>
          <button onClick={handlePlay} className="w-11 h-11 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button onClick={() => goTo(currentSlide + 1)} disabled={currentSlide >= slides.length - 1} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-30"><SkipForward className="w-4 h-4" /></button>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentSlide ? 'bg-indigo-400 w-5' : i < currentSlide ? 'bg-indigo-600' : 'bg-gray-600'}`} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Volume button removed */}
          <button onClick={toggleFS} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {onNext && (
            <button onClick={onNext} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1">
              Next <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
