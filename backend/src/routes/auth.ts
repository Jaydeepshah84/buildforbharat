import { Router, Response } from "express";
import { supabaseAnon } from "../config/supabase";
import * as db from "../services/db";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/signup", async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, role = "student", class: classLevel, language = "en" } = req.body;
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
      user = await db.insert("users", { id: userId, name: name || email.split("@")[0], email, role, class: classLevel, language });
    } catch {
      user = await db.getUserById(userId!);
    }

    if (role === "student" && userId) {
      await db.upsert("student_profile", { user_id: userId, level: "medium", learning_speed: 1.0 }, "user_id").catch(() => {});
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
  res.json({ user, profile: profile?.[0] || null });
});

router.put("/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = await (await import("../config/supabase")).supabase
      .from("users").update(req.body).eq("id", req.user.id).select().single();
    res.json({ user: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
