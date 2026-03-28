import { AzureChatOpenAI } from "@langchain/openai";

export function createLLM(temperature = 0.7, maxTokens = 2000) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
  const match = endpoint.match(/https?:\/\/([^.]+)/);
  const instanceName = match ? match[1] : "";

  return new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: instanceName,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5.4",
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview",
    temperature,
    maxTokens,
  });
}
