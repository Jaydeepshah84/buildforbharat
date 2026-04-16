import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { config } from "./config/env";
import { setupSocket } from "./socket/handler";

// Routes
import authRoutes from "./routes/auth";
import courseRoutes from "./routes/courses";
import aiRoutes from "./routes/ai";
import studentRoutes from "./routes/student";
import uploadRoutes from "./routes/upload";
import classroomRoutes from "./routes/classroom";
import streamRoutes from "./routes/stream";
import courseStreamRoutes from "./routes/courseStream";
import agentRoutes from "./routes/agents";
import ttsRoutes from "./routes/tts";
import animationRoutes from "./routes/animation";
import tutorPipelineRoutes from "./routes/tutor";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST"], credentials: true },
});

// Middleware — allow all origins in development
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/voice", streamRoutes);
app.use("/api/courses/stream", courseStreamRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/tts", ttsRoutes);
app.use("/api/animation", animationRoutes);
app.use("/api/tutor/pipeline", tutorPipelineRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), engine: "TypeScript + LangChain" });
});

// Socket.io
setupSocket(io);
app.set("io", io);

// Start
server.listen(config.port, "0.0.0.0", () => {
  console.log(`\n🚀 Learnify Backend (TypeScript + LangChain)`);
  console.log(`   Server: http://0.0.0.0:${config.port}`);
  console.log(`   Agents: ${["course","notes","quiz","homework","career","doubt","visual","classroom","progress"].join(", ")}`);
  console.log(`   Engine: Azure OpenAI (${config.azure.deployment})\n`);
});

export { app, server, io };
