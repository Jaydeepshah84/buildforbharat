import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openai } from "../config/llm";
import { config } from "../config/env";
import type { TutorRequest, TutorResponse } from "../types/tutor";

// ── PHASE 1: Quick text explanation (fast) ──
export async function generatePhase1(request: TutorRequest): Promise<TutorResponse> {
  const response = await openai.chat.completions.create({
    model: config.azure.deployment,
    messages: [
      { role: "system", content: `You are a warm, encouraging teacher talking directly to one student. Explain the question in a SHORT, friendly way (3-5 sentences) — clear, in plain everyday words, explaining the WHY with a simple relatable example, not a dry textbook definition. Then give 3 key definitions in simple language. No HTML.
Student level: ${request.class_level}
Language: ${request.language === "hi" ? "Hindi" : "English"}

RESPOND EXACTLY:
<TITLE>title</TITLE>
<SUBJECT>physics|math|chemistry|biology|dsa|programming|general</SUBJECT>
<EXPLANATION>Short plain text explanation.</EXPLANATION>
<DEFINITIONS>Term1: def1\nTerm2: def2\nTerm3: def3</DEFINITIONS>
<VOICE_SCRIPT>Short narration text.</VOICE_SCRIPT>` },
      { role: "user", content: request.question },
    ],
    temperature: 0.5,
    max_completion_tokens: 800,
  });

  const content = response.choices[0]?.message?.content || "";
  const title = extractTag(content, "TITLE") || "AI Explanation";
  const subject = extractTag(content, "SUBJECT") || "general";
  const explanation = strip(extractTag(content, "EXPLANATION") || "");
  const voiceScript = strip(extractTag(content, "VOICE_SCRIPT") || explanation);
  const definitions = extractTag(content, "DEFINITIONS").split("\n")
    .filter(l => l.includes(":")).map(l => { const [t, ...r] = l.split(":"); return { term: t.trim(), meaning: r.join(":").trim() }; })
    .filter(d => d.term && d.meaning).slice(0, 5);

  const visual_code = `<!DOCTYPE html><html><head><style>
body{background:#0f172a;color:white;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;flex-direction:column}
.loader{width:50px;height:50px;border:4px solid rgba(255,255,255,0.1);border-top:4px solid #818cf8;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
h2{margin-top:20px;color:#818cf8}p{color:rgba(255,255,255,0.5);margin-top:10px}
</style></head><body>
<div class="loader"></div><h2>${title}</h2><p>Generating full animation...</p>
<script>let paused=false;window.startAnimation=function(){};window.pauseAnimation=function(){};window.resumeAnimation=function(){};window.restartAnimation=function(){};</script>
</body></html>`;

  return { title, steps: [], visual_code, voice_script: voiceScript, explanation, definitions, language: request.language, subject, question_type: "conceptual", difficulty: 5 };
}

// ── Build the Phase-2 animation prompt (shared by the streaming pipeline + Claude-CLI provider) ──
export function buildPhase2Prompt(request: TutorRequest): string {
  const lang = request.language === "hi" ? "Hindi (Devanagari)" : request.language === "gu" ? "Gujarati" : request.language === "es" ? "Spanish" : "English";
  return `Design a 4-5 step animated lesson as JSON. The frontend renders it deterministically. One narration sentence per step; sentences and scenes are 1:1.

Schema:
Spec { totalDuration, canvas:{width:1280,height:720,bg:"#0f172a"}, steps:Step[] }
Step { narration (one 12-25 word sentence), scene:Obj[] }
Obj { id, type:"text"|"emoji"|"shape"|"arrow", x,y (0..1 normalized), text?, emoji?, shape?:"rect"|"circle"|"line", to?:{x,y} (arrows), color?, bg?, fontSize?, fontWeight?, enter?:"fade"|"pop"|"slide-up", highlight? }

RULES:
- NARRATION VOICE — you are a warm, friendly teacher speaking directly to ONE student. Each step's narration is one natural spoken sentence (12-22 words) that:
  • sounds human and encouraging, like a real teacher ("Let's start with...", "See how...", "Now watch what happens...", "Great — so...").
  • explains the WHY, not just the what, in plain everyday words a ${request.class_level} student understands.
  • builds on the previous step so it feels like a continuous lesson, ending with a clear takeaway.
  Avoid dry textbook definitions and jargon; if a term is needed, explain it simply in the same breath.
- KEEP IT SIMPLE AND LITERAL. Show the concept concretely with the exact objects it describes — do NOT make it abstract, wordy, or complex. A child should instantly "see" the idea. One clear idea per step.
- Each step's scene = COMPLETE visible state (no carryover). Reuse same id across steps → smooth tween.
- NARRATION ↔ SCENE 1:1. "2 apples" means exactly 2 apple emoji objects — show the real count, never a number instead of the objects.
- Step 0 = title card: ONE big centered text object only (the topic). Keep it tiny so it renders instantly.
- Illustrate with the concept's REAL objects as emojis — count must be exact (three cats = 🐱🐱🐱). Use emojis that literally match (apple=🍎, water=💧, sun=☀️, plant=🌱). Don't pad with unrelated decoration; show only what the concept needs.
- Do NOT add empty/decorative boxes or rectangles. Only use a shape object when it holds a specific value or represents something concrete. Emojis + labels + operators/arrows are enough.
- Vary colors (bright: #38bdf8, #a78bfa, #34d399, #fbbf24, #fb7185) and entrance (pop/fade/slide-up) so it feels lively.
- BIG text (fontSize≥60) is ONLY for SHORT results: a number, an equation answer, or 1-3 words (max ~12 characters). NEVER put a long sentence in big text — long summaries belong in the narration only, not on screen.
- Last step: KEEP the visuals on screen and reveal the answer. Numeric/short answer → show it big (fontSize≥96, color="#facc15", highlight:true) at y=0.78, clear of the icons. No short answer → keep the labelled diagram; narration states the conclusion. Never end mid-computation.
- Any text longer than ~15 characters must use fontSize ≤ 32 (it's a caption, not a headline).

SIMPLE MATH — build it up literally with countable emojis. WORKED EXAMPLE for "2 + 2":
  step0: title "2 + 2 = ?"
  step1: 🍎🍎 on the left (x≈0.25 & 0.35, y=0.45) + a "+" text (x=0.5) — narration "Here are 2 apples."
  step2: keep those, add 🍎🍎 on the right (x≈0.65 & 0.75) — narration "Add 2 more apples."
  step3: add "=" (x=0.85) and show all four 🍎🍎🍎🍎 together, narration "Now we count them all."
  step4: big highlighted "4" at y=0.78, narration "So 2 plus 2 equals 4."
  → Always show the actual objects being counted, then the number. Same pattern for any counting/arithmetic.
DOMAIN PLAYBOOK — be smart and pick the right visual for the topic type:
- DATA STRUCTURES (B-tree, binary tree/BST, heap, linked list, graph, stack, queue, hash table): draw each NODE as a shape ("rect" or "circle", bg:"#1e293b", color:"#38bdf8") with the node's value as a TEXT object (color:"#f8fafc", fontSize 32-40) at EXACTLY the SAME x,y as its shape. NEVER show a node value without its shape, and never put a value beside a shape instead of inside it. A node that holds SEVERAL keys (B-tree, 2-3 tree): ONE rect with w = 0.1 × (number of keys) + 0.04, and each key as its own text INSIDE it: same y as the rect, x spaced 0.1 apart and centred on the rect's x. Connect nodes with arrows (type:"arrow") to show edges/pointers/parent-child links. Trees are TOP-DOWN: root ~y=0.22, children ~y=0.5, leaves ~y=0.75, and spread children evenly UNDER their parent. Build one level (or node) per step; highlight:true the node being inserted/searched/visited. (e.g. a B-tree: draw the root box with its keys, then child boxes below linked by arrows.)
- ALGORITHMS (sorting, searching, recursion): draw the array as a ROW of shape:"rect" cells (bg:"#1e293b"), each with its value as a text (color:"#f8fafc") at EXACTLY the cell's x,y; highlight the cells being compared/swapped that step; show ONE operation per step and the state after it.
- MATH: arithmetic → countable emojis then the number (see example above). Equations/algebra → build the expression from text terms + operators, then reveal the result big. Geometry → shapes ("rect"/"circle"/"line") with labelled sides/angles. Graphs → two lines as axes + points/a line.
- BIOLOGY: a labelled diagram — emojis/shapes for parts (🫀 heart, 🧠 brain, 🌱 plant, 🦠 cell, 🧬 DNA) each with a text label beside it, and arrows for any process/flow.
- CHEMISTRY: atoms as circles with the element symbol as text inside; bonds as lines/arrows; a reaction shows reactants → arrow → products.
- PHYSICS: the object (emoji/shape) + labelled force/motion arrows (type:"arrow") + short text labels (e.g. "Force", "10 N", "v").
- HISTORY / GEOGRAPHY / GENERAL: a few relevant labelled emojis, or a left→right timeline/flow connected by arrows.
Whatever the question is, choose the layout above that fits it (if unsure, use labelled emojis + arrows). Keep every diagram minimal, factually correct, and clearly labelled.
- FLOW / PROCESS / SEQUENCE topics (food chain, water cycle, life cycle, digestion, any "A→B→C" process): lay the stages LEFT→RIGHT on one row and connect EACH consecutive pair with an arrow (type:"arrow") pointing forward, so the direction of flow is obvious. Include the real starting source (e.g. ☀️ sun for a food chain; 💧/☀️ for the water cycle). Build one new stage per step, keeping the arrows, and the final step shows the full chain with all arrows.

PLACEMENT (critical for a clean look — follow exactly):
- Coordinates are 0..1. Keep everything inside x:0.08..0.92, y:0.15..0.90. Title row y=0.10.
- NEVER place two objects at the same spot. Objects on the same row must be ≥0.14 apart in x. Rows must be ≥0.18 apart in y.
- Main icons/emojis sit on a row around y=0.45, spread evenly across x (e.g. 3 items → x=0.30,0.50,0.70; 4 items → x=0.22,0.41,0.59,0.78).
- A caption goes DIRECTLY BELOW its icon: same x, y = icon_y + 0.16, fontSize 22-26. Don't overlap the icon.
- Arrows (type:"arrow", from = its x,y, to = {x,y}): connect the CENTERS of two DIFFERENT objects to show flow/relationship. from and to must differ by ≥0.15. The renderer auto-trims the ends, so use the objects' real centers. Use arrows to link stages (e.g. sun→plant, evaporation→cloud).
- Emojis: fontSize 90-120. Body text: 26-34. Title: 44-56. Result: ≥96.
- Balance the scene left-to-right; don't cluster everything in one corner. Fill the space evenly.

Language: ${lang}. Narration in this language. Numbers/operators universal.
Student level: ${request.class_level}.

RESPOND EXACTLY in THIS ORDER (no preamble, no markdown fences). Output TITLE then ANIMATION_JSON FIRST, then the rest:
<TITLE>short title</TITLE>
<ANIMATION_JSON>{"totalDuration":<ms>,"canvas":{"width":1280,"height":720,"bg":"#0f172a"},"steps":[/* 4-5 steps, step 0 = title card */]}</ANIMATION_JSON>
<SUBJECT>physics|math|chemistry|biology|dsa|programming|general</SUBJECT>
<DIFFICULTY>1-10</DIFFICULTY>
<EXPLANATION>2-3 sentence summary.</EXPLANATION>
<DEFINITIONS>Term1: def1\\nTerm2: def2\\nTerm3: def3</DEFINITIONS>`;
}

// ── PHASE 2: Structured animation spec (JSON) — streaming via the OpenAI-compatible provider ──
export async function generatePhase2(request: TutorRequest): Promise<TutorResponse> {
  const prompt = buildPhase2Prompt(request);
  const t0 = Date.now();
  // Runaway guard: a model occasionally keeps generating long after the response is
  // complete (one GLM-5 run streamed 73 KB over 5 minutes for a 5-step lesson). Abort
  // as soon as the final tag has closed, or when size/time limits are exceeded.
  const PHASE2_MAX_CHARS = 60_000;
  const PHASE2_MAX_MS = 180_000;
  const abort = new AbortController();
  // Stream the response so we can emit progress events as steps complete.
  const stream = await openai.chat.completions.create({
    model: config.azure.deployment,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: request.question },
    ],
    temperature: 0.4,
    // A rich 5-step scene runs ~2.5-3.5k tokens; leave headroom so the last steps
    // are never cut off (the old 5000 cap was sized for Groq's free tier).
    max_completion_tokens: 8000,
    stream: true,
  }, { signal: abort.signal });

  let content = "";
  let stepsArrayStart = -1;
  let stepsEmitted = 0;   // step objects consumed from the stream (parseable or not)
  let stepsSent = 0;      // steps actually delivered — indices must be contiguous or the player stalls
  let titleSent = false;
  const onStep = (request as any)._onStep as
    | ((idx: number, step: import("../types/tutor").AnimationStepSpec) => void)
    | undefined;
  const onTitle = (request as any)._onTitle as ((title: string) => void) | undefined;

  let stopReason = "";
  try {
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content || "";
    if (!delta) continue;
    content += delta;

    // Everything we need has arrived once the last tag closes; stop consuming so a
    // looping model cannot hold the lesson open for minutes.
    if (/<\/DEFINITIONS>/i.test(content)) { stopReason = "complete"; abort.abort(); break; }
    if (content.length > PHASE2_MAX_CHARS) { stopReason = `over ${PHASE2_MAX_CHARS} chars`; abort.abort(); break; }
    if (Date.now() - t0 > PHASE2_MAX_MS) { stopReason = `over ${PHASE2_MAX_MS / 1000}s`; abort.abort(); break; }

    // Emit the title the instant it closes — lets the frontend paint a header
    // immediately, well before any steps finish.
    if (!titleSent && onTitle) {
      const tm = content.match(/<TITLE>([\s\S]*?)<\/TITLE>/i);
      if (tm) {
        titleSent = true;
        onTitle(tm[1].trim());
      }
    }

    // Locate the start of the steps array exactly once. Prefer inside the
    // <ANIMATION_JSON> tag, but fall back to the first "steps":[ anywhere — so it
    // still streams even if the model omits the tag or wraps the JSON in fences.
    if (stepsArrayStart === -1) {
      const anim = content.indexOf("<ANIMATION_JSON>");
      const from = anim === -1 ? 0 : anim;
      const sIdx = content.indexOf('"steps":[', from);
      if (sIdx === -1) continue;
      stepsArrayStart = sIdx + '"steps":['.length;
    }

    // Emit each newly-completed step in the JSON array. Brace-balanced scanning
    // (string-aware) lets us extract complete `{...}` step objects from the
    // partial stream as soon as they're structurally closed.
    if (onStep) {
      const completed = extractCompleteSteps(content, stepsArrayStart);
      while (stepsEmitted < completed.length) {
        try {
          const step = JSON.parse(repairJson(completed[stepsEmitted]));
          if (step && typeof step.narration === "string" && Array.isArray(step.scene)) {
            // Filter scene to valid objects only (mirrors final parser).
            step.scene = normalizeScene(step.scene.filter(isValidSceneObject));
            if (step.scene.length > 0 && step.narration.trim()) onStep(stepsSent++, step);
          }
        } catch (e: any) {
          console.warn(`[AI] Streamed step ${stepsEmitted} is not valid JSON, skipping: ${e?.message}`);
        }
        stepsEmitted++;
      }
    }
  }
  } catch (e: any) {
    // Our own abort surfaces as an error from the iterator; anything else is real.
    if (!abort.signal.aborted) throw e;
  }
  if (stopReason && stopReason !== "complete") console.warn(`[AI] Phase-2 stream cut off (${stopReason}); using what was received.`);

  console.log(`[AI] Animation spec generated in ${Date.now() - t0}ms, length: ${content.length}`);
  const parsed = parseResponse(content, request);
  if (parsed.animation_spec) {
    const s = parsed.animation_spec;
    console.log(`[AI] Spec: ${s.steps.length} steps, ${s.steps.reduce((a, x) => a + x.scene.length, 0)} total objects. Final narration: "${s.steps[s.steps.length - 1]?.narration?.slice(0, 80)}"`);
  } else {
    console.warn(`[AI] No valid animation_spec parsed. Falling back to legacy path.`);
  }
  return parsed;
}

export async function generateDynamicResponse(request: TutorRequest): Promise<TutorResponse> {
  return generatePhase2(request);
}

/**
 * Provider-agnostic, non-streaming animation generation. Uses the SAME phase-2 prompt
 * and parser as the live pipeline, but the completion can come from:
 *   - "claude-cli": the local Claude Code CLI (subscription auth, headless print mode)
 *   - "openai":     the existing OpenAI-compatible provider (Azure/Groq/OpenAI)
 * Claude CLI falls back to the OpenAI provider automatically on any failure, so the
 * existing integration always remains a working fallback.
 */
export async function generateAnimationSpec(
  request: TutorRequest,
  opts?: { provider?: "claude-cli" | "openai" }
): Promise<TutorResponse & { _provider: string }> {
  const provider = opts?.provider || (process.env.ANIMATION_PROVIDER as any) || "openai";
  const prompt = buildPhase2Prompt(request);

  if (provider === "claude-cli") {
    try {
      const { runClaudeCli } = await import("./claudeCli");
      const content = await runClaudeCli(`${prompt}\n\nTOPIC / QUESTION: ${request.question}`);
      const parsed = parseResponse(content, request);
      if (parsed.animation_spec) return { ...parsed, _provider: "claude-cli" };
      console.warn("[Animation] Claude CLI returned no valid spec — falling back to OpenAI provider.");
    } catch (e: any) {
      console.warn(`[Animation] Claude CLI failed (${e.message}) — falling back to OpenAI provider.`);
    }
  }

  // OpenAI-compatible provider (existing Azure/Groq/OpenAI integration) — primary or fallback.
  const resp = await openai.chat.completions.create({
    model: config.azure.deployment,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: request.question },
    ],
    temperature: 0.4,
    max_completion_tokens: 5000,
  });
  const content = (resp.choices?.[0]?.message?.content as string) || "";
  return { ...parseResponse(content, request), _provider: "openai" };
}

function parseResponse(content: string, request: TutorRequest): TutorResponse {
  const title = extractTag(content, "TITLE") || "AI Explanation";
  const subject = extractTag(content, "SUBJECT") || "general";
  const difficulty = parseInt(extractTag(content, "DIFFICULTY") || "5", 10);
  const explanation = strip(extractTag(content, "EXPLANATION") || "");

  // Primary path: parse the structured animation_spec. If that fails (missing/broken
  // tag, truncation, trailing commas), salvage complete steps directly from the raw
  // content so we (almost) never come up empty.
  let animationSpec = parseAnimationSpec(extractTag(content, "ANIMATION_JSON"));
  if (!animationSpec) {
    animationSpec = salvageAnimationSpec(content);
    // Keep the raw response so a malformed spec can be diagnosed after the fact.
    try {
      const dir = join(tmpdir(), "learnify-failed-specs");
      mkdirSync(dir, { recursive: true });
      const file = join(dir, `${Date.now()}-${request.question.replace(/[^a-z0-9]+/gi, "_").slice(0, 40)}.txt`);
      writeFileSync(file, content);
      console.warn(`[AI] Structured spec did not parse; raw response saved to ${file}`);
    } catch {}
  }

  // Narration is derived from the spec when present; otherwise fall back to legacy <STEPS> tag.
  const specNarrations = animationSpec ? animationSpec.steps.map(s => s.narration).filter(Boolean) : [];
  const legacyNarrations = parseStepsTag(extractTag(content, "STEPS"));
  const narrationSteps = specNarrations.length ? specNarrations : legacyNarrations;

  const voiceScript = strip(extractTag(content, "VOICE_SCRIPT") || (narrationSteps.length ? narrationSteps.join(" ") : explanation));

  // Legacy HTML path (only used when ANIMATION_JSON is absent and an old VISUAL_CODE block was emitted).
  let visualCode = extractTag(content, "VISUAL_CODE") || "";
  if (visualCode) {
    visualCode = visualCode.trim()
      .replace(/^<!\[CDATA\[\s*/i, "").replace(/\s*\]\]>$/i, "")
      .replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    visualCode = postProcess(visualCode, narrationSteps.length);
  }

  const definitions = extractTag(content, "DEFINITIONS").split("\n")
    .filter(l => l.includes(":")).map(l => { const [t, ...r] = l.split(":"); return { term: t.trim(), meaning: r.join(":").trim() }; })
    .filter(d => d.term && d.meaning).slice(0, 5);

  return {
    title,
    steps: [],
    visual_code: visualCode,
    voice_script: voiceScript,
    explanation,
    definitions,
    language: request.language,
    subject,
    question_type: "conceptual",
    difficulty,
    narration_steps: narrationSteps,
    animation_spec: animationSpec || undefined,
  };
}

function parseAnimationSpec(raw: string): import("../types/tutor").AnimationSpec | null {
  const t = (raw || "").trim();
  if (!t) return null;
  // Strip code fences if model wrapped output.
  let cleaned = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // Some models prepend a "Here is the JSON:" preamble — slice from first { to last }.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  let parsed: any;
  try {
    parsed = JSON.parse(repairJson(cleaned));
  } catch {
    return null; // caller salvages complete steps from the raw content
  }
  if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) return null;

  const canvas = {
    width: Number(parsed.canvas?.width) || 1280,
    height: Number(parsed.canvas?.height) || 720,
    bg: parsed.canvas?.bg || "#0f172a",
  };
  const steps = parsed.steps
    .map((s: any) => ({
      narration: typeof s?.narration === "string" ? strip(s.narration) : "",
      duration: typeof s?.duration === "number" ? s.duration : undefined,
      scene: Array.isArray(s?.scene) ? normalizeScene(s.scene.filter(isValidSceneObject)) : [],
    }))
    .filter((s: any) => s.narration && s.scene.length > 0);

  if (steps.length === 0) return null;

  const totalDuration = Number(parsed.totalDuration) || steps.reduce((a: number, s: any) => a + (s.duration || 3000), 0);
  const repaired = repairFinalStep(steps);
  return { totalDuration, canvas, steps: repaired };
}

// Last-resort recovery: pull every complete {...} step object out of the raw content
// via brace-matching, even if the overall JSON is untagged, truncated, or malformed.
// Guarantees we render something whenever the model produced any valid steps at all.
function salvageAnimationSpec(content: string): import("../types/tutor").AnimationSpec | null {
  const anim = content.indexOf("<ANIMATION_JSON>");
  const from = anim === -1 ? 0 : anim;
  const sIdx = content.indexOf('"steps":[', from);
  if (sIdx === -1) return null;
  const start = sIdx + '"steps":['.length;

  const chunks = extractCompleteSteps(content, start);
  const steps = chunks
    .map((c) => { try { return JSON.parse(repairJson(c)); } catch { return null; } })
    .filter(Boolean)
    .map((s: any) => ({
      narration: typeof s?.narration === "string" ? strip(s.narration) : "",
      duration: typeof s?.duration === "number" ? s.duration : undefined,
      scene: Array.isArray(s?.scene) ? normalizeScene(s.scene.filter(isValidSceneObject)) : [],
    }))
    .filter((s: any) => s.narration && s.scene.length > 0);

  if (steps.length === 0) return null;

  const bgMatch = content.match(/"bg"\s*:\s*"(#[0-9a-fA-F]{3,8})"/);
  const canvas = { width: 1280, height: 720, bg: bgMatch ? bgMatch[1] : "#0f172a" };
  const totalDuration = steps.reduce((a: number, s: any) => a + (s.duration || 3000), 0);
  console.log(`[AI] Salvaged ${steps.length} steps from malformed/untagged spec.`);
  return { totalDuration, canvas, steps: repairFinalStep(steps) };
}

// Detect specs that end on a "hanging" state — e.g. last scene shows "=" but no
// numeric/text "answer" object after it. When that happens append a final
// answer-reveal step so the user always sees a clear conclusion.
function repairFinalStep(steps: any[]): any[] {
  if (steps.length === 0) return steps;
  const last = steps[steps.length - 1];
  const scene = last.scene as any[];

  const hasEquals = scene.some((o) => o.type === "text" && typeof o.text === "string" && /^[=]\s*$/.test(o.text.trim()));
  const idsWithAnswer = scene.filter((o) => /answer|result|sum|total/i.test(o.id || ""));
  const lastTextIsTrailingEquals = scene
    .filter((o) => o.type === "text" && typeof o.text === "string")
    .map((o) => o.text.trim())
    .pop() === "=";

  // If the model already produced a clearly named result OR the last text is not just "=", trust it.
  if (idsWithAnswer.length > 0 || !hasEquals || !lastTextIsTrailingEquals) return steps;

  // Otherwise append a final reveal step that keeps the prior scene and adds an "answer" placeholder.
  // We can't compute the answer, but a "?" → big highlighted "?" is better than a frozen partial scene
  // and signals to the renderer / user that the model did not finish; this is rare with the new prompt.
  const reveal = {
    narration: last.narration?.replace(/\.$/, "") + ", and the result appears here.",
    duration: 2500,
    scene: [
      ...scene,
      {
        id: "answer_reveal",
        type: "text",
        x: 0.85,
        y: scene.find((o) => /^=$/.test((o.text || "").trim()))?.y ?? 0.5,
        text: "?",
        fontSize: 120,
        color: "#facc15",
        fontWeight: 800,
        enter: "pop",
        highlight: true,
      },
    ],
  };
  console.warn("[AI] Repaired hanging final step (no result element found).");
  return [...steps, reveal];
}

// ── Scene normalization: keep node boxes and their labels consistent ─────────
// The prompt asks for every node/array cell as a shape with its value text at the
// same x,y, but the model regularly (a) draws ONE default-size box for a multi-key
// node and places the keys just outside it ("10 [box] 20"), (b) puts a label such
// as "10  20" in a box too narrow for it, or (c) drops the box entirely and leaves
// a dark-coloured value floating on the dark canvas. These passes repair each case
// so the renderer always shows values inside boxes.
const NODE_BOX_W = 0.09;   // renderer default shape width  (fraction of canvas width)
const NODE_BOX_H = 0.09;   // renderer default shape height (fraction of canvas height)
const CANVAS_W_PX = 1280;
const LABEL_MAX_CHARS = 8;

function colorLuminance(c?: string): number | null {
  if (!c) return null;
  const s = c.trim().toLowerCase();
  let r: number, g: number, b: number, a = 1;
  const hex = s.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map((ch) => ch + ch).join("");
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
    if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
  } else {
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (!m) return s === "black" ? 0 : s === "white" ? 1 : null;
    const parts = m[1].split(",").map((v) => parseFloat(v));
    [r, g, b] = parts; if (parts.length > 3) a = parts[3];
  }
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  // A translucent fill over the dark canvas reads as dark.
  return a < 0.5 ? Math.min(lum, 0.2) : lum;
}
const isDarkColor = (c?: string) => { const l = colorLuminance(c); return l !== null && l < 0.35; };
const isLightColor = (c?: string) => { const l = colorLuminance(c); return l === null || l > 0.6; };

function isShortLabel(o: any): boolean {
  return o.type === "text" && typeof o.text === "string" && o.text.trim().length > 0 && o.text.trim().length <= LABEL_MAX_CHARS && !o.bg;
}
// Approximate rendered width of a label, as a fraction of canvas width.
function labelWidthFrac(o: any): number {
  const fs = typeof o.fontSize === "number" ? o.fontSize : 28;
  return ((o.text || "").trim().length * fs * 0.62 + 40) / CANVAS_W_PX;
}

export function normalizeScene(input: any[]): any[] {
  const scene = input.map((o) => ({ ...o }));
  const boxes = scene.filter((o) => o.type === "shape" && o.shape !== "line");
  const labels = scene.filter(isShortLabel);
  const arrows = scene.filter((o) => o.type === "arrow" && o.to);
  const boxW = (b: any) => (typeof b.w === "number" ? b.w : NODE_BOX_W);
  const boxH = (b: any) => (typeof b.h === "number" ? b.h : typeof b.w === "number" ? b.w : NODE_BOX_H);
  const inside = (t: any, b: any) => Math.abs(t.x - b.x) <= boxW(b) / 2 && Math.abs(t.y - b.y) <= boxH(b) / 2;
  const nearestBox = (t: any) => boxes.reduce((best: any, b: any) => (!best || Math.hypot(t.x - b.x, t.y - b.y) < Math.hypot(t.x - best.x, t.y - best.y) ? b : best), null);
  // A label that an arrow points at / leaves from is its own node, not a key of a neighbour.
  const hasArrowEnd = (t: any) => arrows.some((a) => Math.hypot(a.x - t.x, a.y - t.y) < 0.06 || Math.hypot(a.to.x - t.x, a.to.y - t.y) < 0.06);

  const claimed = new Set<string>();

  // Pass A — attach labels to boxes: snap a single value to the centre, widen a box
  // whose keys sit beside it (multi-key node), and fit a box to a long label.
  for (const box of boxes) {
    const w = boxW(box), h = boxH(box);
    const cands = labels.filter((t) =>
      !claimed.has(t.id) &&
      nearestBox(t) === box &&
      Math.abs(t.y - box.y) <= h / 2 + 0.04 &&
      (inside(t, box) || (Math.abs(t.x - box.x) <= w / 2 + 0.10 && !hasArrowEnd(t)))
    );
    if (cands.length === 0) continue;
    cands.forEach((t) => claimed.add(t.id));

    if (cands.length === 1) {
      const t = cands[0];
      t.x = box.x; t.y = box.y;
      box.w = Math.max(w, labelWidthFrac(t));
      if (typeof box.h !== "number" && typeof box.w === "number" && box.w !== w) box.h = h; // keep height when only width grew
    } else {
      cands.sort((a, b) => a.x - b.x);
      const first = cands[0], last = cands[cands.length - 1];
      box.x = (first.x + last.x) / 2;
      box.w = Math.max(w, last.x - first.x + Math.max(labelWidthFrac(first), labelWidthFrac(last)) + 0.02);
      if (typeof box.h !== "number") box.h = h;
      cands.forEach((t) => { t.y = box.y; });
    }
    // Keep the value readable against the box fill.
    const fill = box.bg || box.color;
    for (const t of cands) {
      if (isDarkColor(fill) && isDarkColor(t.color)) t.color = "#f8fafc";
      else if (isLightColor(fill) && colorLuminance(fill) !== null && isLightColor(t.color)) t.color = "#0f172a";
    }
  }

  // Pass B — a dark label with no box would vanish on the dark canvas: the model
  // meant a node box and forgot it. Add the box (light text on the app's dark tint).
  const injected: any[] = [];
  for (const t of labels) {
    if (claimed.has(t.id) || boxes.some((b) => inside(t, b))) continue;
    if (!isDarkColor(t.color)) continue;
    injected.push({
      id: `${t.id}__box`, type: "shape", shape: "rect", x: t.x, y: t.y,
      w: Math.max(NODE_BOX_W, labelWidthFrac(t)), h: NODE_BOX_H,
      bg: "#1e293b", color: "#38bdf8", enter: t.enter, highlight: t.highlight,
    });
    t.color = "#f8fafc";
  }
  // Longer dark captions just need to be readable.
  for (const o of scene) {
    if (o.type === "text" && !o.bg && !isShortLabel(o) && isDarkColor(o.color)) o.color = "#e2e8f0";
  }

  // Boxes first so they sit under their labels even without z-index support.
  return [...injected, ...scene];
}

function isValidSceneObject(o: any): boolean {
  if (!o || typeof o !== "object") return false;
  if (typeof o.id !== "string" || !o.id) return false;
  if (!["text", "emoji", "image", "shape", "arrow"].includes(o.type)) return false;
  if (typeof o.x !== "number" || typeof o.y !== "number") return false;
  return true;
}

function parseStepsTag(raw: string): string[] {
  const t = (raw || "").trim();
  if (!t) return [];
  // Strip code fences if model wrapped them.
  const cleaned = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) {
      return arr.map(s => typeof s === "string" ? strip(s) : "").filter(s => s && s.length > 2);
    }
  } catch {}
  // Fallback: line-by-line bullets.
  return cleaned.split(/\n+/).map(l => strip(l.replace(/^[-*\d.\s"\[\],]+/, ""))).filter(l => l.length > 5);
}

function extractTag(content: string, tag: string): string {
  const m = content.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

// Scan a partial JSON buffer for top-level `{...}` step objects inside the
// `steps: [` array. Returns each completed step's JSON substring in order.
// String-aware brace matching — handles quoted braces and escapes.
// Is the quote at `i` the END of a JSON string? Real closing quotes are followed
// (after whitespace) by a structural character; anything else means the model put
// an unescaped quote inside the text, e.g. "See how the "root" sits on top".
function isClosingQuote(text: string, i: number): boolean {
  let j = i + 1;
  while (j < text.length && (text[j] === " " || text[j] === "\t" || text[j] === "\n" || text[j] === "\r")) j++;
  if (j >= text.length) return true;
  return ",:}]".includes(text[j]);
}

// Make model JSON parseable: escape unescaped quotes and raw newlines inside
// strings, drop /* */ and // comments outside strings, strip trailing commas.
export function repairJson(text: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") { out += c + (text[i + 1] ?? ""); i++; continue; }
      if (c === '"') {
        if (isClosingQuote(text, i)) { inString = false; out += c; } else out += '\\"';
        continue;
      }
      if (c === "\n") { out += "\\n"; continue; }
      if (c === "\r") { continue; }
      if (c === "\t") { out += "\\t"; continue; }
      out += c;
      continue;
    }
    if (c === '"') { inString = true; out += c; continue; }
    if (c === "/" && text[i + 1] === "*") { const end = text.indexOf("*/", i + 2); i = end === -1 ? text.length : end + 1; continue; }
    if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    out += c;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

// Scan a partial JSON buffer for top-level `{...}` step objects inside the
// steps array. String-aware (with the same inner-quote tolerance as repairJson)
// so a quote inside a narration cannot swallow every later step.
function extractCompleteSteps(content: string, stepsArrayStart: number): string[] {
  const out: string[] = [];
  let depth = 0;
  let inString = false;
  let stepStart = -1;

  for (let i = stepsArrayStart; i < content.length; i++) {
    const c = content[i];
    if (inString) {
      if (c === "\\") { i++; continue; }
      if (c === '"' && isClosingQuote(content, i)) inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === "/" && content[i + 1] === "*") { const end = content.indexOf("*/", i + 2); if (end === -1) break; i = end + 1; continue; }
    if (c === "{") {
      if (depth === 0) stepStart = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && stepStart !== -1) {
        out.push(content.slice(stepStart, i + 1));
        stepStart = -1;
      }
    } else if (c === "]" && depth === 0) {
      break;
    }
  }
  return out;
}

function postProcess(code: string, expectedSteps: number = 0): string {
  if (!code) return code;
  code = code.replace(/<button[\s\S]*?<\/button>/gi, "");

  // Inject pause/resume + postMessage bridge if missing.
  if (!code.includes("window.pauseAnimation")) {
    const ctrl = [
      `let __paused=false;`,
      `function sleep(ms){return new Promise(r=>{const c=()=>{if(__paused)setTimeout(c,50);else setTimeout(r,ms)};c();});}`,
      `window.pauseAnimation=function(){__paused=true;};`,
      `window.resumeAnimation=function(){__paused=false;};`,
      `window.restartAnimation=function(){__paused=false;if(typeof window.showStep==='function')window.showStep(0);else location.reload();};`,
      `window.startAnimation=function(){__paused=false;};`,
    ].join("\n") + "\n";
    code = code.replace(/<script>/, "<script>\n" + ctrl);
  }

  // Always inject postMessage bridge that supports showStep(idx) with payload.
  if (!code.includes("__animControlBridge")) {
    const bridge = [
      `window.__animControlBridge=true;`,
      `window.addEventListener('message',function(e){`,
      `  var d=e.data;if(!d||d.type!=='animControl')return;`,
      `  if(d.fn==='showStep'&&typeof window.showStep==='function'){try{window.showStep(d.idx|0);}catch(err){}return;}`,
      `  if(typeof window[d.fn]==='function'){try{window[d.fn]();}catch(err){}}`,
      `});`,
    ].join("\n") + "\n";
    code = code.replace(/<script>/, "<script>\n" + bridge);
  }

  const hasShowStep = /window\.showStep\s*=/.test(code) || /function\s+showStep\s*\(/.test(code);

  if (hasShowStep) {
    // Step-driven mode: ensure step 0 renders on load, do NOT auto-advance.
    if (!/window\.showStep\s*\(\s*0\s*\)/.test(code)) {
      const init = `\n;(function(){setTimeout(function(){try{if(typeof window.showStep==='function')window.showStep(0);}catch(e){}},80);})();\n`;
      const idx = code.lastIndexOf("</script>");
      if (idx !== -1) code = code.slice(0, idx) + init + code.slice(idx);
    }
    return code;
  }

  // Legacy auto-run fallback (no showStep): keep old behaviour.
  const hasAutoCall = /(?:startSort|main|animate|run|start|begin|init|play|execute|sort|bubbleSort)\s*\(\s*\)\s*;?\s*(?:<\/script>|$)/i.test(code)
    || /setTimeout\s*\(\s*(?:main|startSort|animate|run|start|begin|init)/i.test(code);
  if (!hasAutoCall) {
    const auto = `\n;(function(){setTimeout(function(){var f=['main','startSort','animate','run','start','begin','init','play','execute','demo','sort','draw','simulate','bubbleSort','runAnimation'];for(var i=0;i<f.length;i++){try{if(typeof window[f[i]]==='function'){window[f[i]]();return;}}catch(e){}}},600);})();\n`;
    const idx = code.lastIndexOf("</script>");
    if (idx !== -1) code = code.slice(0, idx) + auto + code.slice(idx);
  }
  return code;
}

function strip(t: string): string {
  return t.replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\*\*/g, "").replace(/\n{3,}/g, "\n\n").trim();
}
