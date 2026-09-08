/**
 * Learnify Animation Agent — CLI
 *
 * Generates a full animation spec for any topic through the SAME pipeline the web app
 * uses, but from the terminal. The default provider is the local Claude Code CLI
 * (subscription auth, headless `claude -p` print mode). If the CLI is unavailable or
 * returns nothing usable, it automatically falls back to the existing OpenAI-compatible
 * provider (Azure/Groq/OpenAI), so generation always works.
 *
 * Usage:
 *   npm run animation:generate -- "Explain photosynthesis to a Class 8 student"
 *   npm run animation:generate -- "How does a B-tree work" --class 12 --lang en
 *   npm run animation:generate -- "प्रकाश संश्लेषण समझाइए" --lang hi
 *   npm run animation:generate -- "2 + 2" --provider openai      # force the fallback
 *
 * Flags:
 *   --class <n|primary|middle|high_school|college>   default: 8 (middle)
 *   --lang  <en|hi|gu|es>                            default: en
 *   --provider <claude-cli|openai>                   default: claude-cli
 *   --model <name>                                   Claude CLI model override (optional)
 */
import "dotenv/config";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { generateAnimationSpec } from "../pipelines/aiGenerator";
import type { TutorRequest, ClassLevel, Language } from "../types/tutor";

function mapClass(level: string): ClassLevel {
  const known = ["primary", "middle", "high_school", "college"];
  if (known.includes(level)) return level as ClassLevel;
  const n = parseInt(level, 10);
  if (isNaN(n)) return "middle";
  if (n <= 5) return "primary";
  if (n <= 8) return "middle";
  if (n <= 12) return "high_school";
  return "college";
}

function parseArgs() {
  const args = process.argv.slice(2);
  let classLevel = "8";
  let language = "en";
  let provider: "claude-cli" | "openai" = "openai"; // gpt-5.5 via Bedrock (pass --provider claude-cli to use the local CLI)
  let model = "";
  const topicParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--class") classLevel = args[++i] ?? classLevel;
    else if (a === "--lang" || a === "--language") language = args[++i] ?? language;
    else if (a === "--provider") provider = (args[++i] as any) ?? provider;
    else if (a === "--model") model = args[++i] ?? "";
    else topicParts.push(a);
  }
  return { topic: topicParts.join(" ").trim(), classLevel, language, provider, model };
}

(async () => {
  const { topic, classLevel, language, provider, model } = parseArgs();

  if (!topic) {
    console.error(
      'Usage: npm run animation:generate -- "your topic" [--class 8] [--lang en] [--provider claude-cli|openai] [--model <name>]'
    );
    process.exit(1);
  }

  if (model) process.env.CLAUDE_CLI_MODEL = model;

  console.log(`\n🎬 Learnify Animation Agent`);
  console.log(`   Topic:    "${topic}"`);
  console.log(`   Class:    ${classLevel} (${mapClass(classLevel)})`);
  console.log(`   Language: ${language}`);
  console.log(`   Provider: ${provider}${provider === "claude-cli" ? " → falls back to OpenAI provider on failure" : ""}\n`);
  console.log(`   Generating${provider === "claude-cli" ? " via local Claude Code CLI (subscription, headless)" : ""}…\n`);

  const request: TutorRequest = {
    question: topic,
    class_level: mapClass(classLevel),
    language: language as Language,
    style: "detailed",
  };

  const t0 = Date.now();
  let result;
  try {
    result = await generateAnimationSpec(request, { provider });
  } catch (e: any) {
    console.error(`❌ Generation failed: ${e.message}`);
    process.exit(1);
  }

  const spec = result.animation_spec;
  const ms = Date.now() - t0;

  if (!spec || !spec.steps?.length) {
    console.error(`❌ No animation spec produced after ${ms}ms (provider=${result._provider}).`);
    process.exit(1);
  }

  const objCount = spec.steps.reduce((a, s) => a + (s.scene?.length || 0), 0);
  console.log(`✅ Generated via "${result._provider}" in ${ms}ms`);
  console.log(`   Title: ${result.title}`);
  console.log(`   ${spec.steps.length} steps, ${objCount} scene objects\n`);
  spec.steps.forEach((s, i) => {
    console.log(`   step ${i}: ${(s.scene?.length || 0)} objs — ${(s.narration || "").slice(0, 70)}`);
  });

  const dir = join(process.cwd(), "generated-animations");
  mkdirSync(dir, { recursive: true });
  const slug =
    topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "animation";
  const file = join(dir, `${slug}.json`);
  writeFileSync(file, JSON.stringify({ topic, provider: result._provider, ...result }, null, 2));

  console.log(`\n💾 Saved → ${file}`);
  console.log(`   Same shape the frontend AnimationCanvas / /api/tutor/pipeline consumes.\n`);
  process.exit(0);
})();
