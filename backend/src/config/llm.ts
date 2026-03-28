import { AzureChatOpenAI } from "@langchain/openai";
import { AzureOpenAI } from "openai";
import { config } from "./env";

// LangChain LLM (for agents)
export function createLLM(temperature = 0.7, maxTokens = 2000): AzureChatOpenAI {
  const match = config.azure.endpoint.match(/https?:\/\/([^.]+)/);
  const instanceName = match ? match[1] : "";

  return new AzureChatOpenAI({
    azureOpenAIApiKey: config.azure.apiKey,
    azureOpenAIApiInstanceName: instanceName,
    azureOpenAIApiDeploymentName: config.azure.deployment,
    azureOpenAIApiVersion: config.azure.apiVersion,
    temperature,
    // GPT-5.4 uses max_completion_tokens instead of max_tokens
    modelKwargs: { max_completion_tokens: maxTokens },
  });
}

// Raw OpenAI client (for streaming, TTS, STT)
export const openai = new AzureOpenAI({
  apiKey: config.azure.apiKey,
  endpoint: config.azure.endpoint,
  deployment: config.azure.deployment,
  apiVersion: config.azure.apiVersion,
});
