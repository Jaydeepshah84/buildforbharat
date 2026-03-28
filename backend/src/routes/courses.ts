import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { getAgent } from "../agents";
import * as db from "../services/db";
import { supabase } from "../config/supabase";

const router = Router();

// Helper for normalizing AI response keys
const getTitle = (o: any): string => typeof o === "string" ? o : (o?.title || o?.module_title || o?.lesson_title || o?.name || "");
const getDesc = (o: any): string => typeof o === "string" ? "" : (o?.description || o?.module_description || o?.lesson_description || "");

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const courses = await db.getAll("courses", { class: req.query.class as string, subject: req.query.subject as string });
  res.json({ courses });
});

router.get("/enrollments", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = await supabase.from("enrollments").select("*, courses(*)").eq("user_id", req.user.id);
    res.json({ enrollments: data || [] });
  } catch { res.json({ enrollments: [] }); }
});

// ── Progress routes — MUST be before /:id catch-all ──────
// Get all course progress for current user (for dashboard)
router.get("/progress/all", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("*, courses(id, title, subject, duration_days)")
      .eq("user_id", userId);

    const { data: perfs } = await supabase
      .from("student_performance")
      .select("course_id, subject, quiz_avg, homework_avg")
      .eq("user_id", userId);

    const perfMap: Record<string, any> = {};
    (perfs || []).forEach((p: any) => { perfMap[p.course_id] = p; });

    const coursesProgress = (enrollments || []).map((e: any) => {
      const perf = perfMap[e.course_id] || {};
      const completedTopics = (perf.subject || "").split(",").filter(Boolean);
      return {
        courseId: e.course_id,
        courseTitle: e.courses?.title || "",
        courseSubject: e.courses?.subject || "",
        progress: e.progress || 0,
        completedTopics: completedTopics.length,
        completedAt: e.completed_at,
        quizAvg: perf.quiz_avg || 0,
        homeworkAvg: perf.homework_avg || 0,
      };
    });

    const totalCompleted = coursesProgress.filter((c: any) => c.progress >= 100).length;
    const totalTopicsCompleted = coursesProgress.reduce((s: number, c: any) => s + c.completedTopics, 0);
    const avgProgress = coursesProgress.length > 0
      ? Math.round(coursesProgress.reduce((s: number, c: any) => s + c.progress, 0) / coursesProgress.length)
      : 0;

    res.json({
      courses: coursesProgress,
      totalCourses: coursesProgress.length,
      totalCompleted,
      totalTopicsCompleted,
      avgProgress,
    });
  } catch (err: any) {
    res.json({ courses: [], totalCourses: 0, totalCompleted: 0, totalTopicsCompleted: 0, avgProgress: 0 });
  }
});

// Get progress for a single course
router.get("/:courseId/progress", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .single();

    const { data: perf } = await supabase
      .from("student_performance")
      .select("subject")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .single();

    const completedTopics = (perf?.subject || "").split(",").filter(Boolean);

    const course = await db.getCourseWithModules(courseId);
    const allTopics: string[] = [];
    (course?.modules || []).forEach((m: any) =>
      (m.lessons || []).forEach((l: any) =>
        (l.topics || []).forEach((t: any) => allTopics.push(t.id))
      )
    );

    res.json({
      progress: enrollment?.progress || 0,
      completedTopics,
      completedCount: completedTopics.length,
      totalTopics: allTopics.length,
      courseCompleted: (enrollment?.progress || 0) >= 100,
      completedAt: enrollment?.completed_at,
    });
  } catch {
    res.json({ progress: 0, completedTopics: [], completedCount: 0, totalTopics: 0 });
  }
});

// ── Lesson Test: Generate ─────────────────────────────────
router.post("/:courseId/lessons/:lessonId/test/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, lessonId } = req.params;

    // Fetch lesson with topics
    const { data: lesson } = await supabase
      .from("lessons").select("*, topics(*)").eq("id", lessonId).single();

    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    const topics = lesson.topics || [];
    const topicTitles = topics.map((t: any) => t.title).join(", ");
    const questionCount = topics.length <= 3 ? 3 : 10;

    const agent = getAgent("quiz");
    const result = await agent.run(
      `Generate exactly ${questionCount} multiple choice questions covering these topics: "${topicTitles}" from lesson "${lesson.title}". Each question must have exactly 4 options and a correct answer index (0-3). Also provide a brief explanation. Return JSON: { "questions": [{ "question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..." }] }`
    );

    const questions = result.data?.questions || [];
    res.json({ questions, lessonId, lessonTitle: lesson.title, questionCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Lesson Test: Submit ───────────────────────────────────
router.post("/:courseId/lessons/:lessonId/test/submit", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, lessonId } = req.params;
    const { questions, answers, timeTaken } = req.body;
    const userId = req.user.id;

    // Score
    let score = 0;
    (questions || []).forEach((q: any, i: number) => {
      if (answers?.[i] === q.correct) score++;
    });
    const total = questions?.length || 1;
    const pct = Math.round((score / total) * 100);
    const passed = pct >= 60;

    // Save to quizzes table (use topic_id field to store lesson test marker)
    await db.insert("quizzes", {
      user_id: userId,
      topic_id: lessonId,
      course_id: courseId,
      questions,
      answers,
      score: pct,
      total: 100,
      time_taken: timeTaken || 0,
    }).catch(() => {});

    // Update quiz_avg in student_performance
    const allQuizzes = await db.getByUserId("quizzes", userId);
    const courseQuizzes = (allQuizzes || []).filter((q: any) => q.course_id === courseId);
    const avgScore = courseQuizzes.length > 0
      ? Math.round(courseQuizzes.reduce((s: number, q: any) => s + (q.score || 0), 0) / courseQuizzes.length) : 0;

    await supabase.from("student_performance").upsert({
      user_id: userId,
      course_id: courseId,
      quiz_avg: avgScore,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,course_id" }).then(() => {});

    res.json({
      score, total, percentage: pct, passed,
      message: passed ? "Congratulations! You passed!" : "Keep practicing. You need 60% to pass.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Lesson Lock Status ────────────────────────────────────
router.get("/:courseId/lesson-status", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await db.getCourseWithModules(courseId);
    if (!course) return res.json({ lessons: [] });

    // Get all quiz results for this user + course
    const allQuizzes = await db.getByUserId("quizzes", userId);
    const courseQuizzes = (allQuizzes || []).filter((q: any) => q.course_id === courseId);

    // Build flat ordered list of lessons
    const allLessons: any[] = [];
    (course.modules || []).forEach((m: any) => {
      (m.lessons || []).forEach((l: any) => {
        allLessons.push({
          lessonId: l.id,
          lessonTitle: l.title,
          topicCount: (l.topics || []).length,
          moduleTitle: m.title,
        });
      });
    });

    // Check which lessons have passing test results
    const lessonResults: Record<string, { passed: boolean; bestScore: number }> = {};
    courseQuizzes.forEach((q: any) => {
      const lid = q.topic_id; // We store lessonId in topic_id
      if (!lid) return;
      const prev = lessonResults[lid];
      const qScore = q.score || 0;
      if (!prev || qScore > prev.bestScore) {
        lessonResults[lid] = { passed: qScore >= 60, bestScore: qScore };
      }
    });

    // Build status: strictly chronological
    // Lesson N is unlocked ONLY if lesson N-1 test is passed (first lesson always unlocked)
    const lessons = allLessons.map((lesson, idx) => {
      const result = lessonResults[lesson.lessonId];
      let locked = false;

      if (idx > 0) {
        // Check ALL previous lessons — must all be passed
        for (let i = 0; i < idx; i++) {
          const prevResult = lessonResults[allLessons[i].lessonId];
          if (!prevResult?.passed) { locked = true; break; }
        }
      }

      return {
        ...lesson,
        locked,
        testPassed: result?.passed || false,
        bestScore: result?.bestScore ?? null,
      };
    });

    res.json({ lessons });
  } catch {
    res.json({ lessons: [] });
  }
});

// ── Course by ID — catch-all, MUST be last GET ───────────
router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const course = await db.getCourseWithModules(req.params.id);

  // Auto-enroll user if not already enrolled (prevents missing enrollment issues)
  if (course && req.user.id && !req.user.id.startsWith("guest")) {
    supabase.from("enrollments")
      .upsert({ user_id: req.user.id, course_id: req.params.id, progress: 0 }, { onConflict: "user_id,course_id", ignoreDuplicates: true })
      .then(() => {})
      .catch(() => {});
  }

  res.json({ course });
});

router.post("/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { subject, classLevel, duration = 3, language = "en" } = req.body;
    if (!subject) return res.status(400).json({ error: "Subject is required" });

    // Use LangChain Course Agent
    const agent = getAgent("course");
    const langNames: Record<string, string> = { hi: "Hindi", hindi: "Hindi", gu: "Gujarati", gujarati: "Gujarati", es: "Spanish" };
    const langInstr = langNames[language] ? ` Generate ALL content in ${langNames[language]}.` : "";

    const result = await agent.run(
      `Generate course for "${subject}" class ${classLevel}, ${duration} days. Max 20 topics.${langInstr}`,
      req.user.id
    );

    const cs = result.data || {};
    const courseTitle = cs.title || cs.course_title || `${subject} - Class ${classLevel}`;
    const modules = (cs.modules || []).map((m: any, mi: number) => ({
      title: getTitle(m) || `Module ${mi + 1}`,
      description: getDesc(m),
      order_index: mi,
      lessons: (m.lessons || []).map((l: any, li: number) => ({
        title: getTitle(l) || `Lesson ${li + 1}`,
        order_index: li,
        topics: (l.topics || []).map((t: any, ti: number) => ({
          title: typeof t === "string" ? t : getTitle(t),
          order_index: ti,
        })),
      })),
    }));

    // Ensure user exists
    let userId: string | null = null;
    const existing = await db.getUserById(req.user.id);
    if (existing) userId = existing.id;
    else if (req.user.email && !req.user.id?.startsWith("guest")) {
      const u = await db.createUser({ id: req.user.id, name: req.user.profile?.name || "User", email: req.user.email, role: "student" });
      userId = u?.id || null;
    }

    // Save to DB
    let savedCourse = null;
    try {
      savedCourse = await db.insert("courses", {
        title: courseTitle, description: cs.description || cs.course_overview || "",
        class: classLevel, subject, duration_days: duration,
        difficulty_level: "medium", generated_by: userId, syllabus: cs,
      });

      if (savedCourse) {
        const savedMods = await Promise.all(modules.map((m: any) =>
          db.insert("modules", { course_id: savedCourse.id, title: m.title, description: m.description, order_index: m.order_index }).catch(() => null)
        ));

        for (let mi = 0; mi < modules.length; mi++) {
          if (!savedMods[mi]) continue;
          const savedLessons = await Promise.all(modules[mi].lessons.map((l: any) =>
            db.insert("lessons", { module_id: savedMods[mi]!.id, title: l.title, order_index: l.order_index }).catch(() => null)
          ));
          for (let li = 0; li < modules[mi].lessons.length; li++) {
            if (!savedLessons[li]) continue;
            await Promise.all(modules[mi].lessons[li].topics.map((t: any) =>
              db.insert("topics", { lesson_id: savedLessons[li]!.id, title: t.title, order_index: t.order_index }).catch(() => null)
            ));
          }
        }

        if (userId) await db.insert("enrollments", { user_id: userId, course_id: savedCourse.id }).catch(() => {});
        const full = await db.getCourseWithModules(savedCourse.id);
        if (full) return res.status(201).json({ course: full });
      }
    } catch {}

    // Fallback
    res.status(201).json({
      course: {
        id: "generated-" + Date.now(), title: courseTitle, subject, duration_days: duration,
        modules: modules.map((m: any, mi: number) => ({
          ...m, id: `mod-${mi}`,
          lessons: m.lessons.map((l: any, li: number) => ({
            ...l, id: `les-${mi}-${li}`,
            topics: l.topics.map((t: any, ti: number) => ({ ...t, id: `top-${mi}-${li}-${ti}`, content: [] })),
          })),
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { data: classrooms } = await supabase.from("classrooms").select("id").eq("course_id", id);
    if (classrooms?.length) {
      const ids = classrooms.map((c: any) => c.id);
      await supabase.from("messages").delete().in("classroom_id", ids);
      await supabase.from("classroom_users").delete().in("classroom_id", ids);
      await supabase.from("classrooms").delete().eq("course_id", id);
    }
    await supabase.from("enrollments").delete().eq("course_id", id);
    await supabase.from("quizzes").delete().eq("course_id", id);
    await supabase.from("homework").delete().eq("course_id", id);
    await supabase.from("exams").delete().eq("course_id", id);
    await supabase.from("student_performance").delete().eq("course_id", id);
    await supabase.from("courses").delete().eq("id", id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/enroll", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const enrollment = await db.insert("enrollments", { user_id: req.user.id, course_id: req.params.id });
    res.json({ enrollment });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Topic completion + Progress tracking ─────────────────
router.post("/:courseId/topics/:topicId/complete", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, topicId } = req.params;
    const userId = req.user.id;

    // 1. Calculate total topics in this course
    const course = await db.getCourseWithModules(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const allTopics: string[] = [];
    (course.modules || []).forEach((m: any) =>
      (m.lessons || []).forEach((l: any) =>
        (l.topics || []).forEach((t: any) => allTopics.push(t.id))
      )
    );
    const totalTopics = allTopics.length;

    // 2. Get current enrollment
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .single();

    if (!enrollment) return res.status(404).json({ error: "Not enrolled" });

    // 3. Get currently completed topics from student_performance (stored as CSV in subject field)
    let completedTopics: string[] = [];
    const { data: perfRow } = await supabase
      .from("student_performance")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .single();

    if (perfRow) {
      completedTopics = (perfRow.subject || "").split(",").filter(Boolean);
    }

    if (!completedTopics.includes(topicId)) {
      completedTopics.push(topicId);
    }

    const completedCount = completedTopics.length;
    const progressPct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

    // 4. Update enrollment progress
    await supabase
      .from("enrollments")
      .update({ progress: progressPct, ...(progressPct >= 100 ? { completed_at: new Date().toISOString() } : {}) })
      .eq("user_id", userId)
      .eq("course_id", courseId);

    // 5. Upsert student_performance (store topic IDs in subject field as CSV)
    await supabase
      .from("student_performance")
      .upsert({
        user_id: userId,
        course_id: courseId,
        subject: completedTopics.join(","),
        quiz_avg: perfRow?.quiz_avg || 0,
        homework_avg: perfRow?.homework_avg || 0,
        exam_avg: perfRow?.exam_avg || 0,
        attention_avg: perfRow?.attention_avg || 0,
        emotion_avg: perfRow?.emotion_avg || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,course_id" });

    res.json({
      topicId,
      completedTopics,
      completedCount,
      totalTopics,
      progressPct,
      courseCompleted: progressPct >= 100,
    });
  } catch (err: any) {
    console.error("[Progress] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
