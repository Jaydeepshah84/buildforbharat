import { Router, Request, Response } from "express";
import { getAgent, agentNames } from "../agents";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// List all agents
router.get("/", (_req: Request, res: Response) => {
  res.json({ agents: agentNames });
});

// Call a specific agent
router.post("/:name", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const { input, sessionId } = req.body;

    if (!input) return res.status(400).json({ error: "Input is required" });
    if (!agentNames.includes(name)) return res.status(404).json({ error: `Agent "${name}" not found` });

    const agent = getAgent(name);
    const result = await agent.run(input, sessionId || req.user?.id || "default");
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
