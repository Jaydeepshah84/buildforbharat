"use client";
// ============================================================
// DashboardPage - Student dashboard with stats, quizzes, homework
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Brain,
  ClipboardCheck,
  TrendingUp,
  Play,
  MessageCircle,
  Sparkles,
  Award,
  BarChart3,
  Clock,
  ChevronRight,
  Loader2,
  Target,
  Zap,
} from 'lucide-react';
import { student, courses } from '@/services/api';
import { useAuth } from '@/components/AuthProvider';

// --------------- animation helpers ---------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// --------------- skeleton loader ---------------

function SkeletonCard({ className = '' }) {
  return (
    <div className={`card animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome skeleton */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard className="h-48" />
        <SkeletonCard className="h-48" />
      </div>
    </div>
  );
}

// --------------- level badge ---------------

function LevelBadge({ level }) {
  const colorMap = {
    weak: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    strong: 'bg-green-100 text-green-700 border-green-200',
  };

  const colors = colorMap[level] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${colors}`}
    >
      {level || 'N/A'}
    </span>
  );
}

// --------------- score bar ---------------

function ScoreBar({ score, max = 100 }) {
  const pct = Math.min(Math.round((score / max) * 100), 100);
  const color =
    pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-sm font-medium text-gray-600 min-w-[3rem] text-right">
        {score}/{max}
      </span>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        const [res, progress] = await Promise.all([
          student.getDashboard().catch(() => null),
          courses.getAllProgress().catch(() => null),
        ]);
        if (!cancelled) {
          setData(res);
          setProgressData(progress);
        }
      } catch (err) {
        if (!cancelled && err?.status !== 401) {
          toast.error(err.message || t('common.error'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboard();
    return () => { cancelled = true; };
  }, [t]);

  // --------------- loading state ---------------

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  // --------------- derived data ---------------

  const stats = data?.stats || {};
  const recentQuizzes = (data?.recentQuizzes || []).slice(0, 5);
  const recentHomework = (data?.recentHomework || []).slice(0, 5).map((hw: any) => ({
    ...hw,
    title: hw.topic_id || hw.title || hw.subject || "Homework",
    status: hw.submitted_at ? "completed" : "pending",
    submittedAt: hw.submitted_at || hw.created_at,
  }));

  // Study plan: read from currentPlan which has plan_json
  const rawPlan = data?.currentPlan;
  let studyPlan = null;
  try {
    if (rawPlan) {
      const planJson = typeof rawPlan.plan_json === 'string' ? JSON.parse(rawPlan.plan_json) : (rawPlan.plan_json || {});
      const days = planJson?.days || [];
      const firstDay = days[0] || {};
      const tasks = firstDay?.tasks || firstDay?.activities || firstDay?.items || [];
      studyPlan = {
        goal: planJson?.title || firstDay?.focus_topic || "Personalized Study Plan",
        duration: days.length || 7,
        progress: null,
        todayTasks: tasks.slice(0, 3),
        daysLeft: days.length,
      };
    }
  } catch { studyPlan = null; }

  // Performance: build from course progress data
  const perfArray = Array.isArray(data?.performance) ? data.performance : [];
  const courseProgressList = Array.isArray(progressData?.courses) ? progressData.courses : [];
  const performance = {
    subjects: courseProgressList.length > 0
      ? courseProgressList.map((c: any) => ({
          name: c.courseTitle || c.courseSubject || "Course",
          score: c.progress || 0,
        }))
      : perfArray.length > 0
        ? perfArray.map((p: any) => ({
            name: (typeof p.subject === 'string' ? p.subject : '') || "Subject",
            score: p.quiz_avg || 0,
          }))
        : [],
    overallScore: stats.avgProgress || (courseProgressList.length > 0
      ? Math.round(courseProgressList.reduce((s: number, c: any) => s + (c.progress || 0), 0) / courseProgressList.length)
      : null),
  };
  const studentName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('common.student');

  // --------------- stat cards config ---------------

  const pData = progressData || {};
  // Merge progress data from both sources (student dashboard + courses progress)
  const enrolledCount = pData.totalCourses || stats.totalCourses || 0;
  const topicsCount = pData.totalTopicsCompleted || stats.totalTopicsCompleted || 0;
  const avgProg = pData.avgProgress || stats.avgProgress || 0;
  const completedCount = pData.totalCompleted || stats.coursesCompleted || 0;

  const statCards = [
    {
      label: t('dashboard.totalCourses', 'Enrolled Courses'),
      value: enrolledCount,
      icon: BookOpen,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Topics Completed',
      value: topicsCount,
      icon: Target,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Avg Progress',
      value: `${avgProg}%`,
      icon: TrendingUp,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Courses Completed',
      value: completedCount,
      icon: Award,
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  // --------------- quick actions ---------------

  const quickActions = [
    {
      label: t('dashboard.startQuiz', 'Start Quiz'),
      icon: Zap,
      path: '/quiz',
      color: 'from-indigo-500 to-purple-600',
    },
    {
      label: t('dashboard.askTutor', 'Ask Tutor'),
      icon: MessageCircle,
      path: '/tutor',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: t('dashboard.generateCourse', 'Generate Course'),
      icon: Sparkles,
      path: '/courses',
      color: 'from-amber-500 to-orange-600',
    },
  ];

  // --------------- render ---------------

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Welcome */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t('dashboard.welcome', 'Welcome back')}, {studentName}!
          </h1>
          <p className="text-gray-500 mt-1">
            {t('dashboard.subtitle', "Here's an overview of your learning journey.")}
          </p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={i} variants={itemVariants} className="card flex items-start gap-4">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  {card.isComponent ? (
                    <div className="mt-1">{card.value}</div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">{card.value}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick actions */}
        <motion.div variants={itemVariants}>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  onClick={() => router.push(action.path)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium bg-gradient-to-r ${action.color} hover:shadow-lg transition-all duration-200 hover:scale-[1.02]`}
                >
                  <Icon className="w-4 h-4" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent quizzes */}
          <motion.div variants={itemVariants} className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                {t('dashboard.recentQuizzes', 'Recent Quizzes')}
              </h2>
              <button
                onClick={() => router.push('/quiz')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                {t('common.viewAll', 'View All')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {recentQuizzes.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">
                {t('dashboard.noQuizzes', 'No quizzes taken yet.')}
              </p>
            ) : (
              <div className="space-y-3">
                {recentQuizzes.map((quiz, i) => (
                  <div key={quiz._id || i} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Award className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {quiz.title || quiz.subject || `Quiz ${i + 1}`}
                      </p>
                      <ScoreBar score={quiz.score ?? 0} max={quiz.total ?? 100} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent homework */}
          <motion.div variants={itemVariants} className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                {t('dashboard.recentHomework', 'Recent Homework')}
              </h2>
              <button
                onClick={() => router.push('/homework')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                {t('common.viewAll', 'View All')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {recentHomework.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">
                {t('dashboard.noHomework', 'No homework submitted yet.')}
              </p>
            ) : (
              <div className="space-y-3">
                {recentHomework.map((hw, i) => (
                  <div
                    key={hw._id || i}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {hw.subject || hw.title || `Homework ${i + 1}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {hw.submittedAt
                            ? new Date(hw.submittedAt).toLocaleDateString()
                            : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        hw.status === 'completed' || hw.status === 'graded'
                          ? 'bg-green-100 text-green-700'
                          : hw.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {hw.status || 'submitted'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom row: study plan + performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Study plan */}
          <motion.div variants={itemVariants} className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-600" />
                {t('dashboard.studyPlan', 'Study Plan')}
              </h2>
              <button
                onClick={() => router.push('/study-planner')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                {t('common.viewAll', 'View All')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {studyPlan ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t('dashboard.goal', 'Goal')}</span>
                  <span className="font-medium text-gray-800">{studyPlan.goal || '--'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t('dashboard.duration', 'Duration')}</span>
                  <span className="font-medium text-gray-800">
                    {studyPlan.duration || studyPlan.daysLeft
                      ? `${studyPlan.daysLeft || studyPlan.duration} days`
                      : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t('dashboard.progress', 'Progress')}</span>
                  <span className="font-medium text-gray-800">
                    {studyPlan.progress != null ? `${studyPlan.progress}%` : '--'}
                  </span>
                </div>
                {studyPlan.progress != null && (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${studyPlan.progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                )}
                {studyPlan.todayTasks && studyPlan.todayTasks.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      {t('dashboard.todayTasks', "Today's Tasks")}
                    </p>
                    <ul className="space-y-1">
                      {studyPlan.todayTasks.slice(0, 3).map((task, i) => {
                        const label = typeof task === 'string' ? task : (task?.title || task?.task || task?.name || JSON.stringify(task));
                        return (
                          <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Target className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {t('dashboard.noPlan', 'No study plan yet.')}
                </p>
                <button
                  onClick={() => router.push('/study-planner')}
                  className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {t('dashboard.createPlan', 'Create Study Plan')}
                </button>
              </div>
            )}
          </motion.div>

          {/* Performance overview */}
          <motion.div variants={itemVariants} className="card">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              {t('dashboard.performance', 'Performance Overview')}
            </h2>

            {performance.subjects && performance.subjects.length > 0 ? (
              <div className="space-y-4">
                {performance.subjects.slice(0, 5).map((subj, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{subj.name}</span>
                      <span className="text-sm text-gray-500">{subj.score}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          subj.score >= 70
                            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                            : subj.score >= 40
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                            : 'bg-gradient-to-r from-red-400 to-rose-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${subj.score}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {t('dashboard.noPerformance', 'Complete quizzes to see performance data.')}
                </p>
              </div>
            )}

            {performance.overallScore != null && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {t('dashboard.overallScore', 'Overall Score')}
                </span>
                <span className="text-xl font-bold text-indigo-600">
                  {performance.overallScore}%
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
