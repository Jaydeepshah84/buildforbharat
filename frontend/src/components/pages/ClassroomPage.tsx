"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Copy, Link2, LogOut, Send, Mic, MicOff, Video, VideoOff,
  Monitor, MonitorOff, Bot, User, X, Loader2, Sparkles, PenTool,
  MessageSquare, Brain, CheckCircle2, XCircle, Eraser, StickyNote,
  Play, Pause, FileText, Beaker, Plus, ChevronRight, Hash, Zap, BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { io as ioConnect, Socket } from "socket.io-client";
import AnimationPlayer from "@/components/animation/AnimationPlayer";
import AdaptiveLesson from "@/components/course/AdaptiveLesson";
import { useAuth } from "@/components/AuthProvider";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Free TURN servers
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:relay1.expressturn.com:3478", username: "efQKGMJJKFN5ZTADBU", credential: "N8WIBnKgPlFkXnAi" },
];

/* ═══════════════════════════════════════════════════════════
   Shared Whiteboard — synced via Socket.io
   ═══════════════════════════════════════════════════════════ */
function SharedWhiteboard({
  visible, socketRef, roomCode,
}: { visible: boolean; socketRef: React.MutableRefObject<Socket | null>; roomCode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#3b82f6");
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const last = useRef<{ x: number; y: number } | null>(null);

  const getCtx = () => canvasRef.current?.getContext("2d") || null;

  const pos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvasRef.current!.width / r.width), y: (e.clientY - r.top) * (canvasRef.current!.height / r.height) };
  };

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }, c: string, w: number) => {
    const ctx = getCtx(); if (!ctx) return;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.stroke();
  };

  const start = (e: React.MouseEvent<HTMLCanvasElement>) => { setDrawing(true); last.current = pos(e); };
  const move = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !last.current) return;
    const p = pos(e);
    const c = tool === "eraser" ? "#ffffff" : color;
    const w = tool === "eraser" ? 20 : 3;
    drawLine(last.current, p, c, w);
    socketRef.current?.emit("wb:draw", { code: roomCode, data: { from: last.current, to: p, color: c, width: w } });
    last.current = p;
  };
  const stop = () => { setDrawing(false); last.current = null; };

  const clear = () => {
    const ctx = getCtx(); if (ctx) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1200, 600); }
    socketRef.current?.emit("wb:clear", { code: roomCode });
  };

  // Listen for remote draw events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const onDraw = ({ data }: any) => drawLine(data.from, data.to, data.color, data.width);
    const onClear = () => { const ctx = getCtx(); if (ctx) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1200, 600); } };
    socket.on("wb:draw", onDraw);
    socket.on("wb:clear", onClear);
    return () => { socket.off("wb:draw", onDraw); socket.off("wb:clear", onClear); };
  }, [socketRef.current]);

  // Init canvas
  useEffect(() => {
    if (visible) { const ctx = getCtx(); if (ctx) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1200, 600); } }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
        <button onClick={() => setTool("pen")} className={`p-1.5 rounded-lg ${tool === "pen" ? "bg-blue-100 text-blue-600" : "text-gray-400"}`}><PenTool className="w-4 h-4" /></button>
        <button onClick={() => setTool("eraser")} className={`p-1.5 rounded-lg ${tool === "eraser" ? "bg-blue-100 text-blue-600" : "text-gray-400"}`}><Eraser className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-gray-200" />
        {["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#000"].map(c => (
          <button key={c} onClick={() => { setColor(c); setTool("pen"); }}
            className={`w-5 h-5 rounded-full border-2 ${color === c && tool === "pen" ? "border-gray-800 scale-110" : "border-gray-200"}`} style={{ background: c }} />
        ))}
        <div className="flex-1" />
        <span className="text-[10px] text-gray-400">Both students can draw</span>
        <button onClick={clear} className="text-xs text-red-500 font-medium ml-2">Clear</button>
      </div>
      <canvas ref={canvasRef} width={1200} height={600} className="flex-1 cursor-crosshair w-full"
        onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Shared Notes — synced via Socket.io
   ═══════════════════════════════════════════════════════════ */
function SharedNotes({
  visible, notes, setNotes, socketRef, roomCode,
}: { visible: boolean; notes: string; setNotes: (v: string) => void; socketRef: React.MutableRefObject<Socket | null>; roomCode: string }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (val: string) => {
    setNotes(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      socketRef.current?.emit("notes:update", { code: roomCode, content: val });
    }, 300);
  };

  if (!visible) return null;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
        <StickyNote className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-semibold text-gray-700">Shared Notes</span>
        <span className="text-[10px] text-gray-400 ml-auto">Both students can edit</span>
      </div>
      <textarea
        value={notes}
        onChange={e => handleChange(e.target.value)}
        placeholder="Start typing notes here... Both of you can write and see changes in real time."
        className="flex-1 p-4 text-sm text-gray-700 resize-none focus:outline-none leading-relaxed"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Quiz Together — synced via Socket.io
   ═══════════════════════════════════════════════════════════ */
function QuizTogether({
  visible, questions, currentQ, setCurrentQ, answers, onAnswer, partnerAnswers, userName, partnerName,
}: {
  visible: boolean; questions: any[]; currentQ: number; setCurrentQ: (n: number) => void;
  answers: Record<number, number>; onAnswer: (qi: number, ai: number) => void;
  partnerAnswers: Record<number, number>; userName: string; partnerName: string;
}) {
  if (!visible || questions.length === 0) return null;
  const q = questions[currentQ];
  if (!q) return null;

  const myAnswer = answers[currentQ];
  const pAnswer = partnerAnswers[currentQ];
  const bothAnswered = myAnswer !== undefined && pAnswer !== undefined;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-50 shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#284ce3]" />
          <span className="font-bold text-gray-900">Quiz Together</span>
        </div>
        <span className="text-xs text-gray-500">{currentQ + 1} / {questions.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-gray-800 font-semibold mb-4 text-base">{q.question}</p>
        <div className="space-y-2.5">
          {(q.options || []).map((o: string, i: number) => {
            const isMine = myAnswer === i;
            const isPartner = pAnswer === i;
            const isCorrect = bothAnswered && i === q.correct;
            const isWrong = bothAnswered && (isMine || isPartner) && i !== q.correct;

            return (
              <button key={i} onClick={() => { if (myAnswer === undefined) onAnswer(currentQ, i); }}
                disabled={myAnswer !== undefined}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all relative ${
                  isCorrect ? "bg-emerald-50 border-emerald-300 text-emerald-700" :
                  isWrong ? "bg-red-50 border-red-300 text-red-600" :
                  isMine ? "bg-blue-50 border-blue-300 text-[#284ce3]" :
                  "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}>
                <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{o}
                {isCorrect && <CheckCircle2 className="w-4 h-4 inline ml-2 text-emerald-500" />}
                {isWrong && (isMine || isPartner) && <XCircle className="w-4 h-4 inline ml-2 text-red-400" />}
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  {isMine && <span className="text-[10px] bg-blue-100 text-[#284ce3] px-1.5 py-0.5 rounded-full">You</span>}
                  {isPartner && <span className="text-[10px] bg-blue-100 text-[#284ce3] px-1.5 py-0.5 rounded-full">{partnerName}</span>}
                </span>
              </button>
            );
          })}
        </div>

        {bothAnswered && q.explanation && (
          <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700 border border-blue-100">{q.explanation}</div>
        )}

        {myAnswer !== undefined && pAnswer === undefined && (
          <div className="mt-4 text-center text-sm text-gray-400 animate-pulse">Waiting for {partnerName} to answer...</div>
        )}
      </div>

      {bothAnswered && currentQ < questions.length - 1 && (
        <div className="px-4 py-3 border-t border-gray-100 shrink-0">
          <button onClick={() => setCurrentQ(currentQ + 1)}
            className="w-full py-2.5 bg-[#284ce3] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-700">
            Next Question <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {bothAnswered && currentQ === questions.length - 1 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-emerald-50 text-center shrink-0">
          <p className="font-bold text-emerald-700">Quiz Complete!</p>
          <p className="text-xs text-emerald-600 mt-1">
            {userName}: {Object.entries(answers).filter(([qi, ai]) => questions[Number(qi)]?.correct === ai).length}/{questions.length} correct
            {" | "}
            {partnerName}: {Object.entries(partnerAnswers).filter(([qi, ai]) => questions[Number(qi)]?.correct === ai).length}/{questions.length} correct
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Video Tile
   ═══════════════════════════════════════════════════════════ */
function VideoTile({ name, isSelf, stream, muted }: { name: string; isSelf?: boolean; stream?: MediaStream | null; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video || !stream) { setHasVideo(false); return; }

    video.srcObject = stream;
    setHasVideo(stream.getVideoTracks().some(t => t.enabled && t.readyState === "live"));

    // Listen for tracks being added/removed (remote streams add tracks async)
    const onTrackChange = () => {
      setHasVideo(stream.getVideoTracks().some(t => t.enabled && t.readyState === "live"));
    };
    stream.addEventListener("addtrack", onTrackChange);
    stream.addEventListener("removetrack", onTrackChange);

    // Also try playing in case autoplay is blocked
    video.play().catch(() => {});

    return () => {
      stream.removeEventListener("addtrack", onTrackChange);
      stream.removeEventListener("removetrack", onTrackChange);
    };
  }, [stream]);

  const showVideo = stream && (hasVideo || stream.getVideoTracks().length > 0);

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
      {/* Always render video element (hidden if no stream) */}
      <video ref={ref} autoPlay playsInline muted={muted || isSelf}
        className={`w-full h-full object-cover ${showVideo ? "" : "hidden"}`}
        style={isSelf ? { transform: "scaleX(-1)" } : {}} />
      {!showVideo && (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] flex items-center justify-center text-white font-bold text-xl shadow-lg">
            {name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        </div>
      )}
      <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[8px] px-1.5 py-0.5 rounded font-medium truncate max-w-[90%]">
        {name?.split(" ")[0]}{isSelf ? " (You)" : ""}
      </div>
      {isSelf && stream && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Learn Together — AI Lesson + Animation (synced)
   ═══════════════════════════════════════════════════════════ */
function LearnTogether({
  visible, onLoadTopic, socketRef, roomCode, showAnimation, animTopic,
}: {
  visible: boolean;
  onLoadTopic: (topic: string) => void;
  socketRef: React.MutableRefObject<Socket | null>; roomCode: string;
  showAnimation: boolean; animTopic: string;
}) {
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedTopicForLearn, setSelectedTopicForLearn] = useState<any>(null);
  const [learnMode, setLearnMode] = useState<"text" | "visual" | null>(null);

  // Fetch enrolled courses on mount
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    fetch(`${API}/courses/enrollments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async (res) => {
        const enrollments = res.enrollments || [];
        // Fetch full course data for each enrollment
        const coursesWithData = await Promise.all(
          enrollments.slice(0, 10).map(async (e: any) => {
            try {
              const r = await fetch(`${API}/courses/${e.course_id}`, { headers: { Authorization: `Bearer ${token}` } });
              const d = await r.json();
              return d.course || null;
            } catch { return null; }
          })
        );
        setEnrolledCourses(coursesWithData.filter(Boolean));
      })
      .catch(() => {})
      .finally(() => setLoadingCourses(false));
  }, []);

  // Listen for partner's topic selection
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onLessonLoad = ({ topic, type }: any) => {
      setSelectedTopicForLearn({ title: topic });
      setLearnMode(type === "animation" ? "visual" : "text");
    };

    socket.on("lesson:load", onLessonLoad);
    return () => { socket.off("lesson:load", onLessonLoad); };
  }, [socketRef.current]);

  const startTopic = (topic: any, mode: "text" | "visual") => {
    const topicTitle = topic.title || topic.name || "Topic";
    setSelectedTopicForLearn(topic);
    setLearnMode(mode);
    // Sync with partner via socket
    socketRef.current?.emit("lesson:load", { code: roomCode, topic: topicTitle, type: mode === "visual" ? "animation" : "text" });
  };

  if (!visible) return null;

  // If a topic is selected for learning — show the content
  if (selectedTopicForLearn && learnMode) {
    const topicTitle = selectedTopicForLearn.title || selectedTopicForLearn.name;
    return (
      <div className="h-full flex flex-col bg-white overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1 bg-gray-50/80 shrink-0">
          <button onClick={() => { setSelectedTopicForLearn(null); setLearnMode(null); }}
            className="text-[11px] text-[#284ce3] hover:text-blue-800 flex items-center gap-0.5 font-medium">
            <ChevronRight className="w-3 h-3 rotate-180" /> Courses
          </button>
          <span className="text-[11px] text-gray-400 truncate max-w-[50%]">{topicTitle}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {learnMode === "visual" ? (
            <AnimationPlayer topic={topicTitle} classLevel="10" language={typeof window !== "undefined" ? localStorage.getItem("app_language") || "en" : "en"} />
          ) : (
            <AdaptiveLesson topic={selectedTopicForLearn} language={typeof window !== "undefined" ? localStorage.getItem("app_language") || "en" : "en"} onNext={null} onPrev={null} lowBandwidth={false} />
          )}
        </div>
      </div>
    );
  }

  // Show animation if loaded via sync
  if (showAnimation && animTopic) {
    return (
      <div className="h-full flex flex-col bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
          <button onClick={() => { setSelectedTopicForLearn(null); setLearnMode(null); }}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <ChevronRight className="w-3 h-3 rotate-180" /> Back to courses
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AnimationPlayer topic={animTopic} classLevel="10" language="en" />
        </div>
      </div>
    );
  }

  // Course browser — show enrolled courses
  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
          <BookOpen className="w-4 h-4 text-[#284ce3]" /> {selectedCourse ? selectedCourse.title : "Your Courses"}
        </h3>
        {selectedCourse && (
          <button onClick={() => setSelectedCourse(null)} className="text-xs text-[#284ce3] hover:text-blue-800 mt-1">
            ← Back to all courses
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loadingCourses && (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        )}

        {!loadingCourses && !selectedCourse && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {enrolledCourses.length === 0 && (
              <div className="col-span-full text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No courses enrolled yet.</p>
                <p className="text-xs text-gray-400 mt-1">Generate a course first, then come back here to learn together!</p>
              </div>
            )}
            {enrolledCourses.map((course, i) => (
              <button key={course.id || i} onClick={() => setSelectedCourse(course)}
                className="text-left p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all bg-white group">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] flex items-center justify-center text-white font-bold text-sm mb-3 group-hover:scale-110 transition-transform">
                  {(course.title || "C").charAt(0)}
                </div>
                <h4 className="font-semibold text-gray-900 text-sm truncate">{course.title}</h4>
                <p className="text-xs text-gray-400 mt-0.5">{course.subject || "Course"} · {course.modules?.length || 0} modules</p>
              </button>
            ))}
          </div>
        )}

        {!loadingCourses && selectedCourse && (
          <div className="space-y-3">
            {(selectedCourse.modules || []).map((mod: any, mi: number) => (
              <div key={mod.id || mi} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 font-semibold text-xs text-gray-700">{mod.title}</div>
                {(mod.lessons || []).map((les: any, li: number) => (
                  <div key={les.id || li}>
                    <div className="px-3 py-1.5 text-xs text-gray-500 font-medium border-t border-gray-50">{les.title}</div>
                    {(les.topics || []).map((topic: any, ti: number) => (
                      <div key={topic.id || ti} className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 transition-colors border-t border-gray-50">
                        <span className="text-sm text-gray-800 flex-1 truncate">{topic.title}</span>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => startTopic(topic, "text")}
                            className="px-2.5 py-1 bg-blue-50 text-[#284ce3] rounded-lg text-[10px] font-semibold hover:bg-blue-100">
                            Text + Voice
                          </button>
                          <button onClick={() => startTopic(topic, "visual")}
                            className="px-2.5 py-1 bg-blue-50 text-[#284ce3] rounded-lg text-[10px] font-semibold hover:bg-blue-100">
                            Visual
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN: ClassroomPage (2-Person Study Room)
   ═══════════════════════════════════════════════════════════ */
export default function ClassroomPage() {
  const { user } = useAuth();

  // ── Room state ──
  const [roomCode, setRoomCode] = useState("");
  const roomCodeRef = useRef("");
  const [inRoom, setInRoom] = useState(false);
  const [members, setMembers] = useState<{ socketId: string; userId: string; userName: string }[]>([]);
  const [joinCode, setJoinCode] = useState("");

  // ── Socket & WebRTC ──
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [connected, setConnected] = useState(false);
  const [creating, setCreating] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [peerStatus, setPeerStatus] = useState<string>("");
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());

  // ── UI state ──
  const [tab, setTab] = useState<"learn" | "whiteboard" | "notes" | "quiz">("learn");
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Learn state ──
  const [lessonTopic, setLessonTopic] = useState("");
  const [lessonPlaying, setLessonPlaying] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animTopic, setAnimTopic] = useState("");

  // ── Notes state ──
  const [notes, setNotes] = useState("");

  // ── Quiz state ──
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizCurrentQ, setQuizCurrentQ] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizPartnerAnswers, setQuizPartnerAnswers] = useState<Record<number, number>>({});
  const [quizLoading, setQuizLoading] = useState(false);

  // ── AI state ──
  const [aiLoading, setAiLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const unreadRef = useRef(0);
  const [unread, setUnread] = useState(0);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
  const guestIdRef = useRef(`guest-${Date.now()}`);
  const userId = user?.id || guestIdRef.current;
  const partner = members.find(m => m.userId !== userId);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!chatOpen && messages.length > 0) { unreadRef.current++; setUnread(unreadRef.current); }
  }, [messages.length]);

  // Keep roomCode ref in sync for use in closures
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  // ── Auto-join from URL ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) setJoinCode(code.toUpperCase());
  }, []);

  // ── Socket connection ──
  useEffect(() => {
    const socket = ioConnect(SOCKET_URL, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000 });
    socketRef.current = socket;

    socket.on("connect", () => { console.log("Socket connected:", socket.id); setConnected(true); });
    socket.on("disconnect", () => { console.log("Socket disconnected"); setConnected(false); });
    socket.on("connect_error", (err) => { console.error("Socket connect error:", err.message); setConnected(false); });

    // Room events
    socket.on("room:partner-joined", ({ userId: uid, userName: uname, socketId: sid }) => {
      setMembers(prev => {
        if (prev.some(m => m.userId === uid)) return prev;
        return [...prev, { socketId: sid, userId: uid, userName: uname }];
      });
      toast.success(`${uname} joined the study room!`);

      // Initiate WebRTC as the first member (offerer)
      setTimeout(async () => {
        if (pcRef.current) pcRef.current.close();
        iceCandidateQueue.current = [];
        remoteStreamRef.current = new MediaStream();
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        pc.onicecandidate = (e) => {
          if (e.candidate) socket.emit("webrtc:ice", { code: roomCodeRef.current, candidate: e.candidate });
        };
        pc.ontrack = (e) => {
          console.log("[WebRTC offerer] Got remote track:", e.track.kind, e.track.readyState);
          e.streams[0]?.getTracks().forEach(t => {
            if (!remoteStreamRef.current.getTracks().find(rt => rt.id === t.id)) {
              remoteStreamRef.current.addTrack(t);
            }
          });
          // Fallback if no streams array
          if (!e.streams[0]) {
            if (!remoteStreamRef.current.getTracks().find(t => t.id === e.track.id)) {
              remoteStreamRef.current.addTrack(e.track);
            }
          }
          setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
        };
        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState;
          console.log("[WebRTC offerer] ICE state:", state);
          setPeerStatus(state);
          if (state === "failed") { pc.restartIce(); toast.error("Connection failed. Retrying..."); }
          if (state === "connected" || state === "completed") toast.success("Video connected!");
        };
        // Disable auto-renegotiation to prevent m-line order mismatch
        // Renegotiation is handled manually when tracks are added

        // Auto-get camera+mic — try video+audio, then audio-only, then proceed without
        let gotMedia = false;
        for (const constraints of [{ video: true, audio: true }, { video: true }, { audio: true }]) {
          if (gotMedia) break;
          try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
            setLocalStream(stream);
            setCamOn(stream.getVideoTracks().length > 0);
            setMicOn(stream.getAudioTracks().length > 0);
            gotMedia = true;
            console.log("[WebRTC] Offerer media:", stream.getTracks().map(t => t.kind));
          } catch (e) { console.warn("[WebRTC] getUserMedia failed for", constraints, e); }
        }

        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          await pc.setLocalDescription(offer);
          socket.emit("webrtc:offer", { code: roomCodeRef.current, offer });
          console.log("[WebRTC] Offer sent");
        } catch (e) { console.error("Create offer error:", e); }
      }, 500);
    });

    socket.on("room:partner-left", ({ userName: uname }) => {
      setMembers(prev => prev.filter(m => m.userName !== uname));
      toast(`${uname} left the room`, { icon: "👋" });
      cleanupWebRTC();
    });

    socket.on("room:members", ({ members: m }) => setMembers(m));

    // Chat
    socket.on("chat:message", (msg: any) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    // AI
    socket.on("ai:thinking", ({ userName: uname }) => setAiLoading(true));
    socket.on("ai:response", ({ response }) => {
      setAiLoading(false);
      setMessages(prev => [...prev, { userName: "AI Teacher", message: response, timestamp: Date.now(), isAI: true }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    // Lesson sync
    socket.on("lesson:load", ({ topic, type }: any) => {
      if (type === "animation") { setShowAnimation(true); setAnimTopic(topic); setLessonTopic(""); }
      else { setShowAnimation(false); setAnimTopic(""); setLessonTopic(topic); }
      setLessonPlaying(true);
      setTab("learn");
    });
    socket.on("lesson:play", () => setLessonPlaying(true));
    socket.on("lesson:pause", () => { setLessonPlaying(false); window.speechSynthesis?.cancel(); });

    // Notes sync
    socket.on("notes:update", ({ content }: any) => setNotes(content));

    // AI notes
    socket.on("ai:notes-loading", () => setAiLoading(true));
    socket.on("ai:notes-ready", ({ notes: n }: any) => { setNotes(n); setAiLoading(false); setTab("notes"); });

    // AI visual
    socket.on("ai:visual-load", ({ topic }: any) => {
      setShowAnimation(true); setAnimTopic(topic); setLessonTopic(""); setTab("learn");
    });

    // Quiz sync
    socket.on("quiz:loading", () => { setQuizLoading(true); setQuizQuestions([]); setQuizAnswers({}); setQuizPartnerAnswers({}); setQuizCurrentQ(0); });
    socket.on("quiz:ready", ({ questions }: any) => { setQuizQuestions(questions); setQuizLoading(false); setTab("quiz"); });
    socket.on("quiz:error", ({ message }: any) => { setQuizLoading(false); toast.error(message); });
    socket.on("quiz:answer", ({ questionIndex, answerIndex, userName: uname }: any) => {
      if (uname !== userName) setQuizPartnerAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
    });
    socket.on("quiz:next", ({ questionIndex }: any) => setQuizCurrentQ(questionIndex));

    // WebRTC signaling
    socket.on("webrtc:offer", async ({ offer }) => {
      if (pcRef.current) pcRef.current.close();
      iceCandidateQueue.current = [];
      remoteStreamRef.current = new MediaStream();
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit("webrtc:ice", { code: roomCodeRef.current, candidate: e.candidate });
      };
      pc.ontrack = (e) => {
        console.log("[WebRTC answerer] Got remote track:", e.track.kind, e.track.readyState);
        e.streams[0]?.getTracks().forEach(t => {
          if (!remoteStreamRef.current.getTracks().find(rt => rt.id === t.id)) {
            remoteStreamRef.current.addTrack(t);
          }
        });
        if (!e.streams[0]) {
          if (!remoteStreamRef.current.getTracks().find(t => t.id === e.track.id)) {
            remoteStreamRef.current.addTrack(e.track);
          }
        }
        setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
      };
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("[WebRTC answerer] ICE state:", state);
        setPeerStatus(state);
        if (state === "failed") { pc.restartIce(); toast.error("Connection failed. Retrying..."); }
        if (state === "connected" || state === "completed") toast.success("Video connected!");
      };
      // Disable auto-renegotiation to prevent m-line order mismatch

      try {
        // CRITICAL: Set remote description FIRST so ICE candidates can be applied
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("[WebRTC] Remote description set on answerer");

        // Flush any ICE candidates that arrived before remote description was set
        for (const candidate of iceCandidateQueue.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.warn("Queued ICE error:", e); }
        }
        iceCandidateQueue.current = [];

        // Now get camera+mic — try video+audio, then audio-only, then proceed without
        let gotMedia = false;
        for (const constraints of [{ video: true, audio: true }, { video: true }, { audio: true }]) {
          if (gotMedia) break;
          try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
            setLocalStream(stream);
            setCamOn(stream.getVideoTracks().length > 0);
            setMicOn(stream.getAudioTracks().length > 0);
            gotMedia = true;
            console.log("[WebRTC] Answerer media:", stream.getTracks().map(t => t.kind));
          } catch (e) { console.warn("[WebRTC] getUserMedia failed for", constraints, e); }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { code: roomCodeRef.current, answer });
        console.log("[WebRTC] Answer sent");
      } catch (e) { console.error("Handle offer error:", e); }
    });

    socket.on("webrtc:answer", async ({ answer }) => {
      try {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("[WebRTC] Remote description set on offerer");
        // Flush any queued ICE candidates
        for (const c of iceCandidateQueue.current) {
          try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { console.warn("Queued ICE error:", e); }
        }
        iceCandidateQueue.current = [];
      } catch (e) { console.error("Set answer error:", e); }
    });
    socket.on("webrtc:ice", async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc) return;
      // Queue ICE candidates if remote description not yet set
      if (!pc.remoteDescription || !pc.remoteDescription.type) {
        console.log("[WebRTC] Queuing ICE candidate (no remote desc yet)");
        iceCandidateQueue.current.push(candidate);
        return;
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error("ICE error:", e); }
    });
    socket.on("webrtc:renegotiate", async ({ offer }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:renegotiate-answer", { code: roomCodeRef.current, answer });
      } catch (e) { console.error("Renegotiate error:", e); }
    });
    socket.on("webrtc:renegotiate-answer", async ({ answer }) => {
      try { await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer)); } catch (e) { console.error("Renegotiate answer error:", e); }
    });

    return () => { socket.disconnect(); cleanupWebRTC(); };
  }, []);

  // ── Cleanup WebRTC ──
  const cleanupWebRTC = () => {
    pcRef.current?.close();
    pcRef.current = null;
    iceCandidateQueue.current = [];
    remoteStreamRef.current = new MediaStream();
    setRemoteStream(null);
    setPeerStatus("");
  };

  // ── Room actions ──
  const createRoom = () => {
    if (!socketRef.current?.connected) {
      toast.error("Connecting to server... Make sure the backend is running on " + SOCKET_URL);
      return;
    }
    setCreating(true);
    socketRef.current.emit("room:create", { userId, userName }, (res: any) => {
      setCreating(false);
      if (!res) { toast.error("No response from server"); return; }
      if (res.error) { toast.error(res.error); return; }
      setRoomCode(res.code);
      roomCodeRef.current = res.code;
      setInRoom(true);
      setMembers(res.members || []);
      toast.success(`Room ${res.code} created!`);
    });
    // Timeout fallback
    setTimeout(() => setCreating(false), 5000);
  };

  const joinRoom = (code?: string) => {
    const c = (code || joinCode).toUpperCase().trim();
    if (!c) { toast.error("Enter a room code"); return; }
    if (!socketRef.current?.connected) {
      toast.error("Connecting to server... Make sure the backend is running on " + SOCKET_URL);
      return;
    }
    socketRef.current.emit("room:join", { code: c, userId, userName }, (res: any) => {
      if (!res) { toast.error("No response from server"); return; }
      if (res.error) { toast.error(res.error); return; }
      setRoomCode(res.code);
      roomCodeRef.current = res.code;
      setInRoom(true);
      setMembers(res.members || []);
      if (res.notes) setNotes(res.notes);
      if (res.chatHistory) setMessages(res.chatHistory);
      if (res.currentLesson) {
        if (res.currentLesson.type === "animation") { setShowAnimation(true); setAnimTopic(res.currentLesson.topic); }
        else setLessonTopic(res.currentLesson.topic);
      }
      toast.success(`Joined room ${res.code}!`);
    });
  };

  const leaveRoom = () => {
    socketRef.current?.emit("room:leave", { code: roomCode });
    localStream?.getTracks().forEach(t => t.stop());
    screenStream?.getTracks().forEach(t => t.stop());
    cleanupWebRTC();
    setInRoom(false); setRoomCode(""); setMembers([]); setMessages([]);
    setLocalStream(null); setScreenStream(null);
    setMicOn(false); setCamOn(false); setScreenOn(false);
    setLessonTopic(""); setNotes(""); setQuizQuestions([]); setShowAnimation(false); setAnimTopic("");
    window.speechSynthesis?.cancel();
  };

  // ── Media controls ──
  const addTrackToPC = (track: MediaStreamTrack, stream: MediaStream) => {
    const pc = pcRef.current;
    if (!pc) return;
    // Check if this track type already exists as a sender
    const existingSender = pc.getSenders().find(s => s.track?.kind === track.kind);
    if (existingSender) {
      existingSender.replaceTrack(track); // replace existing — no renegotiation needed
    } else {
      pc.addTrack(track, stream); // new track — triggers onnegotiationneeded
    }
  };

  const removeTrackFromPC = (kind: "audio" | "video") => {
    const pc = pcRef.current;
    if (!pc) return;
    const sender = pc.getSenders().find(s => s.track?.kind === kind);
    if (sender) {
      sender.replaceTrack(null); // mute without removing
    }
  };

  const toggleCam = async () => {
    if (camOn && localStream) {
      localStream.getVideoTracks().forEach(t => { t.stop(); localStream.removeTrack(t); });
      removeTrackFromPC("video");
      setCamOn(false);
      if (!micOn) setLocalStream(null);
    } else {
      try {
        const stream = localStream || new MediaStream();
        const vs = await navigator.mediaDevices.getUserMedia({ video: true });
        vs.getVideoTracks().forEach(t => {
          stream.addTrack(t);
          addTrackToPC(t, stream);
        });
        setLocalStream(stream);
        setCamOn(true);
      } catch { toast.error("Camera access denied"); }
    }
  };

  const toggleMic = async () => {
    if (micOn && localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = false; });
      removeTrackFromPC("audio");
      setMicOn(false);
    } else {
      try {
        const stream = localStream || new MediaStream();
        if (stream.getAudioTracks().length > 0) {
          stream.getAudioTracks().forEach(t => { t.enabled = true; });
          // Re-add to PC
          stream.getAudioTracks().forEach(t => addTrackToPC(t, stream));
        } else {
          const as = await navigator.mediaDevices.getUserMedia({ audio: true });
          as.getAudioTracks().forEach(t => {
            stream.addTrack(t);
            addTrackToPC(t, stream);
          });
        }
        setLocalStream(stream);
        setMicOn(true);
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') toast.error("Microphone blocked. Click the lock icon in your browser address bar → Allow Microphone → Reload.", { duration: 6000 });
        else toast.error("Microphone error: " + (err?.message || "Access denied"));
      }
    }
  };

  const toggleScreen = async () => {
    if (screenOn && screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setScreenOn(false);
      socketRef.current?.emit("screen:stop", { code: roomCode });
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenStream(ss);
        setScreenOn(true);
        socketRef.current?.emit("screen:start", { code: roomCode });
        ss.getVideoTracks()[0].onended = () => {
          setScreenStream(null); setScreenOn(false);
          socketRef.current?.emit("screen:stop", { code: roomCode });
        };
        // Add screen tracks to peer connection
        ss.getTracks().forEach(track => addTrackToPC(track, ss));
      } catch { toast.error("Screen sharing denied"); }
    }
  };

  // ── Chat ──
  const sendChat = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit("chat:message", { code: roomCode, userName, message: chatInput.trim() });
    setChatInput("");
  };

  // ── AI Actions ──
  const askAI = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit("ai:ask", { code: roomCode, question: chatInput.trim(), topic: lessonTopic || animTopic, userName });
    setChatInput("");
  };

  const genVisual = () => {
    const topic = lessonTopic || animTopic || "photosynthesis";
    socketRef.current?.emit("lesson:load", { code: roomCode, topic, type: "animation" });
    setShowAnimation(true); setAnimTopic(topic); setLessonTopic(""); setTab("learn");
  };

  const genNotes = () => {
    const topic = lessonTopic || animTopic || "general topic";
    socketRef.current?.emit("ai:gen-notes", { code: roomCode, topic, userName });
  };

  const startQuiz = () => {
    const topic = lessonTopic || animTopic || "general knowledge";
    socketRef.current?.emit("quiz:start", { code: roomCode, topic });
  };

  const handleQuizAnswer = (qi: number, ai: number) => {
    setQuizAnswers(prev => ({ ...prev, [qi]: ai }));
    socketRef.current?.emit("quiz:answer", { code: roomCode, questionIndex: qi, answerIndex: ai, userName });
  };

  // ── Learn Together actions ──
  const loadLessonTopic = (topic: string) => {
    setShowAnimation(false); setAnimTopic(""); setLessonTopic(topic); setLessonPlaying(true);
    socketRef.current?.emit("lesson:load", { code: roomCode, topic, type: "text" });
  };

  const toggleLessonPlay = () => {
    const next = !lessonPlaying;
    setLessonPlaying(next);
    if (next) socketRef.current?.emit("lesson:play", { code: roomCode });
    else { socketRef.current?.emit("lesson:pause", { code: roomCode }); window.speechSynthesis?.cancel(); }
  };

  const copyCode = () => { navigator.clipboard.writeText(roomCode); toast.success("Room code copied!"); };
  const copyLink = () => {
    const link = `${window.location.origin}/classroom?code=${roomCode}`;
    navigator.clipboard.writeText(link); toast.success("Invite link copied!");
  };

  /* ═══════════════════════════════════════════════════════
     LOBBY VIEW (not in a room)
     ═══════════════════════════════════════════════════════ */
  if (!inRoom) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Study Room</h1>
          <p className="text-gray-500 mt-2">Learn together with a study partner in a real-time AI-powered room</p>
          {/* Connection status */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400 animate-pulse"}`} />
            <span className={`text-xs ${connected ? "text-emerald-600" : "text-red-500"}`}>
              {connected ? "Connected to server" : "Connecting to server..."}
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Create */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-[#284ce3]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Create Room</h2>
            <p className="text-sm text-gray-500 mb-5">Start a new study session and invite your partner with a room code.</p>
            <button onClick={createRoom} disabled={!connected || creating}
              className="w-full py-3 bg-gradient-to-r from-[#284ce3] to-[#4a6cf7] text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Zap className="w-4 h-4" /> Create Study Room</>}
            </button>
            {!connected && <p className="text-xs text-red-400 mt-2 text-center">Waiting for server connection...</p>}
          </motion.div>

          {/* Join */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
              <Hash className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Join Room</h2>
            <p className="text-sm text-gray-500 mb-4">Enter a room code or use an invite link from your study partner.</p>
            <div className="flex gap-2">
              <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && joinRoom()}
                placeholder="Enter code" maxLength={6}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={() => joinRoom()} disabled={!joinCode.trim() || !connected}
                className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-emerald-700 transition-colors">
                Join
              </button>
            </div>
          </motion.div>
        </div>

        {/* How it works */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-2xl p-6 border border-blue-100">
          <h3 className="font-bold text-gray-900 mb-4 text-center">How it works</h3>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Create or Join", desc: "One creates, the other joins with a code" },
              { step: "2", title: "Video Call", desc: "See & talk to each other in real-time" },
              { step: "3", title: "Learn Together", desc: "Watch AI lessons & animations in sync" },
              { step: "4", title: "Collaborate", desc: "Whiteboard, notes, quiz — all shared" },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-8 h-8 rounded-full bg-[#284ce3] text-white font-bold flex items-center justify-center mx-auto mb-2 text-sm">{s.step}</div>
                <p className="font-semibold text-sm text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* chatOpen/unread moved to top of component */

  /* ═══════════════════════════════════════════════════════
     ACTIVE ROOM VIEW — Full-width with floating video + chat modal
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col relative">
      {/* ── Top Bar (compact) ────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-1.5">
            <Hash className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-mono font-bold text-sm tracking-wider text-gray-800">{roomCode}</span>
          </div>
          <button onClick={copyCode} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="Copy code"><Copy className="w-4 h-4" /></button>
          <button onClick={copyLink} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="Copy invite link"><Link2 className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex -space-x-2">
            {members.map((m, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] flex items-center justify-center text-white text-[10px] font-bold border-2 border-white">{m.userName.charAt(0).toUpperCase()}</div>
            ))}
          </div>
          <span className="text-xs text-gray-500">{members.length}/2 {!partner && <span className="text-amber-500 animate-pulse">Waiting...</span>}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Chat toggle */}
          <button onClick={() => { setChatOpen(!chatOpen); unreadRef.current = 0; setUnread(0); }}
            className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Chat">
            <MessageSquare className="w-4 h-4" />
            {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
          </button>
          {/* Media controls in top bar */}
          <button onClick={toggleMic} className={`p-2 rounded-lg ${micOn ? "bg-blue-100 text-[#284ce3]" : "text-gray-400 hover:bg-gray-100"}`}>
            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button onClick={toggleCam} className={`p-2 rounded-lg ${camOn ? "bg-blue-100 text-[#284ce3]" : "text-gray-400 hover:bg-gray-100"}`}>
            {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <button onClick={toggleScreen} className={`p-2 rounded-lg ${screenOn ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:bg-gray-100"}`}>
            {screenOn ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </button>
          <button onClick={leaveRoom} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">
            <LogOut className="w-3.5 h-3.5" /> Leave
          </button>
        </div>
      </div>

      {/* ── Full-width Main Content ──────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white shrink-0">
          {[
            { key: "learn" as const, label: "Learn Together", icon: Brain },
            { key: "whiteboard" as const, label: "Whiteboard", icon: PenTool },
            { key: "notes" as const, label: "Notes", icon: StickyNote },
            { key: "quiz" as const, label: "Quiz", icon: Sparkles },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors ${
                tab === key ? "text-[#284ce3] border-b-2 border-[#284ce3] bg-blue-50/50" : "text-gray-400 hover:text-gray-600"
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
          {/* AI actions removed */}
        </div>

        {/* Tab Content — full width, no padding */}
        <div className="flex-1 overflow-hidden">
          <LearnTogether visible={tab === "learn"}
            onLoadTopic={loadLessonTopic}
            socketRef={socketRef} roomCode={roomCode} showAnimation={showAnimation} animTopic={animTopic} />
          <SharedWhiteboard visible={tab === "whiteboard"} socketRef={socketRef} roomCode={roomCode} />
          <SharedNotes visible={tab === "notes"} notes={notes} setNotes={setNotes} socketRef={socketRef} roomCode={roomCode} />

          {tab === "quiz" && quizQuestions.length === 0 && !quizLoading && (
            <div className="h-full flex items-center justify-center bg-white rounded-xl border border-gray-200">
              <div className="text-center">
                <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <h3 className="font-bold text-gray-700 mb-1">Quiz Together</h3>
                <p className="text-sm text-gray-400 mb-4">Start a quiz and compete with your partner!</p>
                <button onClick={startQuiz} className="px-6 py-2.5 bg-gradient-to-r from-[#284ce3] to-[#4a6cf7] text-white rounded-xl font-semibold text-sm hover:shadow-lg">Generate Quiz</button>
              </div>
            </div>
          )}
          {tab === "quiz" && quizLoading && (
            <div className="h-full flex items-center justify-center bg-white rounded-xl border border-gray-200">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          )}
          <QuizTogether visible={tab === "quiz" && quizQuestions.length > 0} questions={quizQuestions}
            currentQ={quizCurrentQ} setCurrentQ={(n) => { setQuizCurrentQ(n); socketRef.current?.emit("quiz:next", { code: roomCode, questionIndex: n }); }}
            answers={quizAnswers} onAnswer={handleQuizAnswer} partnerAnswers={quizPartnerAnswers}
            userName={userName} partnerName={partner?.userName || "Partner"} />
        </div>
      </div>

      {/* ── Floating Video Tiles (PIP style, draggable area) ── */}
      <div className="absolute bottom-3 left-3 flex gap-2 z-20">
        {/* Your video — small PIP */}
        <div className="w-28 rounded-lg overflow-hidden shadow-lg border border-white/30">
          <VideoTile name={userName} isSelf stream={localStream} muted />
        </div>
        {/* Partner — show avatar if no video */}
        {partner && (
          <div className="w-28 rounded-lg overflow-hidden shadow-lg border border-white/30 relative">
            {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
              <VideoTile name={partner.userName} stream={remoteStream} />
            ) : (
              <div className="aspect-video bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm mx-auto">
                    {partner.userName.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-[8px] text-gray-400 mt-1">{partner.userName}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Chat Modal (floating) ───────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="absolute top-12 right-4 bottom-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#284ce3]" />
                <span className="font-bold text-sm text-gray-900">Chat</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {messages.length === 0 && (
                <div className="text-center py-8 text-gray-300">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs">Chat with your study partner</p>
                </div>
              )}
              {messages.map((m, i) => {
                const isMe = m.userName === userName;
                const isAI = m.isAI || m.userName === "AI Teacher";
                const isSys = m.userName === "System";
                if (isSys) return <div key={i} className="text-center text-[10px] text-gray-400 py-1">{m.message}</div>;
                return (
                  <div key={i} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${isAI ? "bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] text-white" : isMe ? "bg-[#284ce3] text-white" : "bg-emerald-500 text-white"}`}>
                      {isAI ? <Bot className="w-3 h-3" /> : m.userName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isMe ? "bg-[#284ce3] text-white rounded-tr-sm" : isAI ? "bg-blue-50 text-gray-800 rounded-tl-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"}`}>
                      {!isMe && <p className="text-[10px] font-semibold mb-0.5 opacity-60">{m.userName}</p>}
                      {isAI ? <ReactMarkdown components={{ p: ({ children }: any) => <p className="mb-1 last:mb-0 text-[13px]">{children}</p> }}>{m.message}</ReactMarkdown> : <span className="text-[13px]">{m.message}</span>}
                    </div>
                  </div>
                );
              })}
              {aiLoading && <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] flex items-center justify-center"><Bot className="w-3 h-3 text-white" /></div><div className="bg-blue-50 rounded-2xl px-3 py-2 rounded-tl-sm"><Loader2 className="w-4 h-4 animate-spin text-blue-400" /></div></div>}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={e => { e.preventDefault(); sendChat(); }} className="flex gap-2 p-3 border-t border-gray-100 shrink-0">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#284ce3]" />
              <button type="submit" disabled={!chatInput.trim()} className="px-3 py-2 bg-[#284ce3] text-white rounded-xl disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
