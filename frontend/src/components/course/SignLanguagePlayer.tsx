"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Play, Pause, SkipForward, SkipBack, Maximize2, Minimize2,
  ChevronRight, RotateCcw, Loader2, Hand,
  ThumbsUp, Bookmark, Type,
} from 'lucide-react';

import dynamic from 'next/dynamic';
import { Palette } from 'lucide-react';
import AvatarScene from './Avatar3D';

const AvatarCreator = dynamic(() => import('./AvatarCreator'), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

/* ═══════════════════════════════════════════════════════════
   SIGN LANGUAGE PLAYER — 3D Human Avatar with Avatar Creator
   ═══════════════════════════════════════════════════════════ */


/* ── Sign Poses ── */
interface SignPose {
  label: string; desc: string; emoji: string; handKey: string;
  handPos: 'center' | 'high' | 'low' | 'left' | 'right';
}

const POSES: SignPose[] = [
  { label: 'Ready', desc: 'Listening position', emoji: '🤲', handKey: 'openPalm', handPos: 'center' },
  { label: 'Explain', desc: 'Open palm — showing', emoji: '🖐️', handKey: 'openPalm', handPos: 'high' },
  { label: 'Point', desc: 'Directing attention', emoji: '👉', handKey: 'point', handPos: 'right' },
  { label: 'Count', desc: 'Listing items', emoji: '✌️', handKey: 'peace', handPos: 'high' },
  { label: 'Emphasize', desc: 'Strong point!', emoji: '✊', handKey: 'fist', handPos: 'center' },
  { label: 'Think', desc: 'Considering...', emoji: '🤔', handKey: 'point', handPos: 'high' },
  { label: 'Agree', desc: 'Yes / Correct', emoji: '👍', handKey: 'thumbsUp', handPos: 'center' },
  { label: 'Greet', desc: 'Hello!', emoji: '👋', handKey: 'wave', handPos: 'high' },
  { label: 'Question', desc: 'Asking...', emoji: '❓', handKey: 'openPalm', handPos: 'high' },
  { label: 'Describe', desc: 'Writing', emoji: '✍️', handKey: 'openPalm', handPos: 'low' },
  { label: 'Applaud', desc: 'Well done!', emoji: '👏', handKey: 'fist', handPos: 'center' },
];

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

/* ═══ Main Component ═══ */
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
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<any>(null);

  // Load saved avatar config
  useEffect(() => {
    try {
      const saved = localStorage.getItem("avatar_config");
      if (saved) setAvatarConfig(JSON.parse(saved));
    } catch {}
  }, []);

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
      const interval = Math.max(450, 2400 / (words.length + 1));
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
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full border-2 border-purple-500/30 border-t-purple-400" />
            <div className="absolute inset-3 rounded-full bg-purple-500/10 flex items-center justify-center"><Hand className="w-8 h-8 text-purple-400" /></div>
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

          {/* ═══ LEFT: 3D Human Avatar ═══ */}
          <div className="w-[44%] lg:w-[42%] relative overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 50% 60%, #1a2550 0%, #0f1628 80%)', minHeight: '300px' }}>

            <div className="absolute inset-0">
              <AvatarScene pose={pose.handPos} isPlaying={isPlaying} highlightWord={highlightWord} config={avatarConfig} />
            </div>

            {/* ISL Badge + Customize */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-purple-600/90 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Hand className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">ISL</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowAvatarCreator(true); }}
                className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1.5 hover:bg-white/25 transition"
              >
                <Palette className="w-3 h-3 text-white/80" />
                <span className="text-[10px] text-white/80 font-medium">Customize</span>
              </button>
            </div>

            {isPlaying && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] text-white/70 font-medium">SIGNING</span>
              </div>
            )}

            {isPlaying && (
              <motion.div key={pose.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-3 left-3 right-3 z-10 flex justify-center">
                <div className="bg-black/70 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-3 max-w-[90%]">
                  <Hand className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-bold">{pose.label}</p>
                    <p className="text-white/50 text-[11px] truncate">{pose.desc}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* ═══ RIGHT: Captions ═══ */}
          <div className="flex-1 relative flex flex-col justify-center p-5 md:p-8 lg:p-10"
            style={{ background: 'linear-gradient(135deg, #0f2847 0%, #141a2e 50%, #16132e 100%)' }}>

            <AnimatePresence mode="wait">
              <motion.div key={`${currentSlide}-${currentPhraseIdx}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }} className="flex-1 flex flex-col justify-center">

                {isPlaying && (
                  <motion.div key={pose.label} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mb-3">
                    <Hand className="w-5 h-5 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-400">{pose.label} — {pose.desc}</span>
                  </motion.div>
                )}

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

                <div className={`text-white/25 leading-relaxed space-y-2 max-h-[30vh] overflow-y-auto pr-2 ${captionSize === 'xlarge' ? 'text-sm' : 'text-xs'}`}>
                  <ReactMarkdown components={{
                    p: ({ children }: any) => <p className="mb-2">{children}</p>,
                    strong: ({ children }: any) => <strong className="text-yellow-400/40">{children}</strong>,
                    li: ({ children }: any) => <li className="ml-4 mb-1 list-disc">{children}</li>,
                  }}>{slide.content}</ReactMarkdown>
                </div>
              </motion.div>
            </AnimatePresence>

            {phrases.length > 1 && (
              <div className="flex items-center gap-1.5 mt-4">
                {phrases.map((_, i) => <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentPhraseIdx ? 'bg-purple-400 w-6' : i < currentPhraseIdx ? 'bg-purple-600 w-2' : 'bg-white/10 w-2'}`} />)}
              </div>
            )}

            <AnimatePresence>{!isPlaying && !loading && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-purple-600/60 backdrop-blur-sm flex items-center justify-center"><Play className="w-8 h-8 text-white ml-1" /></div>
              </motion.div>
            )}</AnimatePresence>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
          <div className="relative h-[3px] group/progress hover:h-[5px] transition-all cursor-pointer"
            onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); goTo(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (slides.length - 1))); }}>
            <div className="absolute inset-0 bg-white/20" />
            <div className="absolute inset-y-0 left-0 bg-purple-500 transition-all duration-300" style={{ width: `${progressFraction * 100}%` }} />
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); goTo(currentSlide - 1); }} disabled={currentSlide === 0} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30"><SkipBack className="w-5 h-5" /></button>
              <button onClick={(e) => { e.stopPropagation(); handlePlay(); }} className="p-2 rounded-full hover:bg-white/10 text-white">{isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}</button>
              <button onClick={(e) => { e.stopPropagation(); goTo(currentSlide + 1); }} disabled={currentSlide >= slides.length - 1} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30"><SkipForward className="w-5 h-5" /></button>
              <span className="text-xs text-white/60 ml-3 font-mono">Slide {currentSlide + 1} / {slides.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); setCaptionSize(p => p === 'normal' ? 'large' : p === 'large' ? 'xlarge' : 'normal'); }}
                className="p-2 rounded-full hover:bg-white/10 text-white flex items-center gap-1"><Type className="w-4 h-4" /><span className="text-[10px] text-white/60">{captionSize === 'normal' ? 'A' : captionSize === 'large' ? 'A+' : 'A++'}</span></button>
              <button onClick={(e) => { e.stopPropagation(); handleRestart(); }} className="p-2 rounded-full hover:bg-white/10 text-white"><RotateCcw className="w-4 h-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); toggleFS(); }} className="p-2 rounded-full hover:bg-white/10 text-white">{isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="mt-3 px-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold"><Hand className="w-3 h-3" /> Sign Language</span>
          <span className="text-[11px] text-gray-400">3D Avatar • No audio needed</span>
        </div>
        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{topicTitle}</h1>
        <div className="flex items-center justify-between mt-3 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-500"><span>{slides.length} slides</span></div>
          <div className="flex items-center gap-1">
            <button onClick={() => setLiked(!liked)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${liked ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-purple-700' : ''}`} /> Like</button>
            <button onClick={() => setSaved(!saved)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${saved ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-purple-700' : ''}`} /> Save</button>
            {onNext && (<button onClick={onNext} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium ml-2">Next Topic <ChevronRight className="w-4 h-4" /></button>)}
          </div>
        </div>
      </div>

      {/* Avatar Creator Modal */}
      <AnimatePresence>
        {showAvatarCreator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAvatarCreator(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <AvatarCreator
                initialConfig={avatarConfig}
                onSave={(cfg) => { setAvatarConfig(cfg); setShowAvatarCreator(false); }}
                onCancel={() => setShowAvatarCreator(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
