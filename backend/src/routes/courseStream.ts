import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { openai } from "../config/llm";
import { config } from "../config/env";
import * as db from "../services/db";
import { supabase } from "../config/supabase";
import { sendCourseCreatedEmail } from "../services/emailService";

const router = Router();

router.post("/generate-stream", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { subject, classLevel = "10", duration = 3, language = "en" } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    send("status", { phase: "structure", message: "Generating course structure..." });

    const maxTopics = Math.min(Math.max(Math.round(duration * 6.5), 10), duration <= 3 ? 20 : duration * 5);
    const langNames: Record<string, string> = { hi: "Hindi", hindi: "Hindi", gu: "Gujarati", gujarati: "Gujarati", es: "Spanish" };
    const langInstr = langNames[language] ? `\nGenerate ALL content in ${langNames[language]}.` : "";

    const structResp = await openai.chat.completions.create({
      model: config.azure.deployment,
      messages: [
        { role: "system", content: `Generate course structure. Return valid JSON.${langInstr}` },
        { role: "user", content: `Course: "${subject}" class ${classLevel}, ${duration} days. Max ${maxTopics} topics.${langInstr}\nJSON: { title, description, modules: [{ title, lessons: [{ title, topics: [""] }] }] }` },
      ],
      temperature: 0.7, max_completion_tokens: 1500, response_format: { type: "json_object" },
    });

    let structure: any;
    try { structure = JSON.parse(structResp.choices[0].message.content || "{}"); } catch { structure = { title: subject, modules: [] }; }

    const getT = (o: any) => typeof o === "string" ? o : (o?.title || o?.module_title || o?.lesson_title || "");
    const modules = (structure.modules || []).map((m: any, mi: number) => ({
      title: getT(m) || `Module ${mi + 1}`,
      lessons: (m.lessons || []).map((l: any, li: number) => ({
        title: getT(l) || `Lesson ${li + 1}`,
        topics: (l.topics || []).map((t: any) => typeof t === "string" ? t : getT(t)),
      })),
    }));

    const allTopics: any[] = [];
    modules.forEach((m: any, mi: number) => m.lessons.forEach((l: any, li: number) =>
      l.topics.forEach((t: string, ti: number) => allTopics.push({ title: t, mi, li, ti }))
    ));

    send("structure", { title: structure.title || subject, description: structure.description || "", modules, totalTopics: allTopics.length });

    // Save to DB
    let userId: string | null = null;
    const u = await db.getUserById(req.user.id);
    if (u) userId = u.id;
    else if (req.user.email && !req.user.id?.startsWith("guest")) {
      const nu = await db.createUser({ id: req.user.id, name: req.user.profile?.name || "User", email: req.user.email, role: "student" });
      userId = nu?.id || null;
    }

    let courseId: string | null = null;
    try {
      const saved = await db.insert("courses", { title: structure.title || subject, description: structure.description || "", class: classLevel, subject, duration_days: duration, difficulty_level: "medium", generated_by: userId, syllabus: structure });
      courseId = saved.id;

      const savedMods = await Promise.all(modules.map((m: any, i: number) => db.insert("modules", { course_id: courseId, title: m.title, order_index: i }).catch(() => null)));
      for (let mi = 0; mi < modules.length; mi++) {
        if (!savedMods[mi]) continue;
        const savedLes = await Promise.all(modules[mi].lessons.map((l: any, i: number) => db.insert("lessons", { module_id: savedMods[mi]!.id, title: l.title, order_index: i }).catch(() => null)));
        for (let li = 0; li < modules[mi].lessons.length; li++) {
          if (!savedLes[li]) continue;
          await Promise.all(modules[mi].lessons[li].topics.map((t: string, i: number) => db.insert("topics", { lesson_id: savedLes[li]!.id, title: t, order_index: i }).catch(() => null)));
        }
      }
      if (userId) await db.insert("enrollments", { user_id: userId, course_id: courseId }).catch(() => {});

      // Notify parent about new course
      if (userId) {
        (async () => {
          try {
            const { data: user } = await supabase.from("users").select("name").eq("id", userId).single();
            const { data: profile } = await supabase.from("student_profile").select("interests").eq("user_id", userId).single();
            let parentEmail: string | null = null;
            if (profile?.interests) {
              const entry = profile.interests.find((i: string) => i.startsWith("parent_email:"));
              if (entry) parentEmail = entry.replace("parent_email:", "");
            }
            console.log(`[Email] Course created — parent_email=${parentEmail || "NOT SET"}`);
            if (parentEmail) {
              await sendCourseCreatedEmail(parentEmail, user?.name || "Student", structure.title || subject, subject, duration);
            }
          } catch (e) { console.log("[Email] Error:", e); }
        })();
      }
    } catch {}

    send("saved", { courseId: courseId || "generated-" + Date.now() });

    // Generate content for each topic
    const contentLang = langNames[language] ? ` Respond in ${langNames[language]}.` : "";
    for (let i = 0; i < allTopics.length; i++) {
      const t = allTopics[i];
      send("status", { phase: "content", message: `Generating topic ${i + 1}/${allTopics.length}: ${t.title}` });
      try {
        const resp = await openai.chat.completions.create({
          model: config.azure.deployment,
          messages: [
            { role: "system", content: `You are a friendly teacher. Explain clearly.${contentLang}` },
            { role: "user", content: `Explain "${t.title}" for class ${classLevel} in 2-3 paragraphs.${contentLang}` },
          ],
          temperature: 0.7, max_completion_tokens: i < 2 ? 800 : 600,
        });
        send("topic:ready", { index: i, title: t.title, content: resp.choices[0].message.content, moduleIdx: t.mi, lessonIdx: t.li });
      } catch {
        send("topic:ready", { index: i, title: t.title, content: `Topic: ${t.title}`, error: true });
      }
    }

    send("complete", { totalTopics: allTopics.length, courseId });
  } catch (err: any) {
    send("error", { message: err.message });
  }
  res.end();
});

export default router;
