"use client";
// ============================================================
// QuizPage - Generate, take, and review AI-generated quizzes
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Brain,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Home,
  ArrowRight,
  Trophy,
  AlertCircle,
  Target,
  Zap,
} from 'lucide-react';
import { ai } from '@/services/api';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';

// --------------- constants ---------------

const QUESTION_COUNTS = [5, 10, 15];
const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'hard', label: 'Hard', color: 'bg-red-100 text-red-700 border-red-200' },
];

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const OPTION_COLORS = {
  default: 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50',
  selected: 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200',
  correct: 'border-green-500 bg-green-50 ring-2 ring-green-200',
  incorrect: 'border-red-500 bg-red-50 ring-2 ring-red-200',
};

// --------------- animation helpers ---------------

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

// --------------- Timer display ---------------

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// --------------- Circular score ---------------

function CircularScore({ score, total }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 70 ? 'text-green-500' : pct >= 40 ? 'text-yellow-500' : 'text-red-500';
  const bgColor =
    pct >= 70 ? 'text-green-100' : pct >= 40 ? 'text-yellow-100' : 'text-red-100';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-40 h-40 -rotate-90" viewBox="0 0 140 140">
        {/* Background circle */}
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="10"
          className={`stroke-current ${bgColor}`}
        />
        {/* Score arc */}
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className={`stroke-current ${color}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className={`text-3xl font-bold ${color}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {pct}%
        </motion.span>
        <span className="text-sm text-gray-400">
          {score}/{total}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Generate Quiz Form
// ============================================================

function GenerateForm({ onGenerate, loading }) {
  const { t } = useTranslation();
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error(t('quiz.topicRequired', 'Please enter a topic.'));
      return;
    }
    onGenerate({ topic: topic.trim(), count, difficulty });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={fadeIn} className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-4">
            <Brain className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('quiz.generateTitle', 'Generate a Quiz')}
          </h1>
          <p className="text-gray-500 mt-2">
            {t('quiz.generateSubtitle', 'Test your knowledge with an AI-generated quiz on any topic.')}
          </p>
        </motion.div>

        {/* Form */}
        <motion.form variants={fadeIn} onSubmit={handleSubmit} className="card space-y-6">
          {/* Topic input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('quiz.topicLabel', 'Topic / Subject')}
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('quiz.topicPlaceholder', 'e.g. Photosynthesis, Quadratic Equations, WW2')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Number of questions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('quiz.countLabel', 'Number of Questions')}
            </label>
            <div className="flex gap-3">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-200 ${
                    count === n
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('quiz.difficultyLabel', 'Difficulty Level')}
            </label>
            <div className="flex gap-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifficulty(d.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                    difficulty === d.value
                      ? d.color + ' border-current'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t(`quiz.difficulty.${d.value}`, d.label)}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('quiz.generating', 'Generating Quiz...')}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {t('quiz.generate', 'Generate Quiz')}
              </>
            )}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}

// ============================================================
// Quiz Taking Interface
// ============================================================

function QuizTaker({ quiz, onSubmit, onBack }) {
  const { t } = useTranslation();
  const questions = quiz.questions || [];
  const totalQuestions = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  const currentQuestion = questions[currentIndex];
  const options = currentQuestion?.options || [];
  const progressPct = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  const selectAnswer = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }));
  };

  const goNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Check unanswered
    const unanswered = questions.filter((_, i) => answers[i] === undefined).length;
    if (unanswered > 0) {
      const proceed = window.confirm(
        t(
          'quiz.unansweredWarning',
          `You have ${unanswered} unanswered question(s). Submit anyway?`,
        ),
      );
      if (!proceed) return;
    }

    clearInterval(timerRef.current);
    setSubmitting(true);

    try {
      await onSubmit(answers, timer);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-16">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No questions found in this quiz.</p>
        <button
          onClick={onBack}
          className="mt-4 btn-primary inline-flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.goBack', 'Go Back')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Top bar: progress + timer */}
        <motion.div variants={fadeIn} className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-600">
                {t('quiz.questionOf', 'Question')} {currentIndex + 1} / {totalQuestions}
              </span>
              <span className="text-sm text-gray-400">
                {Math.round(progressPct)}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-mono font-medium text-gray-600">
              {formatTime(timer)}
            </span>
          </div>
        </motion.div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="card"
          >
            {/* Question text */}
            <div className="mb-6">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold mb-3">
                Q{currentIndex + 1}
              </span>
              <h2 className="text-lg font-semibold text-gray-900 leading-relaxed">
                {currentQuestion.question || currentQuestion.text}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {options.map((option, i) => {
                const isSelected = answers[currentIndex] === i;
                const optionText = typeof option === 'string' ? option : option.text || option.label || '';

                return (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => selectAnswer(i)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                      isSelected ? OPTION_COLORS.selected : OPTION_COLORS.default
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {OPTION_LETTERS[i]}
                    </span>
                    <span
                      className={`text-sm ${
                        isSelected ? 'text-indigo-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {optionText}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <motion.div variants={fadeIn} className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('quiz.previous', 'Previous')}
          </button>

          {/* Question dots */}
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-center max-w-xs">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  i === currentIndex
                    ? 'bg-indigo-600 scale-125'
                    : answers[i] !== undefined
                    ? 'bg-indigo-300'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {currentIndex < totalQuestions - 1 ? (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              {t('quiz.next', 'Next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('quiz.submitting', 'Submitting...')}
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  {t('quiz.submit', 'Submit Quiz')}
                </>
              )}
            </button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Results Screen
// ============================================================

function QuizResults({ quiz, answers, timeTaken, onRetry, onDashboard }) {
  const { t } = useTranslation();
  const questions = quiz.questions || [];
  const totalQuestions = questions.length;

  // Calculate score
  const score = useMemo(() => {
    let correct = 0;
    questions.forEach((q, i) => {
      const userAnswer = answers[i];
      const correctIndex =
        q.correctAnswer ?? q.correct_answer ?? q.answer ?? q.correctIndex ?? q.correct_index;

      // correctIndex can be a number or a letter
      let correctIdx;
      if (typeof correctIndex === 'number') {
        correctIdx = correctIndex;
      } else if (typeof correctIndex === 'string') {
        const letterIdx = OPTION_LETTERS.indexOf(correctIndex.toUpperCase());
        correctIdx = letterIdx >= 0 ? letterIdx : parseInt(correctIndex, 10);
      } else {
        correctIdx = -1;
      }

      if (userAnswer === correctIdx) {
        correct++;
      }
    });
    return correct;
  }, [questions, answers]);

  const pct = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  const messageMap = () => {
    if (pct >= 90) return { text: t('quiz.excellent', 'Excellent!'), icon: Trophy, color: 'text-green-600' };
    if (pct >= 70) return { text: t('quiz.great', 'Great Job!'), icon: CheckCircle2, color: 'text-green-600' };
    if (pct >= 40) return { text: t('quiz.good', 'Good Effort!'), icon: Zap, color: 'text-yellow-600' };
    return { text: t('quiz.keepPracticing', 'Keep Practicing!'), icon: Target, color: 'text-red-600' };
  };

  const msg = messageMap();
  const MsgIcon = msg.icon;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Score card */}
        <motion.div variants={fadeIn} className="card text-center py-8">
          <CircularScore score={score} total={totalQuestions} />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-4"
          >
            <div className={`inline-flex items-center gap-2 text-xl font-bold ${msg.color}`}>
              <MsgIcon className="w-6 h-6" />
              {msg.text}
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatTime(timeTaken)}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              {score} correct
            </span>
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-red-500" />
              {totalQuestions - score} wrong
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('quiz.tryAgain', 'Try Again')}
            </button>
            <button
              onClick={onDashboard}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Home className="w-4 h-4" />
              {t('quiz.backToDashboard', 'Back to Dashboard')}
            </button>
          </div>
        </motion.div>

        {/* Question review */}
        <motion.div variants={fadeIn}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('quiz.reviewTitle', 'Review Answers')}
          </h2>

          <div className="space-y-4">
            {questions.map((q, i) => {
              const userAnswer = answers[i];
              const correctIndex =
                q.correctAnswer ?? q.correct_answer ?? q.answer ?? q.correctIndex ?? q.correct_index;

              let correctIdx;
              if (typeof correctIndex === 'number') {
                correctIdx = correctIndex;
              } else if (typeof correctIndex === 'string') {
                const letterIdx = OPTION_LETTERS.indexOf(correctIndex.toUpperCase());
                correctIdx = letterIdx >= 0 ? letterIdx : parseInt(correctIndex, 10);
              } else {
                correctIdx = -1;
              }

              const isCorrect = userAnswer === correctIdx;
              const options = q.options || [];
              const explanation = q.explanation || q.hint || '';

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`card border-l-4 ${
                    isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span
                      className={`flex-shrink-0 mt-0.5 ${
                        isCorrect ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        Q{i + 1}. {q.question || q.text}
                      </p>

                      <div className="space-y-1.5 mb-3">
                        {options.map((option, j) => {
                          const optText = typeof option === 'string' ? option : option.text || option.label || '';
                          const isUserPick = userAnswer === j;
                          const isCorrectOption = correctIdx === j;

                          let style = 'text-gray-600';
                          let badge = null;

                          if (isCorrectOption && isUserPick) {
                            style = 'text-green-700 font-medium bg-green-50 rounded-lg px-2 py-1';
                            badge = (
                              <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-semibold ml-2">
                                Your Answer (Correct)
                              </span>
                            );
                          } else if (isCorrectOption) {
                            style = 'text-green-700 font-medium bg-green-50 rounded-lg px-2 py-1';
                            badge = (
                              <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-semibold ml-2">
                                Correct Answer
                              </span>
                            );
                          } else if (isUserPick) {
                            style = 'text-red-600 font-medium bg-red-50 rounded-lg px-2 py-1 line-through';
                            badge = (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold ml-2 no-underline">
                                Your Answer
                              </span>
                            );
                          }

                          return (
                            <div key={j} className={`flex items-center gap-2 text-sm ${style}`}>
                              <span className="font-semibold text-xs w-5">
                                {OPTION_LETTERS[j]}.
                              </span>
                              <span>{optText}</span>
                              {badge}
                            </div>
                          );
                        })}
                      </div>

                      {/* Show unanswered state */}
                      {userAnswer === undefined && (
                        <p className="text-xs text-gray-400 italic mb-2">Not answered</p>
                      )}

                      {explanation && (
                        <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-xs font-semibold text-blue-600 mb-1">Explanation</p>
                          <p className="text-sm text-blue-800">{explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function QuizPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();

  // States: 'generate' | 'taking' | 'results'
  const [stage, setStage] = useState('generate');
  const [generating, setGenerating] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeTaken, setTimeTaken] = useState(0);

  // --------------- Generate quiz ---------------

  const handleGenerate = async ({ topic, count, difficulty }) => {
    setGenerating(true);
    try {
      const res = await ai.generateQuiz({ topic, count, difficulty, language });
      const quizData = res.quiz || res.data || res;

      // Normalize: ensure we have a questions array
      let questions = quizData?.questions || (Array.isArray(quizData) ? quizData : []);
      questions = questions.map((q: any) => ({
        ...q,
        question: q.question || q.text || '',
        options: q.options || [],
        correct: typeof q.correct === 'number' ? q.correct : 0,
      }));

      if (questions.length === 0) {
        toast.error(t('quiz.noQuestions', 'Failed to generate questions. Try again.'));
        return;
      }

      setQuiz({ ...quizData, questions, topic });
      setUserAnswers({});
      setTimeTaken(0);
      setStage('taking');
      toast.success(`Quiz generated! ${questions.length} questions.`);
    } catch (err) {
      toast.error(err.message || t('common.error'));
    } finally {
      setGenerating(false);
    }
  };

  // --------------- Submit quiz ---------------

  const handleSubmit = async (answers, time) => {
    setUserAnswers(answers);
    setTimeTaken(time);

    try {
      const questions = quiz.questions || [];
      // Send questions + answer indices for deterministic server-side scoring
      await ai.submitQuiz({
        topic: quiz.topic || quiz.title,
        questions,
        answers: questions.map((q, i) => answers[i] ?? -1),
        timeTaken: time,
      });
    } catch (err) {
      console.error('Submit quiz error:', err);
    }

    setStage('results');
  };

  // --------------- Retry ---------------

  const handleRetry = () => {
    setUserAnswers({});
    setTimeTaken(0);
    setStage('generate');
    setQuiz(null);
  };

  // --------------- Render ---------------

  return (
    <>
      {stage === 'generate' && (
        <GenerateForm onGenerate={handleGenerate} loading={generating} />
      )}

      {stage === 'taking' && quiz && (
        <QuizTaker
          quiz={quiz}
          onSubmit={handleSubmit}
          onBack={() => {
            setStage('generate');
            setQuiz(null);
          }}
        />
      )}

      {stage === 'results' && quiz && (
        <QuizResults
          quiz={quiz}
          answers={userAnswers}
          timeTaken={timeTaken}
          onRetry={handleRetry}
          onDashboard={() => router.push('/dashboard')}
        />
      )}
    </>
  );
}
