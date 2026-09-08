import { generatePhase1, generatePhase2, generateDynamicResponse } from "./aiGenerator";
import type { TutorRequest, TutorResponse } from "../types/tutor";

const cache = new Map<string, { data: TutorResponse; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

// In-flight dedup: when two requests for the same cache key arrive while one
// is generating (e.g. React StrictMode double-render in dev), they share the
// same Azure OpenAI call instead of firing twice.
const inFlight = new Map<string, Promise<TutorResponse>>();

function cacheKey(request: TutorRequest): string {
  const q = request.question.trim().toLowerCase().replace(/\s+/g, " ");
  return `${q}|${request.class_level}|${request.language}`;
}

export async function runTutorPipeline(request: TutorRequest, opts?: { bypassCache?: boolean }): Promise<TutorResponse> {
  const key = cacheKey(request);

  if (!opts?.bypassCache) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[Pipeline] Cache hit");
      return cached.data;
    }
    const pending = inFlight.get(key);
    if (pending) {
      console.log("[Pipeline] Joining in-flight request");
      return pending;
    }
  }

  console.log(`[Pipeline] Generating with Azure OpenAI...${opts?.bypassCache ? " (cache bypassed)" : ""}`);
  const promise = generateDynamicResponse(request)
    .then((response) => {
      cache.set(key, { data: response, timestamp: Date.now() });
      if (cache.size > 100) {
        const oldest = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
        oldest.slice(0, 50).forEach(([k]) => cache.delete(k));
      }
      return response;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export { generatePhase1, generatePhase2 };
