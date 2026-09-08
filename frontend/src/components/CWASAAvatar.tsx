"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * CWASA 3D signing avatar (University of East Anglia JASigning), isolated inside an iframe
 * (/public/cwasa-player.html) so its global scripts never collide with Next.js.
 *
 * Imperative API (via ref):
 *   play(sigml) → Promise<boolean>  true when the avatar finished the whole SiGML,
 *                                    false if it was stopped, failed, or timed out.
 *   stop()                          interrupts the current play (its promise resolves false).
 *   isReady()                       the avatar model has loaded.
 *
 * The avatar is WebGL loaded from the UEA server, so it needs a real browser with network access.
 */
export type AvatarStatus = "loading" | "ready" | "playing" | "error";

export interface CWASAAvatarHandle {
  play: (sigml: string, opts?: { timeoutMs?: number }) => Promise<boolean>;
  stop: () => void;
  isReady: () => boolean;
}

interface Props {
  className?: string;
  style?: React.CSSProperties;
  /** Signing speed in CWASA log-steps (5 steps = 2×). 2 ≈ 1.3×, which keeps fingerspelling snappy. */
  speed?: number;
  avatar?: "anna" | "marc" | "francoise" | "luna";
  onStatus?: (status: AvatarStatus, message?: string) => void;
  /** Render the built-in loading / error overlays (default true). */
  overlays?: boolean;
}

const READY_TIMEOUT_MS = 45000;
const DEFAULT_PLAY_TIMEOUT_MS = 40000;

const CWASAAvatar = forwardRef<CWASAAvatarHandle, Props>(function CWASAAvatar(
  { className = "", style, speed = 2, avatar = "anna", onStatus, overlays = true },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const idRef = useRef(0);
  const pendingRef = useRef<{ id: number; resolve: (ok: boolean) => void; timer: ReturnType<typeof setTimeout> } | null>(null);
  const readyWaitersRef = useRef<Array<() => void>>([]);
  const onStatusRef = useRef(onStatus);
  useEffect(() => { onStatusRef.current = onStatus; }, [onStatus]);

  const [status, setStatus] = useState<AvatarStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const report = useCallback((s: AvatarStatus, msg?: string) => {
    setStatus(s);
    onStatusRef.current?.(s, msg);
  }, []);

  // Resolve the in-flight play. `id` undefined = whatever is pending.
  const settle = useCallback((id: number | undefined, ok: boolean) => {
    const p = pendingRef.current;
    if (!p) return;
    if (id !== undefined && id !== p.id) return;
    clearTimeout(p.timer);
    pendingRef.current = null;
    p.resolve(ok);
  }, []);

  const releaseReadyWaiters = () => readyWaitersRef.current.splice(0).forEach((fn) => fn());

  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      const d = ev.data;
      if (!d || d.source !== "cwasa") return;
      if (iframeRef.current && ev.source !== iframeRef.current.contentWindow) return; // another avatar instance
      switch (d.type) {
        case "ready":
          readyRef.current = true;
          report("ready");
          releaseReadyWaiters();
          break;
        case "playing":
          report("playing");
          break;
        case "done":
          report("ready");
          settle(typeof d.id === "number" ? d.id : undefined, !!d.completed);
          break;
        case "error":
          setErrorMsg(String(d.message || "avatar error"));
          if (!readyRef.current) {
            report("error", d.message);
            releaseReadyWaiters(); // let waiting plays fail fast instead of sitting out the timeout
          } else {
            report("ready", d.message);
          }
          if (typeof d.id === "number") settle(d.id, false);
          break;
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [report, settle]);

  // Fail any in-flight play on unmount so callers never hang.
  useEffect(() => () => settle(undefined, false), [settle]);

  function waitForReady(ms: number): Promise<void> {
    if (readyRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      readyWaitersRef.current.push(() => { clearTimeout(t); resolve(); });
    });
  }

  useImperativeHandle(ref, () => ({
    isReady: () => readyRef.current,
    stop: () => {
      iframeRef.current?.contentWindow?.postMessage({ type: "stop" }, "*");
      settle(undefined, false);
    },
    play: async (sigml, opts) => {
      settle(undefined, false); // one play at a time
      if (!readyRef.current) await waitForReady(READY_TIMEOUT_MS);
      const win = iframeRef.current?.contentWindow;
      if (!readyRef.current || !win) return false;
      const id = ++idRef.current;
      return new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => settle(id, false), opts?.timeoutMs ?? DEFAULT_PLAY_TIMEOUT_MS);
        pendingRef.current = { id, resolve, timer };
        win.postMessage({ type: "play", id, sigml }, "*");
      });
    },
  }), [settle]);

  const src = `/cwasa-player.html?speed=${encodeURIComponent(String(speed))}&avatar=${encodeURIComponent(avatar)}`;

  return (
    <div className={`relative overflow-hidden bg-[#0b1024] ${className}`} style={style}>
      <iframe
        ref={iframeRef}
        src={src}
        title="3D signing avatar"
        className="block w-full h-full border-0"
        allow="fullscreen"
      />
      {overlays && status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0b1024]/70 pointer-events-none">
          <Loader2 className="w-6 h-6 text-white/70 animate-spin" />
          <span className="text-[11px] text-white/60">Loading 3D avatar…</span>
        </div>
      )}
      {overlays && status === "error" && (
        <div className="absolute inset-x-0 bottom-0 bg-red-500/20 px-3 py-1.5 text-[11px] text-red-200">
          3D avatar unavailable{errorMsg ? `: ${errorMsg}` : ""}. Captions will keep the lesson going.
        </div>
      )}
    </div>
  );
});

export default CWASAAvatar;
