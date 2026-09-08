/**
 * Client helpers for sign-language lesson mode: narration text → SiGML for the 3D avatar.
 * The backend does text → gloss (LLM) → SiGML; results are cached here per sentence so replays,
 * pauses and regenerations never wait on the LLM twice.
 */

export interface SignData {
  text: string;
  gloss: string;
  sigml: string;
  signCount: number;
  estimatedMs: number;
  known?: string[];
  spelled?: string[];
  source?: "cache" | "llm" | "fallback";
}

export function getApiBase(): string {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return `http://${window.location.hostname}:5050/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const cache = new Map<string, Promise<SignData | null>>();

/** Text → { gloss, sigml, … }. Resolves null when the sign service is unavailable. */
export function fetchSigns(text: string, opts: { maxWords?: number; signal?: AbortSignal } = {}): Promise<SignData | null> {
  const clean = (text || "").trim();
  if (!clean) return Promise.resolve(null);
  const maxWords = opts.maxWords ?? 8;
  const key = `${maxWords}|${clean}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const p = (async () => {
    try {
      const resp = await fetch(`${getApiBase()}/sign-language/sigml`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text: clean, maxWords }),
        signal: opts.signal ?? AbortSignal.timeout(30000),
      });
      if (!resp.ok) throw new Error(`sign service responded ${resp.status}`);
      const data = await resp.json();
      if (!data?.sigml) throw new Error("sign service returned no SiGML");
      return data as SignData;
    } catch (err: any) {
      cache.delete(key); // let a later replay retry
      console.warn("[sign] could not prepare signs:", err?.message || err);
      return null;
    }
  })();
  cache.set(key, p);
  return p;
}

/** Split an answer into sentences short enough to sign (and read) one at a time. */
export function splitForSigning(text: string): string[] {
  const clean = (text || "")
    .replace(/[#*_`\[\]()>|]/g, "")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\.\s*\./g, ".")
    .trim();
  const parts = clean.split(/(?<=[.!?।])\s+/).map((s) => s.trim()).filter((s) => s.length > 1);
  const out: string[] = [];
  for (const part of parts) {
    const words = part.split(/\s+/);
    if (words.length <= 26) { out.push(part); continue; }
    for (let i = 0; i < words.length; i += 20) out.push(words.slice(i, i + 20).join(" "));
  }
  return out.length ? out : clean ? [clean] : [];
}

/** Pacing when the avatar cannot sign a sentence: ~400 ms per word, at least 2.5 s, so captions still advance. */
export function estimateSignMs(text: string): number {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2500, words * 400);
}
