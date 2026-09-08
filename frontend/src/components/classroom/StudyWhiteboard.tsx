"use client";

import { useState, useEffect, useRef } from "react";
import {
  Undo2, Redo2, PenTool, Eraser, Image as ImageIcon, PaintBucket, Highlighter,
  Shapes, Type, Sticker, Square, Circle, Minus, ArrowRight, Triangle, Trash2, X, Wrench, Plus,
} from "lucide-react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";

/* ═══════════════════════════════════════════════════════════
   Study-room whiteboard (shared live over Socket.io)

   Every client draws in the same logical 1600×900 space, so two partners
   on different screens see identical boards. Committed operations are the
   source of truth (undo / redo / replay for late joiners); in-progress
   strokes are streamed point by point so the partner sees them as they
   are drawn.

   Socket events
     wb:draw  {code, data: LivePacket}   in-progress stroke point (relayed only)
     wb:op    {code, op: WbOp}           committed op (stored + relayed)
     wb:undo  {code, id}                 remove one op (stored + relayed)
     wb:clear {code}                     wipe the board
     wb:title {code, title}              board title
     wb:sync  {code} → cb({ops, title})  full history for a fresh client
   ═══════════════════════════════════════════════════════════ */

export const BOARD_W = 1600;
export const BOARD_H = 900;

type Pt = { x: number; y: number };
type StrokeTool = "pen" | "highlight" | "eraser";
type ShapeKind = "rect" | "circle" | "triangle" | "line" | "arrow";
type Tool = StrokeTool | "fill" | "shape" | "text" | "sticker" | "image";
type Size = "s" | "m" | "l";

type OpBase = { id: string; by: string };
export type WbOp =
  | (OpBase & { kind: "stroke"; tool: StrokeTool; color: string; width: number; points: Pt[] })
  | (OpBase & { kind: "shape"; shape: ShapeKind; color: string; width: number; from: Pt; to: Pt })
  | (OpBase & { kind: "text"; text: string; x: number; y: number; color: string; size: number })
  | (OpBase & { kind: "sticker"; emoji: string; x: number; y: number; size: number })
  | (OpBase & { kind: "image"; src: string; x: number; y: number; w: number; h: number })
  | (OpBase & { kind: "fill"; x: number; y: number; color: string });

type LivePacket = { id: string; tool: StrokeTool; color: string; width: number; p: Pt; start?: boolean };
type LiveStroke = { tool: StrokeTool; color: string; width: number; points: Pt[] };
type Active =
  | { kind: "stroke"; id: string; tool: StrokeTool; color: string; width: number; points: Pt[] }
  | { kind: "shape"; id: string; shape: ShapeKind; color: string; width: number; from: Pt; to: Pt };
type View = { scale: number; offX: number; offY: number; dpr: number; cw: number; ch: number };

const SIZE_PX: Record<Size, { pen: number; highlight: number; eraser: number; shape: number; text: number; sticker: number }> = {
  s: { pen: 2.5, highlight: 14, eraser: 18, shape: 2.5, text: 22, sticker: 40 },
  m: { pen: 4.5, highlight: 22, eraser: 32, shape: 4, text: 30, sticker: 60 },
  l: { pen: 8, highlight: 34, eraser: 56, shape: 7, text: 42, sticker: 88 },
};
const COLORS = ["#1f2937", "#1e40af", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
const STICKERS = ["⭐", "❤️", "👍", "✅", "❌", "💡", "🔥", "🎯", "❓", "😀", "🎉", "📌"];
const SHAPES: { kind: ShapeKind; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { kind: "rect", label: "Rectangle", icon: Square },
  { kind: "circle", label: "Circle", icon: Circle },
  { kind: "triangle", label: "Triangle", icon: Triangle },
  { kind: "line", label: "Line", icon: Minus },
  { kind: "arrow", label: "Arrow", icon: ArrowRight },
];
const TOOL_CURSOR: Record<Tool, string> = {
  pen: "crosshair", highlight: "crosshair", eraser: "cell", fill: "crosshair",
  shape: "crosshair", text: "text", sticker: "copy", image: "copy",
};
const TEXT_FONT = "Inter, system-ui, sans-serif";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/* ── Pure drawing helpers (work in logical board coordinates) ── */
function clearCtx(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

function drawStrokePath(ctx: CanvasRenderingContext2D, tool: StrokeTool, color: string, width: number, points: Pt[]) {
  if (!points.length) return;
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = width;
  if (tool === "eraser") { ctx.globalCompositeOperation = "destination-out"; ctx.strokeStyle = "#000"; }
  else if (tool === "highlight") { ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = 0.45; ctx.strokeStyle = color; }
  else ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) ctx.lineTo(points[0].x + 0.01, points[0].y); // a tap leaves a dot
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

function drawShape(ctx: CanvasRenderingContext2D, shape: ShapeKind, color: string, width: number, a: Pt, b: Pt) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
  ctx.beginPath();
  switch (shape) {
    case "rect": ctx.rect(x, y, w, h); break;
    case "circle": ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break;
    case "triangle": ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); break;
    case "line": ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); break;
    case "arrow": {
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const len = Math.max(14, width * 4);
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - len * Math.cos(ang - Math.PI / 6), b.y - len * Math.sin(ang - Math.PI / 6));
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - len * Math.cos(ang + Math.PI / 6), b.y - len * Math.sin(ang + Math.PI / 6));
      break;
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size: number) {
  ctx.save();
  ctx.fillStyle = color; ctx.font = `600 ${size}px ${TEXT_FONT}`; ctx.textBaseline = "top";
  text.split("\n").forEach((line, i) => ctx.fillText(line, x, y + i * size * 1.25));
  ctx.restore();
}

function drawSticker(ctx: CanvasRenderingContext2D, emoji: string, x: number, y: number, size: number) {
  ctx.save();
  ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(emoji, x, y);
  ctx.restore();
}

/** Scanline flood fill on the backing pixels, limited to the board rectangle. */
function floodFill(ctx: CanvasRenderingContext2D, view: View, lx: number, ly: number, color: string) {
  const { scale, offX, offY, dpr } = view;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const bx0 = clamp(Math.floor(offX * dpr), 0, W), by0 = clamp(Math.floor(offY * dpr), 0, H);
  const bx1 = clamp(Math.ceil((offX + BOARD_W * scale) * dpr), 0, W), by1 = clamp(Math.ceil((offY + BOARD_H * scale) * dpr), 0, H);
  const sx = Math.round((lx * scale + offX) * dpr), sy = Math.round((ly * scale + offY) * dpr);
  if (sx < bx0 || sy < by0 || sx >= bx1 || sy >= by1) return;

  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const s4 = (sy * W + sx) * 4;
  const tr = d[s4], tg = d[s4 + 1], tb = d[s4 + 2], ta = d[s4 + 3];
  const [fr, fg, fb] = hexToRgb(color);
  if (ta === 255 && tr === fr && tg === fg && tb === fb) return;

  // Blank board = transparent pixels; anti-aliased ink edges are semi-transparent
  const matches = ta < 128
    ? (p: number) => d[p * 4 + 3] < 128
    : (p: number) => { const i = p * 4; return Math.abs(d[i] - tr) <= 32 && Math.abs(d[i + 1] - tg) <= 32 && Math.abs(d[i + 2] - tb) <= 32 && Math.abs(d[i + 3] - ta) <= 32; };

  const visited = new Uint8Array(W * H);
  const stack = [sy * W + sx];
  while (stack.length) {
    const p = stack.pop()!;
    if (visited[p]) continue;
    const y = (p / W) | 0;
    let xl = p % W, xr = xl;
    while (xl - 1 >= bx0 && !visited[y * W + xl - 1] && matches(y * W + xl - 1)) xl--;
    while (xr + 1 < bx1 && !visited[y * W + xr + 1] && matches(y * W + xr + 1)) xr++;
    for (let xx = xl; xx <= xr; xx++) {
      const q = y * W + xx;
      visited[q] = 1;
      d[q * 4] = fr; d[q * 4 + 1] = fg; d[q * 4 + 2] = fb; d[q * 4 + 3] = 255;
      if (y - 1 >= by0) { const u = q - W; if (!visited[u] && matches(u)) stack.push(u); }
      if (y + 1 < by1) { const v = q + W; if (!visited[v] && matches(v)) stack.push(v); }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function fileToImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

/* ── Tool button ─────────────────────────────────────────── */
function ToolBtn({ icon: Icon, label, active, disabled, onClick, title }: {
  icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean; disabled?: boolean; onClick: () => void; title?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title || label}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "border-primary-200 bg-primary-50 text-primary-600 shadow-sm" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
      }`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function StudyWhiteboard({ visible, socketRef, roomCode, userId }: {
  visible: boolean; socketRef: React.MutableRefObject<Socket | null>; roomCode: string; userId: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const viewRef = useRef<View>({ scale: 1, offX: 0, offY: 0, dpr: 1, cw: 0, ch: 0 });
  const opsRef = useRef<WbOp[]>([]);
  const redoRef = useRef<WbOp[]>([]);
  const liveRef = useRef<Map<string, LiveStroke>>(new Map());
  const activeRef = useRef<Active | null>(null);
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const failedImgs = useRef<Set<string>>(new Set());
  const renderQueued = useRef(false);
  const textEditRef = useRef<Pt | null>(null);
  const textReadyRef = useRef(false);
  const imageDropPos = useRef<Pt | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[1]);
  const [size, setSize] = useState<Size>("m");
  const [shape, setShape] = useState<ShapeKind>("rect");
  const [emoji, setEmoji] = useState(STICKERS[0]);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [textEditor, setTextEditor] = useState<Pt | null>(null);
  const [view, setView] = useState({ left: 0, top: 0, width: 0, height: 0, scale: 1 });
  const [, setVersion] = useState(0);
  const bump = () => setVersion(v => v + 1);

  const getCtx = () => canvasRef.current?.getContext("2d") || null;
  const emit = (event: string, payload: Record<string, unknown> = {}) => socketRef.current?.emit(event, { code: roomCode, ...payload });

  /* ── Rendering ──────────────────────────────────────────── */
  const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const cached = imgCache.current.get(src);
    if (cached) {
      if (cached.complete) { cached.naturalWidth ? resolve(cached) : reject(new Error("bad image")); return; }
      cached.addEventListener("load", () => resolve(cached), { once: true });
      cached.addEventListener("error", () => reject(new Error("bad image")), { once: true });
      return;
    }
    const img = new Image();
    imgCache.current.set(src, img);
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("bad image"));
    img.src = src;
  });

  const scheduleRender = () => {
    if (renderQueued.current) return;
    renderQueued.current = true;
    requestAnimationFrame(() => { renderQueued.current = false; renderAll(); });
  };

  const drawOp = (ctx: CanvasRenderingContext2D, op: WbOp) => {
    switch (op.kind) {
      case "stroke": drawStrokePath(ctx, op.tool, op.color, op.width, op.points); break;
      case "shape": drawShape(ctx, op.shape, op.color, op.width, op.from, op.to); break;
      case "text": drawText(ctx, op.text, op.x, op.y, op.color, op.size); break;
      case "sticker": drawSticker(ctx, op.emoji, op.x, op.y, op.size); break;
      case "fill": floodFill(ctx, viewRef.current, op.x, op.y, op.color); break;
      case "image": {
        const img = imgCache.current.get(op.src);
        if (img?.complete && img.naturalWidth) ctx.drawImage(img, op.x, op.y, op.w, op.h);
        else if (!failedImgs.current.has(op.src)) loadImage(op.src).then(scheduleRender).catch(() => failedImgs.current.add(op.src));
        break;
      }
    }
  };

  /** Overlay = things still being drawn: highlight strokes (drawn as one path so joints don't double up) and the shape rubber band. */
  const drawOverlay = () => {
    const ctx = overlayRef.current?.getContext("2d"); if (!ctx) return;
    clearCtx(ctx);
    liveRef.current.forEach(s => { if (s.tool === "highlight") drawStrokePath(ctx, "highlight", s.color, s.width, s.points); });
    const a = activeRef.current;
    if (a?.kind === "shape") drawShape(ctx, a.shape, a.color, a.width, a.from, a.to);
  };

  const renderAll = () => {
    const ctx = getCtx(); if (!ctx) return;
    clearCtx(ctx);
    for (const op of opsRef.current) drawOp(ctx, op);
    liveRef.current.forEach(s => { if (s.tool !== "highlight") drawStrokePath(ctx, s.tool, s.color, s.width, s.points); });
    drawOverlay();
  };

  /** Size the canvases to the container and fit the 16:9 board inside it. */
  const fit = () => {
    const wrap = wrapRef.current; if (!wrap) return;
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    if (cw < 10 || ch < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(cw / BOARD_W, ch / BOARD_H);
    const offX = (cw - BOARD_W * scale) / 2, offY = (ch - BOARD_H * scale) / 2;
    viewRef.current = { scale, offX, offY, dpr, cw, ch };
    for (const c of [canvasRef.current, overlayRef.current]) {
      if (!c) continue;
      c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr);
      c.style.width = `${cw}px`; c.style.height = `${ch}px`;
      const ctx = c.getContext("2d"); if (!ctx) continue;
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr);
      ctx.beginPath(); ctx.rect(0, 0, BOARD_W, BOARD_H); ctx.clip();
    }
    setView({ left: offX, top: offY, width: BOARD_W * scale, height: BOARD_H * scale, scale });
    renderAll();
  };

  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
    ro.observe(wrap);
    fit();
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Committing ops ─────────────────────────────────────── */
  const commitLocal = (op: WbOp, alreadyDrawn = false) => {
    const ctx = getCtx();
    if (ctx && !alreadyDrawn) drawOp(ctx, op);
    opsRef.current.push(op);
    redoRef.current = [];
    emit("wb:op", { op });
    bump();
  };

  const undo = () => {
    const ops = opsRef.current;
    for (let i = ops.length - 1; i >= 0; i--) {
      if (ops[i].by !== userId) continue;
      const [op] = ops.splice(i, 1);
      redoRef.current.push(op);
      emit("wb:undo", { id: op.id });
      renderAll();
      bump();
      return;
    }
  };

  const redo = () => {
    const op = redoRef.current.pop();
    if (!op) return;
    opsRef.current.push(op);
    const ctx = getCtx(); if (ctx) drawOp(ctx, op);
    emit("wb:op", { op });
    bump();
  };

  const clearBoard = () => {
    if (opsRef.current.length && !window.confirm("Clear the whole board for both of you?")) return;
    opsRef.current = []; redoRef.current = []; liveRef.current.clear();
    renderAll();
    emit("wb:clear");
    bump();
  };

  const changeTitle = (t: string) => {
    setTitle(t);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => emit("wb:title", { title: t }), 300);
  };

  /* ── Socket sync ────────────────────────────────────────── */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomCode) return;

    const onLive = ({ data }: { data: LivePacket }) => {
      const ctx = getCtx(); if (!ctx || !data?.p) return;
      let s = liveRef.current.get(data.id);
      if (!s || data.start) { s = { tool: data.tool, color: data.color, width: data.width, points: [] }; liveRef.current.set(data.id, s); }
      const prev = s.points[s.points.length - 1];
      s.points.push(data.p);
      if (s.tool === "highlight") drawOverlay();
      else drawStrokePath(ctx, s.tool, s.color, s.width, prev ? [prev, data.p] : [data.p]);
    };
    const onOp = ({ op }: { op: WbOp }) => {
      if (!op?.id || opsRef.current.some(o => o.id === op.id)) return;
      const wasLive = liveRef.current.delete(op.id);
      opsRef.current.push(op);
      const ctx = getCtx();
      if (ctx) {
        const alreadyOnCanvas = op.kind === "stroke" && op.tool !== "highlight" && wasLive;
        if (!alreadyOnCanvas) drawOp(ctx, op);
        if (op.kind === "stroke" && op.tool === "highlight") drawOverlay();
      }
      bump();
    };
    const onUndo = ({ id }: { id: string }) => {
      opsRef.current = opsRef.current.filter(o => o.id !== id);
      renderAll();
      bump();
    };
    const onClear = () => {
      opsRef.current = []; redoRef.current = []; liveRef.current.clear();
      renderAll();
      bump();
    };
    const onTitle = ({ title: t }: { title: string }) => setTitle(t ?? "");

    socket.on("wb:draw", onLive);
    socket.on("wb:op", onOp);
    socket.on("wb:undo", onUndo);
    socket.on("wb:clear", onClear);
    socket.on("wb:title", onTitle);

    // Pull the full history so a late joiner sees what is already on the board
    socket.emit("wb:sync", { code: roomCode }, (res: { ops?: WbOp[]; title?: string } | undefined) => {
      if (!res) return;
      opsRef.current = Array.isArray(res.ops) ? res.ops : [];
      if (typeof res.title === "string") setTitle(res.title);
      const images = opsRef.current.filter(o => o.kind === "image") as Extract<WbOp, { kind: "image" }>[];
      Promise.allSettled(images.map(o => loadImage(o.src))).then(() => { renderAll(); bump(); });
      renderAll();
      bump();
    });

    return () => {
      socket.off("wb:draw", onLive);
      socket.off("wb:op", onOp);
      socket.off("wb:undo", onUndo);
      socket.off("wb:clear", onClear);
      socket.off("wb:title", onTitle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketRef.current, roomCode]);

  /* ── Keyboard: undo / redo, paste image ─────────────────── */
  useEffect(() => {
    if (!visible) return;
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const file = Array.from(e.clipboardData?.files || []).find(f => f.type.startsWith("image/"));
      if (file) { e.preventDefault(); imageDropPos.current = null; insertImageFile(file); }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("paste", onPaste); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, roomCode, userId]);

  // Focus on the next frame: focusing inside the pointerdown handler is undone
  // by the event's default action, which would blur (and commit) the editor at once.
  useEffect(() => {
    if (!textEditor) return;
    const raf = requestAnimationFrame(() => { textRef.current?.focus(); textReadyRef.current = true; });
    return () => { cancelAnimationFrame(raf); textReadyRef.current = false; };
  }, [textEditor]);

  /* ── Pointer handling ───────────────────────────────────── */
  const toBoard = (e: React.PointerEvent): Pt => {
    const r = overlayRef.current!.getBoundingClientRect();
    const { scale, offX, offY } = viewRef.current;
    return { x: (e.clientX - r.left - offX) / scale, y: (e.clientY - r.top - offY) / scale };
  };
  const onBoard = (p: Pt) => p.x >= 0 && p.y >= 0 && p.x <= BOARD_W && p.y <= BOARD_H;
  const clampPt = (p: Pt): Pt => ({ x: clamp(p.x, 0, BOARD_W), y: clamp(p.y, 0, BOARD_H) });

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = toBoard(e);
    if (!onBoard(p)) return;
    if (textEditRef.current) commitText();
    if (tool === "pen" || tool === "highlight" || tool === "eraser" || tool === "shape") {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    switch (tool) {
      case "pen": case "highlight": case "eraser": {
        const id = uid(), width = SIZE_PX[size][tool];
        const stroke: LiveStroke = { tool, color, width, points: [p] };
        liveRef.current.set(id, stroke);
        activeRef.current = { kind: "stroke", id, tool, color, width, points: stroke.points };
        if (tool === "highlight") drawOverlay();
        else { const ctx = getCtx(); if (ctx) drawStrokePath(ctx, tool, color, width, [p]); }
        emit("wb:draw", { data: { id, tool, color, width, p, start: true } });
        break;
      }
      case "shape":
        activeRef.current = { kind: "shape", id: uid(), shape, color, width: SIZE_PX[size].shape, from: p, to: p };
        break;
      case "fill":
        commitLocal({ id: uid(), by: userId, kind: "fill", x: p.x, y: p.y, color });
        break;
      case "text":
        e.preventDefault(); // keep the default mousedown from pulling focus back out of the editor
        textEditRef.current = p;
        setTextEditor(p);
        break;
      case "sticker":
        commitLocal({ id: uid(), by: userId, kind: "sticker", emoji, x: p.x, y: p.y, size: SIZE_PX[size].sticker });
        break;
      case "image":
        imageDropPos.current = p;
        fileRef.current?.click();
        break;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = activeRef.current; if (!a) return;
    const p = clampPt(toBoard(e));
    if (a.kind === "stroke") {
      const prev = a.points[a.points.length - 1];
      if (Math.hypot(p.x - prev.x, p.y - prev.y) < 0.75) return;
      a.points.push(p);
      if (a.tool === "highlight") drawOverlay();
      else { const ctx = getCtx(); if (ctx) drawStrokePath(ctx, a.tool, a.color, a.width, [prev, p]); }
      emit("wb:draw", { data: { id: a.id, tool: a.tool, color: a.color, width: a.width, p } });
    } else {
      a.to = p;
      drawOverlay();
    }
  };

  const onPointerUp = () => {
    const a = activeRef.current; if (!a) return;
    activeRef.current = null;
    if (a.kind === "stroke") {
      liveRef.current.delete(a.id);
      const op: WbOp = { id: a.id, by: userId, kind: "stroke", tool: a.tool, color: a.color, width: a.width, points: a.points };
      if (a.tool === "highlight") { const ctx = getCtx(); if (ctx) drawOp(ctx, op); drawOverlay(); }
      commitLocal(op, true);
    } else {
      drawOverlay();
      if (Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y) < 3) return;
      commitLocal({ id: a.id, by: userId, kind: "shape", shape: a.shape, color: a.color, width: a.width, from: a.from, to: a.to });
    }
  };

  /* ── Text tool ──────────────────────────────────────────── */
  const commitText = () => {
    const at = textEditRef.current;
    textEditRef.current = null;
    textReadyRef.current = false;
    const text = (textRef.current?.innerText || "").replace(/\s+$/, "");
    setTextEditor(null);
    if (!at || !text.trim()) return;
    commitLocal({ id: uid(), by: userId, kind: "text", text, x: at.x, y: at.y, color, size: SIZE_PX[size].text });
  };
  const cancelText = () => { textEditRef.current = null; textReadyRef.current = false; setTextEditor(null); };

  /* ── Image tool ─────────────────────────────────────────── */
  const insertImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    try {
      const img = await fileToImage(file);
      const k = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      let src = file.type === "image/png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.85);
      if (src.length > 1_500_000) src = c.toDataURL("image/jpeg", 0.7);
      if (src.length > 2_500_000) { toast.error("That image is too large for the board"); return; }
      const fitK = Math.min(1, (BOARD_W * 0.6) / w, (BOARD_H * 0.6) / h);
      const bw = w * fitK, bh = h * fitK;
      const at = imageDropPos.current ? clampPt(imageDropPos.current) : { x: BOARD_W / 2, y: BOARD_H / 2 };
      imageDropPos.current = null;
      const x = clamp(at.x - bw / 2, 0, BOARD_W - bw), y = clamp(at.y - bh / 2, 0, BOARD_H - bh);
      await loadImage(src);
      commitLocal({ id: uid(), by: userId, kind: "image", src, x, y, w: bw, h: bh });
    } catch {
      toast.error("Couldn't load that image");
    }
  };

  const pickImage = () => { setTool("image"); imageDropPos.current = null; fileRef.current?.click(); };

  const canUndo = opsRef.current.some(o => o.by === userId);
  const canRedo = redoRef.current.length > 0;
  const gridStep = Math.max(12, 32 * view.scale);

  return (
    <div className={`${visible ? "flex" : "hidden"} h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white`}>
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden bg-gray-100"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { imageDropPos.current = null; insertImageFile(f); } }}>

        {/* Board surface with dot grid, sized to the fitted 16:9 board */}
        <div className="pointer-events-none absolute rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
          style={{ left: view.left, top: view.top, width: view.width, height: view.height,
            backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1.2px)", backgroundSize: `${gridStep}px ${gridStep}px`,
            backgroundPosition: `${gridStep / 2}px ${gridStep / 2}px` }} />

        <canvas ref={canvasRef} className="absolute left-0 top-0" />
        <canvas ref={overlayRef} className="absolute left-0 top-0 touch-none"
          style={{ cursor: TOOL_CURSOR[tool] }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />

        {/* Board title */}
        <input value={title} onChange={e => changeTitle(e.target.value)} maxLength={120}
          placeholder="Untitled board — click to name it"
          className="absolute z-10 rounded-lg bg-transparent px-2 text-center font-display font-bold text-gray-800 outline-none placeholder:font-medium placeholder:text-gray-300 focus:bg-white/80 focus:ring-2 focus:ring-primary-200"
          style={{ left: view.left + view.width * 0.2, width: view.width * 0.6, top: view.top + 10 * view.scale, fontSize: Math.max(14, 30 * view.scale) }} />

        {/* Inline text editor (Enter commits, Shift+Enter = new line, Esc cancels) */}
        {textEditor && (
          <div key={`${textEditor.x}-${textEditor.y}`} ref={textRef} contentEditable suppressContentEditableWarning
            className="absolute z-10 whitespace-pre rounded-md bg-white/70 px-1 outline-none ring-2 ring-primary-300"
            style={{ left: view.left + textEditor.x * view.scale - 4, top: view.top + textEditor.y * view.scale,
              fontSize: SIZE_PX[size].text * view.scale, fontWeight: 600, lineHeight: 1.25, color, minWidth: 24, fontFamily: TEXT_FONT }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); }
              else if (e.key === "Escape") { e.preventDefault(); cancelText(); }
            }}
            onBlur={() => { if (textReadyRef.current && textEditRef.current) commitText(); }} />
        )}

        {/* Tools panel */}
        {toolsOpen ? (
          <div className="absolute right-3 top-3 z-20 flex w-44 flex-col gap-2 rounded-2xl border border-gray-200 bg-white/95 p-2.5 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-bold text-gray-800">Tools</span>
              <button type="button" onClick={() => setToolsOpen(false)} className="text-gray-400 hover:text-gray-600" title="Hide tools"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <ToolBtn icon={Undo2} label="Back" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" />
              <ToolBtn icon={Redo2} label="Forward" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" />
              <ToolBtn icon={PenTool} label="Pen" active={tool === "pen"} onClick={() => setTool("pen")} />
              <ToolBtn icon={Eraser} label="Eraser" active={tool === "eraser"} onClick={() => setTool("eraser")} />
              <ToolBtn icon={ImageIcon} label="Image" active={tool === "image"} onClick={pickImage} title="Insert an image (or drop / paste one)" />
              <ToolBtn icon={PaintBucket} label="Fill" active={tool === "fill"} onClick={() => setTool("fill")} title="Fill an enclosed area" />
              <ToolBtn icon={Highlighter} label="Highlight" active={tool === "highlight"} onClick={() => setTool("highlight")} />
              <ToolBtn icon={Shapes} label="Shape" active={tool === "shape"} onClick={() => setTool("shape")} />
              <ToolBtn icon={Type} label="Text" active={tool === "text"} onClick={() => setTool("text")} title="Click the board to type" />
              <ToolBtn icon={Sticker} label="Sticker" active={tool === "sticker"} onClick={() => setTool("sticker")} title="Click the board to place a sticker" />
            </div>

            {tool === "shape" && (
              <div className="flex gap-1 rounded-xl bg-gray-50 p-1">
                {SHAPES.map(({ kind, label, icon: Icon }) => (
                  <button key={kind} type="button" onClick={() => setShape(kind)} title={label}
                    className={`grid h-7 flex-1 place-items-center rounded-lg transition ${shape === kind ? "bg-white text-primary-600 shadow-sm ring-1 ring-primary-200" : "text-gray-400 hover:text-gray-600"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}
            {tool === "sticker" && (
              <div className="grid grid-cols-6 gap-0.5 rounded-xl bg-gray-50 p-1">
                {STICKERS.map(s => (
                  <button key={s} type="button" onClick={() => setEmoji(s)}
                    className={`grid h-7 place-items-center rounded-lg text-base transition ${emoji === s ? "bg-white shadow-sm ring-1 ring-primary-200" : "hover:bg-white/70"}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="h-px bg-gray-100" />
            <div className="flex flex-wrap items-center gap-1.5 px-0.5">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => { setColor(c); if (tool === "eraser") setTool("pen"); }}
                  className={`h-5 w-5 rounded-full border-2 transition ${color === c && tool !== "eraser" ? "scale-110 border-gray-800" : "border-white ring-1 ring-gray-200"}`}
                  style={{ background: c }} title={c} />
              ))}
              <label className="relative grid h-5 w-5 cursor-pointer place-items-center rounded-full border-2 border-dashed border-gray-300" title="Custom color">
                <Plus className="h-3 w-3 text-gray-400" />
                <input type="color" value={color} onChange={e => { setColor(e.target.value); if (tool === "eraser") setTool("pen"); }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </label>
            </div>
            <div className="flex items-center gap-1 px-0.5">
              <span className="mr-1 text-[10px] font-semibold text-gray-400">Size</span>
              {(["s", "m", "l"] as Size[]).map(s => {
                const dot = s === "s" ? 4 : s === "m" ? 7 : 11;
                return (
                  <button key={s} type="button" onClick={() => setSize(s)} title={s === "s" ? "Thin" : s === "m" ? "Medium" : "Thick"}
                    className={`grid h-6 flex-1 place-items-center rounded-md transition ${size === s ? "bg-primary-50 ring-1 ring-primary-200" : "hover:bg-gray-50"}`}>
                    <span className="rounded-full bg-gray-700" style={{ width: dot, height: dot }} />
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-gray-100" />
            <button type="button" onClick={clearBoard}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 py-1.5 text-[11px] font-semibold text-red-500 transition hover:bg-red-100">
              <Trash2 className="h-3.5 w-3.5" /> Clear board
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setToolsOpen(true)}
            className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg backdrop-blur hover:bg-white">
            <Wrench className="h-3.5 w-3.5" /> Tools
          </button>
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-gray-500 shadow-sm ring-1 ring-gray-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Shared live with your partner
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) insertImageFile(f); }} />
      </div>
    </div>
  );
}
