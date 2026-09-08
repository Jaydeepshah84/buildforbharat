"use client";

/**
 * DEV-ONLY preview: renders a saved AnimationSpec at a chosen step on the real
 * AnimationCanvas, without running the AI pipeline. Used to inspect / screenshot
 * generated specs deterministically. Safe to delete.
 *
 * Usage:  /dev/anim-preview?step=2#<URL-encoded spec JSON>
 *   or:   set localStorage.animPreviewSpec to the JSON, then open /dev/anim-preview?step=2
 */
import { useEffect, useState } from "react";
import AnimationCanvas, { type AnimationSpec } from "@/components/animation/AnimationCanvas";

export default function AnimPreviewPage() {
  const [spec, setSpec] = useState<AnimationSpec | null>(null);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setStep(parseInt(params.get("step") || "0", 10) || 0);
      const fromHash = window.location.hash.length > 1 ? decodeURIComponent(window.location.hash.slice(1)) : "";
      const raw = fromHash || localStorage.getItem("animPreviewSpec") || "";
      if (!raw) { setErr("No spec. Pass it URL-encoded in the hash, or set localStorage.animPreviewSpec."); return; }
      setSpec(JSON.parse(raw));
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }, []);

  if (err) return <pre style={{ color: "#f87171", padding: 16 }}>{err}</pre>;
  if (!spec) return null;

  return (
    <div style={{ background: "#000", minHeight: "100vh", padding: 16 }}>
      <div id="anim-preview" style={{ width: 1280, height: 720, containerType: "size" } as any}>
        <AnimationCanvas spec={spec} stepIndex={step} paused />
      </div>
    </div>
  );
}
