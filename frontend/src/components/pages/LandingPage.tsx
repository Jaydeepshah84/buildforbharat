"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useInView, useReducedMotion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowUpRight, Menu, X, Check, Pause, Play, Mic, Eye, Hand, Languages } from "lucide-react";
import { NAV, STACK, GAPS, PIPELINE, JOURNEY, FEATURE_GROUPS, AGENTS, PRINCIPLES, NUMBERS } from "@/components/landing/data";

const HeroScene = dynamic(() => import("@/components/landing/HeroScene"), { ssr: false });

/* ---------------------------------------------------------------- styles */

const CSS = `
.lp{--bg:#08080b;--panel:#0e0e13;--line:rgba(255,255,255,.09);--line-2:rgba(255,255,255,.16);
  --ink:#ededf0;--muted:#8b8b96;--dim:#5f5f6b;--accent:#818cf8;--accent-2:#22d3ee;
  background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;letter-spacing:-0.012em}
body:has(.lp){background:#08080b}
.lp h1,.lp h2,.lp h3{letter-spacing:-0.035em;font-weight:550}
.lp-muted{color:var(--muted)}
.lp-dim{color:var(--dim)}
.lp-line{border-color:var(--line)}

.lp-card{position:relative;border:1px solid var(--line);border-radius:14px;
  background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.012));
  transition:border-color .3s,transform .3s}
.lp-card::before{content:"";position:absolute;inset:0;border-radius:inherit;opacity:0;
  transition:opacity .3s;pointer-events:none;
  background:radial-gradient(340px circle at var(--mx,50%) var(--my,50%),rgba(129,140,248,.14),transparent 65%)}
.lp-card:hover{border-color:var(--line-2)}
.lp-card:hover::before{opacity:1}

.lp-grad{background:linear-gradient(96deg,#c7d2fe 0%,#818cf8 42%,#22d3ee 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.lp-grid{background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),
  linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:64px 64px}
.lp-noise{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")}

.lp-btn{position:relative;display:inline-flex;align-items:center;gap:.5rem;border-radius:9px;
  padding:.7rem 1.15rem;font-size:.875rem;font-weight:500;transition:all .25s}
.lp-btn-primary{color:#0a0a0f;background:linear-gradient(180deg,#fff,#dcdce4);
  box-shadow:0 1px 0 rgba(255,255,255,.4) inset,0 8px 24px -10px rgba(129,140,248,.5)}
.lp-btn-primary:hover{transform:translateY(-1px);box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 30px -10px rgba(129,140,248,.65)}
.lp-btn-ghost{color:var(--ink);border:1px solid var(--line);background:rgba(255,255,255,.03)}
.lp-btn-ghost:hover{border-color:var(--line-2);background:rgba(255,255,255,.06)}

@keyframes lp-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lp-marquee{animation:lp-marquee 42s linear infinite}
@keyframes lp-bar{0%,100%{transform:scaleY(.28)}50%{transform:scaleY(1)}}
.lp-bar{transform-origin:center;animation:lp-bar 1.1s ease-in-out infinite}
@keyframes lp-ping{0%{opacity:.9;transform:scale(1)}70%,100%{opacity:0;transform:scale(2.4)}}
.lp-ping{animation:lp-ping 2s cubic-bezier(0,0,.2,1) infinite}
@media (prefers-reduced-motion:reduce){.lp *{animation:none!important;transition:none!important}}
`;

/* ---------------------------------------------------------------- helpers */

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Card that lights up under the cursor. */
function Card({ children, className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div {...rest} onMouseMove={onMove} className={`lp-card ${className}`}>
      {children}
    </div>
  );
}

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1100);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{v}{suffix}</span>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] lp-dim">
      <span className="h-1 w-1 rounded-full bg-[#818cf8]" />
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- lesson preview */

function LessonPreview() {
  const reduce = useReducedMotion();
  const steps = [
    { en: "Sunlight reaches the leaf", hi: "सूर्य का प्रकाश पत्ती तक पहुँचता है" },
    { en: "Chlorophyll absorbs the light energy", hi: "क्लोरोफिल प्रकाश ऊर्जा को सोखता है" },
    { en: "Water and carbon dioxide enter", hi: "पानी और कार्बन डाइऑक्साइड प्रवेश करते हैं" },
    { en: "Glucose forms and oxygen is released", hi: "ग्लूकोज़ बनता है और ऑक्सीजन निकलती है" },
  ];
  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!playing || reduce) return;
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), 3400);
    return () => clearInterval(id);
  }, [playing, reduce, steps.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b lp-line px-5 py-3">
        <span className="flex items-center gap-2 text-xs lp-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="lp-ping absolute inline-flex h-full w-full rounded-full bg-[#22d3ee]" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#22d3ee]" />
          </span>
          Generating · Photosynthesis
        </span>
        <span className="text-xs lp-dim">Hindi narration</span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="lp-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_50%,black,transparent)]" />
        <svg viewBox="0 0 480 300" className="relative h-full w-full" role="img" aria-label="Animated diagram of photosynthesis">
          <defs>
            <linearGradient id="lpLeaf" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#134e4a" />
              <stop offset="100%" stopColor="#166534" />
            </linearGradient>
            <radialGradient id="lpSun">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
          </defs>

          <circle cx="80" cy="72" r="24" fill="url(#lpSun)" />
          <circle cx="80" cy="72" r="38" fill="#f59e0b" opacity="0.10" />
          {[0, 1, 2].map((k) => (
            <motion.line
              key={k}
              x1={106} y1={76 + k * 13} x2={160} y2={94 + k * 15}
              stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round"
              animate={reduce ? {} : { opacity: [0.15, 0.9, 0.15] }}
              transition={{ duration: 3, repeat: Infinity, delay: k * 0.3, ease: "easeInOut" }}
            />
          ))}

          <motion.g
            animate={reduce ? {} : { rotate: [-1.5, 1.5, -1.5] }}
            style={{ originX: "50%", originY: "60%" }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M190 210 C 190 140, 240 100, 310 100 C 310 170, 262 210, 190 210 Z" fill="url(#lpLeaf)" stroke="#34d399" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M190 210 L 310 100" stroke="#34d399" strokeWidth="1.2" opacity="0.65" />
            {[0.28, 0.46, 0.64, 0.82].map((f) => (
              <path key={f} d={`M${190 + 120 * f} ${210 - 110 * f} l ${26 * (1 - f) + 14} ${20 * (1 - f) + 8}`} stroke="#34d399" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
            ))}
            <path d="M190 210 L 168 232" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
          </motion.g>

          {["H₂O", "CO₂"].map((m, k) => (
            <motion.text
              key={m} x={62} y={214 + k * 30} fontSize="13" fill="#93a3b8" fontFamily="Inter, sans-serif"
              animate={reduce ? {} : { x: [62, 140], opacity: [0, 1, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, delay: k * 0.8, ease: "easeInOut" }}
            >{m}</motion.text>
          ))}
          <motion.text
            x={352} y={104} fontSize="13" fill="#93a3b8" fontFamily="Inter, sans-serif"
            animate={reduce ? {} : { y: [104, 72], opacity: [0, 1, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, delay: 0.6, ease: "easeInOut" }}
          >O₂</motion.text>
          <text x={338} y={216} fontSize="13" fill="#93a3b8" fontFamily="Inter, sans-serif">C₆H₁₂O₆</text>
        </svg>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b0b10] via-[#0b0b10]/85 to-transparent px-5 pb-4 pt-12">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
              <p className="text-sm font-medium">{steps[step].en}</p>
              <p className="mt-0.5 text-xs lp-muted">{steps[step].hi}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t lp-line px-5 py-3">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="grid h-7 w-7 place-items-center rounded-full border lp-line text-[#ededf0] transition-colors hover:bg-white/10"
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? <Pause size={11} /> : <Play size={11} className="ml-0.5" />}
        </button>
        <div className="flex flex-1 gap-1.5">
          {steps.map((s, k) => (
            <button
              key={s.en}
              onClick={() => setStep(k)}
              className={`h-[3px] flex-1 rounded-full transition-colors ${k <= step ? "bg-gradient-to-r from-[#818cf8] to-[#22d3ee]" : "bg-white/12"}`}
              aria-label={`Step ${k + 1}`}
            />
          ))}
        </div>
        <span className="text-xs tabular-nums lp-dim">{step + 1}/{steps.length}</span>
        <span className="hidden items-center gap-1.5 rounded-full border lp-line px-2.5 py-1 text-[11px] lp-muted sm:inline-flex">
          <Mic size={10} /> Raise hand
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- small bento tiles */

function VoiceTile() {
  return (
    <div className="flex h-full flex-col justify-between p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg border lp-line bg-white/[0.04]"><Mic size={14} /></span>
        <div className="flex h-6 items-end gap-[3px]">
          {[0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72].map((d, i) => (
            <span key={d} className="lp-bar w-[3px] rounded-full bg-gradient-to-t from-[#818cf8] to-[#22d3ee]" style={{ height: `${12 + (i % 3) * 6}px`, animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-[15px] font-medium">Interrupt and ask</p>
        <p className="mt-1.5 text-[13px] leading-relaxed lp-muted">
          Tap to speak mid-lesson. The teacher pauses, answers with voice and a supporting visual, then resumes.
        </p>
      </div>
    </div>
  );
}

function EmotionTile() {
  return (
    <div className="flex h-full flex-col justify-between p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg border lp-line bg-white/[0.04]"><Eye size={14} /></span>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-300">focused</span>
      </div>
      <div>
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#22d3ee]"
            initial={{ width: 0 }}
            whileInView={{ width: "91%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="text-[15px] font-medium">Senses confusion</p>
        <p className="mt-1.5 text-[13px] leading-relaxed lp-muted">
          On-device detection every 30 seconds. A confused streak triggers a simpler re-explanation.
        </p>
      </div>
    </div>
  );
}

function LanguageTile() {
  const langs = ["हिन्दी", "English", "ગુજરાતી", "தமிழ்", "తెలుగు", "मराठी", "বাংলা", "Español"];
  return (
    <div className="flex h-full flex-col justify-between p-5">
      <span className="grid h-8 w-8 place-items-center rounded-lg border lp-line bg-white/[0.04]"><Languages size={14} /></span>
      <div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {langs.map((l) => (
            <span key={l} className="rounded-md border lp-line bg-white/[0.03] px-2 py-0.5 text-[11px] lp-muted">{l}</span>
          ))}
        </div>
        <p className="text-[15px] font-medium">Mother tongue, end to end</p>
        <p className="mt-1.5 text-[13px] leading-relaxed lp-muted">
          Four interface languages, eight for generated content, and neural voices for every major Indian language.
        </p>
      </div>
    </div>
  );
}

function SignTile() {
  return (
    <div className="flex h-full flex-col justify-between p-5">
      <span className="grid h-8 w-8 place-items-center rounded-lg border lp-line bg-white/[0.04]"><Hand size={14} /></span>
      <div>
        <p className="text-[15px] font-medium">Indian Sign Language</p>
        <p className="mt-1.5 text-[13px] leading-relaxed lp-muted">
          A signing avatar with fingerspelling and large captions, so a whole course can be taken without audio.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- architecture rows */

const ROWS = [
  { name: "Web frontend", tech: "Next.js 15, React 19", port: "3000", role: "Twenty pages across the learner and teacher surfaces" },
  { name: "Backend API", tech: "Express, Socket.io", port: "5050", role: "REST, server-sent events, sockets and AI orchestration" },
  { name: "Neural voice", tech: "Flask, edge-tts, Whisper", port: "5001", role: "Text to speech and speech to text" },
  { name: "Database", tech: "Supabase PostgreSQL", port: "—", role: "Eighteen tables plus authentication" },
  { name: "Mobile app", tech: "Expo, React Native", port: "—", role: "Offline-first learning with a local SQLite cache" },
  { name: "Tap launcher", tech: "Python, Whisper", port: "—", role: "Desk-tap and wake-word navigation for kiosks" },
];

/* ---------------------------------------------------------------- pipeline */

function Pipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.55"] });
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="mt-14">
      <div className="relative mb-8 hidden h-px w-full bg-white/10 lg:block">
        <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#818cf8] to-[#22d3ee]" style={{ width }} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PIPELINE.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.06}>
            <Card className="h-full p-5">
              <span className="text-xs font-medium tabular-nums text-[#818cf8]">{p.t}</span>
              <h3 className="mt-3 text-[15px]">{p.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed lp-muted">{p.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- page */

export default function LandingPage() {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("product");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.href.slice(1))).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp min-h-screen overflow-x-hidden antialiased">
      <style>{CSS}</style>

      {/* header */}
      <header className={`sticky top-0 z-50 transition-colors duration-300 ${scrolled ? "border-b lp-line bg-[#08080b]/80 backdrop-blur-xl" : "border-b border-transparent"}`}>
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 text-[15px] font-medium">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#818cf8] to-[#22d3ee] text-[11px] font-semibold text-[#08080b]">L</span>
            LearnerAI
          </Link>

          <div className="hidden items-center gap-1 rounded-full border lp-line bg-white/[0.03] p-1 md:flex">
            {NAV.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${active === l.href.slice(1) ? "bg-white/10 text-[#ededf0]" : "lp-muted hover:text-[#ededf0]"}`}
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <Link href="/login" className="text-[13px] lp-muted transition-colors hover:text-[#ededf0]">Sign in</Link>
            <Link href="/signup" className="lp-btn lp-btn-primary !px-4 !py-2 !text-[13px]">Get started</Link>
          </div>

          <button onClick={() => setMobileOpen((o) => !o)} className="rounded-lg p-1.5 md:hidden" aria-label="Toggle menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t lp-line bg-[#08080b] md:hidden">
              <div className="flex flex-col px-6 py-3">
                {NAV.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="py-2.5 text-sm lp-muted">{l.label}</a>
                ))}
                <Link href="/login" className="border-t lp-line py-2.5 text-sm lp-muted">Sign in</Link>
                <Link href="/signup" className="lp-btn lp-btn-primary mb-3 mt-2 justify-center">Get started</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="lp-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,black,transparent)]" />
          <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[52rem] -translate-x-1/2 rounded-full bg-[#4f46e5] opacity-[0.16] blur-[130px]" />
          <div className="absolute right-[-8rem] top-[8rem] h-[26rem] w-[26rem] rounded-full bg-[#22d3ee] opacity-[0.07] blur-[120px]" />
          <div className="lp-noise absolute inset-0 opacity-[0.035]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pb-28 lg:pt-24">
          <motion.div initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <span className="inline-flex items-center gap-2 rounded-full border lp-line bg-white/[0.04] px-3 py-1 text-[12px] lp-muted">
              <span className="relative flex h-1.5 w-1.5">
                <span className="lp-ping absolute inline-flex h-full w-full rounded-full bg-[#818cf8]" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#818cf8]" />
              </span>
              Nine AI agents, one adaptive platform
            </span>

            <h1 className="mt-6 text-[40px] leading-[1.06] sm:text-[52px] lg:text-[60px]">
              An AI teacher that <span className="lp-grad">explains, listens</span>, and adapts.
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-relaxed lp-muted">
              LearnerAI generates animated, voice-narrated lessons on demand in eight languages. Students interrupt with a
              spoken question at any point, and the platform senses confusion through the webcam and changes how it teaches.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="lp-btn lp-btn-primary group">
                Get started
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#product" className="lp-btn lp-btn-ghost">See it work</a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] lp-dim">
              <span className="flex items-center gap-1.5"><Check size={13} className="text-[#818cf8]" /> Free for students</span>
              <span className="flex items-center gap-1.5"><Check size={13} className="text-[#818cf8]" /> Works offline on mobile</span>
              <span className="flex items-center gap-1.5"><Check size={13} className="text-[#818cf8]" /> No credit card</span>
            </div>
          </motion.div>

          <div className="relative h-[300px] sm:h-[380px] lg:h-[460px]">
            <HeroScene still={!!reduce} />
          </div>
        </div>

        {/* stack marquee */}
        <div className="relative border-y lp-line bg-white/[0.015]">
          <div className="overflow-hidden py-3.5 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
            <div className="lp-marquee flex w-max gap-8 whitespace-nowrap text-[13px] lp-dim">
              {[...STACK, ...STACK].map((s, i) => (
                <span key={i} className="flex items-center gap-8">{s}<span className="h-1 w-1 rounded-full bg-white/15" /></span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* problem */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <Reveal className="max-w-2xl">
          <Label>The problem</Label>
          <h2 className="mt-5 text-[32px] leading-[1.1] sm:text-[42px]">Three gaps hold Indian classrooms back.</h2>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {GAPS.map((g, i) => (
            <Reveal key={g.title} delay={i * 0.08}>
              <Card className="h-full p-6">
                <span className="text-xs tabular-nums lp-dim">0{i + 1}</span>
                <h3 className="mt-3 text-lg">{g.title}</h3>
                <p className="mt-3 text-[13.5px] leading-relaxed lp-muted">{g.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* product bento */}
      <section id="product" className="relative border-t lp-line">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(79,70,229,.13),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <Reveal className="max-w-2xl">
            <Label>The product</Label>
            <h2 className="mt-5 text-[32px] leading-[1.1] sm:text-[42px]">Lessons are generated, not retrieved.</h2>
            <p className="mt-5 text-[15px] leading-relaxed lp-muted">
              Ask any question and the platform builds a four to six step animated explanation, narrates it sentence by
              sentence in a neural voice, and shows subtitles on the same timeline. Nothing comes from a fixed library.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            <Reveal className="lg:col-span-2 lg:row-span-2">
              <Card className="h-full overflow-hidden !bg-[#0b0b10]"><LessonPreview /></Card>
            </Reveal>
            <Reveal delay={0.08}><Card className="h-full min-h-[190px]"><VoiceTile /></Card></Reveal>
            <Reveal delay={0.14}><Card className="h-full min-h-[190px]"><EmotionTile /></Card></Reveal>
            <Reveal delay={0.2} className="lg:col-span-2"><Card className="h-full min-h-[170px]"><LanguageTile /></Card></Reveal>
            <Reveal delay={0.26}><Card className="h-full min-h-[170px]"><SignTile /></Card></Reveal>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="border-t lp-line">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <Reveal className="max-w-2xl">
            <Label>How it works</Label>
            <h2 className="mt-5 text-[32px] leading-[1.1] sm:text-[42px]">From question to narrated animation.</h2>
            <p className="mt-5 text-[15px] leading-relaxed lp-muted">
              Long generations stream over server-sent events, so the interface paints in seconds instead of waiting for a
              complete response.
            </p>
          </Reveal>

          <Pipeline />

          <Reveal className="mt-24 max-w-2xl">
            <Label>The student journey</Label>
            <h2 className="mt-5 text-[32px] leading-[1.1] sm:text-[42px]">One adaptive loop, not ten separate tools.</h2>
            <p className="mt-5 text-[15px] leading-relaxed lp-muted">
              What a student struggles with shapes the analytics, which shape the study plan, which schedules the revision
              the AI teacher then delivers.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-x-4 gap-y-0 sm:grid-cols-2">
            {JOURNEY.map((j, i) => (
              <Reveal key={j.title} delay={(i % 2) * 0.05} className="h-full">
                <div className="group flex h-full gap-5 border-b lp-line py-5 transition-colors hover:border-white/25">
                  <span className="w-6 shrink-0 text-sm tabular-nums lp-dim transition-colors group-hover:text-[#818cf8]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[15px]">{j.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed lp-muted">{j.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="relative border-t lp-line">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,rgba(34,211,238,.08),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <Label>Features</Label>
              <h2 className="mt-5 text-[32px] leading-[1.1] sm:text-[42px]">Twenty-nine features, all implemented.</h2>
            </div>
            <p className="max-w-sm text-[14px] leading-relaxed lp-muted">
              Every capability below is reachable from the interface today, across web, mobile and ambient hardware.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FEATURE_GROUPS.map((g, gi) => (
              <Reveal key={g.title} delay={(gi % 4) * 0.06}>
                <Card className="h-full p-5">
                  <div className="flex items-baseline gap-3 border-b lp-line pb-3">
                    <span className="text-xs tabular-nums lp-dim">{String(gi + 1).padStart(2, "0")}</span>
                    <h3 className="text-[15px]">{g.title}</h3>
                    <span className="ml-auto text-xs lp-dim">{g.items.length}</span>
                  </div>
                  <ul className="mt-4 space-y-3.5">
                    {g.items.map((it) => (
                      <li key={it.name}>
                        <p className="text-[13.5px] font-medium">{it.name}</p>
                        <p className="mt-1 text-[13px] leading-relaxed lp-muted">{it.desc}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* engine */}
      <section id="engine" className="border-t lp-line">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <Reveal className="max-w-2xl">
            <Label>The engine</Label>
            <h2 className="mt-5 text-[32px] leading-[1.1] sm:text-[42px]">Nine specialised agents.</h2>
            <p className="mt-5 text-[15px] leading-relaxed lp-muted">
              Each capability is its own agent with its own prompt, schema and post-processing. Every agent returns
              validated JSON before anything reaches the database.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AGENTS.map((a, i) => (
              <Reveal key={a.name} delay={(i % 3) * 0.05}>
                <Card className="flex h-full items-start gap-3 p-4">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-[#818cf8] to-[#22d3ee]" />
                  <div>
                    <p className="text-[14px] font-medium">{a.name}Agent</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed lp-muted">{a.job}</p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>

          <div className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={(i % 3) * 0.05}>
                <div className="border-t border-white/15 pt-5">
                  <h3 className="text-[15px]">{p.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed lp-muted">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* architecture */}
      <section id="architecture" className="border-t lp-line">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <Reveal className="max-w-2xl">
            <Label>Architecture</Label>
            <h2 className="mt-5 text-[32px] leading-[1.1] sm:text-[42px]">Five coordinated services.</h2>
            <p className="mt-5 text-[15px] leading-relaxed lp-muted">
              A stateless API, a managed database and a separable voice service. The mobile app and the desk-tap launcher
              share the same backend.
            </p>
          </Reveal>

          <Reveal className="mt-12">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b lp-line text-[11px] uppercase tracking-[0.14em] lp-dim">
                      <th className="px-5 py-3 font-medium">Service</th>
                      <th className="px-5 py-3 font-medium">Technology</th>
                      <th className="px-5 py-3 font-medium">Port</th>
                      <th className="px-5 py-3 font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((r) => (
                      <tr key={r.name} className="border-b lp-line transition-colors last:border-0 hover:bg-white/[0.03]">
                        <td className="px-5 py-3.5 font-medium">{r.name}</td>
                        <td className="px-5 py-3.5 lp-muted">{r.tech}</td>
                        <td className="px-5 py-3.5 tabular-nums text-[#818cf8]">{r.port}</td>
                        <td className="px-5 py-3.5 lp-muted">{r.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Reveal>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {NUMBERS.map((n, i) => (
              <Reveal key={n.label} delay={(i % 4) * 0.05}>
                <Card className="p-5">
                  <p className="text-[28px] tabular-nums"><Counter to={n.v} suffix={n.suffix} /></p>
                  <p className="mt-1 text-xs lp-muted">{n.label}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="border-t lp-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border lp-line px-8 py-14 text-center sm:px-16">
              <div className="pointer-events-none absolute inset-0">
                <div className="lp-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_70%_80%_at_50%_50%,black,transparent)]" />
                <div className="absolute left-1/2 top-[-14rem] h-[30rem] w-[40rem] -translate-x-1/2 rounded-full bg-[#4f46e5] opacity-25 blur-[120px]" />
              </div>
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-[30px] leading-[1.1] sm:text-[40px]">Start with one question.</h2>
                <p className="mx-auto mt-4 max-w-md text-[15px] lp-muted">
                  Pick a class, a subject and a language. The first lesson streams in seconds.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/signup" className="lp-btn lp-btn-primary group">
                    Get started
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="/login" className="lp-btn lp-btn-ghost">Sign in</Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t lp-line">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 text-[15px] font-medium">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#818cf8] to-[#22d3ee] text-[11px] font-semibold text-[#08080b]">L</span>
                LearnerAI
              </Link>
              <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed lp-muted">
                A personal AI teacher students can watch, hear and question. Multilingual, visual and emotion-adaptive.
              </p>
            </div>
            {[
              { title: "Learn", links: [["Courses", "/courses"], ["AI tutor", "/tutor"], ["Visual Lab", "/visual-lab"], ["Voice assistant", "/voice-assistant"]] },
              { title: "Assess", links: [["Quizzes", "/quiz"], ["Exams", "/exam"], ["Homework", "/homework"], ["Analytics", "/analytics"]] },
              { title: "Plan", links: [["Study planner", "/study-planner"], ["Career guidance", "/career"], ["Study room", "/classroom"], ["Dashboard", "/dashboard"]] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-[13.5px] font-medium">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="group inline-flex items-center gap-1 text-[13.5px] lp-muted transition-colors hover:text-[#ededf0]">
                        {label}
                        <ArrowUpRight size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col justify-between gap-2 border-t lp-line pt-6 text-xs lp-dim sm:flex-row">
            <p>&copy; {new Date().getFullYear()} LearnerAI</p>
            <p>Made in India</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
