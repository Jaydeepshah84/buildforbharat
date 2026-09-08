"use client";

import { useMemo } from "react";

// ── Types mirror the backend AnimationSpec shape ──
export interface SceneObject {
  id: string;
  type: "text" | "emoji" | "image" | "shape" | "arrow";
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotation?: number;
  scale?: number;
  opacity?: number;
  color?: string;
  bg?: string;
  text?: string;
  fontSize?: number;
  fontWeight?: number | string;
  emoji?: string;
  src?: string;
  shape?: "rect" | "circle" | "line";
  to?: { x: number; y: number };
  enter?: "fade" | "scale" | "pop" | "slide-up" | "slide-down" | "slide-left" | "slide-right";
  highlight?: boolean;
}

export interface AnimationStepSpec {
  narration: string;
  duration?: number;
  scene: SceneObject[];
}

export interface AnimationSpec {
  totalDuration: number;
  canvas: { width: number; height: number; bg?: string };
  steps: AnimationStepSpec[];
}

interface Props {
  spec: AnimationSpec;
  stepIndex: number;
  paused?: boolean;
}

export default function AnimationCanvas({ spec, stepIndex, paused = false }: Props) {
  const idx = Math.max(0, Math.min(stepIndex, spec.steps.length - 1));
  const step = spec.steps[idx];
  const aspectRatio = `${spec.canvas.width} / ${spec.canvas.height}`;

  // Build a stable map of objects — same id across steps means React reuses the DOM node, so transforms tween.
  // Objects in the current step are rendered; objects in previous step but absent now fade out gracefully.
  const previous = idx > 0 ? spec.steps[idx - 1].scene : [];
  const current = step.scene;

  // Drop "lonely" decorative shape boxes: a small shape with no text/emoji near
  // its center is just visual noise (e.g. an empty rounded box floating on an arrow).
  // Keep shapes that back an icon (something near them) or are large group containers.
  const contentPts = current.filter(o => o.type === "text" || o.type === "emoji" || o.type === "image");
  const isLonelyShape = (o: SceneObject) => {
    if (o.type !== "shape") return false;
    const big = (o.w ?? 0.09) >= 0.2 || (o.h ?? 0) >= 0.2;
    if (big) return false;
    return !contentPts.some(p => Math.hypot(p.x - o.x, p.y - o.y) < 0.12);
  };

  const merged = useMemo(() => {
    const map = new Map<string, { obj: SceneObject; visible: boolean }>();
    // First add previous-step objects as "fading out" (visible:false hides them via opacity 0).
    for (const o of previous) {
      if (!current.find(c => c.id === o.id)) map.set(o.id, { obj: o, visible: false });
    }
    // Then current objects override.
    for (const o of current) map.set(o.id, { obj: o, visible: true });
    return Array.from(map.values()).filter(({ obj }) => !isLonelyShape(obj));
  }, [previous, current]);

  const bg = spec.canvas.bg || "#0f172a";

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ aspectRatio }}>
      {/* Layered gradient backdrop with slow drift for depth */}
      <div
        className="absolute inset-0 anim-bg-pan"
        style={{
          background: `radial-gradient(circle at 28% 18%, rgba(56,189,248,0.18) 0%, transparent 52%), radial-gradient(circle at 78% 82%, rgba(129,140,248,0.22) 0%, transparent 52%), linear-gradient(135deg, ${bg} 0%, #0b1024 100%)`,
          backgroundSize: "200% 200%",
        }}
      />
      {/* Subtle dot grid for texture */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.12,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
      {/* Ambient floating particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={`p${i}`}
          className="anim-particle absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: i % 2 ? "rgba(129,140,248,0.7)" : "rgba(56,189,248,0.6)",
            boxShadow: "0 0 8px currentColor",
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      ))}

      {/* Scene container — position objects via percentages so it scales with any container size */}
      <div className="absolute inset-0">
        {merged.map(({ obj, visible }) => (
          <SceneNode key={obj.id} obj={obj} visible={visible} canvasW={spec.canvas.width} canvasH={spec.canvas.height} paused={paused} />
        ))}
      </div>

      {/* Vignette for focus */}
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 120px 40px rgba(0,0,0,0.45)" }} />

      {/* Step indicator (subtle) */}
      <div className="absolute top-3 left-3 text-[11px] text-white/40 font-mono tracking-wider">
        {idx + 1} / {spec.steps.length}
      </div>
    </div>
  );
}

// Deterministic ambient particles (no Math.random → stable across SSR/render)
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 37 + 7) % 100,
  top: (i * 53 + 11) % 100,
  size: 2 + (i % 4),
  dur: 6 + (i % 6),
  delay: i % 5,
}));

function SceneNode({ obj, visible, canvasW, canvasH, paused }: { obj: SceneObject; visible: boolean; canvasW: number; canvasH: number; paused: boolean }) {
  // Clamp into the safe viewing area so nothing renders half off-screen.
  const cx = Math.min(0.95, Math.max(0.05, obj.x));
  const cy = Math.min(0.94, Math.max(0.07, obj.y));
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${cx * 100}%`,
    top: `${cy * 100}%`,
    transform: `translate(-50%, -50%) rotate(${obj.rotation || 0}deg) scale(${obj.scale ?? 1})`,
    opacity: visible ? (obj.opacity ?? 1) : 0,
    color: obj.color || "#ffffff",
    transition: "left 0.6s cubic-bezier(0.4, 0, 0.2, 1), top 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease",
    pointerEvents: "none",
    willChange: "transform, opacity",
    // Labels always sit above boxes/arrows regardless of scene order, so a value is
    // never hidden behind the node box that was added for it.
    zIndex: obj.type === "text" || obj.type === "emoji" || obj.type === "image" ? 2 : 1,
  };

  // Convert px font size as a fraction of canvas height for responsive sizing.
  // canvas.height is the design unit; the renderer fills its parent so we use vw/vh-style relative sizing.
  let fontSizePx = obj.fontSize ?? (obj.type === "text" ? 28 : 56);
  // Guard: a big font on a LONG string produces a giant overlay that covers the
  // whole scene. Scale big fonts down as text gets longer so only short results
  // (a number, a word) stay large. ~1100/len keeps "8" huge but a full sentence small.
  if (obj.type === "text") {
    const len = (obj.text || "").trim().length;
    if (len > 14 && fontSizePx > 40) {
      fontSizePx = Math.min(fontSizePx, Math.max(26, Math.round(1100 / len)));
    }
  }
  const relFontSize = `clamp(10px, ${(fontSizePx / canvasH) * 100}cqh, ${fontSizePx * 1.2}px)`;

  const widthPct = obj.w ? `${obj.w * 100}%` : undefined;
  const heightPct = obj.h ? `${obj.h * 100}%` : undefined;

  if (obj.type === "text") {
    const isCard = !!obj.bg;
    return (
      <div
        style={{
          ...baseStyle,
          fontSize: relFontSize,
          fontWeight: obj.fontWeight ?? 700,
          fontFamily: "Inter, Arial, sans-serif",
          textAlign: "center",
          letterSpacing: "0.01em",
          background: isCard ? obj.bg : undefined,
          backdropFilter: isCard ? "blur(6px)" : undefined,
          WebkitBackdropFilter: isCard ? "blur(6px)" : undefined,
          border: isCard ? "1px solid rgba(255,255,255,0.16)" : undefined,
          padding: isCard ? "0.5em 0.9em" : 0,
          borderRadius: isCard ? "0.7em" : 0,
          boxShadow: isCard ? "0 8px 30px rgba(0,0,0,0.35)" : undefined,
          width: widthPct,
          maxWidth: "90%",
          whiteSpace: "pre-wrap",
          textShadow: obj.highlight
            ? "0 0 24px rgba(129,140,248,0.9), 0 2px 6px rgba(0,0,0,0.55)"
            : "0 2px 8px rgba(0,0,0,0.45)",
          animation: visible ? animationCss(obj.enter, paused) : undefined,
        }}
        className={obj.highlight ? "highlight-pulse" : ""}
      >
        {obj.text || ""}
      </div>
    );
  }

  if (obj.type === "emoji") {
    const entrance = animationCss(obj.enter, paused);
    const floatDur = 3.4 + (obj.id.length % 3) * 0.6;
    const floatDelay = 0.5 + (obj.id.length % 4) * 0.2;
    return (
      <div
        style={{
          ...baseStyle,
          fontSize: `clamp(24px, ${((obj.fontSize ?? 90) / canvasH) * 100}cqh, ${(obj.fontSize ?? 90) * 1.25}px)`,
          lineHeight: 1,
          filter: obj.highlight
            ? "drop-shadow(0 0 16px rgba(250,204,21,0.95))"
            : "drop-shadow(0 6px 10px rgba(0,0,0,0.45))",
          // Entrance first, then a gentle continuous float so the scene feels alive.
          animation: visible
            ? `${entrance ? entrance + ", " : ""}obj-float-kf ${floatDur}s ease-in-out ${floatDelay}s infinite`
            : undefined,
        }}
        className={obj.highlight ? "highlight-pulse" : ""}
      >
        {obj.emoji || "✦"}
      </div>
    );
  }

  if (obj.type === "image" && obj.src) {
    return (
      <img
        src={obj.src}
        alt=""
        style={{
          ...baseStyle,
          width: widthPct ?? "10%",
          height: heightPct ?? "auto",
          objectFit: "contain",
          animation: visible ? animationCss(obj.enter, paused) : undefined,
        }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  if (obj.type === "shape") {
    const isCircle = obj.shape === "circle";
    const fill = obj.bg || obj.color || "rgba(99,102,241,0.28)";
    return (
      <div
        style={{
          ...baseStyle,
          width: widthPct ?? "9%",
          height: heightPct ?? widthPct ?? "9%",
          background: `linear-gradient(145deg, ${fill}, rgba(255,255,255,0.06))`,
          border: `2px solid ${obj.color || "rgba(255,255,255,0.5)"}`,
          borderRadius: isCircle ? "50%" : "14px",
          boxShadow: obj.highlight
            ? "0 0 26px rgba(129,140,248,0.8), inset 0 1px 8px rgba(255,255,255,0.25)"
            : "0 8px 22px rgba(0,0,0,0.35), inset 0 1px 8px rgba(255,255,255,0.15)",
          animation: visible ? animationCss(obj.enter, paused) : undefined,
        }}
        className={obj.highlight ? "highlight-pulse" : ""}
      />
    );
  }

  if (obj.type === "arrow" && obj.to) {
    // Draw in the canvas's real pixel space (e.g. 1280x720) with a uniform
    // aspect ratio, so arrowheads and angles are NOT distorted (the old code
    // stretched a square viewBox onto a 16:9 area). Endpoints are pulled back
    // from the object centers so the head sits beside the target, not under it.
    const W = canvasW || 1280;
    const H = canvasH || 720;
    const x1 = obj.x * W, y1 = obj.y * H;
    const x2 = obj.to.x * W, y2 = obj.to.y * H;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const startPad = Math.min(len * 0.15, 55); // clear the source icon
    const endPad = Math.min(len * 0.2, 70);    // clear the target icon
    const sx = x1 + ux * startPad, sy = y1 + uy * startPad;
    const ex = x2 - ux * endPad, ey = y2 - uy * endPad;
    const color = obj.color || "#fbbf24";
    return (
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          pointerEvents: "none",
          opacity: visible ? (obj.opacity ?? 1) : 0,
          transition: "opacity 0.5s ease",
          filter: `drop-shadow(0 0 6px ${color}aa)`,
        }}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id={`arrow-${obj.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" fill={color} />
          </marker>
        </defs>
        <line
          x1={sx} y1={sy} x2={ex} y2={ey}
          stroke={color}
          strokeWidth={Math.max(6, H * 0.012)}
          strokeLinecap="round"
          markerEnd={`url(#arrow-${obj.id})`}
        />
      </svg>
    );
  }

  return null;
}

function animationCss(enter: SceneObject["enter"], paused: boolean): string | undefined {
  if (!enter) return undefined;
  // Entrance animations always run to completion — pausing them would freeze the
  // object at its first keyframe (opacity 0), making it invisible. The `paused`
  // prop controls narration/step flow, not whether objects are allowed to appear.
  const playState = "running";
  const duration = "0.5s";
  switch (enter) {
    case "fade":         return `obj-fade ${duration} ease-out both ${playState}`;
    case "scale":        return `obj-scale ${duration} ease-out both ${playState}`;
    case "pop":          return `obj-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both ${playState}`;
    case "slide-up":     return `obj-slide-up ${duration} ease-out both ${playState}`;
    case "slide-down":   return `obj-slide-down ${duration} ease-out both ${playState}`;
    case "slide-left":   return `obj-slide-left ${duration} ease-out both ${playState}`;
    case "slide-right":  return `obj-slide-right ${duration} ease-out both ${playState}`;
    default: return undefined;
  }
}
