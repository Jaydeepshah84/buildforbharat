"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { ChevronRight } from "lucide-react";
import { student, courses } from "@/services/api";
import { useAuth } from "@/components/AuthProvider";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
      <div className="h-24 rounded-2xl bg-gray-50" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-gray-50" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-52 rounded-2xl bg-gray-50" />
        <div className="h-52 rounded-2xl bg-gray-50" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchDashboard() {
      try {
        const [res, progress] = await Promise.all([
          student.getDashboard().catch(() => null),
          courses.getAllProgress().catch(() => null),
        ]);
        if (!cancelled) { setData(res); setProgressData(progress); }
      } catch (err: any) {
        if (!cancelled && err?.status !== 401) toast.error(err.message || t("common.error"));
      } finally { if (!cancelled) setLoading(false); }
    }
    fetchDashboard();
    return () => { cancelled = true; };
  }, [t]);

  if (loading) return <DashboardSkeleton />;

  const stats = data?.stats || {};
  const recentQuizzes = (data?.recentQuizzes || []).slice(0, 4);
  const recentHomework = (data?.recentHomework || []).slice(0, 4).map((hw: any) => ({
    ...hw,
    title: hw.topic_id || hw.title || hw.subject || "Homework",
    status: hw.submitted_at ? "completed" : "pending",
    submittedAt: hw.submitted_at || hw.created_at,
  }));

  const rawPlan = data?.currentPlan;
  let studyPlan: any = null;
  try {
    if (rawPlan) {
      const planJson = typeof rawPlan.plan_json === "string" ? JSON.parse(rawPlan.plan_json) : (rawPlan.plan_json || {});
      const days = planJson?.days || [];
      const firstDay = days[0] || {};
      const tasks = firstDay?.tasks || firstDay?.activities || firstDay?.items || [];
      studyPlan = { goal: planJson?.title || firstDay?.focus_topic || "Personalized Study Plan", duration: days.length || 7, progress: null, todayTasks: tasks.slice(0, 3), daysLeft: days.length };
    }
  } catch { studyPlan = null; }

  const perfArray = Array.isArray(data?.performance) ? data.performance : [];
  const pData = progressData || {};
  const courseProgressList = Array.isArray(pData?.courses) ? pData.courses : [];
  const performance = {
    subjects: courseProgressList.length > 0
      ? courseProgressList.map((c: any) => ({ name: c.courseTitle || c.courseSubject || "Course", score: c.progress || 0 }))
      : perfArray.length > 0
        ? perfArray.map((p: any) => ({ name: (typeof p.subject === "string" ? p.subject : "") || "Subject", score: p.quiz_avg || 0 }))
        : [],
    overallScore: stats.avgProgress || (courseProgressList.length > 0
      ? Math.round(courseProgressList.reduce((s: number, c: any) => s + (c.progress || 0), 0) / courseProgressList.length)
      : null),
  };

  const studentName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || t("common.student");
  const firstName = studentName.split(" ")[0];
  const enrolledCount = pData.totalCourses || stats.totalCourses || 0;
  const topicsCount = pData.totalTopicsCompleted || stats.totalTopicsCompleted || 0;
  const avgProg = pData.avgProgress || stats.avgProgress || 0;
  const completedCount = pData.totalCompleted || stats.coursesCompleted || 0;

  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  const statCards = [
    { label: "Enrolled", value: enrolledCount, sub: "courses", color: "from-[#284ce3] to-[#5b7cf7]" },
    { label: "Topics", value: topicsCount, sub: "completed", color: "from-violet-500 to-purple-400" },
    { label: "Progress", value: `${avgProg}%`, sub: "average", color: "from-emerald-500 to-teal-400" },
    { label: "Completed", value: completedCount, sub: "courses", color: "from-amber-500 to-orange-400" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

        {/* ── Greeting ── */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">{dayNames[today.getDay()]}, {monthNames[today.getMonth()]} {today.getDate()}</p>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {greeting}, {firstName}
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/quiz")}
              className="px-5 py-2.5 rounded-xl bg-[#284ce3] text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm">
              Start Quiz
            </button>
            <button onClick={() => router.push("/tutor")}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all">
              Ask Tutor
            </button>
            <button onClick={() => router.push("/courses")}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all">
              New Course
            </button>
          </div>
        </motion.div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div key={i} variants={itemVariants}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-5 text-white`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
              <p className="text-sm font-medium text-white/70 mb-1">{card.label}</p>
              <p className="text-4xl font-extrabold tracking-tight">{card.value}</p>
              <p className="text-xs text-white/50 mt-1">{card.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Quizzes + Homework ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Recent Quizzes */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">Recent Quizzes</h2>
              <button onClick={() => router.push("/quiz")}
                className="text-xs text-[#284ce3] font-semibold flex items-center gap-0.5 hover:text-blue-700">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {recentQuizzes.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-6xl mb-4">📝</p>
                <p className="text-sm text-gray-400 mb-3">No quizzes taken yet</p>
                <button onClick={() => router.push("/quiz")}
                  className="text-sm font-semibold text-[#284ce3] hover:text-blue-700">Take your first quiz &rarr;</button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentQuizzes.map((quiz: any, i: number) => {
                  const pct = Math.round(((quiz.score ?? 0) / (quiz.total || 100)) * 100);
                  return (
                    <div key={quiz._id || i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold text-white ${
                        pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"
                      }`}>
                        {pct}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{quiz.title || quiz.subject || `Quiz ${i + 1}`}</p>
                        <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div className={`h-full rounded-full ${
                            pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"
                          }`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">{quiz.score ?? 0}/{quiz.total ?? 100}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Recent Homework */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">Recent Homework</h2>
              <button onClick={() => router.push("/homework")}
                className="text-xs text-[#284ce3] font-semibold flex items-center gap-0.5 hover:text-blue-700">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {recentHomework.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-6xl mb-4">📋</p>
                <p className="text-sm text-gray-400">No homework submitted yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentHomework.map((hw: any, i: number) => (
                  <div key={hw._id || i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-8 rounded-full flex-shrink-0 ${
                        hw.status === "completed" || hw.status === "graded" ? "bg-emerald-500" : "bg-amber-400"
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{hw.subject || hw.title || `Homework ${i + 1}`}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{hw.submittedAt ? new Date(hw.submittedAt).toLocaleDateString() : ""}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wide ${
                      hw.status === "completed" || hw.status === "graded" ? "text-emerald-600" : "text-amber-600"
                    }`}>
                      {hw.status || "submitted"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Study Plan + Performance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Study Plan */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">Study Plan</h2>
              <button onClick={() => router.push("/study-planner")}
                className="text-xs text-[#284ce3] font-semibold flex items-center gap-0.5 hover:text-blue-700">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {studyPlan ? (
              <div className="space-y-4">
                {[
                  { k: "Goal", v: studyPlan.goal || "--" },
                  { k: "Duration", v: studyPlan.daysLeft || studyPlan.duration ? `${studyPlan.daysLeft || studyPlan.duration} days` : "--" },
                  { k: "Progress", v: studyPlan.progress != null ? `${studyPlan.progress}%` : "--" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{row.k}</span>
                    <span className="text-sm font-bold text-gray-800">{row.v}</span>
                  </div>
                ))}
                {studyPlan.progress != null && (
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-[#284ce3] to-[#6366f1]" initial={{ width: 0 }} animate={{ width: `${studyPlan.progress}%` }} transition={{ duration: 1 }} />
                  </div>
                )}
                {studyPlan.todayTasks?.length > 0 && (
                  <div className="pt-3 border-t border-gray-50">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Today</p>
                    {studyPlan.todayTasks.slice(0, 3).map((task: any, i: number) => {
                      const label = typeof task === "string" ? task : (task?.title || task?.task || task?.name || "");
                      return (
                        <div key={i} className="flex items-center gap-2.5 py-1.5 text-sm text-gray-700">
                          <span className="w-5 h-5 rounded-md bg-blue-50 text-[10px] font-bold text-[#284ce3] flex items-center justify-center">{i + 1}</span>
                          <span className="truncate">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-6xl mb-4">🎯</p>
                <p className="text-sm text-gray-400 mb-3">No study plan yet</p>
                <button onClick={() => router.push("/study-planner")}
                  className="text-sm font-semibold text-[#284ce3] hover:text-blue-700">Create one &rarr;</button>
              </div>
            )}
          </motion.div>

          {/* Performance */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5">Performance</h2>
            {performance.subjects?.length > 0 ? (
              <div className="space-y-4">
                {performance.subjects.slice(0, 5).map((subj: any, i: number) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700 truncate">{subj.name}</span>
                      <span className="text-sm font-extrabold text-gray-900 ml-2">{subj.score}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          subj.score >= 70 ? "bg-emerald-500" : subj.score >= 40 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${subj.score}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-6xl mb-4">📊</p>
                <p className="text-sm text-gray-400">Complete quizzes to see performance data</p>
              </div>
            )}
            {performance.overallScore != null && (
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-400">Overall</span>
                <span className="text-3xl font-extrabold text-[#284ce3]">{performance.overallScore}%</span>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
