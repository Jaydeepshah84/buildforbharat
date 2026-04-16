"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Play, Pause, SkipForward, SkipBack, Maximize2, Minimize2,
  ChevronRight, ChevronLeft, RotateCcw, Loader2, Hand,
  ThumbsUp, Bookmark, Settings, Type, ZoomIn, ZoomOut,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/* ── ISL (Indian Sign Language) fingerspelling hand shapes ── */
const ISL_SIGNS: Record<string, string> = {
  a: '🤛', b: '🖐', c: '🤏', d: '☝️', e: '✊', f: '🤞', g: '👈',
  h: '🤟', i: '🤙', j: '🤙', k: '✌️', l: '🤘', m: '✊', n: '✊',
  o: '👌', p: '👇', q: '👇', r: '🤞', s: '✊', t: '✊', u: '🤘',
  v: '✌️', w: '🤟', x: '🤞', y: '🤙', z: '☝️',
  ' ': '✋', '.': '👊', ',': '👊', '?': '🤔', '!': '👏',
};

/* Sign language gesture poses for the animated avatar */
const SIGN_POSES = [
  // Each pose is a set of CSS transforms for left/right hands
  { leftHand: 'rotate(-20deg) translateY(0px)', rightHand: 'rotate(20deg) translateY(0px)', label: 'neutral' },
  { leftHand: 'rotate(-40deg) translateY(-15px)', rightHand: 'rotate(10deg) translateY(5px)', label: 'explain-1' },
  { leftHand: 'rotate(-10deg) translateY(-25px)', rightHand: 'rotate(35deg) translateY(-20px)', label: 'explain-2' },
  { leftHand: 'rotate(-30deg) translateY(-10px) scaleX(-1)', rightHand: 'rotate(30deg) translateY(-10px)', label: 'emphasize' },
  { leftHand: 'rotate(0deg) translateY(-30px)', rightHand: 'rotate(0deg) translateY(-30px)', label: 'both-up' },
  { leftHand: 'rotate(-50deg) translateY(10px)', rightHand: 'rotate(50deg) translateY(-25px)', label: 'gesture-1' },
  { leftHand: 'rotate(-15deg) translateY(-20px) scale(1.1)', rightHand: 'rotate(40deg) translateY(-15px)', label: 'point' },
  { leftHand: 'rotate(-25deg) translateY(-5px)', rightHand: 'rotate(25deg) translateY(-5px) scaleX(-1)', label: 'mirror' },
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

/* Split text into short phrases for sign-by-sign display */
function splitIntoPhrases(text: string): string[] {
  const clean = text.replace(/[#*_`\[\]()>|]/g, '').replace(/\n+/g, ' ').trim();
  // Split into short phrases of ~4-6 words for readable signing pace
  const words = clean.split(/\s+/);
  const phrases: string[] = [];
  let current: string[] = [];
  for (const w of words) {
    current.push(w);
    if (current.length >= 5 || w.endsWith('.') || w.endsWith('!') || w.endsWith('?') || w.endsWith(',')) {
      phrases.push(current.join(' '));
      current = [];
    }
  }
  if (current.length > 0) phrases.push(current.join(' '));
  return phrases.filter(Boolean);
}

interface Props {
  topic: any;
  language?: string;
  onNext?: (() => void) | null;
  onPrev?: (() => void) | null;
}

export default function SignLanguagePlayer({ topic, language = 'en', onNext, onPrev }: Props) {
  const [slides, setSlides] = useState<{ content: string }[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [captionSize, setCaptionSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sign language animation state
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [phrases, setPhrases] = useState<string[]>([]);
  const [signPoseIdx, setSignPoseIdx] = useState(0);
  const [fingerSpellChar, setFingerSpellChar] = useState('');
  const [avatarExpression, setAvatarExpression] = useState<'neutral' | 'smile' | 'thinking' | 'emphasize'>('neutral');

  const containerRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef(false);
  const controlsTimerRef = useRef<any>(null);
  const slidesRef = useRef<{ content: string }[]>([]);

  const topicTitle = typeof topic === 'string' ? topic : (topic?.title || 'Topic');

  useEffect(() => { slidesRef.current = slides; }, [slides]);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) setShowControls(true);
    else resetControlsTimer();
  }, [isPlaying]);

  // ── Fetch content ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSlides([]);
    setCurrentSlide(0);
    stopRef.current = true;
    setIsPlaying(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const langMap: Record<string, string> = { hi: 'Hindi', hindi: 'Hindi', gu: 'Gujarati', gujarati: 'Gujarati', es: 'Spanish' };
    const li = langMap[language] ? ` Respond entirely in ${langMap[language]}.` : '';

    fetch(`${API}/voice/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message: `Explain "${topicTitle}" clearly for a student. Use simple language, short sentences. Write 4-5 short paragraphs. Keep sentences very clear and concise for sign language interpretation.${li}`,
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
        const sl = splitIntoSlides(full);
        setSlides(sl);
        setLoading(false);
        // Auto-play
        setTimeout(() => {
          setIsPlaying(true);
          slidesRef.current = sl;
          playFrom(0);
        }, 800);
      }
    }).catch(() => {
      if (!cancelled) { setSlides([{ content: 'Unable to load content.' }]); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [topicTitle, language]);

  // ── Sign language animation loop ──────────────────────
  async function animatePhrase(phrase: string): Promise<void> {
    return new Promise((resolve) => {
      if (stopRef.current) { resolve(); return; }
      setCurrentPhrase(phrase);

      // Animate through sign poses for the duration of the phrase
      const words = phrase.split(/\s+/);
      const totalDuration = Math.max(words.length * 600, 2000); // ~600ms per word, min 2s
      const poseInterval = totalDuration / (words.length + 1);

      let wordIdx = 0;
      const interval = setInterval(() => {
        if (stopRef.current) { clearInterval(interval); resolve(); return; }

        if (wordIdx < words.length) {
          const word = words[wordIdx];
          // Cycle sign pose
          setSignPoseIdx(prev => (prev + 1) % SIGN_POSES.length);
          // Show fingerspell of first letter
          setFingerSpellChar(ISL_SIGNS[word[0]?.toLowerCase()] || '🤲');
          // Change expression based on punctuation
          if (word.endsWith('?')) setAvatarExpression('thinking');
          else if (word.endsWith('!')) setAvatarExpression('emphasize');
          else if (wordIdx === words.length - 1) setAvatarExpression('smile');
          else setAvatarExpression('neutral');
          wordIdx++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, poseInterval);
    });
  }

  async function playSlide(slideIdx: number): Promise<void> {
    if (stopRef.current || slideIdx >= slidesRef.current.length) return;

    setCurrentSlide(slideIdx);
    const slideContent = slidesRef.current[slideIdx]?.content || '';
    const phrs = splitIntoPhrases(slideContent);
    setPhrases(phrs);

    for (let i = 0; i < phrs.length; i++) {
      if (stopRef.current) return;
      setCurrentPhraseIdx(i);
      await animatePhrase(phrs[i]);
      if (stopRef.current) return;
      // Pause between phrases
      await new Promise(r => setTimeout(r, 400));
    }

    // Brief pause at end of slide
    await new Promise(r => setTimeout(r, 800));
  }

  async function playFrom(idx: number) {
    stopRef.current = false;
    const sl = slidesRef.current;

    for (let i = idx; i < sl.length; i++) {
      if (stopRef.current) return;
      await playSlide(i);
    }
    setIsPlaying(false);
    setAvatarExpression('smile');
  }

  function handlePlay() {
    if (isPlaying) {
      stopRef.current = true;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playFrom(currentSlide);
    }
  }

  function goTo(idx: number) {
    stopRef.current = true;
    const c = Math.max(0, Math.min(idx, slides.length - 1));
    setCurrentSlide(c);
    setCurrentPhrase('');
    setPhrases([]);
    setCurrentPhraseIdx(0);
    if (isPlaying) setTimeout(() => playFrom(c), 300);
  }

  function handleRestart() {
    stopRef.current = true;
    setIsPlaying(false);
    setCurrentSlide(0);
    setCurrentPhrase('');
    setCurrentPhraseIdx(0);
    setAvatarExpression('neutral');
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

  useEffect(() => () => { stopRef.current = true; }, []);

  const progress = slides.length > 0 ? ((currentSlide + 1) / slides.length) * 100 : 0;
  const progressFraction = slides.length > 0 ? (currentSlide / Math.max(1, slides.length - 1)) : 0;
  const slide = slides[currentSlide] || { content: '' };
  const currentPose = SIGN_POSES[signPoseIdx];

  const captionSizeClasses = {
    normal: 'text-base md:text-lg',
    large: 'text-lg md:text-xl lg:text-2xl',
    xlarge: 'text-xl md:text-2xl lg:text-3xl',
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="bg-[#1a1a2e] rounded-xl overflow-hidden flex items-center justify-center aspect-video w-full">
        <div className="text-center">
          <div className="relative mx-auto w-20 h-20 mb-5">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-2 border-purple-500/30 border-t-purple-400"
            />
            <div className="absolute inset-3 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Hand className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <p className="text-white font-medium text-sm">Preparing Sign Language Lesson...</p>
          <p className="text-gray-400 text-xs mt-1">"{topicTitle}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* ── Sign Language Player ── */}
      <div
        ref={containerRef}
        className={`bg-[#1a1a2e] overflow-hidden flex flex-col relative group ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-xl'}`}
        onMouseMove={resetControlsTimer}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        style={{ aspectRatio: isFullscreen ? undefined : '16/9', height: isFullscreen ? '100vh' : undefined }}
      >
        {/* ── Main content area — split into Avatar + Caption ── */}
        <div className="flex-1 relative overflow-hidden flex" onClick={handlePlay}>
          {/* Left: Animated Sign Language Avatar */}
          <div className="w-[45%] lg:w-[40%] relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
            {/* Avatar body */}
            <div className="relative" style={{ width: '80%', maxWidth: 280 }}>
              {/* Head */}
              <motion.div
                animate={{
                  rotateZ: avatarExpression === 'thinking' ? [-2, 2, -2] : [0, 0],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="relative mx-auto"
                style={{ width: '55%' }}
              >
                {/* Face circle */}
                <div className="aspect-square rounded-full bg-gradient-to-b from-[#f4c28f] to-[#e8a86d] relative overflow-hidden shadow-lg">
                  {/* Eyes */}
                  <div className="absolute top-[38%] left-[22%] w-[16%] h-[12%] bg-white rounded-full flex items-center justify-center">
                    <motion.div
                      animate={{ y: avatarExpression === 'thinking' ? [-1, 1] : 0 }}
                      transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                      className="w-[55%] h-[65%] bg-[#2d1b0e] rounded-full"
                    />
                  </div>
                  <div className="absolute top-[38%] right-[22%] w-[16%] h-[12%] bg-white rounded-full flex items-center justify-center">
                    <motion.div
                      animate={{ y: avatarExpression === 'thinking' ? [-1, 1] : 0 }}
                      transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                      className="w-[55%] h-[65%] bg-[#2d1b0e] rounded-full"
                    />
                  </div>
                  {/* Eyebrows */}
                  <motion.div
                    animate={{
                      y: avatarExpression === 'emphasize' ? -3 : avatarExpression === 'thinking' ? -2 : 0,
                    }}
                    className="absolute top-[30%] left-[20%] w-[18%] h-[3%] bg-[#5a3a1a] rounded-full"
                  />
                  <motion.div
                    animate={{
                      y: avatarExpression === 'emphasize' ? -3 : avatarExpression === 'thinking' ? -1 : 0,
                      rotate: avatarExpression === 'thinking' ? 8 : 0,
                    }}
                    className="absolute top-[30%] right-[20%] w-[18%] h-[3%] bg-[#5a3a1a] rounded-full"
                  />
                  {/* Mouth */}
                  <motion.div
                    animate={{
                      scaleX: avatarExpression === 'smile' ? 1.2 : 1,
                      borderRadius: avatarExpression === 'smile' ? '0 0 50% 50%' : '50%',
                    }}
                    className="absolute bottom-[25%] left-1/2 -translate-x-1/2 w-[20%] h-[6%] bg-[#c0735a]"
                    style={{ borderRadius: '0 0 50% 50%' }}
                  />
                  {/* Hair */}
                  <div className="absolute top-0 left-0 right-0 h-[30%] bg-[#2d1b0e] rounded-t-full" />
                </div>
              </motion.div>

              {/* Body / Torso */}
              <div className="relative mx-auto mt-1" style={{ width: '75%' }}>
                <div className="bg-gradient-to-b from-[#4a90d9] to-[#357abd] rounded-t-2xl pt-6 pb-8 relative overflow-visible">
                  {/* Collar */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-3 bg-white/90 rounded-b-lg" />

                  {/* Hands container */}
                  <div className="flex justify-between px-2 -mx-8 relative" style={{ marginTop: 8 }}>
                    {/* Left hand */}
                    <motion.div
                      animate={{ transform: currentPose.leftHand }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                      className="text-3xl md:text-4xl lg:text-5xl"
                    >
                      <div className="bg-gradient-to-b from-[#f4c28f] to-[#e8a86d] rounded-lg p-1.5 md:p-2 shadow-md">
                        <span className="block">{fingerSpellChar || '✋'}</span>
                      </div>
                    </motion.div>

                    {/* Right hand */}
                    <motion.div
                      animate={{ transform: currentPose.rightHand }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                      className="text-3xl md:text-4xl lg:text-5xl"
                    >
                      <div className="bg-gradient-to-b from-[#f4c28f] to-[#e8a86d] rounded-lg p-1.5 md:p-2 shadow-md">
                        <span className="block">🤲</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign language badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-purple-600/80 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Hand className="w-3.5 h-3.5 text-white" />
              <span className="text-[10px] text-white font-bold uppercase tracking-wider">Sign Language</span>
            </div>

            {/* Current fingerspell character */}
            {isPlaying && fingerSpellChar && (
              <motion.div
                key={fingerSpellChar}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-center"
              >
                <span className="text-2xl block">{fingerSpellChar}</span>
              </motion.div>
            )}
          </div>

          {/* Right: Caption / Text Display Area */}
          <div className="flex-1 relative bg-gradient-to-br from-[#0f3460] to-[#1a1a2e] flex flex-col justify-center p-6 md:p-10">
            {/* Slide content as large readable text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentSlide}-${currentPhraseIdx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-center"
              >
                {/* Current phrase highlight */}
                {currentPhrase && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-white font-bold leading-relaxed mb-6 ${captionSizeClasses[captionSize]}`}
                  >
                    {currentPhrase}
                  </motion.p>
                )}

                {/* Full slide text with current phrase highlighted */}
                <div className={`text-white/40 leading-relaxed space-y-2 max-h-[40vh] overflow-y-auto ${
                  captionSize === 'xlarge' ? 'text-base' : 'text-sm'
                }`}>
                  <ReactMarkdown components={{
                    p: ({ children }: any) => <p className="mb-2">{children}</p>,
                    strong: ({ children }: any) => <strong className="text-yellow-400/60">{children}</strong>,
                    li: ({ children }: any) => <li className="ml-4 mb-1 list-disc">{children}</li>,
                  }}>{slide.content}</ReactMarkdown>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Phrase progress dots */}
            {phrases.length > 1 && (
              <div className="flex items-center gap-1.5 mt-4">
                {phrases.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === currentPhraseIdx ? 'bg-purple-400 w-6' :
                      i < currentPhraseIdx ? 'bg-purple-600 w-2' : 'bg-white/10 w-2'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Center play button on pause */}
            <AnimatePresence>
              {!isPlaying && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
                >
                  <div className="w-16 h-16 rounded-full bg-purple-600/60 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Bottom controls ── */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}
        >
          {/* Purple progress bar */}
          <div className="relative h-[3px] group/progress hover:h-[5px] transition-all cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              goTo(Math.round(pct * (slides.length - 1)));
            }}
          >
            <div className="absolute inset-0 bg-white/20" />
            <div className="absolute inset-y-0 left-0 bg-purple-500 transition-all duration-300" style={{ width: `${progressFraction * 100}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-md"
              style={{ left: `${progressFraction * 100}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between px-3 py-2">
            {/* Left */}
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); goTo(currentSlide - 1); }}
                disabled={currentSlide === 0}
                className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handlePlay(); }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); goTo(currentSlide + 1); }}
                disabled={currentSlide >= slides.length - 1}
                className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>

              <span className="text-xs text-white/60 ml-3 font-mono">
                Slide {currentSlide + 1} / {slides.length}
              </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1">
              {/* Caption size toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCaptionSize(prev => prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'normal');
                }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors flex items-center gap-1"
                title="Caption size"
              >
                <Type className="w-4 h-4" />
                <span className="text-[10px] text-white/60 uppercase">
                  {captionSize === 'normal' ? 'A' : captionSize === 'large' ? 'A+' : 'A++'}
                </span>
              </button>
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

      {/* ── Below player info ── */}
      <div className="mt-3 px-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
            <Hand className="w-3 h-3" /> Sign Language Mode
          </span>
          <span className="text-[11px] text-gray-400">No audio required</span>
        </div>
        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
          {topicTitle}
        </h1>

        <div className="flex items-center justify-between mt-3 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{slides.length} slides</span>
            <span>Visual captions</span>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setLiked(!liked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${liked ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-purple-700' : ''}`} />
              Like
            </button>
            <button onClick={() => setSaved(!saved)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${saved ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-purple-700' : ''}`} />
              Save
            </button>
            {onNext && (
              <button onClick={onNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors ml-2">
                Next Topic <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
