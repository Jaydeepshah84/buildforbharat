import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabase } from "../config/supabase";
import * as db from "../services/db";

const router = Router();

router.get("/dashboard", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.user.id;
    const [enrollments, performance, quizzes, homework, studyPlans, profile] = await Promise.all([
      db.getByUserId("enrollments", id), db.getByUserId("student_performance", id),
      db.getByUserId("quizzes", id), db.getByUserId("homework", id),
      db.getByUserId("study_plans", id), db.getByUserId("student_profile", id),
    ]);

    const safeQuizzes = quizzes || [];
    const safeHW = homework || [];
    const avgQuiz = safeQuizzes.length > 0 ? safeQuizzes.reduce((s: number, q: any) => s + (q.score || 0), 0) / safeQuizzes.length : 0;

    // Calculate real progress from enrollments
    const safeEnrollments = enrollments || [];
    const totalTopicsCompleted = (performance || []).reduce((sum: number, p: any) => {
      const topics = (p.subject || "").split(",").filter(Boolean);
      return sum + topics.length;
    }, 0);
    const avgProgress = safeEnrollments.length > 0
      ? Math.round(safeEnrollments.reduce((s: number, e: any) => s + (e.progress || 0), 0) / safeEnrollments.length)
      : 0;
    const coursesCompleted = safeEnrollments.filter((e: any) => (e.progress || 0) >= 100).length;

    res.json({
      profile: profile?.[0] || null, enrollments,
      stats: {
        totalCourses: safeEnrollments.length,
        totalTopicsCompleted,
        avgProgress,
        coursesCompleted,
        totalQuizzes: safeQuizzes.length,
        avgQuizScore: Math.round(avgQuiz),
        totalHomework: safeHW.length,
        completedHomework: safeHW.filter((h: any) => h.submitted_at).length,
        homeworkDone: safeHW.filter((h: any) => h.submitted_at).length,
        level: profile?.[0]?.level || "medium",
        currentLevel: profile?.[0]?.level || "medium",
      },
      // Enrich quizzes with lesson/course names
      recentQuizzes: await Promise.all(safeQuizzes.slice(0, 5).map(async (q: any) => {
        let name = "Quiz";
        try {
          // topic_id stores lesson ID for lesson tests, or topic name for standalone quizzes
          if (q.topic_id) {
            // Try as lesson ID first
            const lesson = await db.getById("lessons", q.topic_id);
            if (lesson?.title) name = lesson.title;
            else {
              // Try as topic name (standalone quiz stores topic string)
              const topic = await db.getById("topics", q.topic_id);
              if (topic?.title) name = topic.title;
              else name = q.topic_id.length > 36 ? "Quiz" : q.topic_id; // If it's a plain string topic
            }
          }
          if (name === "Quiz" && q.course_id) {
            const course = await db.getById("courses", q.course_id);
            if (course?.title) name = course.title;
          }
        } catch {}
        return { ...q, title: name };
      })),
      recentHomework: safeHW.slice(0, 5),
      currentPlan: (studyPlans || [])[0] || null, studyPlans: studyPlans || [], performance: performance || [],
    });
  } catch {
    res.json({ profile: null, enrollments: [], stats: { totalCourses: 0, totalTopicsCompleted: 0, avgProgress: 0, coursesCompleted: 0, totalQuizzes: 0, avgQuizScore: 0, totalHomework: 0, completedHomework: 0, homeworkDone: 0, level: "medium", currentLevel: "medium" }, recentQuizzes: [], recentHomework: [], currentPlan: null, performance: [] });
  }
});

router.get("/performance", authMiddleware, async (req: AuthRequest, res: Response) => {
  const performance = await db.getByUserId("student_performance", req.user.id);
  const profile = await db.getByUserId("student_profile", req.user.id);
  const emotions = await db.getByUserId("emotion_logs", req.user.id);
  const emotionSummary: Record<string, number> = {};
  (emotions || []).forEach((e: any) => { emotionSummary[e.emotion] = (emotionSummary[e.emotion] || 0) + 1; });
  const avgAtt = emotions?.length ? emotions.reduce((s: number, e: any) => s + (e.attention_level || 0), 0) / emotions.length : 0.5;
  res.json({ performance, profile: profile?.[0], emotionSummary, avgAttention: Math.round(avgAtt * 100) });
});

router.get("/report", authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = req.user.id;
  const [perf, profile, quizzes, hw, exams, emotions] = await Promise.all([
    db.getByUserId("student_performance", id), db.getByUserId("student_profile", id),
    db.getByUserId("quizzes", id), db.getByUserId("homework", id),
    db.getByUserId("exams", id), db.getByUserId("emotion_logs", id),
  ]);
  res.json({ student: profile?.[0], performance: perf, quizHistory: quizzes, homeworkHistory: hw, examHistory: exams, emotionLogs: (emotions || []).slice(0, 50) });
});

export default router;
