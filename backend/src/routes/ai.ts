import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { getAgent } from "../agents";
import { openai } from "../config/llm";
import { config } from "../config/env";
import * as db from "../services/db";
import { sendQuizResultEmail, sendExamResultEmail } from "../services/emailService";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper: get parent email + student name for a user
async function getParentInfo(userId: string): Promise<{ parentEmail: string | null; studentName: string }> {
  try {
    // 1. Try users table
    const user = await db.getUserById(userId);
    const studentName = user?.name || user?.full_name || user?.email?.split('@')[0] || 'Student';
    console.log(`[ParentInfo] User: ${studentName} (${userId}), parent_email in users: ${user?.parent_email || 'none'}`);

    if (user?.parent_email) return { parentEmail: user.parent_email, studentName };

    // 2. Fallback: student_profile.interests array (parent_email:xxx format)
    const profiles = await db.getByUserId("student_profile", userId);
    const profile = profiles?.[0];
    if (profile?.interests?.length) {
      const entry = (profile.interests as string[]).find((i: string) => typeof i === 'string' && i.startsWith('parent_email:'));
      if (entry) {
        const email = entry.replace('parent_email:', '').trim();
        console.log(`[ParentInfo] Found parent email in profile.interests: ${email}`);
        return { parentEmail: email, studentName };
      }
    }

    // 3. Fallback: check if parent_email is stored as a separate column in student_profile
    if (profile?.parent_email) {
      console.log(`[ParentInfo] Found parent email in profile.parent_email: ${profile.parent_email}`);
      return { parentEmail: profile.parent_email, studentName };
    }

    console.log(`[ParentInfo] No parent email found for user ${userId}`);
    return { parentEmail: null, studentName };
  } catch (err: any) {
    console.warn(`[ParentInfo] Error looking up parent: ${err.message}`);
    return { parentEmail: null, studentName: 'Student' };
  }
}

// AI Tutor chat (uses Doubt agent)
router.post("/tutor/chat", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { topic, message, conversationHistory = [], language = "en" } = req.body;
    const profile = await db.getByUserId("student_profile", req.user.id);
    const level = profile?.[0]?.level || "medium";

    const resp = await openai.chat.completions.create({
      model: config.azure.deployment,
      messages: [
        { role: "system", content: `You are a friendly AI teacher. Student is ${level} level studying "${topic}". Adapt accordingly.${language !== "en" ? ` Respond in ${language}.` : ""}` },
        ...conversationHistory.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_completion_tokens: 2000,
    });

    res.json({ response: resp.choices[0].message.content });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.post("/tutor", authMiddleware, (req, res) => (router as any).handle({ ...req, url: "/tutor/chat", method: "POST" }, res, () => {}));

// Quiz — MCQ with deterministic scoring
router.post("/quiz/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { topic, count = 5, difficulty = "medium", language = "en" } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic required" });

    const result = await getAgent("quiz").run(
      `Generate EXACTLY ${count} ${difficulty} multiple choice questions about "${topic}".${language !== "en" ? ` In ${language}.` : ""}
Each question MUST have: "question", "options" (array of exactly 4 strings), "correct" (index 0-3), "explanation".
Return JSON: { "questions": [{ "question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..." }] }`
    );

    let questions = (result.data?.questions || []).map((q: any, i: number) => ({
      question: q.question || q.text || `Question ${i + 1}`,
      options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ["Option A", "Option B", "Option C", "Option D"],
      correct: typeof q.correct === "number" && q.correct >= 0 && q.correct <= 3 ? q.correct : 0,
      explanation: q.explanation || "",
    }));

    if (questions.length === 0) return res.status(500).json({ error: "Failed to generate questions" });

    res.json({ quiz: { questions, topic, count: questions.length, difficulty } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/quiz/submit", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { topic, questions, answers, timeTaken } = req.body;

    // Score deterministically — handle both formats
    let score = 0;
    const total = (questions || []).length;
    (questions || []).forEach((q: any, i: number) => {
      const userAns = answers?.[i];
      const ansIdx = typeof userAns === "object" ? (userAns?.selectedOption ?? -1) : userAns;
      if (ansIdx === q.correct) score++;
    });
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;

    const saved = await db.insert("quizzes", {
      user_id: req.user.id, topic_id: topic, questions, answers,
      score: pct, total: 100, time_taken: timeTaken || 0,
    }).catch(() => null);

    // Send result to parent email (non-blocking)
    console.log(`[Quiz] Submitting for user ${req.user.id}, score ${pct}%`);
    getParentInfo(req.user.id).then(({ parentEmail, studentName }) => {
      console.log(`[Quiz] Parent lookup: email=${parentEmail}, student=${studentName}`);
      if (parentEmail) {
        sendQuizResultEmail(parentEmail, studentName, topic || 'Quiz', score, total, pct, timeTaken || 0)
          .then(ok => console.log(`[Quiz] Email sent: ${ok}`))
          .catch(err => console.warn('[Quiz] Email failed:', err.message));
      } else {
        console.log('[Quiz] No parent email — skipping notification');
      }
    }).catch(err => console.warn('[Quiz] Parent lookup failed:', err.message));

    res.json({ result: saved, score, total, percentage: pct });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Homework
router.post("/homework/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { topic, count = 5, difficulty = "medium" } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic required" });

    const result = await getAgent("homework").run(
      `Generate EXACTLY ${count} ${difficulty} homework questions about "${topic}".
Each question must have: "question" (the question text), "type" ("short" or "long"), "marks" (number), "hint" (optional hint).
Return JSON: { "questions": [{ "question": "...", "type": "short", "marks": 5, "hint": "..." }] }`
    );

    let questions = result.data?.questions || [];
    if (!Array.isArray(questions) || questions.length === 0) {
      // Try to extract from different formats
      if (Array.isArray(result.data)) questions = result.data;
      else if (result.data?.homework) questions = result.data.homework;
    }

    questions = questions.map((q: any, i: number) => ({
      question: q.question || q.text || q.title || `Question ${i + 1}`,
      type: q.type || "short",
      marks: q.marks || 5,
      hint: q.hint || "",
    }));

    if (questions.length === 0) return res.status(500).json({ error: "Failed to generate questions" });

    res.json({ homework: { questions, topic, count: questions.length, difficulty } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/homework/submit", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { topicId, courseId, questions, submission } = req.body;

    // AI evaluates the answers
    const answersStr = (questions || []).map((q: any, i: number) =>
      `Q${i + 1}: ${q.question}\nAnswer: ${typeof submission === 'object' ? (submission[i] || submission[q.question] || 'No answer') : submission}`
    ).join("\n\n");

    const evalResult = await getAgent("doubt").run(
      `Evaluate these homework answers. Give a score (0-100) and brief feedback for each.\n\n${answersStr}\n\nReturn JSON: { "score": 75, "feedback": "overall feedback", "details": [{ "questionIndex": 0, "score": 80, "feedback": "good" }] }`
    );

    const score = evalResult.data?.score || 50;
    const hw = await db.insert("homework", {
      user_id: req.user.id, topic_id: topicId, course_id: courseId,
      questions, submission,
      ai_feedback: evalResult.data?.feedback || "",
      score, total: 100, submitted_at: new Date().toISOString(),
    }).catch(() => null);

    res.json({ homework: hw, evaluation: evalResult.data, feedback: evalResult.data });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Evaluate
router.post("/evaluate", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { question, studentAnswer, correctAnswer } = req.body;
  const result = await getAgent("doubt").run(`Question: ${question}\nStudent: ${studentAnswer}\nCorrect: ${correctAnswer}\nEvaluate. Return JSON: { "score": 0-100, "feedback": "", "improvements": [] }`);
  res.json({ evaluation: result.data });
});

// Exam — MCQ Only with deterministic scoring
router.post("/exam/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { topics, questionCount: reqCount, totalMarks } = req.body;
    if (!topics?.length) return res.status(400).json({ error: "Topics required" });

    // Use questionCount directly if provided, otherwise derive from totalMarks
    const questionCount = reqCount || Math.max(5, Math.min(Math.round((totalMarks || 30) / 2), 75));
    const topicList = topics.join(", ");

    const result = await getAgent("quiz").run(
      `Generate EXACTLY ${questionCount} multiple choice questions (MCQ) covering: "${topicList}".
Each question MUST have: "question", "options" (array of exactly 4 strings), "correct" (index 0-3), "explanation".
Return JSON: { "questions": [{ "question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..." }] }
IMPORTANT: Generate exactly ${questionCount} questions. ALL must be MCQ with 4 options.`
    );

    let questions = (result.data?.questions || []).map((q: any, i: number) => ({
      question: q.question || q.text || `Question ${i + 1}`,
      options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ["Option A", "Option B", "Option C", "Option D"],
      correct: typeof q.correct === "number" && q.correct >= 0 && q.correct <= 3 ? q.correct : 0,
      explanation: q.explanation || "",
      marks: 2,
      type: "mcq",
    }));

    if (questions.length === 0) return res.status(500).json({ error: "Failed to generate questions" });

    res.json({ exam: { questions, totalMarks: questions.length * 2, questionCount: questions.length, topics } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/exam/submit", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { questions, submission, timeTaken } = req.body;

    // Deterministic MCQ scoring
    let totalScore = 0;
    const details: any[] = [];

    (questions || []).forEach((q: any, i: number) => {
      const sub = submission?.[i];
      const answerIdx = typeof sub === "object" ? (sub?.answer ?? sub?.answerIndex ?? -1) : sub;
      const isCorrect = answerIdx === q.correct;
      const qMarks = q.marks || 2;
      totalScore += isCorrect ? qMarks : 0;

      details.push({
        question: q.question, userAnswer: answerIdx, correctAnswer: q.correct,
        correct: isCorrect, explanation: q.explanation || "",
        score: isCorrect ? qMarks : 0, maxScore: qMarks,
      });
    });

    const maxMarks = (questions || []).reduce((s: number, q: any) => s + (q.marks || 2), 0);
    const pct = maxMarks > 0 ? Math.round((totalScore / maxMarks) * 100) : 0;

    await db.insert("exams", { user_id: req.user.id, questions, answers: submission, score: pct, total: 100, time_taken: timeTaken || 0 }).catch(() => {});

    // Send result to parent email (non-blocking)
    const examTopics = req.body.topics || (questions || []).slice(0, 3).map((q: any) => q.topic).filter(Boolean);
    console.log(`[Exam] Submitting for user ${req.user.id}, score ${pct}%`);
    getParentInfo(req.user.id).then(({ parentEmail, studentName }) => {
      console.log(`[Exam] Parent lookup: email=${parentEmail}, student=${studentName}`);
      if (parentEmail) {
        sendExamResultEmail(
          parentEmail, studentName,
          examTopics.length > 0 ? examTopics : ['General Exam'],
          totalScore, maxMarks, pct, timeTaken || 0, (questions || []).length
        ).then(ok => console.log(`[Exam] Email sent: ${ok}`))
          .catch(err => console.warn('[Exam] Email failed:', err.message));
      } else {
        console.log('[Exam] No parent email — skipping notification');
      }
    }).catch(err => console.warn('[Exam] Parent lookup failed:', err.message));

    res.json({
      exam: { score: pct },
      evaluation: {
        score: totalScore, total: maxMarks, percentage: pct, timeTaken, details,
        feedback: pct >= 70 ? "Excellent work! Strong understanding of the material."
          : pct >= 50 ? "Good effort! Review the questions you got wrong."
          : "Keep practicing. Focus on the topics you found challenging.",
      },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Study Plan (uses Progress Agent)
router.post("/study-plan/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { availableHours = 4 } = req.body;

    // Get user's enrolled courses for context
    const enrollments = await db.getByUserId("enrollments", req.user.id);
    const courseNames = (enrollments || []).map((e: any) => e.course_id).slice(0, 5);
    let courseContext = "";
    for (const cid of courseNames) {
      const c = await db.getById("courses", cid);
      if (c) courseContext += `${c.title} (${c.subject}), `;
    }

    const result = await getAgent("progress").run(
      `Create a 7-day study plan for a student. Available hours: ${availableHours}/day.
${courseContext ? `Enrolled courses: ${courseContext}` : "General study plan."}

Return JSON: { "title": "7-Day Study Plan", "days": [{ "day": "Day 1", "date": "Monday", "focus": "topic name", "tasks": [{ "title": "task name", "duration": "30 min", "type": "study|quiz|revision|exercise", "topic": "topic name" }] }] }

Generate EXACTLY 7 days with 3-5 tasks each. Each task must have title, duration, type, and topic.`
    );

    const planData = result.data || {};
    const saved = await db.insert("study_plans", {
      user_id: req.user.id,
      plan_json: planData,
      plan_text: JSON.stringify(planData),
    }).catch(() => null);

    res.json({ plan: { ...(saved || {}), ...planData, availableHours } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/study-plan", authMiddleware, (req, res, next) => { req.url = "/study-plan/generate"; next(); });

// Career (uses Career Agent)
router.post("/career-guidance", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { interests = [], skills = [] } = req.body;
    if (!interests.length && !skills.length) return res.status(400).json({ error: "Add at least one interest or skill" });

    const result = await getAgent("career").run(
      `Student interests: ${interests.join(", ")}. Skills: ${skills.join(", ")}.

Suggest 5 career paths. Return JSON: { "careers": [{ "title": "Career Name", "field": "technology|medicine|engineering|business|arts|science|law|education", "description": "2-3 sentences about this career", "skills_needed": ["skill1", "skill2", "skill3"], "education": "Required education path", "salary_range": "$50k-$100k", "growth": "High/Medium/Low", "match_score": 85 }] }

Return EXACTLY 5 careers with all fields filled.`
    );

    let careers = result.data?.careers || result.data?.recommendations || [];
    if (!Array.isArray(careers)) careers = [];

    careers = careers.map((c: any) => ({
      title: c.title || c.name || c.career || "Career",
      field: c.field || c.category || c.industry || "general",
      description: c.description || c.overview || "",
      skills_needed: c.skills_needed || c.skills || c.requiredSkills || [],
      education: c.education || c.qualification || "",
      salary_range: c.salary_range || c.salary || "",
      growth: c.growth || c.demand || "Medium",
      match_score: c.match_score || c.matchScore || c.score || 75,
    }));

    res.json({ careers });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.post("/career", authMiddleware, (req, res, next) => { req.url = "/career-guidance"; next(); });

// Translate
router.post("/translate", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { content, targetLanguage } = req.body;
  const resp = await openai.chat.completions.create({
    model: config.azure.deployment,
    messages: [{ role: "user", content: `Translate to ${targetLanguage}:\n\n${content}` }],
    max_completion_tokens: 2000,
  });
  res.json({ translated: resp.choices[0].message.content });
});

// TTS
router.post("/tts", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const resp = await openai.audio.speech.create({ model: "tts-1", voice: req.body.voice || "alloy", input: req.body.text });
    const buf = Buffer.from(await resp.arrayBuffer());
    res.set({ "Content-Type": "audio/mpeg", "Content-Length": buf.length.toString() }).send(buf);
  } catch { res.status(500).json({ error: "TTS unavailable" }); }
});

// Doubt solver
router.post("/doubt", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { topic, question, context } = req.body;
  const result = await getAgent("doubt").run(`Topic: ${topic}\nQuestion: ${question}${context ? `\nContext: ${context}` : ""}`);
  res.json({ answer: result.data?.answer || result.data?.text || JSON.stringify(result.data) });
});

// Emotion
router.post("/emotion", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { emotionData, sessionId } = req.body;
  await db.insert("emotion_logs", { user_id: req.user.id, session_id: sessionId, emotion: emotionData?.emotion || "neutral", attention_level: emotionData?.attention || 0.5 }).catch(() => {});
  res.json({ emotion: emotionData?.emotion, attention: emotionData?.attention });
});

export default router;
