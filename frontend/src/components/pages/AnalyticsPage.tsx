"use client";
// ============================================================
// AnalyticsPage - Student performance analytics with Chart.js
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  BarChart3,
  Brain,
  Eye,
  AlertTriangle,
  Clock,
  Target,
  Loader2,
  BookOpen,
  Activity,
  Smile,
  Frown,
  Meh,
  Zap,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import LazyRender from '@/components/common/LazyRender';
import { student, courses } from '@/services/api';
import { useAuth } from '@/components/AuthProvider';
import PageHero from "@/components/common/PageHero";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
  Title,
);

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

// --------------- color palette ---------------

const COLORS = {
  blue: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgb(59, 130, 246)', solid: '#3B82F6' },
  purple: { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgb(139, 92, 246)', solid: '#8B5CF6' },
  green: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgb(16, 185, 129)', solid: '#10B981' },
  indigo: { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgb(99, 102, 241)', solid: '#1e40af' },
  teal: { bg: 'rgba(20, 184, 166, 0.15)', border: 'rgb(20, 184, 166)', solid: '#14B8A6' },
  violet: { bg: 'rgba(167, 139, 250, 0.15)', border: 'rgb(167, 139, 250)', solid: '#1e40af' },
};

const EMOTION_COLORS: Record<string, { bg: string; border: string }> = {
  happy:      { bg: 'rgba(16, 185, 129, 0.7)',  border: '#10B981' },
  focused:    { bg: 'rgba(59, 130, 246, 0.7)',   border: '#3B82F6' },
  neutral:    { bg: 'rgba(59, 130, 246, 0.5)',   border: '#60A5FA' },
  confused:   { bg: 'rgba(245, 158, 11, 0.7)',   border: '#F59E0B' },
  sad:        { bg: 'rgba(245, 158, 11, 0.7)',   border: '#F59E0B' },
  bored:      { bg: 'rgba(139, 92, 246, 0.7)',   border: '#8B5CF6' },
  disgusted:  { bg: 'rgba(139, 92, 246, 0.5)',   border: '#1e40af' },
  frustrated: { bg: 'rgba(239, 68, 68, 0.7)',    border: '#EF4444' },
  angry:      { bg: 'rgba(239, 68, 68, 0.7)',    border: '#EF4444' },
  surprised:  { bg: 'rgba(168, 85, 247, 0.7)',   border: '#A855F7' },
  fearful:    { bg: 'rgba(249, 115, 22, 0.7)',   border: '#F97316' },
  anxious:    { bg: 'rgba(249, 115, 22, 0.5)',   border: '#FB923C' },
};

// Map DB emotion values to user-friendly learning-state labels
// DB stores: happy, confused, bored, focused, frustrated, neutral
const EMOTION_LABEL_MAP: Record<string, string> = {
  happy:      'Engaged',
  focused:    'Focused',
  neutral:    'Neutral',
  confused:   'Confused',
  bored:      'Bored',
  frustrated: 'Frustrated',
};

// --------------- shared chart options ---------------

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 10,
        font: { size: 12, family: "'Inter', sans-serif" },
      },
    },
  },
};

const lineOptions = {
  ...commonOptions,
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 } },
    },
    y: {
      min: 0,
      max: 100,
      grid: { color: 'rgba(0,0,0,0.04)' },
      ticks: { font: { size: 11 }, callback: (v) => v + '%' },
    },
  },
  elements: {
    line: { tension: 0.4 },
    point: { radius: 4, hoverRadius: 6 },
  },
};

const barOptions = {
  ...commonOptions,
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 } },
    },
    y: {
      min: 0,
      max: 100,
      grid: { color: 'rgba(0,0,0,0.04)' },
      ticks: { font: { size: 11 }, callback: (v) => v + '%' },
    },
  },
};

const doughnutOptions = {
  ...commonOptions,
  cutout: '60%',
  plugins: {
    ...commonOptions.plugins,
    legend: {
      ...commonOptions.plugins.legend,
      position: 'right',
    },
  },
};

const radarOptions = {
  ...commonOptions,
  scales: {
    r: {
      min: 0,
      max: 100,
      ticks: { stepSize: 20, font: { size: 10 }, backdropColor: 'transparent' },
      grid: { color: 'rgba(0,0,0,0.06)' },
      pointLabels: { font: { size: 12 } },
    },
  },
};

// --------------- Chart Card wrapper ---------------

function ChartCard({ title, icon: Icon, children, className = '' }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300 ${className}`}
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50 bg-gray-50/50">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e40af] to-[#5b7cf7] flex items-center justify-center">
            <Icon className="w-4 h-4 text-white" />
          </div>
        )}
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-5">
        <LazyRender rootMargin="350px" minHeight={220} placeholder={<div className="skeleton w-full h-[220px] rounded-xl" />}>
          {children}
        </LazyRender>
      </div>
    </motion.div>
  );
}

// --------------- Metric Card ---------------

function AnimatedNumber({ value, suffix = '' }: { value: number | string; suffix?: string }) {
  const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (numValue === 0) { setDisplay(0); return; }
    const duration = 1200;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const increment = numValue / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numValue) { setDisplay(numValue); clearInterval(timer); }
      else setDisplay(Math.round(current));
    }, stepTime);
    return () => clearInterval(timer);
  }, [numValue]);

  return <>{display}{suffix}</>;
}

function MetricCard({ label, value, sub, icon: Icon, color = 'blue', trend = 0 }) {
  const colorMap = {
    blue:   { gradient: 'from-primary-500 to-primary-600', bg: 'bg-primary-50', text: 'text-primary-600', ring: 'ring-primary-200' },
    purple: { gradient: 'from-primary-500 to-primary-600', bg: 'bg-primary-50', text: 'text-primary-600', ring: 'ring-primary-200' },
    green:  { gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200' },
    indigo: { gradient: 'from-primary-500 to-primary-600', bg: 'bg-primary-50', text: 'text-primary-600', ring: 'ring-primary-200' },
  };
  const c = colorMap[color] || colorMap.blue;

  const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value;
  const hasPct = typeof value === 'string' && value.includes('%');

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
      className={`relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-xl transition-all overflow-hidden group`}
    >
      {/* Decorative gradient corner */}
      <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br ${c.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />

      <div className="flex items-start justify-between mb-3 relative">
        <div className={`w-11 h-11 bg-gradient-to-br ${c.gradient} rounded-xl flex items-center justify-center shadow-lg shadow-${color}-200/40`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold text-gray-900 relative">
        {numericValue > 0 ? <AnimatedNumber value={numericValue} suffix={hasPct ? '%' : ''} /> : value}
      </p>
      <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// --------------- Skeleton ---------------

function AnalyticsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="h-8 skeleton rounded-lg w-1/3 mb-2" />
      <div className="h-4 skeleton rounded w-1/2 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="w-10 h-10 skeleton rounded-xl mb-3" />
            <div className="h-7 skeleton rounded w-1/2 mb-1.5" />
            <div className="h-4 skeleton rounded w-2/3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-80 skeleton rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ===============================================================
// Main AnalyticsPage Component
// ===============================================================

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [reportData, setReportData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --------------- fetch ALL real data ---------------

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [reportRes, progressRes] = await Promise.all([
          student.getReport().catch(() => ({})),
          courses.getAllProgress().catch(() => ({})),
        ]);
        setReportData(reportRes);
        setProgressData(progressRes);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // --------------- loading state ---------------

  if (loading) return <AnalyticsSkeleton />;

  // --------------- derive ALL data from real sources ---------------

  const quizHistory = reportData?.quizHistory || [];
  const homeworkHistory = reportData?.homeworkHistory || [];
  const examHistory = reportData?.examHistory || [];
  const emotionLogs = reportData?.emotionLogs || [];
  const courseProgress = progressData?.courses || [];

  // Metric cards — real calculated values
  const avgQuizScore = quizHistory.length > 0
    ? Math.round(quizHistory.reduce((s: number, q: any) => s + (q.score || 0), 0) / quizHistory.length) : 0;
  const avgHomeworkScore = homeworkHistory.length > 0
    ? Math.round(homeworkHistory.reduce((s: number, h: any) => s + (h.score || 0), 0) / homeworkHistory.length) : 0;
  const avgExamScore = examHistory.length > 0
    ? Math.round(examHistory.reduce((s: number, e: any) => s + (e.score || 0), 0) / examHistory.length) : 0;

  const totalAssessments = quizHistory.length + homeworkHistory.length + examHistory.length;
  const overallScore = totalAssessments > 0
    ? Math.round(((avgQuizScore * quizHistory.length) + (avgHomeworkScore * homeworkHistory.length) + (avgExamScore * examHistory.length)) / totalAssessments)
    : 0;

  const totalTopicsCompleted = progressData?.totalTopicsCompleted || 0;
  const totalCourses = progressData?.totalCourses || 0;
  const avgProgress = progressData?.avgProgress || 0;

  // Quiz score timeline (group by date, last 8 entries)
  const quizTimelineMap = new Map<string, number[]>();
  quizHistory.forEach((q: any) => {
    const d = q.created_at ? new Date(q.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : 'Quiz';
    if (!quizTimelineMap.has(d)) quizTimelineMap.set(d, []);
    quizTimelineMap.get(d)!.push(q.score || 0);
  });
  const timeLabels = quizTimelineMap.size > 0
    ? [...quizTimelineMap.keys()].slice(-8)
    : courseProgress.map((c: any) => c.courseTitle?.substring(0, 15) || 'Course');
  const quizScores = quizTimelineMap.size > 0
    ? [...quizTimelineMap.entries()].slice(-8).map(([, scores]) => Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))
    : courseProgress.map((c: any) => c.quizAvg || 0);
  const homeworkScores = homeworkHistory.length > 0
    ? [...quizTimelineMap.keys()].slice(-8).map(() => avgHomeworkScore)
    : courseProgress.map((c: any) => c.homeworkAvg || 0);
  const examScores = examHistory.length > 0
    ? [...quizTimelineMap.keys()].slice(-8).map(() => avgExamScore)
    : courseProgress.map(() => 0);

  // Use course progress labels if no quiz data
  const hasTimelineData = timeLabels.length > 0;
  const finalTimeLabels = hasTimelineData ? timeLabels : ['No data'];
  const finalQuizScores = hasTimelineData ? quizScores : [0];
  const finalHomeworkScores = hasTimelineData ? homeworkScores : [0];
  const finalExamScores = hasTimelineData ? examScores : [0];

  // Subject-wise performance (from course progress)
  const subjects = courseProgress.length > 0
    ? courseProgress.map((c: any) => c.courseSubject || c.courseTitle || 'Course')
    : [];
  const subjectScores = courseProgress.length > 0
    ? courseProgress.map((c: any) => c.progress || 0)
    : [];

  // Emotion distribution — from real emotion logs
  // Group by mapped label so raw face-api keys (happy, sad, etc.) become learning labels (Engaged, Confused, etc.)
  const emotionCounts: Record<string, number> = {};
  const emotionKeyMap: Record<string, string> = {}; // label -> raw key (for color lookup)
  emotionLogs.forEach((e: any) => {
    const raw = e.emotion || 'neutral';
    const label = EMOTION_LABEL_MAP[raw] || raw.charAt(0).toUpperCase() + raw.slice(1);
    emotionCounts[label] = (emotionCounts[label] || 0) + 1;
    if (!emotionKeyMap[label]) emotionKeyMap[label] = raw;
  });
  const emotions = Object.keys(emotionCounts).length > 0 ? emotionCounts : { Focused: 1 };
  const emotionLabels = Object.keys(emotions);
  const emotionValues = Object.values(emotions);
  const emotionBgColors = emotionLabels.map(label => {
    const raw = emotionKeyMap[label] || label.toLowerCase();
    return EMOTION_COLORS[raw]?.bg || EMOTION_COLORS[label.toLowerCase()]?.bg || 'rgba(156,163,175,0.7)';
  });
  const emotionBorderColors = emotionLabels.map(label => {
    const raw = emotionKeyMap[label] || label.toLowerCase();
    return EMOTION_COLORS[raw]?.border || EMOTION_COLORS[label.toLowerCase()]?.border || '#9CA3AF';
  });

  // Attention metrics — from real data
  const avgAttention = emotionLogs.length > 0
    ? Math.round(emotionLogs.reduce((s: number, e: any) => s + (e.attention_level || 0.5), 0) / emotionLogs.length * 100)
    : 0;
  const focusedCount = emotionCounts['focused'] || 0;
  const totalEmotions = emotionLogs.length || 1;
  const attention = {
    focus: avgAttention,
    engagement: Math.round((focusedCount / totalEmotions) * 100),
    consistency: avgProgress,
    quizScore: avgQuizScore,
    completion: avgProgress,
  };
  const attentionLabels = Object.keys(attention).map(k => k.charAt(0).toUpperCase() + k.slice(1));
  const attentionValues = Object.values(attention);

  // Improvement trend — use course progress percentages
  const improvementLabels = courseProgress.length > 0
    ? courseProgress.map((c: any) => c.courseTitle?.substring(0, 12) || 'Course')
    : ['No data'];
  const improvementScores = courseProgress.length > 0
    ? courseProgress.map((c: any) => c.progress || 0)
    : [0];

  // Weak topics — courses with low progress
  const weakTopics = courseProgress
    .filter((c: any) => c.progress < 50)
    .map((c: any) => ({ name: c.courseTitle, score: c.progress, subject: c.courseSubject }));

  // ===============================================================
  // Chart data objects
  // ===============================================================

  const performanceLineData = {
    labels: finalTimeLabels,
    datasets: [
      {
        label: t('Quiz Scores'),
        data: finalQuizScores,
        borderColor: COLORS.blue.border,
        backgroundColor: COLORS.blue.bg,
        fill: true,
      },
      {
        label: t('Homework Scores'),
        data: finalHomeworkScores,
        borderColor: COLORS.purple.border,
        backgroundColor: COLORS.purple.bg,
        fill: true,
      },
      {
        label: t('Exam Scores'),
        data: finalExamScores,
        borderColor: COLORS.green.border,
        backgroundColor: COLORS.green.bg,
        fill: true,
      },
    ],
  };

  const subjectBarData = {
    labels: subjects,
    datasets: [
      {
        label: t('Score (%)'),
        data: subjectScores,
        backgroundColor: [
          COLORS.blue.bg,
          COLORS.purple.bg,
          COLORS.green.bg,
          COLORS.indigo.bg,
          COLORS.teal.bg,
          COLORS.violet.bg,
        ].map((c) => c.replace('0.15', '0.6')),
        borderColor: [
          COLORS.blue.border,
          COLORS.purple.border,
          COLORS.green.border,
          COLORS.indigo.border,
          COLORS.teal.border,
          COLORS.violet.border,
        ],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const emotionDoughnutData = {
    labels: emotionLabels,
    datasets: [
      {
        data: emotionValues,
        backgroundColor: emotionBgColors,
        borderColor: emotionBorderColors,
        borderWidth: 2,
      },
    ],
  };

  const attentionRadarData = {
    labels: attentionLabels,
    datasets: [
      {
        label: t('Attention Metrics'),
        data: attentionValues,
        backgroundColor: COLORS.blue.bg.replace('0.15', '0.25'),
        borderColor: COLORS.blue.border,
        borderWidth: 2,
        pointBackgroundColor: COLORS.blue.solid,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const improvementLineData = {
    labels: improvementLabels,
    datasets: [
      {
        label: t('Overall Performance'),
        data: improvementScores,
        borderColor: COLORS.green.border,
        backgroundColor: COLORS.green.bg,
        fill: true,
        borderWidth: 3,
      },
    ],
  };

  // ===============================================================
  // RENDER
  // ===============================================================

  return (
    <motion.div
      className="max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Hero */}
      <PageHero title="Analytics" subtitle="Track your learning progress with detailed performance insights.">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
            <Activity className="w-4 h-4 text-white/80" />
            <span className="text-xs text-white/80 font-medium">{totalAssessments} Assessments</span>
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
            <Target className="w-4 h-4 text-white/80" />
            <span className="text-xs text-white/80 font-medium">{overallScore}% Overall</span>
          </div>
        </div>
      </PageHero>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label={t('Avg Progress')}
          value={`${avgProgress}%`}
          sub={`${totalCourses} course${totalCourses !== 1 ? 's' : ''} enrolled`}
          icon={Target}
          color="blue"
        />
        <MetricCard
          label={t('Topics Completed')}
          value={totalTopicsCompleted}
          sub={`Across all courses`}
          icon={BookOpen}
          color="purple"
        />
        <MetricCard
          label={t('Quiz Average')}
          value={quizHistory.length > 0 ? `${avgQuizScore}%` : '--'}
          sub={`${quizHistory.length} quiz${quizHistory.length !== 1 ? 'zes' : ''} taken`}
          icon={Brain}
          color="green"
        />
        <MetricCard
          label={t('Assessments')}
          value={totalAssessments}
          sub={`${quizHistory.length} quizzes, ${homeworkHistory.length} HW, ${examHistory.length} exams`}
          icon={Zap}
          color="indigo"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Over Time */}
        <ChartCard title={t('Performance Overview')} icon={TrendingUp} className="lg:col-span-2">
          <div className="h-72">
            <Line data={performanceLineData} options={lineOptions} />
          </div>
        </ChartCard>

        {/* Subject-wise Performance */}
        <ChartCard title={t('Subject-wise Performance')} icon={BarChart3}>
          <div className="h-72">
            <Bar data={subjectBarData} options={barOptions} />
          </div>
        </ChartCard>

        {/* Emotion Analytics */}
        <ChartCard title={t('Emotion Analytics')} icon={Smile}>
          <div className="h-72 flex items-center justify-center">
            <Doughnut data={emotionDoughnutData} options={doughnutOptions} />
          </div>
        </ChartCard>

        {/* Attention Level */}
        <ChartCard title={t('Attention Level')} icon={Eye}>
          <div className="h-72 flex items-center justify-center">
            <Radar data={attentionRadarData} options={radarOptions} />
          </div>
        </ChartCard>

        {/* Improvement Graph */}
        <ChartCard title={t('Improvement Trend')} icon={TrendingUp}>
          <div className="h-72">
            <Line data={improvementLineData} options={lineOptions} />
          </div>
        </ChartCard>
      </div>

      {/* Weak Topics Section */}
      <motion.div variants={itemVariants}>
        <ChartCard title={t('Weak Topics')} icon={AlertTriangle}>
          {weakTopics.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('No weak topics identified yet')}</p>
              <p className="text-sm text-gray-400 mt-1">
                {t('Complete more assessments to get insights')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {weakTopics.map((topic, idx) => {
                const topicName = typeof topic === 'string' ? topic : topic.name || topic.topic;
                const topicScore =
                  typeof topic === 'object' ? topic.score || topic.accuracy : null;
                const topicSubject =
                  typeof topic === 'object' ? topic.subject || topic.course : null;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl"
                  >
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{topicName}</p>
                      {topicSubject && (
                        <p className="text-xs text-gray-500">{topicSubject}</p>
                      )}
                      {topicScore != null && (
                        <p className="text-xs text-red-600 font-medium mt-0.5">
                          {t('Score')}: {topicScore}%
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </motion.div>
    </motion.div>
  );
}
