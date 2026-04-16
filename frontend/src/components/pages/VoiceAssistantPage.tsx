"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Mic, MicOff, Volume2, VolumeX, Bot, User, Sparkles,
  Phone, PhoneOff, MessageSquare, X, BookOpen, Send,
  Globe, Settings2, Zap,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

/* ── Voice Orb — animated indicator ── */
function VoiceOrb({ state, level = 0 }: { state: string; level: number }) {
  const colors = {
    idle:      { core: '#4f46e5', glow: '#6366f1', ring: 'rgba(99,102,241,0.12)' },
    listening: { core: '#ef4444', glow: '#f97316', ring: 'rgba(249,115,22,0.15)' },
    thinking:  { core: '#7c3aed', glow: '#a78bfa', ring: 'rgba(167,139,250,0.12)' },
    speaking:  { core: '#0ea5e9', glow: '#38bdf8', ring: 'rgba(56,189,248,0.12)' },
  }[state] || { core: '#4f46e5', glow: '#6366f1', ring: 'rgba(99,102,241,0.12)' };

  const scale = 1 + (state === 'listening' ? level * 0.25 : 0);

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Pulse rings */}
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ width: 192 + i * 40, height: 192 + i * 40, background: colors.ring }}
          animate={state !== 'idle' ? { scale: [1, 1.08, 1], opacity: [0.2, 0.4, 0.2] } : {}}
          transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}

      {/* Audio waveform bars */}
      {(state === 'listening' || state === 'speaking') && (
        <div className="absolute flex items-center gap-[2px] z-[5]">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div key={i} className="rounded-full"
              style={{ width: 2.5, background: colors.glow }}
              animate={{
                height: state === 'listening'
                  ? [3, 3 + level * 45 + Math.random() * 15, 3]
                  : [3, 10 + Math.random() * 20, 3]
              }}
              transition={{ duration: 0.2 + Math.random() * 0.15, repeat: Infinity, delay: i * 0.02 }}
            />
          ))}
        </div>
      )}

      {/* Core orb */}
      <motion.div
        className="relative w-28 h-28 rounded-full shadow-2xl flex items-center justify-center z-10"
        style={{ background: `radial-gradient(circle at 35% 35%, ${colors.glow}, ${colors.core})` }}
        animate={{ scale }}
        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      >
        {state === 'thinking' ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
            <Sparkles className="w-10 h-10 text-white/90" />
          </motion.div>
        ) : state === 'listening' ? (
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
            <Mic className="w-10 h-10 text-white" />
          </motion.div>
        ) : state === 'speaking' ? (
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
            <Volume2 className="w-10 h-10 text-white" />
          </motion.div>
        ) : (
          <Bot className="w-10 h-10 text-white/60" />
        )}
      </motion.div>
    </div>
  );
}

/* ── State label with color ── */
function StateLabel({ state, active }: { state: string; active: boolean }) {
  if (!active) return <span className="text-gray-400">Ready to start</span>;
  const map = {
    listening: { text: 'Listening...', color: 'text-orange-500', dot: 'bg-orange-500' },
    thinking:  { text: 'Processing...', color: 'text-purple-500', dot: 'bg-purple-500' },
    speaking:  { text: 'Speaking...', color: 'text-sky-500', dot: 'bg-sky-500' },
    idle:      { text: 'Connected', color: 'text-green-500', dot: 'bg-green-500' },
  };
  const s = map[state] || map.idle;
  return (
    <span className={`flex items-center gap-2 ${s.color} text-sm font-medium`}>
      <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
        className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.text}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function VoiceAssistantPage() {
  const { language: appLanguage } = useLanguage();
  const [active, setActive] = useState(false);
  const [state, setState] = useState('idle');
  const [messages, setMessages] = useState<any[]>([]);
  const [caption, setCaption] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [topic, setTopic] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [muted, setMuted] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');

  const activeRef = useRef(false);
  const stateRef = useRef('idle');
  const historyRef = useRef<any[]>([]);
  const topicRef = useRef('');
  const mutedRef = useRef(false);
  const recRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const analyserCtxRef = useRef<any>(null);
  const animRef = useRef<any>(null);
  const chatEndRef = useRef<any>(null);
  const abortRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { topicRef.current = topic; }, [topic]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Set language from app settings
  useEffect(() => {
    if (appLanguage === 'hi' || appLanguage === 'hindi') setSelectedLang('hi');
    else setSelectedLang('en');
  }, [appLanguage]);

  const langConfig = {
    en: { code: 'en-US', label: 'English', tts: 'en' },
    hi: { code: 'hi-IN', label: 'Hindi', tts: 'hi' },
  }[selectedLang] || { code: 'en-US', label: 'English', tts: 'en' };

  // ── Mic analyser ──
  const startMic = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = s;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser(); an.fftSize = 256;
      src.connect(an);
      analyserCtxRef.current = ctx;
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteFrequencyData(buf);
        setAudioLevel(Math.min(buf.reduce((a, b) => a + b, 0) / buf.length / 100, 1));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  }, []);

  const stopMic = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    analyserCtxRef.current?.close().catch(() => {});
    analyserCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t: any) => t.stop());
    streamRef.current = null;
    setAudioLevel(0);
  }, []);

  // ── TTS: try backend TTS service first, then browser fallback ──
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      if (mutedRef.current || !text.trim()) { resolve(); return; }
      const clean = text.replace(/[#*_`\[\]()>|]/g, '').replace(/\n+/g, '. ').trim();
      if (!clean) { resolve(); return; }

      // Stop any current audio
      if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
      window.speechSynthesis?.cancel();

      // Try TTS microservice first
      const ttsHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const ttsUrl = `http://${ttsHost}:5001/tts`;
      try {
        const resp = await fetch(ttsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean, language: langConfig.tts, speed: 1.0 }),
          signal: AbortSignal.timeout(15000),
        });
        if (resp.ok) {
          const blob = await resp.blob();
          if (blob.size > 200) {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            currentAudioRef.current = audio;
            audio.onended = () => { currentAudioRef.current = null; URL.revokeObjectURL(url); resolve(); };
            audio.onerror = () => { currentAudioRef.current = null; URL.revokeObjectURL(url); resolve(); };
            await audio.play();
            return;
          }
        }
      } catch {}

      // Fallback: browser SpeechSynthesis
      if (!window.speechSynthesis) { resolve(); return; }
      const utt = new SpeechSynthesisUtterance(clean);
      utt.rate = 1.0;
      utt.lang = langConfig.code;
      const voices = window.speechSynthesis.getVoices();
      const isHindi = selectedLang === 'hi';
      const v = voices.find((x: any) => isHindi ? x.lang.startsWith('hi') : (x.name.includes('Google') && x.lang.startsWith('en')))
        || voices.find((x: any) => x.lang.startsWith(isHindi ? 'hi' : 'en'));
      if (v) utt.voice = v;
      utt.onend = () => resolve();
      utt.onerror = () => resolve();
      window.speechSynthesis.speak(utt);
    });
  }, [selectedLang, langConfig]);

  // ── Start recognition helper ──
  const startRec = useCallback(() => {
    try { recRef.current?.start(); } catch {
      try { recRef.current?.stop(); } catch {}
      setTimeout(() => { try { recRef.current?.start(); } catch {} }, 150);
    }
  }, []);

  // ── Stream AI response ──
  const streamAI = useCallback(async (text: string) => {
    const token = localStorage.getItem('token') || '';
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const langInst = selectedLang === 'hi' ? ' Respond entirely in Hindi.' : '';

    const resp = await fetch(`${API}/voice/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message: text + langInst,
        topic: topicRef.current || 'general',
        history: historyRef.current.slice(-6),
      }),
      signal: ctrl.signal,
    });

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.done || data.error) break;
          if (data.text) {
            fullText += data.text;
            setCaption(fullText.length > 200 ? '...' + fullText.slice(-200) : fullText);
          }
        } catch {}
      }
    }
    return fullText;
  }, [selectedLang]);

  // ── Core: user speech → AI → speak → listen ──
  const processUserInput = useCallback(async (text: string) => {
    if (!text.trim() || !activeRef.current) return;
    try { recRef.current?.stop(); } catch {}

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    historyRef.current.push({ role: 'user', content: text });

    setState('thinking');
    setCaption('');

    try {
      setState('speaking');
      const reply = await streamAI(text);
      if (reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        historyRef.current.push({ role: 'assistant', content: reply });
        setCaption(reply.length > 200 ? '...' + reply.slice(-200) : reply);
        await speak(reply);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
      }
    }

    if (activeRef.current) {
      setState('listening');
      setCaption('Listening...');
      startRec();
    } else {
      setState('idle');
      setCaption('');
    }
  }, [streamAI, speak, startRec]);

  const processRef = useRef(processUserInput);
  useEffect(() => { processRef.current = processUserInput; }, [processUserInput]);

  // ── Speech Recognition setup ──
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = langConfig.code;

    rec.onresult = (e: any) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      if (interim) setCaption(interim);
      if (final.trim()) processRef.current(final.trim());
    };

    rec.onerror = () => {};
    rec.onend = () => {
      if (activeRef.current && stateRef.current === 'listening') {
        setTimeout(() => {
          if (activeRef.current && stateRef.current === 'listening') {
            try { rec.start(); } catch {}
          }
        }, 100);
      }
    };

    recRef.current = rec;
    window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
    return () => { rec.abort(); window.speechSynthesis?.cancel(); };
  }, [langConfig.code]);

  // ── Start / End call ──
  const startCall = useCallback(async () => {
    setActive(true);
    setMessages([]);
    setCaption('');
    historyRef.current = [];
    await startMic();

    const isHindi = selectedLang === 'hi';
    const greeting = isHindi
      ? "नमस्ते! मैं आपका AI शिक्षक हूँ। आज आप क्या सीखना चाहेंगे?"
      : "Hi! I'm your AI teacher. What would you like to learn about today?";

    setMessages([{ role: 'assistant', content: greeting }]);
    historyRef.current.push({ role: 'assistant', content: greeting });

    setState('speaking');
    setCaption(greeting);
    await speak(greeting);

    if (activeRef.current) {
      setState('listening');
      setCaption(isHindi ? 'सुन रहा हूँ...' : 'Listening...');
      startRec();
    }
  }, [startMic, speak, startRec, selectedLang]);

  const endCall = useCallback(() => {
    setActive(false); setState('idle'); setCaption('');
    try { recRef.current?.stop(); } catch {}
    window.speechSynthesis?.cancel();
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    abortRef.current?.abort();
    stopMic();
  }, [stopMic]);

  const interrupt = useCallback(() => {
    if (!active) return;
    window.speechSynthesis?.cancel();
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    abortRef.current?.abort();
    setState('listening');
    setCaption('Listening...');
    startRec();
  }, [active, startRec]);

  useEffect(() => () => {
    try { recRef.current?.abort(); } catch {}
    window.speechSynthesis?.cancel();
    if (currentAudioRef.current) { currentAudioRef.current.pause(); }
    abortRef.current?.abort();
    stopMic();
  }, [stopMic]);

  // ── Render ──
  return (
    <div className="h-full flex flex-col overflow-hidden" style={{
      background: 'linear-gradient(180deg, #0a0e1a 0%, #111827 40%, #0f172a 100%)',
    }}>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/30 z-20 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">AI Voice Tutor</h1>
            <StateLabel state={state} active={active} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language picker */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/10 px-1 py-1">
            {[{ k: 'en', l: 'EN' }, { k: 'hi', l: 'HI' }].map(({ k, l }) => (
              <button key={k} onClick={() => setSelectedLang(k)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedLang === k ? 'bg-[#284ce3] text-white shadow' : 'text-gray-400 hover:text-white'
                }`}>
                {l}
              </button>
            ))}
          </div>

          {/* Topic input */}
          <div className="hidden sm:flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/10">
            <BookOpen className="w-3.5 h-3.5 text-gray-400" />
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic..."
              className="bg-transparent text-xs outline-none w-28 text-gray-300 placeholder-gray-500" />
          </div>

          {/* Mute */}
          <button onClick={() => { setMuted(!muted); if (!muted) { window.speechSynthesis?.cancel(); if (currentAudioRef.current) currentAudioRef.current.pause(); } }}
            className={`p-2 rounded-lg transition ${muted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Chat toggle */}
          <button onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-lg transition relative ${showChat ? 'bg-[#284ce3]/20 text-blue-400' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
            <MessageSquare className="w-4 h-4" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#284ce3] rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                {messages.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center: Orb + controls */}
        <div className={`flex-1 flex flex-col items-center justify-center gap-6 px-4 ${showChat ? 'hidden lg:flex' : ''}`}>
          {/* Orb — tap to interrupt */}
          <div onClick={interrupt}
            className={`${active && (state === 'speaking' || state === 'thinking') ? 'cursor-pointer' : ''}`}>
            <VoiceOrb state={state} level={audioLevel} />
          </div>

          {/* Caption */}
          <div className="h-20 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {caption && (
                <motion.p key={caption.slice(0, 30)}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`max-w-lg text-center text-sm px-6 leading-relaxed ${
                    state === 'listening' ? 'text-orange-300/80' :
                    state === 'speaking' ? 'text-cyan-300/80' :
                    state === 'thinking' ? 'text-purple-300/80' : 'text-blue-300/80'
                  }`}>
                  {caption}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Tap to interrupt hint */}
          {active && state === 'speaking' && (
            <p className="text-[11px] text-gray-600 animate-pulse">Tap the orb to interrupt</p>
          )}

          {/* Call button */}
          <div>
            {!active ? (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={startCall}
                className="flex items-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white text-lg shadow-xl shadow-green-500/25 hover:shadow-green-500/40 transition-shadow">
                <Phone className="w-6 h-6" /> Start Conversation
              </motion.button>
            ) : (
              <div className="flex items-center gap-3">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={endCall}
                  className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-red-500 to-rose-600 font-semibold text-white text-lg shadow-xl shadow-red-500/25">
                  <PhoneOff className="w-5 h-5" /> End
                </motion.button>
              </div>
            )}
          </div>

          {!active && (
            <div className="text-center">
              <p className="text-xs text-gray-500">Hands-free voice conversation with your AI tutor</p>
              <div className="flex items-center justify-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <Mic className="w-3 h-3" /> Voice input
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <Zap className="w-3 h-3" /> Real-time AI
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <Globe className="w-3 h-3" /> {langConfig.label}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Chat sidebar ── */}
        <AnimatePresence>
          {showChat && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 380, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/10 bg-black/50 backdrop-blur-sm flex flex-col overflow-hidden">
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Transcript
                </h3>
                <button onClick={() => setShowChat(false)} className="p-1 hover:bg-white/10 rounded text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center mt-12">
                    <Bot className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Start a conversation to see the transcript</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                      m.role === 'user' ? 'bg-[#284ce3]' : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                    }`}>
                      {m.role === 'user' ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#284ce3] text-white rounded-tr-sm'
                        : 'bg-white/8 text-gray-200 rounded-tl-sm border border-white/5'
                    }`}>
                      <ReactMarkdown components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="text-yellow-300">{children}</strong>,
                      }}>{m.content}</ReactMarkdown>
                    </div>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Type input */}
              {active && (
                <form onSubmit={e => {
                  e.preventDefault();
                  const v = (e.target as any).elements.m;
                  if (v.value.trim()) { processRef.current(v.value.trim()); v.value = ''; }
                }} className="p-3 border-t border-white/10">
                  <div className="flex gap-2">
                    <input name="m" placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl outline-none text-gray-200 placeholder-gray-500 focus:border-[#284ce3] transition" />
                    <button type="submit"
                      className="px-4 py-2.5 bg-[#284ce3] hover:bg-blue-600 rounded-xl text-white text-sm font-medium transition-colors flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
