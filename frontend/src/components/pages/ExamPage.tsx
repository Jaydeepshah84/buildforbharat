"use client";
// ============================================================
// ExamPage - Generate, take, and review AI-generated exams
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  Sparkles,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Trophy,
  Target,
  Zap,
  BookOpen,
  BarChart3,
  AlertCircle,
  Timer,
  Hash,
  X,
} from 'lucide-react';
import { ai } from '@/services/api';
import { useAuth } from '@/components/AuthProvider';

// --------------- constants ---------------

const DEFAULT_TIME_LIMIT = 60; // minutes
const QUESTION_COUNT_OPTIONS = [15, 30, 50, 75];

// --------------- animation helpers ---------------

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// --------------- helpers ---------------

function formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function classifyQuestion(q) {
  const type = (q.type || '').toLowerCase();
  if (type.includes('mcq') || type.includes('multiple') || type === 'objective') return 'mcq';
  if (type.includes('long') || type === 'essay') return 'long';
  return 'short';
}

// --------------- Circular score ---------------

function CircularScore({ score, total }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 70 ? 'text-green-500' : pct >= 40 ? 'text-yellow-500' : 'text-red-500';
  const bgColor =
    pct >= 70 ? 'text-green-100' : pct >= 40 ? 'text-yellow-100' : 'text-red-100';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" strokeWidth="9" className={`stroke-current ${bgColor}`} />
        <motion.circle
          cx="65" cy="65" r={radius}
          fill="none" strokeWidth="9" strokeLinecap="round"
          className={`stroke-current ${color}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className={`text-2xl font-bold ${color}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {pct}%
        </motion.span>
        <span className="text-xs text-gray-400">{score}/{total}</span>
      </div>
    </div>
  );
}

// ============================================================
// Generate Exam Form
// ============================================================

function GenerateExamForm({ onGenerate, loading }) {
  const { t } = useTranslation();
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState([]);
  const [questionCount, setQuestionCount] = useState(15);
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME_LIMIT);

  const addTopic = () => {
    const trimmed = topicInput.trim();
    if (trimmed && !topics.includes(trimmed)) {
      setTopics((prev) => [...prev, trimmed]);
      setTopicInput('');
    }
  };

  const removeTopic = (topic) => {
    setTopics((prev) => prev.filter((t) => t !== topic));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTopic();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add any remaining text as a topic
    const trimmed = topicInput.trim();
    const finalTopics = trimmed && !topics.includes(trimmed) ? [...topics, trimmed] : topics;

    if (finalTopics.length === 0) {
      toast.error(t('exam.topicsRequired', 'Please add at least one topic.'));
      return;
    }

    onGenerate({ topics: finalTopics, questionCount, timeLimit });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeIn} className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('exam.generateTitle', 'Generate an Exam')}
          </h1>
          <p className="text-gray-500 mt-2">
            {t('exam.generateSubtitle', 'Create a comprehensive MCQ exam. Questions are auto-scored instantly.')}
          </p>
        </motion.div>

        {/* Form */}
        <motion.form variants={fadeIn} onSubmit={handleSubmit} className="card space-y-6">
          {/* Topics multi-input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('exam.topicsLabel', 'Topics (press Enter to add)')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('exam.topicPlaceholder', 'e.g. Photosynthesis')}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="button"
                onClick={addTopic}
                disabled={!topicInput.trim() || loading}
                className="px-4 py-3 rounded-xl bg-indigo-100 text-indigo-700 text-sm font-medium hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('exam.add', 'Add')}
              </button>
            </div>

            {/* Topic chips */}
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {topics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => removeTopic(topic)}
                      className="text-indigo-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Number of questions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Questions
            </label>
            <div className="flex gap-3">
              {QUESTION_COUNT_OPTIONS.map((n) => (
                <button
                  key={n} type="button"
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-200 ${
                    questionCount === n
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Time limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('exam.timeLimit', 'Time Limit (minutes)')}
            </label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Math.max(5, parseInt(e.target.value) || DEFAULT_TIME_LIMIT))}
              min={5}
              max={180}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || (topics.length === 0 && !topicInput.trim())}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('exam.generating', 'Generating Exam...')}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {t('exam.generate', 'Generate Exam')}
              </>
            )}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}

// ============================================================
// Exam Taking Interface
// ============================================================

function ExamTaker({ exam, onSubmit }) {
  const { t } = useTranslation();
  const questions = exam.questions || [];
  const timeLimitSecs = (exam.timeLimit || DEFAULT_TIME_LIMIT) * 60;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() =>
    questions.reduce((acc, _, i) => ({ ...acc, [i]: '' }), {})
  );
  const [timeLeft, setTimeLeft] = useState(timeLimitSecs);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef(null);

  // All questions are MCQ
  const sectionOrder = [
    { key: 'mcq', label: t('exam.sectionMCQ', 'Multiple Choice'), items: questions.map((q, i) => ({ ...q, globalIndex: i })) },
  ];

  // Timer countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0) {
      toast.error(t('exam.timeUp', 'Time is up! Submitting your exam.'));
      doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const updateAnswer = (index, value) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const answeredCount = Object.values(answers).filter((a) =>
    typeof a === 'string' ? a.trim() : a !== '' && a !== null && a !== undefined
  ).length;

  const doSubmit = async () => {
    clearInterval(timerRef.current);
    setSubmitting(true);
    setShowConfirm(false);

    // Send answer indices directly (MCQ only)
    const submission = questions.map((q, i) => {
      const ans = answers[i];
      return typeof ans === 'number' ? ans : -1; // -1 = unanswered
    });

    try {
      await onSubmit(submission, timeLimitSecs - timeLeft);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    if (answeredCount < questions.length) {
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  const currentQuestion = questions[currentIndex];
  const currentType = currentQuestion ? classifyQuestion(currentQuestion) : 'short';
  const isTimeLow = timeLeft < 300; // less than 5 min

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-6xl mx-auto">
      {/* Main question area */}
      <div className="flex-1 space-y-4">
        {/* Timer bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
            isTimeLow ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <Timer className={`w-5 h-5 ${isTimeLow ? 'text-red-500' : 'text-indigo-500'}`} />
            <span className={`text-lg font-mono font-bold ${isTimeLow ? 'text-red-600' : 'text-gray-800'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            {answeredCount}/{questions.length}
          </div>
        </motion.div>

        {/* Section labels */}
        <div className="flex flex-wrap gap-2">
          {sectionOrder.map((sec) => (
            <span
              key={sec.key}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                sec.key === 'mcq'
                  ? 'bg-blue-100 text-blue-700'
                  : sec.key === 'short'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {sec.label}: {sec.items.length}
            </span>
          ))}
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="card"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold">
                  Q{currentIndex + 1}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">MCQ</span>
                <span className="text-xs text-gray-400 ml-auto">
                  [{currentQuestion.marks || 2} {t('exam.marks', 'marks')}]
                </span>
              </div>

              <h2 className="text-base font-semibold text-gray-900 leading-relaxed mb-4">
                {currentQuestion.question || currentQuestion.text}
              </h2>

              {/* MCQ options */}
              {currentType === 'mcq' && (currentQuestion.options || []).length > 0 && (
                <div className="space-y-2.5">
                  {(currentQuestion.options || []).map((option, oi) => {
                    const optText = typeof option === 'string' ? option : option.text || option.label || '';
                    const isSelected = answers[currentIndex] === oi;

                    return (
                      <motion.button
                        key={oi}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => updateAnswer(currentIndex, oi)}
                        type="button"
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {OPTION_LETTERS[oi]}
                        </span>
                        <span className={`text-sm ${isSelected ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}>
                          {optText}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* All questions are MCQ — no textarea needed */}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('exam.previous', 'Previous')}
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              {t('exam.next', 'Next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmitClick}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('exam.submitting', 'Submitting...')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t('exam.submit', 'Submit Exam')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Side navigation panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-64 flex-shrink-0"
      >
        <div className="card sticky top-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Hash className="w-4 h-4 text-indigo-500" />
            {t('exam.questionNav', 'Questions')}
          </h3>

          {sectionOrder.map((sec) => (
            <div key={sec.key} className="mb-4">
              <p className={`text-xs font-semibold mb-2 ${
                sec.key === 'mcq' ? 'text-blue-600' : sec.key === 'short' ? 'text-green-600' : 'text-purple-600'
              }`}>
                {sec.label}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {sec.items.map((q) => {
                  const gi = q.globalIndex;
                  const isActive = gi === currentIndex;
                  const isAnswered = typeof answers[gi] === 'number'
                    ? true
                    : typeof answers[gi] === 'string' && answers[gi].trim();

                  return (
                    <button
                      key={gi}
                      onClick={() => setCurrentIndex(gi)}
                      className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : isAnswered
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {gi + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Submit from sidebar */}
          <button
            onClick={handleSubmitClick}
            disabled={submitting}
            className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {t('exam.submit', 'Submit Exam')}
          </button>
        </div>
      </motion.div>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {t('exam.confirmTitle', 'Submit Exam?')}
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                {t(
                  'exam.confirmMessage',
                  `You have answered ${answeredCount} out of ${questions.length} questions. Unanswered questions will receive no marks. Are you sure you want to submit?`
                )}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t('exam.goBack', 'Go Back')}
                </button>
                <button
                  onClick={doSubmit}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {t('exam.confirmSubmit', 'Yes, Submit')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Exam Results
// ============================================================

function ExamResults({ result, exam, onNewExam, onDashboard }) {
  const { t } = useTranslation();

  const score = result.score ?? result.totalScore ?? result.totalMarks ?? 0;
  const total = result.total ?? result.maxScore ?? result.maxMarks ?? exam.totalMarks ?? 0;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const timeTaken = result.timeTaken || 0;
  const feedbackText = result.feedback || result.overallFeedback || '';
  const sectionBreakdown = result.sectionBreakdown || result.sections || result.breakdown || [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        {/* Score card */}
        <motion.div variants={fadeIn} className="card text-center py-8">
          <CircularScore score={score} total={total} />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-4"
          >
            {pct >= 70 ? (
              <div className="inline-flex items-center gap-2 text-xl font-bold text-green-600">
                <Trophy className="w-6 h-6" />
                {t('exam.excellent', 'Excellent!')}
              </div>
            ) : pct >= 40 ? (
              <div className="inline-flex items-center gap-2 text-xl font-bold text-yellow-600">
                <Zap className="w-6 h-6" />
                {t('exam.goodEffort', 'Good Effort!')}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-xl font-bold text-red-600">
                <Target className="w-6 h-6" />
                {t('exam.keepPracticing', 'Keep Practicing!')}
              </div>
            )}
          </motion.div>

          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-500">
            {timeTaken > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatTime(timeTaken)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              {score}/{total} {t('exam.marks', 'marks')}
            </span>
          </div>
        </motion.div>

        {/* Section breakdown */}
        {sectionBreakdown.length > 0 && (
          <motion.div variants={fadeIn} className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              {t('exam.sectionBreakdown', 'Section-wise Breakdown')}
            </h3>
            <div className="space-y-3">
              {sectionBreakdown.map((sec, i) => {
                const secScore = sec.score ?? sec.marks ?? 0;
                const secTotal = sec.total ?? sec.maxMarks ?? sec.maxScore ?? 0;
                const secPct = secTotal > 0 ? Math.round((secScore / secTotal) * 100) : 0;

                return (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 w-32 truncate">
                      {sec.section || sec.type || sec.name || `Section ${i + 1}`}
                    </span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          secPct >= 70 ? 'bg-green-500' : secPct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${secPct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-600 w-16 text-right">
                      {secScore}/{secTotal}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* AI Feedback */}
        {feedbackText && (
          <motion.div variants={fadeIn} className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              {t('exam.aiFeedback', 'AI Feedback')}
            </h3>
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{feedbackText}</ReactMarkdown>
            </div>
          </motion.div>
        )}

        {/* Per-question feedback */}
        {(result.questionFeedback || result.details || []).length > 0 && (
          <motion.div variants={fadeIn}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('exam.questionWise', 'Question-wise Review')}
            </h3>
            <div className="space-y-3">
              {(result.questionFeedback || result.details || []).map((qf, i) => (
                <div
                  key={i}
                  className={`card border-l-4 ${
                    (qf.score ?? qf.marks ?? 0) >= (qf.maxScore ?? qf.maxMarks ?? 1) * 0.7
                      ? 'border-l-green-500'
                      : (qf.score ?? qf.marks ?? 0) >= (qf.maxScore ?? qf.maxMarks ?? 1) * 0.4
                      ? 'border-l-yellow-500'
                      : 'border-l-red-500'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Q{i + 1}. {qf.question || ''}
                  </p>
                  {qf.feedback && (
                    <p className="text-sm text-gray-600">{qf.feedback}</p>
                  )}
                  {(qf.score !== undefined || qf.marks !== undefined) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {t('exam.score', 'Score')}: {qf.score ?? qf.marks}/{qf.maxScore ?? qf.maxMarks ?? '?'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div variants={fadeIn} className="flex items-center justify-center gap-3">
          <button
            onClick={onNewExam}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {t('exam.takeAnother', 'Take Another Exam')}
          </button>
          <button
            onClick={onDashboard}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            {t('exam.backToDashboard', 'Back to Dashboard')}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function ExamPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  // Stage: 'generate' | 'taking' | 'results'
  const [stage, setStage] = useState('generate');
  const [generating, setGenerating] = useState(false);
  const [exam, setExam] = useState(null);
  const [result, setResult] = useState(null);

  // --------------- Generate ---------------

  const handleGenerate = async ({ topics, questionCount: qCount, timeLimit }) => {
    setGenerating(true);
    try {
      const res = await ai.generateExam({ topics, questionCount: qCount, timeLimit });
      const examData = res.exam || res.data || res;

      if (!examData || !(examData.questions || []).length) {
        toast.error(t('exam.noQuestions', 'Failed to generate exam. Try again.'));
        return;
      }

      // Ensure all questions are MCQ format
      const questions = (examData.questions || []).map((q: any) => ({
        ...q,
        type: 'mcq',
        options: q.options || [],
        correct: typeof q.correct === 'number' ? q.correct : 0,
      }));

      setExam({
        questions,
        totalMarks: questions.length * 2,
        timeLimit,
        topics,
        questionCount: questions.length,
      });
      setResult(null);
      setStage('taking');
      toast.success(`Exam generated! ${questions.length} MCQ questions. Good luck!`);
    } catch (err) {
      toast.error(err.message || t('common.error', 'Something went wrong.'));
    } finally {
      setGenerating(false);
    }
  };

  // --------------- Submit ---------------

  const handleSubmit = async (submission, timeTaken) => {
    try {
      // Convert submission to answer indices for MCQ
      const answerIndices = submission.map((s: any) => typeof s === 'object' ? s.answer : s);

      const res = await ai.submitExam({
        questions: exam.questions,
        submission: answerIndices,
        timeTaken,
        totalMarks: exam.totalMarks,
      });

      const evaluation = res.evaluation || {};
      const resultData = {
        score: evaluation.score ?? 0,
        total: evaluation.total ?? exam.totalMarks,
        percentage: evaluation.percentage ?? 0,
        timeTaken,
        feedback: evaluation.feedback || '',
        details: evaluation.details || [],
        questionFeedback: evaluation.details || [],
      };

      setResult(resultData);
      setStage('results');
      toast.success('Exam submitted! Check your results.');
    } catch (err) {
      toast.error(err.message || 'Something went wrong.');
      setResult({ score: 0, total: exam.totalMarks, timeTaken, feedback: 'Submission failed.' });
      setStage('results');
    }
  };

  // --------------- Reset ---------------

  const handleNewExam = () => {
    setStage('generate');
    setExam(null);
    setResult(null);
  };

  // --------------- Render ---------------

  return (
    <>
      {stage === 'generate' && (
        <GenerateExamForm onGenerate={handleGenerate} loading={generating} />
      )}

      {stage === 'taking' && exam && (
        <ExamTaker exam={exam} onSubmit={handleSubmit} />
      )}

      {stage === 'results' && result && (
        <ExamResults
          result={result}
          exam={exam}
          onNewExam={handleNewExam}
          onDashboard={() => router.push('/dashboard')}
        />
      )}
    </>
  );
}
