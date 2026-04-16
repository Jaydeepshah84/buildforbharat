import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000"),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  azure: {
    apiKey: process.env.AZURE_OPENAI_API_KEY || "",
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || "",
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5.4",
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview",
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
    from: process.env.EMAIL_FROM || "Learnify <noreply@learnify.app>",
  },
};
