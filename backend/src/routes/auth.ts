import { Router, Response } from "express";
import { supabaseAnon } from "../config/supabase";
import * as db from "../services/db";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { sendWelcomeEmail } from "../services/emailService";

const router = Router();

router.post("/signup", async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, role = "student", class: classLevel, language = "en", parentEmail } = req.body;
    let userId: string | null = null;
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      const { data } = await supabaseAnon.auth.getUser(token);
      if (data?.user) userId = data.user.id;
    }

    if (!userId) {
      const { data, error } = await supabaseAnon.auth.signUp({ email, password: req.body.password });
      if (error) throw error;
      userId = data.user?.id || null;
    }

    let user;
    try {
      user = await db.insert("users", {
        id: userId,
        name: name || email.split("@")[0],
        email,
        role,
        class: classLevel,
        language,
        parent_email: parentEmail || null,
      });
    } catch {
      user = await db.getUserById(userId!);
    }

    if (role === "student" && userId) {
      await db.upsert("student_profile", { user_id: userId, level: "medium", learning_speed: 1.0 }, "user_id").catch(() => {});
    }

    // Send welcome email to parent
    if (parentEmail) {
      sendWelcomeEmail(parentEmail, name || email.split("@")[0], email, classLevel || "N/A").catch(() => {});
    }

    res.status(201).json({ message: "Account created", user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = await db.getUserById(data.user.id) || { id: data.user.id, email, name: email.split("@")[0], role: "student" };
    res.json({ user, session: data.session });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.get("/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await db.getUserById(req.user.id);
  const profile = await db.getByUserId("student_profile", req.user.id);
  const profileData = profile?.[0] || null;

  // Extract parent_email from interests array
  let parentEmail: string | null = null;
  if (profileData?.interests) {
    const entry = profileData.interests.find((i: string) => i.startsWith("parent_email:"));
    if (entry) parentEmail = entry.replace("parent_email:", "");
  }

  res.json({
    user: user ? { ...user, parent_email: parentEmail } : null,
    profile: profileData,
  });
});

router.put("/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { supabase } = await import("../config/supabase");
    const { parent_email, ...rest } = req.body;

    // Update users table (only known columns)
    const allowedFields: Record<string, any> = {};
    if (rest.name) allowedFields.name = rest.name;
    if (rest.language) allowedFields.language = rest.language;
    if (rest.avatar_url) allowedFields.avatar_url = rest.avatar_url;

    let user: any = null;
    if (Object.keys(allowedFields).length > 0) {
      const { data } = await supabase.from("users").update(allowedFields).eq("id", req.user.id).select().single();
      user = data;
    }

    // Store parent_email in student_profile.interests[0] as "parent_email:xxx@yyy.com"
    if (parent_email !== undefined) {
      const { data: profile } = await supabase.from("student_profile").select("interests").eq("user_id", req.user.id).single();
      let interests: string[] = profile?.interests || [];
      // Remove old parent_email entry
      interests = interests.filter((i: string) => !i.startsWith("parent_email:"));
      if (parent_email) interests.unshift(`parent_email:${parent_email}`);
      await supabase.from("student_profile").update({ interests }).eq("user_id", req.user.id);
    }

    if (!user) user = await db.getUserById(req.user.id);

    // Attach parent_email to response
    const { data: profile } = await supabase.from("student_profile").select("interests").eq("user_id", req.user.id).single();
    const parentEntry = (profile?.interests || []).find((i: string) => i.startsWith("parent_email:"));
    const parentEmailVal = parentEntry ? parentEntry.replace("parent_email:", "") : null;

    res.json({ user: { ...user, parent_email: parentEmailVal } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
