import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabase } from "../config/supabase";
import * as db from "../services/db";

const router = Router();

router.get("/", authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const { data } = await supabase.from("classrooms").select("*, courses(*)").eq("is_active", true).order("created_at", { ascending: false });
    res.json({ classrooms: data || [] });
  } catch { res.json({ classrooms: [] }); }
});

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, courseId, password } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });

    let userId: string | null = null;
    const u = await db.getUserById(req.user.id);
    if (u) userId = u.id;
    else if (req.user.email && !req.user.id?.startsWith("guest")) {
      const nu = await db.createUser({ id: req.user.id, name: req.user.profile?.name || "User", email: req.user.email, role: "student" });
      userId = nu?.id || null;
    }

    const classroom = await db.insert("classrooms", { name: name.trim(), course_id: courseId || null, created_by: userId });
    if (password && classroom) {
      await db.insert("messages", { classroom_id: classroom.id, user_id: userId, message: `__password__:${password}`, message_type: "system" }).catch(() => {});
    }
    if (userId && classroom) await db.insert("classroom_users", { classroom_id: classroom.id, user_id: userId }).catch(() => {});
    res.status(201).json({ classroom });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/join", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body || {};
    const classroomId = req.params.id;

    // Check password
    const { data: sys } = await supabase.from("messages").select("message").eq("classroom_id", classroomId).eq("message_type", "system").like("message", "__password__%").limit(1);
    if (sys?.length) {
      const stored = sys[0].message.replace("__password__:", "");
      if (stored && stored !== password) return res.status(403).json({ error: "Incorrect password" });
    }

    if (req.user.id?.startsWith("guest")) return res.json({ result: { classroom_id: classroomId }, guest: true });

    try {
      const result = await db.insert("classroom_users", { classroom_id: classroomId, user_id: req.user.id });
      res.json({ result });
    } catch (err: any) {
      if (err.message?.includes("duplicate") || err.message?.includes("unique")) {
        res.json({ result: { classroom_id: classroomId }, alreadyJoined: true });
      } else throw err;
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/:id/messages", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = await supabase.from("messages").select("*, users(name)").eq("classroom_id", req.params.id).order("created_at", { ascending: true }).limit(50);
    res.json({ messages: (data || []).filter((m: any) => !m.message?.startsWith("__password__")) });
  } catch { res.json({ messages: [] }); }
});

/* ── Study Room lookup (in-memory rooms from socket handler) ── */
router.get("/study-room/:code", (req: any, res: Response) => {
  try {
    const io = req.app.get("io");
    const rooms: Map<string, any> | undefined = io?.__studyRooms;
    if (!rooms) return res.json({ error: "Rooms not available" });

    const room = rooms.get(req.params.code?.toUpperCase());
    if (!room) return res.status(404).json({ error: "Room not found" });

    res.json({
      code: room.code,
      memberCount: room.members.length,
      isFull: room.members.length >= 2,
      members: room.members.map((m: any) => ({ userName: m.userName })),
    });
  } catch { res.status(500).json({ error: "Server error" }); }
});

export default router;
