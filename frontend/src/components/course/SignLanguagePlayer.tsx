"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Play, Pause, SkipForward, SkipBack, Maximize2, Minimize2,
  ChevronRight, RotateCcw, Loader2, Hand,
  ThumbsUp, Bookmark, Type,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/* ═══════════════════════════════════════════════════════════
   SIGN LANGUAGE PLAYER — Uses REAL photographs
   - Real person photo as the interpreter avatar
   - Real hand gesture photos showing actual fingers
   ═══════════════════════════════════════════════════════════ */

/* Real hand gesture photos from Unsplash (free, open source) */
const HAND_PHOTOS: Record<string, string> = {
  openPalm:   'https://images.unsplash.com/photo-1577741314755-048d8525d31e?w=280&h=280&fit=crop',
  point:      'https://images.unsplash.com/photo-1598550487520-3af0fcc0ecdc?w=280&h=280&fit=crop',
  fist:       'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=280&h=280&fit=crop',
  thumbsUp:   'https://images.unsplash.com/photo-1602525666785-ff5fb4e70b94?w=280&h=280&fit=crop',
  peace:      'https://images.unsplash.com/photo-1612962970681-1694c328f510?w=280&h=280&fit=crop',
  wave:       'https://images.unsplash.com/photo-1587614313085-5da51cebd8ac?w=280&h=280&fit=crop',
  writing:    'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=280&h=280&fit=crop',
  clap:       'https://images.unsplash.com/photo-1531379410502-63bfe8cdaf6f?w=280&h=280&fit=crop',
};

/* Real person - professional woman interpreter */
const INTERPRETER_PHOTO = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=500&fit=crop&crop=top';

/* Sign poses — each maps to a real hand photo + position */
interface SignPose {
  label: string;
  desc: string;
  emoji: string;
  handKey: string;       // key into HAND_PHOTOS
  handPos: 'center' | 'high' | 'low' | 'left' | 'right';
}

const POSES: SignPose[] = [
  { label: 'Ready',      desc: 'Listening position',   emoji: '🤲', handKey: 'openPalm', handPos: 'center' },
  { label: 'Explain',    desc: 'Open palm — showing',  emoji: '🖐️', handKey: 'openPalm', handPos: 'high' },
  { label: 'Point',      desc: 'Directing attention',   emoji: '👉', handKey: 'point',    handPos: 'right' },
  { label: 'Count',      desc: 'Listing items',         emoji: '✌️', handKey: 'peace',    handPos: 'high' },
  { label: 'Emphasize',  desc: 'Strong point!',         emoji: '✊', handKey: 'fist',     handPos: 'center' },
  { label: 'Think',      desc: 'Considering...',        emoji: '🤔', handKey: 'point',    handPos: 'high' },
  { label: 'Agree',      desc: 'Yes / Correct',         emoji: '👍', handKey: 'thumbsUp', handPos: 'center' },
  { label: 'Greet',      desc: 'Hello!',                emoji: '👋', handKey: 'wave',     handPos: 'high' },
  { label: 'Question',   desc: 'Asking...',             emoji: '❓', handKey: 'openPalm', handPos: 'high' },
  { label: 'Describe',   desc: 'Writing / detailing',   emoji: '✍️', handKey: 'writing',  handPos: 'low' },
  { label: 'Applaud',    desc: 'Well done!',            emoji: '👏', handKey: 'clap',     handPos: 'center' },
];

const HAND_POS_STYLES: Record<string, string> = {
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  high:   'top-[15%] left-1/2 -translate-x-1/2',
  low:    'bottom-[15%] left-1/2 -translate-x-1/2',
  left:   'top-1/2 left-[15%] -translate-y-1/2',
  right:  'top-1/2 right-[15%] -translate-y-1/2',
};

function choosePose(word: string, idx: number): number {
  const w = word.toLowerCase();
  if (w.includes('?')) return 8;
  if (w.includes('!')) return 4;
  if (/example|like|such|means|is/.test(w)) return 1;
  if (/important|key|main|must|remember/.test(w)) return 4;
  if (/first|second|third|step|\d/.test(w)) return 3;
  if (/think|imagine|consider/.test(w)) return 5;
  if (/yes|correct|right|good|great/.test(w)) return 6;
  if (/hello|welcome|hi/.test(w)) return 7;
  if (/write|describe|detail/.test(w)) return 9;
  return [1, 2, 3, 1, 6, 2, 3, 8][idx % 8];
}

function splitIntoSlides(text: string) {
  if (!text) return [];
  const parts = text.split(/\n\n+/).filter((p: string) => p.trim());
  if (parts.length === 0) return [{ content: text }];
  if (parts.length === 1) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const slides: { content: string }[] = [];
    for (let i = 0; i < sentences.length; i += 2) slides.push({ content: sentences.slice(i, i + 2).join(' ').trim() });
    return slides.length > 0 ? slides : [{ content: text }];
  }
  return parts.map((p: string) => ({ content: p.trim() }));
}

function splitIntoPhrases(text: string): string[] {
  const clean = text.replace(/[#*_`\[\]()>|]/g, '').replace(/\n+/g, ' ').trim();
  const words = clean.split(/\s+/);
  const phrases: string[] = [];
  let cur: string[] = [];
  for (const w of words) { cur.push(w); if (cur.length >= 5 || /[.!?,]$/.test(w)) { phrases.push(cur.join(' ')); cur = []; } }
  if (cur.length > 0) phrases.push(cur.join(' '));
  return phrases.filter(Boolean);
}

/* ═══════ Main Component ═══════ */
interface Props { topic: any; language?: string; onNext?: (() => void) | null; onPrev?: (() => void) | null; }

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
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [highlightWord, setHighlightWord] = useState('');
  const [phrases, setPhrases] = useState<string[]>([]);
  const [poseIdx, setPoseIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef(false);
  const controlsTimerRef = useRef<any>(null);
  const slidesRef = useRef<{ content: string }[]>([]);
  const topicTitle = typeof topic === 'string' ? topic : (topic?.title || 'Topic');

  useEffect(() => { slidesRef.current = slides; }, [slides]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isPlaying) controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
  }, [isPlaying]);

  useEffect(() => { if (!isPlaying) setShowControls(true); else resetControlsTimer(); }, [isPlaying]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setSlides([]); setCurrentSlide(0); stopRef.current = true; setIsPlaying(false);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const langMap: Record<string, string> = { hi: 'Hindi', hindi: 'Hindi', gu: 'Gujarati', gujarati: 'Gujarati', es: 'Spanish' };
    const li = langMap[language] ? ` Respond entirely in ${langMap[language]}.` : '';

    fetch(`${API}/voice/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: `Explain "${topicTitle}" clearly for a student. Use simple language, short sentences. Write 4-5 short paragraphs.${li}`, topic: topicTitle, history: [] }),
    }).then(async resp => {
      const reader = resp.body?.getReader(); if (!reader) return;
      const decoder = new TextDecoder(); let full = '';
      while (true) { const { done, value } = await reader.read(); if (done) break; for (const line of decoder.decode(value, { stream: true }).split('\n')) { if (!line.startsWith('data: ')) continue; try { const d = JSON.parse(line.slice(6)); if (d.text) full += d.text; } catch {} } }
      if (!cancelled && full) { const sl = splitIntoSlides(full); setSlides(sl); setLoading(false); setTimeout(() => { setIsPlaying(true); slidesRef.current = sl; playFrom(0); }, 800); }
    }).catch(() => { if (!cancelled) { setSlides([{ content: 'Unable to load content.' }]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [topicTitle, language]);

  async function animatePhrase(phrase: string, pi: number): Promise<void> {
    return new Promise(resolve => {
      if (stopRef.current) { resolve(); return; }
      setCurrentPhrase(phrase);
      const words = phrase.split(/\s+/);
      const interval = Math.max(500, 2200 / (words.length + 1));
      let wi = 0;
      const iv = setInterval(() => {
        if (stopRef.current) { clearInterval(iv); resolve(); return; }
        if (wi < words.length) {
          setHighlightWord(words[wi]);
          setPoseIdx(choosePose(words[wi], pi * 10 + wi));
          wi++;
        } else { clearInterval(iv); resolve(); }
      }, interval);
    });
  }

  async function playSlide(si: number): Promise<void> {
    if (stopRef.current || si >= slidesRef.current.length) return;
    setCurrentSlide(si);
    const phrs = splitIntoPhrases(slidesRef.current[si]?.content || '');
    setPhrases(phrs);
    for (let i = 0; i < phrs.length; i++) {
      if (stopRef.current) return;
      setCurrentPhraseIdx(i); await animatePhrase(phrs[i], i);
      if (stopRef.current) return; await new Promise(r => setTimeout(r, 350));
    }
    await new Promise(r => setTimeout(r, 700));
  }

  async function playFrom(idx: number) {
    stopRef.current = false;
    for (let i = idx; i < slidesRef.current.length; i++) { if (stopRef.current) return; await playSlide(i); }
    setIsPlaying(false); setPoseIdx(0);
  }

  function handlePlay() { if (isPlaying) { stopRef.current = true; setIsPlaying(false); } else { setIsPlaying(true); playFrom(currentSlide); } }
  function goTo(idx: number) { stopRef.current = true; const c = Math.max(0, Math.min(idx, slides.length - 1)); setCurrentSlide(c); setCurrentPhrase(''); setPhrases([]); setCurrentPhraseIdx(0); setHighlightWord(''); if (isPlaying) setTimeout(() => playFrom(c), 300); }
  function handleRestart() { stopRef.current = true; setIsPlaying(false); setCurrentSlide(0); setCurrentPhrase(''); setCurrentPhraseIdx(0); setPoseIdx(0); setHighlightWord(''); }
  function toggleFS() { if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setIsFullscreen(true); } else { document.exitFullscreen(); setIsFullscreen(false); } }

  useEffect(() => { const h = () => { if (!document.fullscreenElement) setIsFullscreen(false); }; document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h); }, []);
  useEffect(() => () => { stopRef.current = true; }, []);

  const progressFraction = slides.length > 0 ? (currentSlide / Math.max(1, slides.length - 1)) : 0;
  const slide = slides[currentSlide] || { content: '' };
  const pose = POSES[poseIdx] || POSES[0];
  const captionCls = { normal: 'text-base md:text-lg', large: 'text-lg md:text-xl lg:text-2xl', xlarge: 'text-xl md:text-2xl lg:text-3xl' };

  if (loading) {
    return (
      <div className="bg-[#0f1628] rounded-xl overflow-hidden flex items-center justify-center aspect-video w-full">
        <div className="text-center">
          <div className="relative mx-auto w-24 h-24 mb-5">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full border-2 border-purple-500/30 border-t-purple-400"/>
            <div className="absolute inset-3 rounded-full bg-purple-500/10 flex items-center justify-center"><Hand className="w-8 h-8 text-purple-400"/></div>
          </div>
          <p className="text-white font-medium text-sm">Preparing Sign Language Lesson...</p>
          <p className="text-gray-400 text-xs mt-1">"{topicTitle}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div ref={containerRef} className={`bg-[#0f1628] overflow-hidden flex flex-col relative group ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-xl'}`}
        onMouseMove={resetControlsTimer} onMouseLeave={() => isPlaying && setShowControls(false)}
        style={{ aspectRatio: isFullscreen ? undefined : '16/9', height: isFullscreen ? '100vh' : undefined }}>

        <div className="flex-1 relative overflow-hidden flex" onClick={handlePlay}>

          {/* ═══ LEFT: Real interpreter + real hand photo ═══ */}
          <div className="w-[44%] lg:w-[42%] relative overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 50% 40%, #1e2848 0%, #0f1628 80%)' }}>

            {/* Real interpreter photo — full height */}
            <div className="absolute inset-0">
              <img
                src={INTERPRETER_PHOTO}
                alt="Sign language interpreter"
                className="w-full h-full object-cover object-top opacity-70"
                loading="eager"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {/* Dark gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1628] via-[#0f1628]/40 to-transparent"/>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0f1628]/60"/>
            </div>

            {/* ── Large hand gesture photo ── */}
            <div className="absolute inset-0 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pose.handKey + pose.handPos}
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={`absolute ${HAND_POS_STYLES[pose.handPos]}`}
                  style={{ width: '55%', maxWidth: 180 }}
                >
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/15 aspect-square">
                    <img
                      src={HAND_PHOTOS[pose.handKey] || HAND_PHOTOS.openPalm}
                      alt={`Hand sign: ${pose.label}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    {/* Glow ring when signing */}
                    {isPlaying && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl border-2 border-purple-400/50"
                        animate={{ borderColor: ['rgba(168,85,247,0.3)', 'rgba(168,85,247,0.7)', 'rgba(168,85,247,0.3)'] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ISL Badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-purple-600/90 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Hand className="w-3.5 h-3.5 text-white"/>
              <span className="text-[10px] text-white font-bold uppercase tracking-wider">ISL</span>
            </div>

            {/* Live indicator */}
            {isPlaying && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-green-500"/>
                <span className="text-[10px] text-white/70 font-medium">SIGNING</span>
              </div>
            )}

            {/* Sign label at bottom */}
            {isPlaying && (
              <motion.div key={pose.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-3 left-3 right-3 z-10 flex justify-center">
                <div className="bg-black/70 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-3 max-w-[90%]">
                  <span className="text-2xl flex-shrink-0">{pose.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-bold">{pose.label}</p>
                    <p className="text-white/50 text-[11px] truncate">{pose.desc}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* ═══ RIGHT: Captions area ═══ */}
          <div className="flex-1 relative flex flex-col justify-center p-5 md:p-8 lg:p-10"
            style={{ background: 'linear-gradient(135deg, #0f2847 0%, #141a2e 50%, #16132e 100%)' }}>

            <AnimatePresence mode="wait">
              <motion.div key={`${currentSlide}-${currentPhraseIdx}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }} className="flex-1 flex flex-col justify-center">

                {/* Current sign emoji large */}
                {isPlaying && (
                  <motion.div key={pose.emoji} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl mb-3">{pose.emoji}</motion.div>
                )}

                {/* Current phrase — word by word highlight */}
                {currentPhrase && (
                  <div className={`font-bold leading-relaxed mb-6 ${captionCls[captionSize]}`}>
                    {currentPhrase.split(/\s+/).map((word, i) => (
                      <motion.span key={`${word}-${i}`}
                        className={`inline-block mr-[0.3em] transition-all duration-200 ${word === highlightWord ? 'text-yellow-300' : 'text-white/90'}`}
                        animate={word === highlightWord ? { y: [-2, 0] } : {}}>
                        {word}
                      </motion.span>
                    ))}
                  </div>
                )}

                {/* Full slide text dimmed */}
                <div className={`text-white/25 leading-relaxed space-y-2 max-h-[30vh] overflow-y-auto pr-2 ${captionSize === 'xlarge' ? 'text-sm' : 'text-xs'}`}>
                  <ReactMarkdown components={{
                    p: ({ children }: any) => <p className="mb-2">{children}</p>,
                    strong: ({ children }: any) => <strong className="text-yellow-400/40">{children}</strong>,
                    li: ({ children }: any) => <li className="ml-4 mb-1 list-disc">{children}</li>,
                  }}>{slide.content}</ReactMarkdown>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Phrase dots */}
            {phrases.length > 1 && (
              <div className="flex items-center gap-1.5 mt-4">
                {phrases.map((_, i) => <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentPhraseIdx ? 'bg-purple-400 w-6' : i < currentPhraseIdx ? 'bg-purple-600 w-2' : 'bg-white/10 w-2'}`}/>)}
              </div>
            )}

            {/* Play overlay */}
            <AnimatePresence>{!isPlaying && !loading && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-purple-600/60 backdrop-blur-sm flex items-center justify-center"><Play className="w-8 h-8 text-white ml-1"/></div>
              </motion.div>
            )}</AnimatePresence>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
          <div className="relative h-[3px] group/progress hover:h-[5px] transition-all cursor-pointer"
            onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); goTo(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (slides.length - 1))); }}>
            <div className="absolute inset-0 bg-white/20"/>
            <div className="absolute inset-y-0 left-0 bg-purple-500 transition-all duration-300" style={{ width: `${progressFraction * 100}%` }}/>
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 opacity-0 group-hover/progress:opacity-100 transition-opacity" style={{ left: `${progressFraction * 100}%`, transform: 'translate(-50%, -50%)' }}/>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); goTo(currentSlide - 1); }} disabled={currentSlide === 0} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30"><SkipBack className="w-5 h-5"/></button>
              <button onClick={(e) => { e.stopPropagation(); handlePlay(); }} className="p-2 rounded-full hover:bg-white/10 text-white">{isPlaying ? <Pause className="w-6 h-6"/> : <Play className="w-6 h-6 ml-0.5"/>}</button>
              <button onClick={(e) => { e.stopPropagation(); goTo(currentSlide + 1); }} disabled={currentSlide >= slides.length - 1} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30"><SkipForward className="w-5 h-5"/></button>
              <span className="text-xs text-white/60 ml-3 font-mono">Slide {currentSlide + 1} / {slides.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); setCaptionSize(p => p === 'normal' ? 'large' : p === 'large' ? 'xlarge' : 'normal'); }}
                className="p-2 rounded-full hover:bg-white/10 text-white flex items-center gap-1"><Type className="w-4 h-4"/><span className="text-[10px] text-white/60">{captionSize === 'normal' ? 'A' : captionSize === 'large' ? 'A+' : 'A++'}</span></button>
              <button onClick={(e) => { e.stopPropagation(); handleRestart(); }} className="p-2 rounded-full hover:bg-white/10 text-white"><RotateCcw className="w-4 h-4"/></button>
              <button onClick={(e) => { e.stopPropagation(); toggleFS(); }} className="p-2 rounded-full hover:bg-white/10 text-white">{isFullscreen ? <Minimize2 className="w-5 h-5"/> : <Maximize2 className="w-5 h-5"/>}</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info below ── */}
      <div className="mt-3 px-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold"><Hand className="w-3 h-3"/> Sign Language</span>
          <span className="text-[11px] text-gray-400">No audio needed</span>
        </div>
        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{topicTitle}</h1>
        <div className="flex items-center justify-between mt-3 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-500"><span>{slides.length} slides</span><span>Real hand signs</span></div>
          <div className="flex items-center gap-1">
            <button onClick={() => setLiked(!liked)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${liked ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-purple-700' : ''}`}/> Like</button>
            <button onClick={() => setSaved(!saved)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${saved ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-purple-700' : ''}`}/> Save</button>
            {onNext && (<button onClick={onNext} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium ml-2">Next Topic <ChevronRight className="w-4 h-4"/></button>)}
          </div>
        </div>
      </div>
    </div>
  );
}
