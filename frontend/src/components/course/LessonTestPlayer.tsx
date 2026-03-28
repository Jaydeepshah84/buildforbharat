"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, CheckCircle2, XCircle, ChevronRight, Loader2,
  Trophy, RotateCcw, ArrowLeft, Clock, Sparkles, Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { courses } from "@/services/api";

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

interface Props {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  topicCount: number;
  onPass: () => void;
  onClose: () => void;
}

export default function LessonTestPlayer({ courseId, lessonId, lessonTitle, topicCount, onPass, onClose }: Props) {
  const [phase, setPhase] = useState<"loading" | "intro" | "taking" | "review" | "results">("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answersRef = useRef<Record<number, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [passed, setPassed] = useState(false);
  const [timer, setTimer] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);

  // Load questions
  useEffect(() => {
    async function load() {
      try {
        const res = await courses.generateLessonTest(courseId, lessonId);
        const qs = res?.questions || [];
        if (qs.length === 0) { toast.error("Failed to generate test"); onClose(); return; }
        setQuestions(qs);
        setPhase("intro");
      } catch (err: any) {
        toast.error(err.message || "Failed to generate test");
        onClose();
      }
    }
    load();
  }, [courseId, lessonId]);

  // Timer
  useEffect(() => {
    if (phase === "taking") {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const startTest = () => { setPhase("taking"); setCurrentQ(0); setAnswers({}); answersRef.current = {}; setTimer(0); };

  const selectOption = (idx: number) => {
    if (showFeedback) return;
    setSelectedOption(idx);
    setShowFeedback(true);

    // Save answer in both state and ref (ref avoids stale closure)
    setAnswers(prev => ({ ...prev, [currentQ]: idx }));
    answersRef.current[currentQ] = idx;

    const isLast = currentQ >= questions.length - 1;

    // Show feedback for 1.5s then move to next or submit
    setTimeout(() => {
      setShowFeedback(false);
      setSelectedOption(null);
      if (!isLast) {
        setCurrentQ(prev => prev + 1);
      } else {
        doSubmit();
      }
    }, 1500);
  };

  const doSubmit = async () => {
    clearInterval(timerRef.current);
    setSubmitting(true);

    // Use ref to get ALL answers (avoids stale closure issue)
    const finalAnswers = { ...answersRef.current };
    let correct = 0;
    questions.forEach((q, i) => { if (finalAnswers[i] === q.correct) correct++; });
    const pct = Math.round((correct / questions.length) * 100);
    const didPass = pct >= 60;

    setScore(correct);
    setPercentage(pct);
    setPassed(didPass);

    try {
      await courses.submitLessonTest(courseId, lessonId, {
        questions, answers: Object.values(finalAnswers), timeTaken: timer,
      });
    } catch {}

    setSubmitting(false);
    setPhase("results");
  };

  const q = questions[currentQ];

  // ── Loading ──
  if (phase === "loading") {
    return (
      <div className="min-h-[500px] bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Generating your test...</p>
          <p className="text-gray-400 text-sm mt-1">AI is creating questions for "{lessonTitle}"</p>
        </div>
      </div>
    );
  }

  // ── Intro ──
  if (phase === "intro") {
    return (
      <div className="min-h-[500px] bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 rounded-2xl flex items-center justify-center p-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
            <Brain className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Lesson Test</h2>
          <p className="text-gray-400 mb-1">{lessonTitle}</p>
          <div className="flex items-center justify-center gap-4 mt-4 mb-8">
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <p className="text-xl font-bold text-white">{questions.length}</p>
              <p className="text-xs text-gray-400">Questions</p>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <p className="text-xl font-bold text-white">60%</p>
              <p className="text-xs text-gray-400">To Pass</p>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <p className="text-xl font-bold text-amber-400">MCQ</p>
              <p className="text-xs text-gray-400">Format</p>
            </div>
          </div>
          <motion.button onClick={startTest} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-2 mx-auto">
            <Zap className="w-5 h-5" /> Start Test
          </motion.button>
          <button onClick={onClose} className="mt-4 text-sm text-gray-500 hover:text-gray-300">Go back</button>
        </motion.div>
      </div>
    );
  }

  // ── Results ──
  if (phase === "results") {
    return (
      <div className="min-h-[500px] bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 rounded-2xl flex items-center justify-center p-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          {/* Score circle */}
          <div className="relative w-36 h-36 mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <motion.circle cx="50" cy="50" r="42" fill="none"
                stroke={passed ? "#10B981" : "#EF4444"} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - percentage / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div>
                <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}
                  className={`text-3xl font-extrabold ${passed ? "text-emerald-400" : "text-red-400"}`}>{percentage}%</motion.p>
                <p className="text-xs text-gray-400">{score}/{questions.length}</p>
              </div>
            </div>
          </div>

          {passed ? (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}>
                <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              </motion.div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">Test Passed!</h2>
              <p className="text-gray-400 mb-6">Great job! The next lesson is now unlocked.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setPhase("review")}
                  className="px-5 py-2.5 bg-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/20">
                  Review Answers
                </button>
                <motion.button onClick={onPass} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-1">
                  Continue <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-red-400 mb-2">Not Yet</h2>
              <p className="text-gray-400 mb-6">You need 60% to pass. Review and try again!</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setPhase("review")}
                  className="px-5 py-2.5 bg-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/20">
                  Review Answers
                </button>
                <motion.button onClick={startTest} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-1">
                  <RotateCcw className="w-4 h-4" /> Retry
                </motion.button>
              </div>
            </>
          )}

          <p className="text-xs text-gray-500 mt-4">Time: {formatTime(timer)}</p>
        </motion.div>
      </div>
    );
  }

  // ── Review ──
  if (phase === "review") {
    return (
      <div className="min-h-[500px] bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 rounded-2xl p-6 overflow-y-auto max-h-[80vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Brain className="w-5 h-5 text-indigo-400" /> Review Answers</h2>
          <button onClick={() => setPhase("results")} className="text-sm text-gray-400 hover:text-white flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <div className="space-y-4">
          {questions.map((q, i) => {
            const userAnswer = answers[i];
            const isCorrect = userAnswer === q.correct;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-xs font-bold text-gray-500 bg-white/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="text-sm text-white font-medium">{q.question}</p>
                </div>
                <div className="space-y-1.5 ml-8">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                      oi === q.correct ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                      oi === userAnswer && !isCorrect ? "bg-red-500/20 text-red-300 border border-red-500/30" :
                      "text-gray-400"
                    }`}>
                      {oi === q.correct && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {oi === userAnswer && !isCorrect && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                    </div>
                  ))}
                </div>
                {q.explanation && <p className="ml-8 mt-2 text-xs text-indigo-300 bg-indigo-500/10 rounded-lg px-3 py-2">{q.explanation}</p>}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Taking Test (main quiz UI) ──
  if (!q) return null;
  const progress = ((currentQ + 1) / questions.length) * 100;
  const isCorrect = selectedOption === q.correct;

  return (
    <div className="min-h-[500px] bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 rounded-2xl flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/30">
        <div className="flex items-center gap-3">
          <Brain className="w-4 h-4 text-indigo-400" />
          <span className="text-xs text-gray-400 font-medium">Lesson Test</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" /> {formatTime(timer)}
          </div>
          <span className="text-xs text-gray-500">{currentQ + 1}/{questions.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/5">
        <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
        <AnimatePresence mode="wait">
          <motion.div key={currentQ} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }} className="w-full max-w-2xl">

            {/* Question number badge */}
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm mb-5 mx-auto shadow-lg shadow-indigo-500/30">
              {currentQ + 1}
            </motion.div>

            {/* Question text */}
            <h3 className="text-lg md:text-xl font-bold text-white text-center mb-8 leading-relaxed">{q.question}</h3>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, idx) => {
                let optClass = "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:border-indigo-500/50";
                if (showFeedback) {
                  if (idx === q.correct) optClass = "bg-emerald-500/20 border-emerald-500 text-emerald-300 scale-[1.02]";
                  else if (idx === selectedOption) optClass = "bg-red-500/20 border-red-500 text-red-300";
                  else optClass = "bg-white/5 border-white/5 text-gray-500";
                }

                return (
                  <motion.button key={idx} onClick={() => selectOption(idx)}
                    disabled={showFeedback}
                    whileHover={showFeedback ? {} : { scale: 1.02 }}
                    whileTap={showFeedback ? {} : { scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + idx * 0.08 }}
                    className={`relative px-5 py-4 rounded-xl border-2 text-left text-sm font-medium transition-all duration-300 flex items-center gap-3 ${optClass}`}>
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {showFeedback && idx === q.correct && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </motion.div>
                    )}
                    {showFeedback && idx === selectedOption && idx !== q.correct && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <XCircle className="w-5 h-5 text-red-400" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback explanation */}
            <AnimatePresence>
              {showFeedback && q.explanation && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`mt-5 p-4 rounded-xl text-sm ${isCorrect ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-red-500/10 text-red-300 border border-red-500/20"}`}>
                  <p className="font-semibold mb-1">{isCorrect ? "Correct!" : "Not quite."}</p>
                  <p className="text-xs opacity-80">{q.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom dots */}
      <div className="flex items-center justify-center gap-1.5 pb-4">
        {questions.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${
            i === currentQ ? "bg-indigo-400 w-5" :
            i < currentQ ? (answers[i] === questions[i].correct ? "bg-emerald-500" : "bg-red-500") :
            "bg-white/20"
          }`} />
        ))}
      </div>
    </div>
  );
}
