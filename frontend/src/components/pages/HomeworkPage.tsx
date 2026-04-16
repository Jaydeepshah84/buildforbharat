"use client";
// ============================================================
// HomeworkPage - Generate, answer, and review AI homework
// ============================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen,
  Sparkles,
  Loader2,
  CheckCircle2,
  ClipboardList,
  Send,
  ArrowLeft,
  Trophy,
  Target,
  Zap,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
  FileText,
} from 'lucide-react';
import { ai, student } from '@/services/api';
import { useAuth } from '@/components/AuthProvider';
import PageHero from "@/components/common/PageHero";

// --------------- constants ---------------

const QUESTION_COUNTS = [3, 5, 8, 10];
const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'hard', label: 'Hard', color: 'bg-red-100 text-red-700 border-red-200' },
];

// --------------- animation helpers ---------------

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

// --------------- Circular score ---------------

function CircularScore({ score, total }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 70 ? 'text-green-500' : pct >= 40 ? 'text-yellow-500' : 'text-red-500';
  const bgColor =
    pct >= 70 ? 'text-green-100' : pct >= 40 ? 'text-yellow-100' : 'text-red-100';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="8" className={`stroke-current ${bgColor}`} />
        <motion.circle cx="60" cy="60" r={radius} fill="none" strokeWidth="8" strokeLinecap="round"
          className={`stroke-current ${color}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span className={`text-2xl font-bold ${color}`}
          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}>
          {pct}%
        </motion.span>
        <span className="text-xs text-gray-400">{score}/{total}</span>
      </div>
    </div>
  );
}

// ============================================================
// Generate Homework Form
// ============================================================

function GenerateForm({ onGenerate, loading }) {
  const { t } = useTranslation();
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error(t('homework.topicRequired', 'Please enter a topic.'));
      return;
    }
    onGenerate({ topic: topic.trim(), count, difficulty });
  };

  return (
    <motion.form variants={fadeIn} onSubmit={handleSubmit} className="card space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] flex items-center justify-center text-white">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {t('homework.generateTitle', 'Generate Homework')}
          </h2>
          <p className="text-sm text-gray-500">
            {t('homework.generateSubtitle', 'Get AI-generated questions on any topic')}
          </p>
        </div>
      </div>

      {/* Topic */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('homework.topicLabel', 'Topic / Subject')}
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t('homework.topicPlaceholder', 'e.g. Photosynthesis, Quadratic Equations')}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#284ce3] focus:border-transparent"
          disabled={loading}
        />
      </div>

      {/* Question count */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('homework.countLabel', 'Number of Questions')}
        </label>
        <div className="flex gap-3">
          {QUESTION_COUNTS.map((n) => (
            <button
              key={n} type="button"
              onClick={() => setCount(n)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-200 ${
                count === n
                  ? 'border-[#284ce3] bg-blue-50 text-[#284ce3]'
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
          {t('homework.difficultyLabel', 'Difficulty Level')}
        </label>
        <div className="flex gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value} type="button"
              onClick={() => setDifficulty(d.value)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                difficulty === d.value
                  ? d.color + ' border-current'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t(`homework.difficulty.${d.value}`, d.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !topic.trim()}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#284ce3] to-[#4a6cf7] text-white font-semibold text-sm hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('homework.generating', 'Generating Homework...')}
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            {t('homework.generate', 'Generate Homework')}
          </>
        )}
      </button>
    </motion.form>
  );
}

// ============================================================
// Homework Answer Interface
// ============================================================

function HomeworkAnswerSheet({ homework, onSubmit, onBack, submitting }) {
  const { t } = useTranslation();
  const questions = homework.questions || [];
  const [answers, setAnswers] = useState(() =>
    questions.reduce((acc, _, i) => ({ ...acc, [i]: '' }), {})
  );

  const updateAnswer = (index, value) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const answeredCount = Object.values(answers).filter((a) => a.trim()).length;
  const allAnswered = answeredCount === questions.length;

  const handleSubmit = () => {
    if (answeredCount === 0) {
      toast.error(t('homework.answerAtLeastOne', 'Please answer at least one question.'));
      return;
    }

    if (!allAnswered) {
      const proceed = window.confirm(
        t(
          'homework.unansweredWarning',
          `You have ${questions.length - answeredCount} unanswered question(s). Submit anyway?`
        )
      );
      if (!proceed) return;
    }

    const submission = questions.map((q, i) => ({
      questionIndex: i,
      question: q.question || q.text,
      type: q.type || 'short',
      answer: answers[i] || '',
    }));

    onSubmit(submission);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeIn} className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#284ce3] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.goBack', 'Go Back')}
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          {answeredCount}/{questions.length} {t('homework.answered', 'answered')}
        </div>
      </motion.div>

      <motion.div variants={fadeIn} className="card">
        <div className="flex items-center gap-3 mb-1">
          <ClipboardList className="w-5 h-5 text-[#284ce3]" />
          <h2 className="text-lg font-bold text-gray-900">
            {homework.topic || t('homework.title', 'Homework')}
          </h2>
        </div>
        <p className="text-sm text-gray-500 ml-8">
          {questions.length} {t('homework.questions', 'questions')} &middot;{' '}
          {homework.difficulty || 'medium'} {t('homework.difficultyTag', 'difficulty')}
        </p>
      </motion.div>

      {/* Questions */}
      {questions.map((q, i) => {
        const questionText = q.question || q.text || '';
        const qType = (q.type || 'short').toLowerCase();
        const isLong = qType === 'long' || qType === 'long_answer' || qType === 'essay';

        return (
          <motion.div
            key={i}
            variants={fadeIn}
            className="card"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-[#284ce3] text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isLong
                      ? 'bg-blue-100 text-[#284ce3]'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {isLong
                      ? t('homework.longAnswer', 'Long Answer')
                      : t('homework.shortAnswer', 'Short Answer')}
                  </span>
                  {q.marks && (
                    <span className="text-xs text-gray-400">
                      [{q.marks} {t('homework.marks', 'marks')}]
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 leading-relaxed">
                  {questionText}
                </p>
              </div>
            </div>

            <textarea
              value={answers[i]}
              onChange={(e) => updateAnswer(i, e.target.value)}
              placeholder={
                isLong
                  ? t('homework.longPlaceholder', 'Write a detailed answer...')
                  : t('homework.shortPlaceholder', 'Write your answer here...')
              }
              rows={isLong ? 6 : 3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#284ce3] focus:border-transparent"
            />

            {answers[i].trim() && (
              <div className="flex justify-end mt-1">
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {t('homework.answerSaved', 'Answer saved')}
                </span>
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Submit button */}
      <motion.div variants={fadeIn} className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting || answeredCount === 0}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('homework.submitting', 'Submitting...')}
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              {t('homework.submitAll', 'Submit All Answers')}
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Feedback / Results View
// ============================================================

function HomeworkFeedback({ feedback, homework, onNewHomework }) {
  const { t } = useTranslation();
  const score = feedback.score ?? feedback.totalScore ?? 0;
  const total = feedback.total ?? feedback.maxScore ?? homework?.questions?.length ?? 0;
  const feedbackText = feedback.feedback || feedback.overallFeedback || '';
  const tips = feedback.tips || feedback.improvements || feedback.improvementTips || [];
  const questionFeedback = feedback.questionFeedback || feedback.details || [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Score card */}
      <motion.div variants={fadeIn} className="card text-center py-8">
        <CircularScore score={score} total={total} />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-4"
        >
          {score / total >= 0.7 ? (
            <div className="inline-flex items-center gap-2 text-lg font-bold text-green-600">
              <Trophy className="w-5 h-5" />
              {t('homework.excellent', 'Excellent Work!')}
            </div>
          ) : score / total >= 0.4 ? (
            <div className="inline-flex items-center gap-2 text-lg font-bold text-yellow-600">
              <Zap className="w-5 h-5" />
              {t('homework.goodEffort', 'Good Effort!')}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-lg font-bold text-red-600">
              <Target className="w-5 h-5" />
              {t('homework.keepPracticing', 'Keep Practicing!')}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Overall AI feedback */}
      {feedbackText && (
        <motion.div variants={fadeIn} className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#284ce3]" />
            {t('homework.aiFeedback', 'AI Feedback')}
          </h3>
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown>{feedbackText}</ReactMarkdown>
          </div>
        </motion.div>
      )}

      {/* Improvement tips */}
      {tips.length > 0 && (
        <motion.div variants={fadeIn} className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            {t('homework.improvementTips', 'Improvement Tips')}
          </h3>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {typeof tip === 'string' ? tip : tip.text || tip.tip || JSON.stringify(tip)}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Per-question feedback */}
      {questionFeedback.length > 0 && (
        <motion.div variants={fadeIn}>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('homework.questionWise', 'Question-wise Feedback')}
          </h3>
          <div className="space-y-3">
            {questionFeedback.map((qf, i) => (
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
                    {t('homework.score', 'Score')}: {qf.score ?? qf.marks}/{qf.maxScore ?? qf.maxMarks ?? '?'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* New homework button */}
      <motion.div variants={fadeIn} className="flex justify-center">
        <button
          onClick={onNewHomework}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#284ce3] to-[#4a6cf7] text-white font-semibold text-sm hover:shadow-lg hover:shadow-blue-200 transition-all"
        >
          <Sparkles className="w-5 h-5" />
          {t('homework.generateAnother', 'Generate New Homework')}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Past Homework List
// ============================================================

function PastHomeworkList({ homeworkList }) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState(null);

  if (!homeworkList || homeworkList.length === 0) {
    return (
      <motion.div variants={fadeIn} className="card text-center py-8">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">
          {t('homework.noPast', 'No past homework found. Generate your first homework above!')}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {homeworkList.map((hw, idx) => {
        const id = hw._id || hw.id || idx;
        const isExpanded = expandedId === id;
        const score = hw.score ?? hw.totalScore ?? null;
        const total = hw.total ?? hw.maxScore ?? hw.questions?.length ?? null;
        const pct = score !== null && total ? Math.round((score / total) * 100) : null;

        return (
          <motion.div
            key={id}
            variants={fadeIn}
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setExpandedId(isExpanded ? null : id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  pct !== null && pct >= 70
                    ? 'bg-green-100 text-green-600'
                    : pct !== null && pct >= 40
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {hw.topic || hw.title || t('homework.untitled', 'Homework')}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {hw.createdAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(hw.createdAt).toLocaleDateString()}
                      </span>
                    )}
                    {hw.difficulty && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        hw.difficulty === 'easy'
                          ? 'bg-green-100 text-green-700'
                          : hw.difficulty === 'hard'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {hw.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {pct !== null && (
                  <span className={`text-sm font-bold ${
                    pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {pct}%
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {hw.feedback && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-xs font-semibold text-[#284ce3] mb-1">
                          {t('homework.aiFeedback', 'AI Feedback')}
                        </p>
                        <div className="prose prose-sm max-w-none text-sm text-blue-800">
                          <ReactMarkdown>
                            {typeof hw.feedback === 'string' ? hw.feedback : hw.feedback.text || hw.feedback.overallFeedback || ''}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {(hw.tips || hw.improvements) && (
                      <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                        <p className="text-xs font-semibold text-yellow-700 mb-1">
                          {t('homework.improvementTips', 'Improvement Tips')}
                        </p>
                        <ul className="text-sm text-yellow-800 space-y-1">
                          {(hw.tips || hw.improvements || []).map((tip, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-yellow-500 mt-0.5">-</span>
                              {typeof tip === 'string' ? tip : tip.text || tip.tip || ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {score !== null && (
                      <p className="text-xs text-gray-400">
                        {t('homework.score', 'Score')}: {score}/{total}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function HomeworkPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Stage: 'idle' | 'answering' | 'feedback'
  const [stage, setStage] = useState('idle');
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [homework, setHomework] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Past homework
  const [pastHomework, setPastHomework] = useState([]);
  const [loadingPast, setLoadingPast] = useState(true);

  // Fetch past homework from dashboard
  useEffect(() => {
    let cancelled = false;

    async function fetchPast() {
      try {
        const res = await student.getDashboard();
        const data = res.dashboard || res.data || res;
        const hwList = data.homework || data.homeworks || data.pastHomework || [];
        if (!cancelled) setPastHomework(Array.isArray(hwList) ? hwList : []);
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoadingPast(false);
      }
    }

    fetchPast();
    return () => { cancelled = true; };
  }, [feedback]); // Re-fetch when new feedback arrives (after submit)

  // --------------- Generate ---------------

  const handleGenerate = async ({ topic, count, difficulty }) => {
    setGenerating(true);
    try {
      const res = await ai.generateHomework({ topic, count, difficulty });
      const hwData = res.homework || res.data || res;

      if (!hwData || !(hwData.questions || []).length) {
        toast.error(t('homework.noQuestions', 'Failed to generate questions. Try again.'));
        return;
      }

      setHomework({ ...hwData, topic, difficulty });
      setFeedback(null);
      setStage('answering');
      toast.success(t('homework.generated', 'Homework generated!'));
    } catch (err) {
      toast.error(err.message || t('common.error', 'Something went wrong.'));
    } finally {
      setGenerating(false);
    }
  };

  // --------------- Submit ---------------

  const handleSubmit = async (submission) => {
    setSubmitting(true);
    try {
      const res = await ai.submitHomework({
        topicId: homework.topicId || homework._id || undefined,
        courseId: homework.courseId || undefined,
        questions: homework.questions,
        submission,
      });

      const fbData = res.feedback || res.result || res.data || res;
      setFeedback(fbData);
      setStage('feedback');
      toast.success(t('homework.submitted', 'Homework submitted! Check your feedback.'));
    } catch (err) {
      toast.error(err.message || t('common.error', 'Something went wrong.'));
    } finally {
      setSubmitting(false);
    }
  };

  // --------------- Reset ---------------

  const handleNewHomework = () => {
    setStage('idle');
    setHomework(null);
    setFeedback(null);
  };

  // --------------- Render ---------------

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHero title="Homework" subtitle="Practice with AI-generated homework and get instant feedback.">
        <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
          <BookOpen className="w-4 h-4 text-white/80" />
          <span className="text-xs text-white/80 font-medium">AI Grading</span>
        </div>
      </PageHero>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        {/* Stage: Idle -- show generate form + past homework */}
        {stage === 'idle' && (
          <>
            <GenerateForm onGenerate={handleGenerate} loading={generating} />

            {/* My Homework section */}
            <motion.div variants={fadeIn} className="mt-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#284ce3]" />
                {t('homework.myHomework', 'My Homework')}
              </h2>

              {loadingPast ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#284ce3]" />
                </div>
              ) : (
                <PastHomeworkList homeworkList={pastHomework} />
              )}
            </motion.div>
          </>
        )}

        {/* Stage: Answering */}
        {stage === 'answering' && homework && (
          <HomeworkAnswerSheet
            homework={homework}
            onSubmit={handleSubmit}
            onBack={handleNewHomework}
            submitting={submitting}
          />
        )}

        {/* Stage: Feedback */}
        {stage === 'feedback' && feedback && (
          <HomeworkFeedback
            feedback={feedback}
            homework={homework}
            onNewHomework={handleNewHomework}
          />
        )}
      </motion.div>
    </div>
  );
}
