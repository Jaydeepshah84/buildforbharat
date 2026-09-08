"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { ChevronRight, BookOpen, CheckCircle2, TrendingUp, Trophy, PlayCircle, CalendarDays, ArrowUpRight } from "lucide-react";
import { student, courses } from "@/services/api";
import { useAuth } from "@/components/AuthProvider";
import AnimatedNumber from "@/components/common/AnimatedNumber";

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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="h-40 skeleton rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 skeleton rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-64 skeleton rounded-2xl" />
        <div className="h-64 skeleton rounded-2xl" />
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
    { label: "Enrolled courses", value: enrolledCount, suffix: "", icon: BookOpen, bg: "bg-primary-50", fg: "text-primary-600" },
    { label: "Topics completed", value: topicsCount, suffix: "", icon: CheckCircle2, bg: "bg-emerald-50", fg: "text-emerald-600" },
    { label: "Average progress", value: avgProg, suffix: "%", icon: TrendingUp, bg: "bg-sky-50", fg: "text-sky-600" },
    { label: "Courses finished", value: completedCount, suffix: "", icon: Trophy, bg: "bg-amber-50", fg: "text-amber-600" },
  ];

  const cardShadow = "shadow-[0_1px_3px_rgba(16,24,40,0.06)]";

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

        {/* ── Hero ── */}
        <motion.div variants={itemVariants}
          className="sheen relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-[#1e40af] p-7 sm:p-9 text-white shadow-[0_24px_50px_-22px_rgba(30,64,175,0.65)]">
          {/* Drifting depth blobs */}
          <motion.div aria-hidden className="absolute -top-16 -right-8 w-56 h-56 rounded-full bg-white/10 blur-2xl"
            animate={{ x: [0, 24, 0], y: [0, 16, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div aria-hidden className="absolute -bottom-24 right-40 w-44 h-44 rounded-full bg-sky-300/20 blur-2xl"
            animate={{ x: [0, -20, 0], y: [0, -14, 0], scale: [1, 1.18, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
          <div className="relative">
            <p className="text-sm font-medium text-white/70 mb-2">{dayNames[today.getDay()]}, {monthNames[today.getMonth()]} {today.getDate()}</p>
            <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight leading-tight">{greeting}, {firstName} 👋</h1>
            <p className="mt-2 text-white/80 max-w-lg text-[15px]">Ready to learn something new today? Pick up where you left off, or explore a fresh topic.</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => router.push("/courses")}
                className="px-5 py-2.5 rounded-xl bg-white text-primary-700 text-sm font-bold shadow-sm">
                Browse courses
              </motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => router.push("/quiz")}
                className="px-5 py-2.5 rounded-xl bg-white/15 backdrop-blur text-white text-sm font-semibold border border-white/25">
                Take a quiz
              </motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => router.push("/study-planner")}
                className="px-5 py-2.5 rounded-xl bg-white/15 backdrop-blur text-white text-sm font-semibold border border-white/25">
                Study plan
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div key={i} variants={itemVariants}
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 320, damping: 22 } }}
              className={`group bg-white rounded-2xl border border-gray-100 p-5 ${cardShadow} hover:shadow-[0_20px_44px_-20px_rgba(30,64,175,0.30)] hover:border-primary-200/60 transition-[box-shadow,border-color] duration-300 cursor-default`}>
              <div className={`w-11 h-11 rounded-2xl ${card.bg} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                <card.icon className={`w-5 h-5 ${card.fg}`} strokeWidth={2.2} />
              </div>
              <p className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-none">
                <AnimatedNumber value={card.value} suffix={card.suffix} />
              </p>
              <p className="text-[13px] text-gray-400 mt-1.5">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Continue Learning */}
            <motion.div variants={itemVariants} className={`bg-white rounded-2xl border border-gray-100 p-6 ${cardShadow}`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900">Continue learning</h2>
                <button onClick={() => router.push("/courses")}
                  className="text-xs text-primary-600 font-semibold flex items-center gap-0.5 hover:text-primary-700">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {courseProgressList.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3"><BookOpen className="w-6 h-6 text-primary-500" /></div>
                  <p className="text-sm text-gray-400 mb-3">No courses yet</p>
                  <button onClick={() => router.push("/courses")} className="text-sm font-semibold text-primary-600 hover:text-primary-700">Start a course &rarr;</button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {courseProgressList.slice(0, 4).map((c: any, i: number) => {
                    const prog = c.progress || 0;
                    return (
                      <button key={i} onClick={() => router.push(`/courses/${c.courseId || c.course_id || ""}`)}
                        className="text-left p-4 rounded-2xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/40 transition-all group">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0"><PlayCircle className="w-5 h-5 text-white" /></div>
                          <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
                        </div>
                        <p className="text-sm font-bold text-gray-800 truncate">{c.courseTitle || c.courseSubject || "Course"}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div className="h-full rounded-full bg-primary-500" initial={{ width: 0 }} animate={{ width: `${prog}%` }} transition={{ duration: 0.8 }} />
                          </div>
                          <span className="text-xs font-bold text-gray-500">{prog}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Recent Quizzes */}
            <motion.div variants={itemVariants} className={`bg-white rounded-2xl border border-gray-100 p-6 ${cardShadow}`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900">Recent quizzes</h2>
                <button onClick={() => router.push("/quiz")}
                  className="text-xs text-primary-600 font-semibold flex items-center gap-0.5 hover:text-primary-700">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {recentQuizzes.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3"><CheckCircle2 className="w-6 h-6 text-primary-500" /></div>
                  <p className="text-sm text-gray-400 mb-3">No quizzes taken yet</p>
                  <button onClick={() => router.push("/quiz")}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700">Take your first quiz &rarr;</button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentQuizzes.map((quiz: any, i: number) => {
                    const pct = Math.round(((quiz.score ?? 0) / (quiz.total || 100)) * 100);
                    return (
                      <div key={quiz._id || i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
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
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Today's Plan */}
            <motion.div variants={itemVariants} className={`bg-white rounded-2xl border border-gray-100 p-6 ${cardShadow}`}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center"><CalendarDays className="w-4 h-4 text-primary-600" /></div>
                  <h2 className="text-base font-bold text-gray-900">Today's plan</h2>
                </div>
                <button onClick={() => router.push("/study-planner")}
                  className="text-xs text-primary-600 font-semibold hover:text-primary-700">Edit</button>
              </div>
              {studyPlan ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-primary-50/50 border border-primary-100/60">
                    <p className="text-[11px] font-bold text-primary-600 uppercase tracking-wider mb-0.5">Goal</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{studyPlan.goal || "--"}</p>
                  </div>
                  {studyPlan.todayTasks?.length > 0 ? (
                    <div className="space-y-1.5">
                      {studyPlan.todayTasks.slice(0, 4).map((task: any, i: number) => {
                        const label = typeof task === "string" ? task : (task?.title || task?.task || task?.name || "");
                        return (
                          <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-gray-50 transition-colors">
                            <span className="w-6 h-6 rounded-lg bg-primary-500 text-[11px] font-bold text-white flex items-center justify-center flex-shrink-0">{i + 1}</span>
                            <span className="text-sm text-gray-700 truncate">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">No tasks for today.</p>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3"><CalendarDays className="w-6 h-6 text-primary-500" /></div>
                  <p className="text-sm text-gray-400 mb-3">No study plan yet</p>
                  <button onClick={() => router.push("/study-planner")}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700">Create one &rarr;</button>
                </div>
              )}
            </motion.div>

            {/* Performance */}
            <motion.div variants={itemVariants} className={`bg-white rounded-2xl border border-gray-100 p-6 ${cardShadow}`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900">Performance</h2>
                {performance.overallScore != null && (
                  <span className="text-2xl font-extrabold text-primary-600">{performance.overallScore}%</span>
                )}
              </div>
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
                <div className="py-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3"><TrendingUp className="w-6 h-6 text-primary-500" /></div>
                  <p className="text-sm text-gray-400">Complete quizzes to see your performance.</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
