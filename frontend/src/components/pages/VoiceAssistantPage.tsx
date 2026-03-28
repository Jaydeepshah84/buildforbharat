"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Mic, Volume2, VolumeX, Bot, User, Sparkles,
  Phone, PhoneOff, MessageSquare, X, BookOpen,
} from 'lucide-react';

import AITeacherAvatar from '@/components/avatar/AITeacherAvatar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ─── Orb ────────────────────────────────────────────────────
function Orb({ state, level = 0 }) {
  const c = {
    idle:      { a:'#4f46e5', b:'#6366f1', g:'#818cf820' },
    listening: { a:'#dc2626', b:'#f97316', g:'#f9731640' },
    thinking:  { a:'#7c3aed', b:'#c084fc', g:'#c084fc30' },
    speaking:  { a:'#0284c7', b:'#38bdf8', g:'#38bdf830' },
  }[state] || { a:'#4f46e5', b:'#6366f1', g:'#818cf820' };
  const s = 1 + (state === 'listening' ? level * 0.3 : 0);

  return (
    <div className="relative w-52 h-52 flex items-center justify-center">
      {[0,1,2].map(i => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ width:208+i*44, height:208+i*44, background:c.g }}
          animate={state!=='idle' ? { scale:[1,1.06,1], opacity:[.15,.35,.15] } : {}}
          transition={{ duration:2+i*.5, repeat:Infinity, delay:i*.2 }} />
      ))}
      {(state==='listening'||state==='speaking') && (
        <div className="absolute flex items-center gap-[2px] z-[5]">
          {Array.from({length:24}).map((_,i) => (
            <motion.div key={i} className="rounded-full" style={{width:2.5, background:c.b}}
              animate={{ height: state==='listening'
                ? [3, 3+level*50+Math.random()*18, 3]
                : [3, 12+Math.random()*24, 3] }}
              transition={{ duration:.18+Math.random()*.2, repeat:Infinity, delay:i*.02 }} />
          ))}
        </div>
      )}
      <motion.div className="relative w-32 h-32 rounded-full shadow-2xl flex items-center justify-center z-10"
        style={{ background:`radial-gradient(circle at 35% 35%,${c.b},${c.a})` }}
        animate={{ scale:s }} transition={{ type:'spring', stiffness:280, damping:18 }}>
        {state==='thinking' ? (
          <motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:'linear'}}>
            <Sparkles className="w-12 h-12 text-white/90" /></motion.div>
        ) : state==='listening' ? (
          <motion.div animate={{scale:[1,1.15,1]}} transition={{duration:.5,repeat:Infinity}}>
            <Mic className="w-12 h-12 text-white" /></motion.div>
        ) : state==='speaking' ? (
          <motion.div animate={{scale:[1,1.08,1]}} transition={{duration:.8,repeat:Infinity}}>
            <Volume2 className="w-12 h-12 text-white" /></motion.div>
        ) : <Bot className="w-12 h-12 text-white/60" />}
      </motion.div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
export default function VoiceAssistantPage() {
  const [active, setActive] = useState(false);
  const [state, setState] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [caption, setCaption] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [topic, setTopic] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [muted, setMuted] = useState(false);

  const activeRef = useRef(false);
  const stateRef = useRef('idle');
  const historyRef = useRef([]);
  const topicRef = useRef('');
  const mutedRef = useRef(false);
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const analyserCtxRef = useRef(null);
  const animRef = useRef(null);
  const chatEndRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { topicRef.current = topic; }, [topic]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  // ── Mic analyser ──────────────────────────────────────────
  const startMic = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio:true });
      streamRef.current = s;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser(); an.fftSize = 256;
      src.connect(an);
      analyserCtxRef.current = ctx;
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteFrequencyData(buf);
        setAudioLevel(Math.min(buf.reduce((a,b)=>a+b,0)/buf.length/100, 1));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  }, []);

  const stopMic = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    analyserCtxRef.current?.close().catch(()=>{});
    analyserCtxRef.current = null;
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current = null;
    setAudioLevel(0);
  }, []);

  // ── TTS: speak and return promise ─────────────────────────
  const speak = useCallback((text) => {
    return new Promise(resolve => {
      if (mutedRef.current || !window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const clean = text.replace(/[#*_`\[\]()>|]/g, '').replace(/\n+/g, '. ');
      const utt = new SpeechSynthesisUtterance(clean);
      utt.rate = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find(x=>x.name.includes('Google')&&x.lang.startsWith('en'))
        || voices.find(x=>x.lang.startsWith('en'));
      if (v) utt.voice = v;
      utt.onend = resolve;
      utt.onerror = resolve;
      window.speechSynthesis.speak(utt);
    });
  }, []);

  // ── Start recognition helper ──────────────────────────────
  const startRec = useCallback(() => {
    try { recRef.current?.start(); } catch {
      try { recRef.current?.stop(); } catch {}
      setTimeout(() => { try { recRef.current?.start(); } catch {} }, 150);
    }
  }, []);

  // ── Stream AI response (fast, token by token) ─────────────
  const streamAI = useCallback(async (text) => {
    const token = localStorage.getItem('token') || '';
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const resp = await fetch(`${API}/voice/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: text,
        topic: topicRef.current || 'general',
        history: historyRef.current.slice(-6),
      }),
      signal: ctrl.signal,
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.done || data.error) break;
          if (data.text) {
            fullText += data.text;
            setCaption(fullText.length > 160 ? '…' + fullText.slice(-160) : fullText);
          }
        } catch {}
      }
    }

    return fullText;
  }, []);

  // ── Core: user speech → stream AI → speak → listen ────────
  const processUserInput = useCallback(async (text) => {
    if (!text.trim() || !activeRef.current) return;

    // Stop recognition
    try { recRef.current?.stop(); } catch {}

    // Add user message
    setMessages(prev => [...prev, { role:'user', content: text }]);
    historyRef.current.push({ role:'user', content: text });

    // Think → stream AI response
    setState('thinking');
    setCaption('');

    try {
      setState('speaking');
      const reply = await streamAI(text);

      if (reply) {
        setMessages(prev => [...prev, { role:'assistant', content: reply }]);
        historyRef.current.push({ role:'assistant', content: reply });

        // Speak the full response
        setCaption(reply.length > 160 ? '…' + reply.slice(-160) : reply);
        await speak(reply);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, { role:'assistant', content:'Sorry, something went wrong.' }]);
      }
    }

    // Resume listening
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

  // ── Speech Recognition setup (once) ───────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e) => {
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
  }, []);

  // ── Start / End call ──────────────────────────────────────
  const startCall = useCallback(async () => {
    setActive(true);
    setMessages([]);
    setCaption('');
    historyRef.current = [];
    await startMic();

    const greeting = "Hi! I'm your AI teacher. What would you like to learn about today?";
    setMessages([{ role:'assistant', content: greeting }]);
    historyRef.current.push({ role:'assistant', content: greeting });

    setState('speaking');
    setCaption(greeting);
    await speak(greeting);

    if (activeRef.current) {
      setState('listening');
      setCaption('Listening...');
      startRec();
    }
  }, [startMic, speak, startRec]);

  const endCall = useCallback(() => {
    setActive(false);
    setState('idle');
    setCaption('');
    try { recRef.current?.stop(); } catch {}
    window.speechSynthesis?.cancel();
    abortRef.current?.abort();
    stopMic();
  }, [stopMic]);

  const interrupt = useCallback(() => {
    if (!active) return;
    window.speechSynthesis?.cancel();
    abortRef.current?.abort();
    setState('listening');
    setCaption('Listening...');
    startRec();
  }, [active, startRec]);

  useEffect(() => () => {
    try { recRef.current?.abort(); } catch {}
    window.speechSynthesis?.cancel();
    abortRef.current?.abort();
    stopMic();
  }, [stopMic]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-950 via-[#0c0c1d] to-gray-950 text-white overflow-hidden">
      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/30 z-20 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold">AI Voice Assistant</h1>
            <p className="text-[11px]" style={{color:
              state==='listening'?'#f97316':state==='thinking'?'#a855f7':state==='speaking'?'#38bdf8':'#6b7280'}}>
              {active ? (state==='listening'?'● Listening':state==='thinking'?'● Processing':state==='speaking'?'● Speaking':'● Connected') : 'Ready'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/10">
            <BookOpen className="w-3.5 h-3.5 text-gray-400" />
            <input type="text" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic..."
              className="bg-transparent text-xs outline-none w-28 text-gray-300 placeholder-gray-500" />
          </div>
          <button onClick={()=>{setMuted(!muted); if(!muted) window.speechSynthesis?.cancel();}}
            className={`p-2 rounded-lg transition ${muted?'bg-red-500/20 text-red-400':'bg-white/5 text-gray-400 hover:text-white'}`}>
            {muted?<VolumeX className="w-4 h-4"/>:<Volume2 className="w-4 h-4"/>}
          </button>
          <button onClick={()=>setShowChat(!showChat)}
            className={`p-2 rounded-lg transition ${showChat?'bg-indigo-500/20 text-indigo-400':'bg-white/5 text-gray-400 hover:text-white'}`}>
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 flex flex-col items-center justify-center gap-5 ${showChat?'hidden lg:flex':''}`}>
          <div onClick={interrupt} className={active&&(state==='speaking'||state==='thinking')?'cursor-pointer':''}>
            <Orb state={state} level={audioLevel} />
          </div>

          <AnimatePresence mode="wait">
            {caption && (
              <motion.p key={caption.slice(0,20)} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                className={`max-w-lg text-center text-sm px-4 leading-relaxed ${
                  state==='listening'?'text-orange-300/80':state==='speaking'?'text-cyan-300/80':'text-purple-300/80'}`}>
                {caption}
              </motion.p>
            )}
          </AnimatePresence>

          {active && state==='speaking' && <p className="text-[11px] text-gray-600">Tap orb to interrupt</p>}

          <div className="mt-4">
            {!active ? (
              <motion.button whileHover={{scale:1.05}} whileTap={{scale:.95}} onClick={startCall}
                className="flex items-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-lg shadow-lg shadow-green-500/25">
                <Phone className="w-6 h-6" /> Start Conversation
              </motion.button>
            ) : (
              <motion.button whileHover={{scale:1.05}} whileTap={{scale:.95}} onClick={endCall}
                className="flex items-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-red-500 to-rose-600 font-semibold text-lg shadow-lg shadow-red-500/25">
                <PhoneOff className="w-6 h-6" /> End
              </motion.button>
            )}
          </div>
          {!active && <p className="text-xs text-gray-600">Hands-free real-time conversation</p>}
        </div>

        {/* Avatar removed */}

        {/* transcript */}
        <AnimatePresence>
          {showChat && (
            <motion.div initial={{width:0,opacity:0}} animate={{width:360,opacity:1}} exit={{width:0,opacity:0}}
              className="border-l border-white/10 bg-black/40 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Transcript</h3>
                <button onClick={()=>setShowChat(false)} className="p-1 hover:bg-white/10 rounded text-gray-500"><X className="w-4 h-4"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length===0 && <p className="text-sm text-gray-600 text-center mt-8">Start a conversation</p>}
                {messages.map((m,i)=>(
                  <motion.div key={i} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                    className={`flex gap-2 ${m.role==='user'?'flex-row-reverse':''}`}>
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${m.role==='user'?'bg-indigo-500':'bg-cyan-500'}`}>
                      {m.role==='user'?<User className="w-3 h-3 text-white"/>:<Bot className="w-3 h-3 text-white"/>}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role==='user'?'bg-indigo-600 text-white rounded-tr-sm':'bg-gray-800 text-gray-200 rounded-tl-sm'}`}>
                      <ReactMarkdown components={{
                        p:({children})=><p className="mb-1 last:mb-0">{children}</p>,
                        strong:({children})=><strong className="text-yellow-300">{children}</strong>,
                      }}>{m.content}</ReactMarkdown>
                    </div>
                  </motion.div>
                ))}
                <div ref={chatEndRef}/>
              </div>
              {active && (
                <form onSubmit={e=>{e.preventDefault();const v=e.target.elements.m;if(v.value.trim()){processRef.current(v.value.trim());v.value='';}}}
                  className="p-3 border-t border-white/10">
                  <div className="flex gap-2">
                    <input name="m" placeholder="Type instead..." className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg outline-none text-gray-200 placeholder-gray-500 focus:border-indigo-500"/>
                    <button type="submit" className="px-3 py-2 bg-indigo-600 rounded-lg text-white text-sm">Send</button>
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
