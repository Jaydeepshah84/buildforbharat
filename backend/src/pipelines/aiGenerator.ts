import { openai } from "../config/llm";
import { config } from "../config/env";
import type { TutorRequest, TutorResponse } from "../types/tutor";

// ── PHASE 1: Quick text explanation (fast) ──
export async function generatePhase1(request: TutorRequest): Promise<TutorResponse> {
  const response = await openai.chat.completions.create({
    model: config.azure.deployment,
    messages: [
      { role: "system", content: `You are a tutor. Give a SHORT plain-text explanation (3-5 sentences) for the student's question. Also give 3 key definitions. No HTML.
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
    max_completion_tokens: 1500,
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

// ── PHASE 2: Full HTML animation ──
export async function generatePhase2(request: TutorRequest): Promise<TutorResponse> {
  const prompt = `You write simple, clean, WORKING HTML pages that animate concepts. Your code must be short, correct, and actually work.

KEY PRINCIPLES:
1. Simple HTML structure - just divs, no complex nesting
2. Clean CSS - flexbox layout, transitions for smooth effects
3. Real JavaScript logic - actual algorithm, async/await with sleep()
4. UI updates - classList.add/remove for highlights, innerText for values
5. Narration via text element that updates at each step
6. Auto-starts immediately (no button needed)
7. Short and clean - under 120 lines total

RULES:
- Background: #0f172a, color: white, font-family: Arial
- Use flexbox for layout
- Use CSS classes for state changes (.active, .highlight, .done, .swap)
- Use async/await with sleep() for timed animation steps
- Auto-start the animation
- Show explanation text that updates at each step
- Use emoji for objects when appropriate
- NO buttons - animation starts automatically
- KEEP IT SIMPLE - under 120 lines
- ACCURACY: sorting must sort correctly, math must calculate correctly

ALSO INCLUDE these window functions at the TOP of your script:
let paused = false;
function sleep(ms) { return new Promise(r => { const c = () => { if(paused) setTimeout(c,50); else setTimeout(r,ms) }; c(); }); }
window.pauseAnimation = function(){ paused=true; };
window.resumeAnimation = function(){ paused=false; };
window.restartAnimation = function(){ paused=false; location.reload(); };
window.startAnimation = function(){ paused=false; };

Student: class_level=${request.class_level}, style=${request.style}
Language: ${request.language === "hi" ? "Hindi" : "English"}

RESPOND WITH:
<TITLE>title</TITLE>
<SUBJECT>physics|math|chemistry|biology|dsa|programming|general</SUBJECT>
<DIFFICULTY>1-10</DIFFICULTY>
<EXPLANATION>Plain text explanation. No HTML tags.</EXPLANATION>
<DEFINITIONS>Term1: def1\\nTerm2: def2\\nTerm3: def3</DEFINITIONS>
<VOICE_SCRIPT>Plain text narration.</VOICE_SCRIPT>
<VISUAL_CODE>
Your complete HTML page here.
</VISUAL_CODE>`;

  const t0 = Date.now();
  const response = await openai.chat.completions.create({
    model: config.azure.deployment,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: request.question },
    ],
    temperature: 0.4,
    max_completion_tokens: 10000,
  });

  const content = response.choices[0]?.message?.content || "";
  console.log(`[AI] Animation generated in ${Date.now() - t0}ms, length: ${content.length}`);
  return parseResponse(content, request);
}

export async function generateDynamicResponse(request: TutorRequest): Promise<TutorResponse> {
  return generatePhase2(request);
}

function parseResponse(content: string, request: TutorRequest): TutorResponse {
  const title = extractTag(content, "TITLE") || "AI Explanation";
  const subject = extractTag(content, "SUBJECT") || "general";
  const difficulty = parseInt(extractTag(content, "DIFFICULTY") || "5", 10);
  const explanation = strip(extractTag(content, "EXPLANATION") || "");
  const voiceScript = strip(extractTag(content, "VOICE_SCRIPT") || explanation);
  let visualCode = extractTag(content, "VISUAL_CODE") || "";

  visualCode = visualCode.trim()
    .replace(/^<!\[CDATA\[\s*/i, "").replace(/\s*\]\]>$/i, "")
    .replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  visualCode = postProcess(visualCode);

  const definitions = extractTag(content, "DEFINITIONS").split("\n")
    .filter(l => l.includes(":")).map(l => { const [t, ...r] = l.split(":"); return { term: t.trim(), meaning: r.join(":").trim() }; })
    .filter(d => d.term && d.meaning).slice(0, 5);

  return { title, steps: [], visual_code: visualCode, voice_script: voiceScript, explanation, definitions, language: request.language, subject, question_type: "conceptual", difficulty };
}

function extractTag(content: string, tag: string): string {
  const m = content.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function postProcess(code: string): string {
  if (!code) return code;
  code = code.replace(/<button[\s\S]*?<\/button>/gi, "");

  if (!code.includes("window.pauseAnimation")) {
    const ctrl = [
      `let paused=false;`,
      `function sleep(ms){return new Promise(r=>{const c=()=>{if(paused)setTimeout(c,50);else setTimeout(r,ms)};c();});}`,
      `window.pauseAnimation=function(){paused=true;};`,
      `window.resumeAnimation=function(){paused=false;};`,
      `window.restartAnimation=function(){paused=false;location.reload();};`,
      `window.startAnimation=function(){paused=false;};`,
      // Listen for postMessage from parent (works reliably with sandbox)
      `window.addEventListener('message',function(e){`,
      `  if(e.data&&e.data.type==='animControl'&&typeof window[e.data.fn]==='function'){window[e.data.fn]();}`,
      `});`,
    ].join("\n") + "\n";
    code = code.replace(/<script>/, "<script>\n" + ctrl);
  }

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
