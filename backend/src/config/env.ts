import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000"),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  // Kept the key name `azure` so existing call sites (config.azure.deployment)
  // don't change, but the values now come from LLM_* and point to Groq's
  // OpenAI-compatible endpoint. (Using non-AZURE_* env names avoids LangChain's
  // automatic Azure-mode detection.)
  azure: {
    apiKey: process.env.LLM_API_KEY || "",
    endpoint: process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1",
    deployment: process.env.LLM_MODEL || "openai/gpt-oss-120b",
    // Optional: sent as the `OpenAI-Project` header (required by Amazon Bedrock's
    // OpenAI-compatible endpoint). Empty = header omitted (Groq/OpenAI don't need it).
    project: process.env.LLM_PROJECT || "",
    apiVersion: "",
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
    from: process.env.EMAIL_FROM || "LearnerAI <noreply@learnify.app>",
  },
};
