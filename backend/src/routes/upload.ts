import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { getAgent } from "../agents";
import * as db from "../services/db";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/pdf", authMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const pdfParse = require("pdf-parse");
    const pdf = await pdfParse(req.file.buffer);
    const notes = await getAgent("notes").run(`Summarize and create study notes from:\n\n${pdf.text.slice(0, 3000)}`);
    const saved = await db.insert("notes", { user_id: req.user.id, title: req.body.title || req.file.originalname, original_text: pdf.text, summary: notes.data?.summary || JSON.stringify(notes.data), flashcards: notes.data?.practiceQuestions, source_type: "pdf" }).catch(() => null);
    res.json({ note: saved, notes: notes.data });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/image", authMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const Tesseract = require("tesseract.js");
    const { data: { text } } = await Tesseract.recognize(req.file.buffer, "eng");
    const notes = await getAgent("notes").run(`Create study notes from:\n\n${text}`);
    const saved = await db.insert("notes", { user_id: req.user.id, title: req.body.title || "Image Notes", original_text: text, summary: notes.data?.summary || "", flashcards: notes.data?.practiceQuestions, source_type: "image" }).catch(() => null);
    res.json({ note: saved, notes: notes.data });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/notes", authMiddleware, async (req: AuthRequest, res: Response) => {
  const notes = await db.getByUserId("notes", req.user.id);
  res.json({ notes });
});

export default router;
