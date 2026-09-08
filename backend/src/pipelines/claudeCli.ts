import { spawn, execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

/**
 * Claude Code CLI provider — runs a one-shot generation through the LOCAL, officially
 * supported headless mode (`claude -p`), using the user's Claude Code subscription auth.
 * No API key, no token extraction, no UI scraping — just the documented print mode.
 *
 * Binary resolution order:
 *   1. CLAUDE_CLI_PATH   (explicit override in .env)
 *   2. CLAUDE_CODE_EXECPATH (set automatically when run inside a Claude Code session)
 *   3. `claude` on PATH  (global install)
 *   4. The VS Code extension's bundled native binary (newest version)
 */
export function findClaudeBinary(): string {
  const envs = [process.env.CLAUDE_CLI_PATH, process.env.CLAUDE_CODE_EXECPATH].filter(Boolean) as string[];
  for (const c of envs) if (existsSync(c)) return c;

  try {
    const p = execSync("command -v claude", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (p && existsSync(p)) return p;
  } catch { /* not on PATH */ }

  try {
    const extDir = join(homedir(), ".vscode", "extensions");
    const dirs = readdirSync(extDir)
      .filter((d) => d.startsWith("anthropic.claude-code-"))
      .sort()
      .reverse();
    for (const d of dirs) {
      const bin = join(extDir, d, "resources", "native-binary", "claude");
      if (existsSync(bin)) return bin;
    }
  } catch { /* no vscode extension */ }

  throw new Error(
    "Claude Code CLI not found. Install the `claude` CLI (npm i -g @anthropic-ai/claude-code) " +
    "or set CLAUDE_CLI_PATH in backend/.env to the claude binary path."
  );
}

export function isClaudeCliAvailable(): boolean {
  try { findClaudeBinary(); return true; } catch { return false; }
}

interface RunOpts {
  model?: string;      // e.g. "claude-sonnet-4-5"; omit to use the account default
  timeoutMs?: number;  // default 300s — a full lesson spec + cold cache creation can take 90-150s
}

const DEFAULT_TIMEOUT_MS = 300000;

/**
 * Run a single headless prompt through the Claude Code CLI and return the plain-text
 * response. Uses `--max-turns 1` so it answers directly with no tool loops.
 */
export function runClaudeCli(prompt: string, opts: RunOpts = {}): Promise<string> {
  const bin = findClaudeBinary();
  const args = ["-p", prompt, "--output-format", "text", "--max-turns", "1"];
  const model = opts.model || process.env.CLAUDE_CLI_MODEL;
  if (model) args.push("--model", model);

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Claude CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", (d) => { err += d.toString(); });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && out.trim()) resolve(out);
      else reject(new Error(`Claude CLI exited with code ${code}: ${(err || "no output").slice(0, 400)}`));
    });
  });
}
