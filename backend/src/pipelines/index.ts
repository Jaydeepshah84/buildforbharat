import { generatePhase1, generatePhase2, generateDynamicResponse } from "./aiGenerator";
import type { TutorRequest, TutorResponse } from "../types/tutor";

// Simple in-memory cache
const cache = new Map<string, { data: TutorResponse; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

export async function runTutorPipeline(request: TutorRequest): Promise<TutorResponse> {
  const key = `${request.question}_${request.class_level}_${request.language}_${request.style}`;
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("[Pipeline] Cache hit");
    return cached.data;
  }

  console.log("[Pipeline] Generating with Azure OpenAI...");
  const response = await generateDynamicResponse(request);
  cache.set(key, { data: response, timestamp: Date.now() });

  // Cleanup old cache entries
  if (cache.size > 100) {
    const oldest = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    oldest.slice(0, 50).forEach(([k]) => cache.delete(k));
  }

  return response;
}

export { generatePhase1, generatePhase2 };
