import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";
import { config } from "./env";

// AI engine: any OpenAI-compatible provider — configured via LLM_* in .env
// (Groq / OpenAI / Amazon Bedrock). Only the base URL, key, model name, and optional
// project header change; all read from config.azure.* (kept as `azure` so no call
// sites need editing).

// Amazon Bedrock's OpenAI-compatible endpoint requires an `OpenAI-Project` header.
// Only send it when LLM_PROJECT is set, so Groq/OpenAI aren't given an unexpected header.
const defaultHeaders = config.azure.project ? { "OpenAI-Project": config.azure.project } : undefined;

// Zhipu GLM models (glm-4.5+, glm-5) on the official Z.ai / bigmodel.cn endpoints "think"
// by default: a long hidden reasoning phase runs before any content streams, and those
// reasoning tokens also count against max_completion_tokens. Measured on the phase-2
// animation spec: ~5.5 minutes per lesson with thinking on vs ~40s (first token at ~2s)
// with it off. Disable it for GLM models unless a call sets `thinking` explicitly.
const GLM_MODEL = /^glm[-_.]/i;
const glmThinkingOff = (model: string): Record<string, any> =>
  GLM_MODEL.test(model) ? { thinking: { type: "disabled" } } : {};

// Third-party OpenAI-compatible endpoints (Z.ai, Bedrock, Groq) only honour the
// classic `max_tokens`; Z.ai silently ignores `max_completion_tokens` (a 60-token cap
// returned 2100 tokens). Mirror the cap into `max_tokens` everywhere except the
// official OpenAI API, whose reasoning models reject `max_tokens`.
const IS_OFFICIAL_OPENAI = /(^|\/\/)api\.openai\.com/i.test(config.azure.endpoint || "");
const mirrorMaxTokens = (body: Record<string, any>): Record<string, any> =>
  !IS_OFFICIAL_OPENAI && body.max_completion_tokens !== undefined && body.max_tokens === undefined
    ? { max_tokens: body.max_completion_tokens }
    : {};

// LangChain LLM (for the 9 agents)
export function createLLM(temperature = 0.7, maxTokens = 4000): ChatOpenAI {
  return new ChatOpenAI({
    apiKey: config.azure.apiKey,
    model: config.azure.deployment,
    temperature,
    modelKwargs: {
      max_completion_tokens: maxTokens,
      ...mirrorMaxTokens({ max_completion_tokens: maxTokens }),
      ...glmThinkingOff(config.azure.deployment),
    },
    configuration: { baseURL: config.azure.endpoint, defaultHeaders },
  });
}

// Raw OpenAI client (for streaming, JSON output, TTS/STT routes).
export const openai = new OpenAI({
  apiKey: config.azure.apiKey || "dummy-key-for-local-dev",
  baseURL: config.azure.endpoint || "https://api.openai.com/v1",
  defaultHeaders,
});

// Reasoning models (gpt-oss, o-series, deepseek-r1) spend token budget on internal
// "thinking" — capping it with reasoning_effort:"low" keeps long JSON outputs complete
// and fast. Standard models (gpt-4o, gpt-4o-mini) REJECT reasoning_effort, so only
// inject it for reasoning models. Any call can still override it explicitly.
const REASONING_MODEL = /gpt-oss|(^|[^a-z])o[1-9]|deepseek-r|reason/i;
const _rawCreate = openai.chat.completions.create.bind(openai.chat.completions);
(openai.chat.completions as any).create = (body: any, options?: any) => {
  const model = String(body?.model || config.azure.deployment || "");
  const extra: Record<string, any> = {};
  if (REASONING_MODEL.test(model) && body?.reasoning_effort === undefined) extra.reasoning_effort = "low";
  if (body?.thinking === undefined) Object.assign(extra, glmThinkingOff(model));
  Object.assign(extra, mirrorMaxTokens(body || {}));
  return Object.keys(extra).length ? _rawCreate({ ...extra, ...body }, options) : _rawCreate(body, options);
};
