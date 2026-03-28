import { Server, Socket } from "socket.io";
import { getAgent } from "../agents";

/* ── Types ─────────────────────────────────────────────── */
interface RoomMember {
  socketId: string;
  userId: string;
  userName: string;
}

interface StudyRoom {
  code: string;
  members: RoomMember[];
  currentLesson: { topic: string; type: string } | null;
  isPlaying: boolean;
  notes: string;
  chatHistory: { userName: string; message: string; timestamp: number; isAI?: boolean }[];
  whiteboardHistory: any[];
}

/* ── In-memory room store ──────────────────────────────── */
const rooms = new Map<string, StudyRoom>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function findRoomBySocket(socketId: string): [string, StudyRoom] | null {
  for (const [code, room] of rooms.entries()) {
    if (room.members.some(m => m.socketId === socketId)) return [code, room];
  }
  return null;
}

/* ══════════════════════════════════════════════════════════
   Main socket setup
   ══════════════════════════════════════════════════════════ */
export function setupSocket(io: Server) {
  const studentStates = new Map<string, any>();

  io.on("connection", (socket: Socket) => {
    console.log("Connected:", socket.id);

    /* ── Create Room ─────────────────────────────────────── */
    socket.on("room:create", ({ userId, userName }, cb) => {
      // Leave any existing room first
      const existing = findRoomBySocket(socket.id);
      if (existing) leaveRoom(io, socket, existing[0]);

      let code = generateCode();
      while (rooms.has(code)) code = generateCode();

      const room: StudyRoom = {
        code,
        members: [{ socketId: socket.id, userId, userName }],
        currentLesson: null,
        isPlaying: false,
        notes: "",
        chatHistory: [],
        whiteboardHistory: [],
      };
      rooms.set(code, room);
      socket.join(code);

      cb?.({ code, members: room.members });
      console.log(`Room ${code} created by ${userName}`);
    });

    /* ── Join Room ───────────────────────────────────────── */
    socket.on("room:join", ({ code, userId, userName }, cb) => {
      const room = rooms.get(code?.toUpperCase?.());
      if (!room) { cb?.({ error: "Room not found. Check the code and try again." }); return; }
      if (room.members.length >= 2) { cb?.({ error: "Room is full! Only 2 students allowed." }); return; }
      if (room.members.some(m => m.userId === userId)) { cb?.({ error: "You are already in this room." }); return; }

      // Leave any other room first
      const existing = findRoomBySocket(socket.id);
      if (existing) leaveRoom(io, socket, existing[0]);

      room.members.push({ socketId: socket.id, userId, userName });
      socket.join(room.code);

      // Notify partner
      socket.to(room.code).emit("room:partner-joined", {
        userId, userName, socketId: socket.id,
      });

      // Send full room state to joiner
      cb?.({
        code: room.code,
        members: room.members,
        currentLesson: room.currentLesson,
        isPlaying: room.isPlaying,
        notes: room.notes,
        chatHistory: room.chatHistory,
        whiteboardHistory: room.whiteboardHistory,
      });

      // Broadcast updated members to everyone
      io.to(room.code).emit("room:members", { members: room.members });

      // System message
      const sysMsg = { userName: "System", message: `${userName} joined the study room!`, timestamp: Date.now(), isAI: false };
      room.chatHistory.push(sysMsg);
      io.to(room.code).emit("chat:message", sysMsg);

      console.log(`${userName} joined room ${room.code} (${room.members.length}/2)`);
    });

    /* ── Leave Room ──────────────────────────────────────── */
    socket.on("room:leave", ({ code }) => {
      leaveRoom(io, socket, code);
    });

    /* ── WebRTC Signaling ────────────────────────────────── */
    socket.on("webrtc:offer", ({ code, offer }) => {
      socket.to(code).emit("webrtc:offer", { offer, from: socket.id });
    });
    socket.on("webrtc:answer", ({ code, answer }) => {
      socket.to(code).emit("webrtc:answer", { answer, from: socket.id });
    });
    socket.on("webrtc:ice", ({ code, candidate }) => {
      socket.to(code).emit("webrtc:ice", { candidate, from: socket.id });
    });
    socket.on("webrtc:renegotiate", ({ code, offer }) => {
      socket.to(code).emit("webrtc:renegotiate", { offer, from: socket.id });
    });
    socket.on("webrtc:renegotiate-answer", ({ code, answer }) => {
      socket.to(code).emit("webrtc:renegotiate-answer", { answer, from: socket.id });
    });

    /* ── Lesson Sync ─────────────────────────────────────── */
    socket.on("lesson:load", ({ code, topic, type }) => {
      const room = rooms.get(code);
      if (room) { room.currentLesson = { topic, type }; room.isPlaying = true; }
      socket.to(code).emit("lesson:load", { topic, type });
    });
    socket.on("lesson:play", ({ code }) => {
      const room = rooms.get(code);
      if (room) room.isPlaying = true;
      socket.to(code).emit("lesson:play", {});
    });
    socket.on("lesson:pause", ({ code }) => {
      const room = rooms.get(code);
      if (room) room.isPlaying = false;
      socket.to(code).emit("lesson:pause", {});
    });

    /* ── Whiteboard Sync ─────────────────────────────────── */
    socket.on("wb:draw", ({ code, data }) => {
      const room = rooms.get(code);
      if (room) room.whiteboardHistory.push(data);
      socket.to(code).emit("wb:draw", { data });
    });
    socket.on("wb:clear", ({ code }) => {
      const room = rooms.get(code);
      if (room) room.whiteboardHistory = [];
      socket.to(code).emit("wb:clear", {});
    });

    /* ── Shared Notes Sync ───────────────────────────────── */
    socket.on("notes:update", ({ code, content }) => {
      const room = rooms.get(code);
      if (room) room.notes = content;
      socket.to(code).emit("notes:update", { content });
    });

    /* ── Chat ────────────────────────────────────────────── */
    socket.on("chat:message", ({ code, userName, message }) => {
      const room = rooms.get(code);
      const msg = { userName, message, timestamp: Date.now() };
      if (room) room.chatHistory.push(msg);
      io.to(room?.code || code).emit("chat:message", msg);
    });

    /* ── AI Ask (shared — both see response) ─────────────── */
    socket.on("ai:ask", async ({ code, question, topic, userName }) => {
      const room = rooms.get(code);
      io.to(code).emit("ai:thinking", { question, userName });

      try {
        // Build shared context from recent chat
        const recentChat = (room?.chatHistory || []).slice(-10)
          .map(m => `${m.userName}: ${m.message}`).join("\n");

        const prompt = `You are a friendly AI teacher in a study room with 2 students learning together.
Recent conversation:
${recentChat}

Student "${userName}" asks: "${question}"${topic ? ` (Topic: ${topic})` : ""}

Give a clear, helpful, encouraging explanation. Use examples. Keep it concise but thorough.`;

        const result = await getAgent("classroom").run(prompt);
        const response = result.data?.answer || result.data?.text || JSON.stringify(result.data);
        const aiMsg = { userName: "AI Teacher", message: response, timestamp: Date.now(), isAI: true };
        if (room) room.chatHistory.push(aiMsg);
        io.to(code).emit("ai:response", { question, response, userName, timestamp: Date.now() });
      } catch (err) {
        io.to(code).emit("ai:response", { question, response: "Sorry, I couldn't process that. Please try again!", userName, timestamp: Date.now() });
      }
    });

    /* ── AI Generate Notes (shared) ──────────────────────── */
    socket.on("ai:gen-notes", async ({ code, topic, userName }) => {
      io.to(code).emit("ai:notes-loading", { topic, userName });
      try {
        const result = await getAgent("notes").run(`Create concise, well-structured study notes for the topic: "${topic}". Include key points, definitions, and a summary.`);
        const notes = typeof result.data === "string" ? result.data : (result.data?.notes || result.data?.text || JSON.stringify(result.data));
        const room = rooms.get(code);
        if (room) room.notes = notes;
        io.to(code).emit("ai:notes-ready", { topic, notes, timestamp: Date.now() });
      } catch {
        io.to(code).emit("ai:notes-ready", { topic, notes: "Could not generate notes right now.", timestamp: Date.now() });
      }
    });

    /* ── AI Visual Explanation trigger (both users load it) ─ */
    socket.on("ai:visual", ({ code, topic, userName }) => {
      io.to(code).emit("ai:visual-load", { topic, userName });
    });

    /* ── Quiz Together ───────────────────────────────────── */
    socket.on("quiz:start", async ({ code, topic }) => {
      io.to(code).emit("quiz:loading", { topic });
      try {
        const result = await getAgent("quiz").run(
          `Generate exactly 5 multiple choice questions about "${topic || "general knowledge"}". Each question must have 4 options and a correct answer index (0-3). Also provide a brief explanation for each answer. Return as JSON with a "questions" array.`
        );
        const questions = result.data?.questions || [];
        io.to(code).emit("quiz:ready", { questions, topic });
      } catch {
        io.to(code).emit("quiz:error", { message: "Failed to generate quiz. Try again!" });
      }
    });
    socket.on("quiz:answer", ({ code, questionIndex, answerIndex, userName }) => {
      io.to(code).emit("quiz:answer", { questionIndex, answerIndex, userName });
    });
    socket.on("quiz:next", ({ code, questionIndex }) => {
      io.to(code).emit("quiz:next", { questionIndex });
    });

    /* ── Screen Share signaling ──────────────────────────── */
    socket.on("screen:start", ({ code }) => {
      socket.to(code).emit("screen:start", { from: socket.id });
    });
    socket.on("screen:stop", ({ code }) => {
      socket.to(code).emit("screen:stop", { from: socket.id });
    });

    /* ── Disconnect ──────────────────────────────────────── */
    socket.on("disconnect", () => {
      const found = findRoomBySocket(socket.id);
      if (found) leaveRoom(io, socket, found[0]);
      studentStates.delete(socket.id);
      console.log("Disconnected:", socket.id);
    });

    /* ── Adaptive learning (existing — keep) ─────────────── */
    socket.on("session:start", ({ userId, topicTitle, language }) => {
      studentStates.set(socket.id, { userId, topicTitle, language, confusedStreak: 0, boredStreak: 0, lastIntervention: 0 });
      socket.emit("session:ready", { status: "ok" });
    });

    socket.on("emotion:update", async (data) => {
      const state = studentStates.get(socket.id);
      if (!state) return;
      const { emotion, attention } = data;

      if (emotion === "confused") { state.confusedStreak++; state.boredStreak = 0; }
      else if (emotion === "bored") { state.boredStreak++; state.confusedStreak = 0; }
      else { state.confusedStreak = 0; state.boredStreak = 0; }

      const now = Date.now();
      if (now - state.lastIntervention < 15000) return;

      if (state.confusedStreak >= 3) {
        state.lastIntervention = now; state.confusedStreak = 0;
        const result = await getAgent("doubt").run(`Explain "${state.topicTitle}" very simply for a confused student.`);
        socket.emit("adaptive:intervention", { type: "simplify", action: "Switching to simpler explanation...", content: result.data?.answer || result.data?.text });
      } else if (state.boredStreak >= 3) {
        state.lastIntervention = now; state.boredStreak = 0;
        const result = await getAgent("quiz").run(`Generate 3 easy quick questions about "${state.topicTitle}".`);
        socket.emit("adaptive:intervention", { type: "engage_quiz", action: "Quick quiz to re-engage!", content: result.data });
      } else if (emotion === "distracted" && attention < 0.3) {
        state.lastIntervention = now;
        socket.emit("adaptive:intervention", { type: "refocus", action: "Let's get back to learning!", message: `Here's an interesting fact about ${state.topicTitle}` });
      }

      socket.emit("emotion:summary", { currentEmotion: emotion, attention, faceDetected: data.faceDetected });
    });

    socket.on("session:end", () => studentStates.delete(socket.id));
  });

  /* ── Leave helper ────────────────────────────────────── */
  function leaveRoom(io: Server, socket: Socket, code: string) {
    const room = rooms.get(code);
    if (!room) return;
    const member = room.members.find(m => m.socketId === socket.id);
    room.members = room.members.filter(m => m.socketId !== socket.id);
    socket.leave(code);

    if (member) {
      socket.to(code).emit("room:partner-left", { userName: member.userName, userId: member.userId });
      const sysMsg = { userName: "System", message: `${member.userName} left the study room.`, timestamp: Date.now() };
      room.chatHistory.push(sysMsg);
      io.to(code).emit("chat:message", sysMsg);
      console.log(`${member.userName} left room ${code}`);
    }

    // Delete room if empty
    if (room.members.length === 0) {
      rooms.delete(code);
      console.log(`Room ${code} deleted (empty)`);
    }
  }

  /* ── REST-compatible room lookup (used by API routes) ── */
  (io as any).__studyRooms = rooms;
}
