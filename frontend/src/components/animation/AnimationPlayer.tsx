"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Maximize2, Minimize2, Volume2, VolumeX, Loader2, ChevronRight, ThumbsUp, Bookmark, Hand, MessageSquare, Send, X } from "lucide-react";
import AnimationCanvas, { type AnimationSpec } from "./AnimationCanvas";
import CWASAAvatar, { type CWASAAvatarHandle, type AvatarStatus } from "@/components/CWASAAvatar";
import { fetchSigns, splitForSigning, estimateSignMs, type SignData } from "@/lib/signLanguage";

interface Props {
  topic: string;
  classLevel?: string;
  language?: string;
  onNext?: () => void;
  regenerateNonce?: number; // bump from parent to force a fresh, cache-bypassed AI generation
  /** Deaf-student mode: no audio — the 3D signing avatar narrates each step and answers questions. */
  signLanguage?: boolean;
}

const BACKEND = typeof window !== "undefined"
  ? (window.location.hostname !== "localhost"
    ? `http://${window.location.hostname}:5050/api`
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"))
  : "";
const getTtsUrl = () => {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `http://${host}:5001/tts`;
};

export default function AnimationPlayer({ topic, classLevel = "10", language = "en", onNext, regenerateNonce = 0, signLanguage = false }: Props) {
  const [phase, setPhase] = useState<1 | 2>(1);
  const [htmlCode, setHtmlCode] = useState("");
  const [voiceScript, setVoiceScript] = useState("");
  const [narrationSteps, setNarrationSteps] = useState<string[]>([]);
  const [animationSpec, setAnimationSpec] = useState<AnimationSpec | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [title, setTitle] = useState("");
  const [explanation, setExplanation] = useState("");
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState("Preparing your lesson...");
  const [error, setError] = useState(""); // backend/network failure to show instead of an empty player
  const [iframeKey, setIframeKey] = useState(0);
  const [speakingText, setSpeakingText] = useState("");
  const [sentenceIdx, setSentenceIdx] = useState(-1);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(100);
  const [showVolSlider, setShowVolSlider] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Sign-language mode: the 3D avatar is the narrator ──
  const avatarRef = useRef<CWASAAvatarHandle>(null);
  const signLanguageRef = useRef(signLanguage);
  useEffect(() => { signLanguageRef.current = signLanguage; }, [signLanguage]);
  // Per-step SiGML. Slot states mirror the audio slots: undefined = not requested, null = in flight, false = failed.
  const preloadedSignsRef = useRef<(SignData | null | false | undefined)[]>([]);
  const [signGloss, setSignGloss] = useState("");
  const [avatarStatus, setAvatarStatus] = useState<AvatarStatus>("loading");
  const [signPhase, setSignPhase] = useState<"" | "preparing" | "signing" | "captions">("");
  // "Ask the avatar": the lesson pauses, the tutor answers, the avatar signs the answer.
  const [askOpen, setAskOpen] = useState(false);
  const [askInput, setAskInput] = useState("");
  const [ask, setAsk] = useState<{ question: string; answer: string; sentences: string[]; active: number; loading: boolean; done: boolean; error?: string } | null>(null);
  const askAbortRef = useRef(false);
  const askHistoryRef = useRef<{ role: string; content: string }[]>([]);

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
  const stepDrivenRef = useRef(false); // true when narration is 1:1 with animation steps
  // Progressive mode: when the backend streams steps one-by-one, we start
  // playback the moment step 0 arrives instead of waiting for the full spec.
  const progressiveModeRef = useRef(false);
  // True once the whole spec has finished streaming — lets playback/replay know
  // there are no more steps coming, so it stops cleanly instead of waiting.
  const generationCompleteRef = useRef(false);

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
    const ctrl = new AbortController();
    setLoading(true); setPhase(1); setHtmlCode(""); setVoiceScript(""); setNarrationSteps([]); setSpeakingText("");
    setAnimationSpec(null); setCurrentStep(0); setError("");
    progressiveModeRef.current = false;
    generationCompleteRef.current = false;
    sentencesRef.current = [];
    preloadedAudioRef.current = [];
    preloadedSignsRef.current = [];
    askAbortRef.current = true;
    askHistoryRef.current = [];
    setSignGloss(""); setAsk(null); setAskOpen(false);
    stopAll();

    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

    fetch(`${BACKEND}/tutor/pipeline/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question: topicTitle, classLevel, language, style: "detailed", regenerate: regenerateNonce > 0 }),
      signal: ctrl.signal,
    }).then(async resp => {
      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let lastEvent = "";
      let gotContent = false;
      let failed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (line.startsWith("event: ")) { lastEvent = line.slice(7).trim(); continue; }
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));

            // The backend reported a failure (e.g. an LLM auth error). Show it rather
            // than dropping into an empty black player with no explanation.
            if (lastEvent === "error") {
              failed = true;
              setError(d.message || "Unknown error");
              continue;
            }

            // Early title — paint the header before any steps finish.
            if (d.type === "meta" && d.title) {
              setTitle(d.title);
              continue;
            }

            // Progressive: a single step arrived from the Azure stream.
            // Show step 0 immediately and start narration as audio for each step lands.
            if (d.type === "step" && d.step) {
              gotContent = true;
              handleProgressiveStep(d.stepIndex, d.step);
              continue;
            }

            if (d.phase && d.message) setStatus(d.message);
            const steps: string[] = Array.isArray(d.narration_steps) ? d.narration_steps.filter((s: any) => typeof s === "string" && s.trim().length > 2) : [];
            const spec: AnimationSpec | null = isValidSpec(d.animation_spec) ? d.animation_spec : null;
            const isPhase2 = !!spec || (d.visual_code && d.explanation && !d.visual_code.includes("loader"));
            if (isPhase2) {
              gotContent = true;
              setHtmlCode(d.visual_code || "");
              // In progressive mode, we already have the spec built up; only
              // overwrite metadata (title/explanation/definitions). Keep our
              // progressively-accumulated animationSpec to avoid wiping state.
              if (!progressiveModeRef.current) {
                setAnimationSpec(spec);
                setCurrentStep(0);
                setNarrationSteps(spec ? spec.steps.map(s => s.narration) : steps);
                setPhase(2);
                setLoading(false);
              }
              setVoiceScript(d.voice_script || d.explanation || "");
              setTitle(d.title || topicTitle);
              setExplanation(d.explanation || "");
              setDefinitions(d.definitions || []);
            } else if (d.visual_code) {
              gotContent = true;
              setHtmlCode(d.visual_code);
              setNarrationSteps(steps);
              setTitle(d.title || topicTitle);
              setExplanation(d.explanation || "");
              setDefinitions(d.definitions || []);
              setVoiceScript(d.voice_script || "");
              setLoading(false);
            }
          } catch {}
        }
      }
      if (!cancelled) {
        if (!gotContent && !failed) setError("The AI returned no animation for this topic. Please try again.");
        setLoading(false); generationCompleteRef.current = true;
      }
    }).catch((e: any) => {
      if (!cancelled) {
        if (e?.name !== "AbortError") setError(`Could not reach the backend: ${e?.message || e}`);
        setLoading(false); generationCompleteRef.current = true;
      }
    });

    return () => { cancelled = true; ctrl.abort(); stopAll(); };
  }, [topicTitle, classLevel, language, regenerateNonce]);

  // Handle an incremental step from the backend stream. The first step flips
  // the UI to phase 2 and kicks off TTS preload + playback. Subsequent steps
  // append to the spec and preload their audio without interrupting playback.
  function handleProgressiveStep(stepIndex: number, step: any) {
    setAnimationSpec(prev => {
      const baseSteps = prev ? [...prev.steps] : [];
      baseSteps[stepIndex] = step;
      return {
        canvas: prev?.canvas || { width: 1280, height: 720, bg: "#0f172a" },
        steps: baseSteps,
        totalDuration: prev?.totalDuration || 0,
      } as AnimationSpec;
    });
    setNarrationSteps(prev => {
      const next = [...prev];
      next[stepIndex] = step.narration || "";
      return next;
    });

    // Keep sentencesRef in sync so speakSequential picks up newly-arrived steps.
    sentencesRef.current[stepIndex] = step.narration || "";

    // Preload this step's narration in the background: TTS audio, or SiGML for the signing avatar.
    preloadStep(stepIndex, step.narration || "");

    if (stepIndex === 0) {
      progressiveModeRef.current = true;
      stepDrivenRef.current = true;
      currentSentenceRef.current = 0;
      cancelSpeakRef.current = false;
      setTitle(prev => prev || topicTitle);
      setPhase(2);
      setLoading(false);
      setCurrentStep(0);
      setStatus("");

      if (signLanguageRef.current) {
        // Sign mode plays no audio, so the autoplay restriction below doesn't apply:
        // start signing step 0 as soon as it arrives.
        setIsPlaying(true);
        playingRef.current = true;
        cancelSpeakRef.current = false;
        setTimeout(() => speakSequential(), 60);
      } else {
        // Start PAUSED. Browsers block audio autoplay without a user gesture — if we
        // auto-started, audio.play() would reject and the loop would blast through all
        // steps in ~2s with no narration. Instead we show step 0 + a Play button, and
        // start narration on the user's first Play click (which unlocks audio).
        setIsPlaying(false);
      }
    }
  }

  function preloadStep(idx: number, text: string) {
    if (signLanguageRef.current) preloadStepSigns(idx, text);
    else preloadStepAudio(idx, text);
  }

  function preloadStepSigns(idx: number, text: string) {
    if (preloadedSignsRef.current[idx] !== undefined) return;
    if (!text) { preloadedSignsRef.current[idx] = false; return; }
    preloadedSignsRef.current[idx] = null; // in flight
    fetchSigns(text).then((data) => { preloadedSignsRef.current[idx] = data || false; });
  }

  function preloadStepAudio(idx: number, text: string) {
    if (preloadedAudioRef.current[idx] !== undefined) return;
    if (!text) { preloadedAudioRef.current[idx] = false; return; }
    // Mark as in-flight (null) immediately to avoid double-fetching. Any failure
    // sets the slot to false so speakSequential falls back to the browser voice
    // at once instead of waiting out its 8s grace period for audio that never comes.
    preloadedAudioRef.current[idx] = null;

    fetch(getTtsUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: langCode, speed: 1.0 }),
      signal: AbortSignal.timeout(20000),
    }).then(async resp => {
      if (!resp.ok) throw new Error(`TTS service responded ${resp.status}`);
      const blob = await resp.blob();
      if (blob.size <= 200) throw new Error("TTS service returned empty audio");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await new Promise<void>((resolve) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => resolve();
        setTimeout(resolve, 5000);
        audio.load();
      });
      preloadedAudioRef.current[idx] = audio;
    }).catch((err) => {
      preloadedAudioRef.current[idx] = false;
      console.warn(`[TTS] Step ${idx} narration unavailable, using browser voice:`, err?.message || err);
    });
  }

  // Slot states: undefined = not requested, null = in flight, false = failed, HTMLAudioElement = ready.
  const preloadedAudioRef = useRef<(HTMLAudioElement | null | false)[]>([]);
  const preloadingRef = useRef(false);

  // ── When phase 2 loads: build the sentence list, preload audio, then drive animation in lockstep ──
  useEffect(() => {
    if (phase !== 2) return;
    // In progressive mode the streaming reader already started playback and
    // is preloading per-step. This effect would otherwise wipe that state.
    if (progressiveModeRef.current) return;

    // Prefer step-driven mode whenever we have either an animation_spec or narration_steps from the backend.
    let sentences: string[];
    if (animationSpec && animationSpec.steps.length > 0) {
      sentences = animationSpec.steps.map(s => s.narration);
      stepDrivenRef.current = true;
    } else if (narrationSteps.length > 0) {
      sentences = narrationSteps;
      stepDrivenRef.current = true;
    } else {
      const text = voiceScript || explanation;
      if (!text) return;
      sentences = splitSentences(text);
      stepDrivenRef.current = false;
    }

    sentencesRef.current = sentences;
    currentSentenceRef.current = 0;
    cancelSpeakRef.current = false;
    preloadedAudioRef.current = [];

    if (mutedRef.current && !signLanguageRef.current) return;

    // Pin the visual to step 0 (or pause legacy auto-run) until audio is preloaded.
    setTimeout(() => {
      if (animationSpec) setCurrentStep(0);
      else if (stepDrivenRef.current) sendToIframeWithArgs("showStep", { idx: 0 });
      else sendToIframe("pauseAnimation");
    }, 120);
    if (signLanguageRef.current) {
      // Sign mode: no audio. Request every step's SiGML in parallel and start; speakSequential
      // waits per step for its signs to arrive, exactly like it waits for audio.
      sentences.forEach((s, i) => preloadStepSigns(i, s));
      setStatus("");
      speakSequential();
      return () => { cancelSpeakRef.current = true; stopAll(); };
    }

    setStatus("Loading voice narration...");

    preloadingRef.current = true;

    Promise.all(sentences.map(async (s) => {
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

      // In step-driven mode the animation is paused at step 0; speakSequential will advance per sentence.
      // In legacy mode we kick off the auto-running animation now that audio is ready.
      if (!stepDrivenRef.current) sendToIframe("resumeAnimation");
      setStatus("");
      speakSequential();
    }).catch(() => {
      preloadingRef.current = false;
      if (!stepDrivenRef.current) sendToIframe("resumeAnimation");
      setStatus("");
    });

    return () => { cancelSpeakRef.current = true; stopAll(); };
  }, [phase, voiceScript, explanation, narrationSteps, animationSpec]);

  function isValidSpec(s: any): boolean {
    return !!(s && Array.isArray(s.steps) && s.steps.length > 0 && s.canvas);
  }

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

    const stepDriven = stepDrivenRef.current;
    const progressive = progressiveModeRef.current;

    // Read sentences/audio dynamically so progressive mode picks up new steps.
    for (let i = currentSentenceRef.current; ; i++) {
      if (cancelSpeakRef.current || (mutedRef.current && !signLanguageRef.current)) break;

      // In progressive mode, wait for sentence i to arrive — but stop immediately
      // once generation is complete and there are no more sentences (also fixes a
      // 60s hang at the end and makes replay end cleanly).
      if (progressive) {
        const start = Date.now();
        while (
          !cancelSpeakRef.current &&
          !sentencesRef.current[i] &&
          !generationCompleteRef.current &&
          Date.now() - start < 60000
        ) {
          await new Promise(r => setTimeout(r, 150));
        }
        if (cancelSpeakRef.current) break;
        if (!sentencesRef.current[i]) break; // No more sentences → done.
      } else if (i >= sentencesRef.current.length) {
        break;
      }

      while (!playingRef.current && !cancelSpeakRef.current) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (cancelSpeakRef.current) break;

      currentSentenceRef.current = i;
      setSentenceIdx(i);
      setSpeakingText(sentencesRef.current[i]);

      // Drive the animation forward in lockstep with the narration sentence.
      if (stepDriven) {
        if (animationSpec) {
          setCurrentStep(i);
        } else {
          sendToIframeWithArgs("showStep", { idx: i });
        }
        // Tiny pause so the visual transition starts ~just before the voice.
        await new Promise(r => setTimeout(r, 120));
      }

      if (signLanguageRef.current) {
        // Sign mode: the 3D avatar signs this step and the loop advances when it finishes.
        const outcome = await signStep(i);
        if (cancelSpeakRef.current) break;
        if (outcome === "interrupted") { i--; continue; } // paused mid-sign → re-sign this step on resume
      } else {
        // Wait briefly for audio for this step (still in flight from TTS).
        // If it never arrives, fall back to browser SpeechSynthesis.
        let audio = preloadedAudioRef.current[i];
        if (progressive && audio == null) {
          // null/undefined = TTS request still in flight; false = it already failed, so don't wait.
          const start = Date.now();
          while (
            !cancelSpeakRef.current &&
            preloadedAudioRef.current[i] == null &&
            Date.now() - start < 8000
          ) {
            await new Promise(r => setTimeout(r, 100));
          }
          audio = preloadedAudioRef.current[i];
        }
        if (cancelSpeakRef.current) break;

        if (audio) {
          await playPreloaded(audio);
        } else {
          await speakWithBrowserAsync(sentencesRef.current[i]);
        }
      }

      if (!cancelSpeakRef.current) await new Promise(r => setTimeout(r, 250));
    }

    speakingRef.current = false;
    setSpeakingText("");
    setSentenceIdx(-1);
  }

  // Sign one step with the 3D avatar. "interrupted" = paused/stopped mid-sign (re-signed on resume);
  // "completed" = signed, or shown as a timed caption when the avatar can't sign this step.
  async function signStep(i: number): Promise<"completed" | "interrupted"> {
    const text = sentencesRef.current[i] || "";
    if (preloadedSignsRef.current[i] === undefined) preloadStepSigns(i, text);

    // Wait for this step's SiGML (in flight from the sign service).
    setSignPhase("preparing");
    const start = Date.now();
    while (!cancelSpeakRef.current && playingRef.current && preloadedSignsRef.current[i] == null && Date.now() - start < 20000) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (cancelSpeakRef.current || !playingRef.current) { setSignPhase(""); return "interrupted"; }

    const data = preloadedSignsRef.current[i];
    if (data) {
      setSignGloss(data.gloss);
      setSignPhase("signing");
      const ok = await avatarRef.current?.play(data.sigml, { timeoutMs: data.estimatedMs * 2 + 10000 });
      setSignPhase("");
      if (ok) return "completed";
      if (cancelSpeakRef.current || !playingRef.current) return "interrupted";
      // The avatar failed on this step while we were playing: keep the lesson moving with a timed caption.
    }
    setSignPhase("captions");
    const result = await pacedWait(estimateSignMs(text));
    setSignPhase("");
    return result;
  }

  // Wait `ms` of *playing* time; "interrupted" if paused or cancelled meanwhile.
  async function pacedWait(ms: number): Promise<"completed" | "interrupted"> {
    for (let elapsed = 0; elapsed < ms; elapsed += 100) {
      if (cancelSpeakRef.current || !playingRef.current) return "interrupted";
      await new Promise(r => setTimeout(r, 100));
    }
    return "completed";
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

    // Stop the signing avatar (sign mode)
    avatarRef.current?.stop();
    setSignPhase("");

    // Stop current audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }

    // Stop ALL preloaded audio elements
    if (preloadedAudioRef.current) {
      preloadedAudioRef.current.forEach(a => { if (!a) return; try { a.pause(); a.src = ""; } catch {} });
      preloadedAudioRef.current = [];
    }

    // Force cancel all speech synthesis (call multiple times for reliability)
    try {
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.cancel();
    } catch {}

    // Stop any audio elements in the page that might still be playing
    try {
      document.querySelectorAll("audio").forEach(a => { a.pause(); a.src = ""; });
    } catch {}

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

  const sendToIframeWithArgs = (fn: string, args: Record<string, any>) => {
    const iframe = iframeRef.current;
    if (!iframe) return false;
    try { iframe.contentWindow?.postMessage({ type: "animControl", fn, ...args }, "*"); } catch {}
    try {
      const w = iframe.contentWindow as any;
      if (w?.[fn]) { w[fn](...Object.values(args)); return true; }
    } catch {}
    return false;
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      sendToIframe("pauseAnimation");
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis?.pause();
      playingRef.current = false;
      if (signLanguageRef.current) avatarRef.current?.stop(); // the loop re-signs this step on resume
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playingRef.current = true;

      // First Play click: narration hasn't started yet. This click is the user
      // gesture that unlocks audio playback, so kick off the sequential narration.
      if (phase === 2 && !speakingRef.current && (!mutedRef.current || signLanguageRef.current)) {
        cancelSpeakRef.current = false;
        setTimeout(() => speakSequential(), 60);
        return;
      }

      // Otherwise resume whatever was paused mid-playback.
      sendToIframe("resumeAnimation");
      if (audioRef.current) audioRef.current.play().catch(() => {});
      window.speechSynthesis?.resume();
    }
  };

  const handleRestart = () => {
    // Capture the narration BEFORE stopAll() clears refs.
    const sentences = [...sentencesRef.current].filter(Boolean);

    stopAll();                       // cancels the running loop + frees old audio
    askAbortRef.current = true; setAsk(null); setAskOpen(false); setSignGloss("");
    setIframeKey(prev => prev + 1);  // remount the canvas
    setCurrentStep(0);
    setSentenceIdx(-1);
    currentSentenceRef.current = 0;

    if (phase === 2 && sentences.length > 0) {
      // stopAll() destroyed the preloaded audio — rebuild the sentence list and
      // re-preload each step's audio so replay has narration again.
      sentencesRef.current = sentences;
      preloadedAudioRef.current = [];
      if (signLanguageRef.current) { preloadedSignsRef.current = []; sentences.forEach((s, i) => preloadStepSigns(i, s)); }
      else if (!mutedRef.current) sentences.forEach((s, i) => preloadStepAudio(i, s));

      setIsPlaying(true);
      playingRef.current = true;

      // Give the previous loop a moment to fully exit, then start fresh.
      setTimeout(() => {
        cancelSpeakRef.current = false;
        speakingRef.current = false;
        setCurrentStep(0);
        if (!animationSpec && stepDrivenRef.current) sendToIframeWithArgs("showStep", { idx: 0 });
        if (!mutedRef.current || signLanguageRef.current) speakSequential();
      }, 350);
    }
  };

  // ── Ask the avatar (sign mode): pause the lesson, get an answer, sign it sentence by sentence ──
  function pauseForQuestion() {
    playingRef.current = false;
    setIsPlaying(false);
    avatarRef.current?.stop(); // the narration loop re-signs the current step on resume
  }

  function openAsk() {
    pauseForQuestion();
    setAskOpen(true);
  }

  async function handleAsk(question: string) {
    const q = question.trim();
    if (!q || ask?.loading) return;
    setAskInput("");
    setAskOpen(false);
    askAbortRef.current = false;
    pauseForQuestion();
    setAsk({ question: q, answer: "", sentences: [], active: -1, loading: true, done: false });

    let answer = "";
    try {
      const token = localStorage.getItem("token") || "";
      const langHint = language === "hi" ? " Reply in Hindi." : language === "gu" ? " Reply in Gujarati." : language === "es" ? " Reply in Spanish." : "";
      const resp = await fetch(`${BACKEND}/voice/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: `${q}${langHint}`, topic: title || topicTitle, history: askHistoryRef.current.slice(-6) }),
      });
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response from the tutor");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done || askAbortRef.current) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          let d: any = null;
          try { d = JSON.parse(line.slice(6)); } catch { continue; }
          if (d?.text) answer += d.text;
          if (d?.error) throw new Error(d.error);
        }
      }
    } catch (e: any) {
      if (!askAbortRef.current) setAsk(prev => prev && { ...prev, loading: false, done: true, error: e?.message || "Could not get an answer" });
      return;
    }
    if (askAbortRef.current) return;
    const clean = answer.trim();
    if (!clean) { setAsk(prev => prev && { ...prev, loading: false, done: true, error: "The tutor gave no answer. Please try again." }); return; }
    askHistoryRef.current.push({ role: "user", content: q }, { role: "assistant", content: clean });

    const sentences = splitForSigning(clean);
    setAsk({ question: q, answer: clean, sentences, active: -1, loading: false, done: false });

    // Sign the answer one sentence at a time, highlighting the sentence being signed.
    for (let k = 0; k < sentences.length; k++) {
      if (askAbortRef.current) break;
      setAsk(prev => prev && { ...prev, active: k });
      const data = await fetchSigns(sentences[k], { maxWords: 10 });
      if (askAbortRef.current) break;
      if (data) {
        setSignGloss(data.gloss);
        await avatarRef.current?.play(data.sigml, { timeoutMs: data.estimatedMs * 2 + 10000 });
      } else {
        await new Promise(r => setTimeout(r, estimateSignMs(sentences[k])));
      }
    }
    if (!askAbortRef.current) setAsk(prev => prev && { ...prev, active: -1, done: true });
  }

  function closeAsk(resume: boolean) {
    askAbortRef.current = true;
    avatarRef.current?.stop();
    setAsk(null);
    setAskOpen(false);
    if (resume && !playingRef.current) handlePlayPause();
  }

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

  // Cleanup on unmount — stop everything
  useEffect(() => {
    return () => {
      stopAll();
      // Extra safety: force cancel speech after a delay too
      setTimeout(() => {
        try { window.speechSynthesis?.cancel(); } catch {}
      }, 100);
      setTimeout(() => {
        try { window.speechSynthesis?.cancel(); } catch {}
      }, 500);
    };
  }, []);

  // Also stop speech when page becomes hidden (tab switch, navigation)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) stopAll();
    };
    const handleBeforeUnload = () => stopAll();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const totalSentences = sentencesRef.current.length;
  const voiceProgress = totalSentences > 0 ? ((sentenceIdx + 1) / totalSentences) * 100 : 0;

  // ── Error (nothing to play) ──
  if (error && !htmlCode && !animationSpec) {
    return (
      <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center aspect-video w-full">
        <div className="text-center px-6 max-w-lg">
          <p className="text-red-400 font-semibold text-sm mb-2">Couldn&apos;t generate this lesson</p>
          <p className="text-gray-300 text-xs break-words">{error}</p>
          <p className="text-gray-500 text-xs mt-2">"{topicTitle}"</p>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading && !htmlCode && !animationSpec) {
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
        {/* Animation surface — JSON canvas (preferred) or legacy HTML iframe. In sign mode the 3D avatar sits beside it. */}
        <div className="flex-1 relative bg-[#0f172a] cursor-pointer flex min-h-0" onClick={handlePlayPause}>
          {/* Left: diagrams / animation + captions */}
          <div className="flex-1 min-w-0 relative">
            {animationSpec ? (
              <div
                key={iframeKey}
                className="w-full h-full"
                style={{ containerType: "size" } as any}
              >
                <AnimationCanvas spec={animationSpec} stepIndex={currentStep} paused={!isPlaying} />
              </div>
            ) : htmlCode ? (
              <iframe
                key={iframeKey}
                ref={iframeRef}
                srcDoc={htmlCode}
                className="w-full h-full border-0"
                style={{ minHeight: isFullscreen ? "calc(100vh - 56px)" : undefined }}
                sandbox="allow-scripts allow-same-origin"
                title="Animation"
              />
            ) : null}

            {/* Center play button on pause */}
            {!isPlaying && !ask && !askOpen && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />
                </div>
              </div>
            )}

            {/* Speaking / signing indicator */}
            {speakingText && !ask && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                {signLanguage ? (
                  <Hand className={`w-3 h-3 ${signPhase === "signing" ? "text-yellow-300 animate-pulse" : "text-white/50"}`} />
                ) : (
                  <div className="flex gap-0.5 items-end">
                    {[1,2,3,4].map(i => (
                      <span key={i} className="w-0.5 bg-red-500 rounded-full animate-pulse" style={{ height: 4 + Math.random() * 8, animationDelay: `${i * 100}ms` }} />
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-white/70">{sentenceIdx + 1}/{totalSentences}</span>
              </div>
            )}

            {/* Subtitle overlay — larger in sign mode: captions are the second channel for deaf students */}
            {speakingText && !ask && (
              <div className="absolute bottom-12 left-0 right-0 z-10 pointer-events-none">
                <div className="mx-auto max-w-2xl px-4">
                  <p className={`text-white text-center leading-relaxed bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2.5 shadow-lg ${signLanguage ? "text-base md:text-lg font-semibold" : "text-sm"}`}>
                    {speakingText}
                  </p>
                </div>
              </div>
            )}

            {/* Loading voice overlay */}
            {!signLanguage && phase === 2 && preloadingRef.current && (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
                <span className="text-[10px] text-yellow-300">Loading voice...</span>
              </div>
            )}

            {/* Sign-mode status */}
            {signLanguage && !ask && (avatarStatus === "loading" || signPhase === "preparing" || signPhase === "captions" || avatarStatus === "error") && (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                {avatarStatus === "loading" || signPhase === "preparing"
                  ? <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
                  : <Hand className="w-3 h-3 text-yellow-400" />}
                <span className="text-[10px] text-yellow-300">
                  {avatarStatus === "loading" ? "Loading 3D avatar…"
                    : signPhase === "preparing" ? "Preparing signs…"
                    : avatarStatus === "error" ? "Avatar unavailable — captions only"
                    : "Captions only for this step"}
                </span>
              </div>
            )}

            {/* Ask-the-avatar overlay (sign mode) */}
            {signLanguage && (ask || askOpen) && (
              <div className="absolute inset-0 z-20 bg-[#0b1024]/90 backdrop-blur-sm flex flex-col p-4 md:p-6 cursor-default" onClick={(e) => e.stopPropagation()}>
                {ask ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-yellow-300 font-bold">Your question</p>
                        <p className="text-white font-semibold text-sm md:text-base leading-snug">{ask.question}</p>
                      </div>
                      <button onClick={() => closeAsk(false)} className="p-1.5 rounded-full hover:bg-white/10 text-white/70" title="Close">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto mt-3">
                      {ask.loading ? (
                        <div className="flex items-center gap-2 text-white/70 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</div>
                      ) : ask.error ? (
                        <p className="text-red-300 text-sm">{ask.error}</p>
                      ) : (
                        <p className="text-white text-base md:text-lg leading-relaxed">
                          {ask.sentences.map((s, k) => (
                            <span key={k} className={`transition-colors ${k === ask.active ? "bg-yellow-400/90 text-black rounded px-1" : (k < ask.active || ask.done) ? "text-white" : "text-white/45"}`}>{s} </span>
                          ))}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                        {!ask.loading && !ask.done && <><Hand className="w-3.5 h-3.5 text-yellow-300 animate-pulse" /> The avatar is signing the answer…</>}
                        {ask.done && !ask.error && "Answer signed."}
                      </span>
                      <button onClick={() => closeAsk(true)} className="px-4 py-1.5 rounded-full bg-yellow-400 text-black text-sm font-semibold hover:bg-yellow-300 transition-colors">
                        {ask.done ? "Continue lesson" : "Skip & continue"}
                      </button>
                    </div>
                  </>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleAsk(askInput); }} className="m-auto w-full max-w-md">
                    <p className="text-white font-semibold text-sm mb-2 flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-yellow-300" /> Ask the avatar</p>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={askInput}
                        onChange={(e) => setAskInput(e.target.value)}
                        placeholder="Type your question about this lesson…"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-yellow-300"
                      />
                      <button type="submit" disabled={!askInput.trim()} className="px-3 py-2 rounded-lg bg-yellow-400 text-black text-sm font-semibold disabled:opacity-40">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <button type="button" onClick={() => setAskOpen(false)} className="mt-2 text-xs text-white/60 hover:text-white">Cancel</button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right: 3D signing avatar — the lesson's "voice" for deaf students */}
          {signLanguage && (
            <div className="relative w-[36%] min-w-[180px] max-w-[480px] border-l border-white/10 bg-[#0b1024] cursor-default" onClick={(e) => e.stopPropagation()}>
              <CWASAAvatar ref={avatarRef} className="absolute inset-0" onStatus={setAvatarStatus} />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 pointer-events-none">
                <Hand className="w-3 h-3 text-yellow-300" />
                <span className="text-[10px] text-white/80 font-semibold uppercase tracking-wider">ISL avatar</span>
              </div>
              {signGloss && (
                <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-black/60 text-center pointer-events-none">
                  <p className="text-[11px] md:text-xs font-mono tracking-wider text-yellow-300 truncate" title={signGloss}>{signGloss}</p>
                </div>
              )}
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

              {/* Volume (voice mode only) */}
              {!signLanguage && (
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
              )}

              {/* Sentence counter as time */}
              {totalSentences > 0 && (
                <span className="text-xs text-white/70 ml-2 font-mono tabular-nums">
                  {sentenceIdx >= 0 ? sentenceIdx + 1 : 0}:{totalSentences.toString().padStart(2, "0")}
                </span>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              {signLanguage && (
                <button onClick={(e) => { e.stopPropagation(); openAsk(); }}
                  className="px-2.5 py-1.5 rounded-full hover:bg-white/10 text-white transition-colors flex items-center gap-1.5 text-xs font-medium" title="Ask the avatar a question">
                  <MessageSquare className="w-4 h-4" /> Ask
                </button>
              )}
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
            {signLanguage ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[11px] font-bold">
                <Hand className="w-3 h-3" /> Sign Language · 3D avatar narrates
              </span>
            ) : (
              <span>Visual Explanation</span>
            )}
            {totalSentences > 0 && (
              <span>{totalSentences} {stepDrivenRef.current ? "synced steps" : "narration segments"}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setLiked(!liked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${liked ? "bg-primary-100 text-primary-700" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
              <ThumbsUp className={`w-4 h-4 ${liked ? "fill-blue-700" : ""}`} />
              Like
            </button>
            <button onClick={() => setSaved(!saved)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${saved ? "bg-primary-100 text-primary-700" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
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

        {/* Ask the avatar (sign mode) */}
        {signLanguage && (
          <form onSubmit={(e) => { e.preventDefault(); handleAsk(askInput); }} className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <MessageSquare className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                placeholder="Ask the avatar a question about this lesson — it will sign the answer"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] transition"
              />
            </div>
            <button type="submit" disabled={!askInput.trim() || !!ask?.loading}
              className="px-4 py-2.5 rounded-xl bg-[#1e40af] text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center gap-1.5">
              <Send className="w-4 h-4" /> Ask
            </button>
          </form>
        )}

        {/* Definitions */}
        {definitions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {definitions.map((d, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700">
                <strong>{d.term}:</strong> {d.meaning}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
