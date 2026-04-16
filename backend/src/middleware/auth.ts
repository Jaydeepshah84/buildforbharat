import { Request, Response, NextFunction } from "express";
import { supabaseAnon } from "../config/supabase";

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token || token === "null" || token === "undefined") {
      req.user = guestUser();
      return next();
    }

    // Try Supabase verification
    try {
      const { data, error } = await supabaseAnon.auth.getUser(token);
      if (!error && data?.user) {
        let profile = null;
        try {
          const { data: p } = await supabaseAnon.from("users").select("*").eq("id", data.user.id).single();
          profile = p;
        } catch {}

        req.user = {
          ...data.user,
          profile: profile || {
            id: data.user.id,
            name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "User",
            email: data.user.email,
            role: "student",
            language: "en",
          },
        };
        return next();
      }
    } catch {}

    // Decode JWT manually as fallback
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        req.user = {
          id: payload.sub || "unknown",
          email: payload.email || "user@learnify.local",
          profile: { id: payload.sub, name: payload.email?.split("@")[0] || "User", email: payload.email, role: "student", language: "en" },
        };
        return next();
      }
    } catch {}

    req.user = guestUser();
    next();
  } catch {
    req.user = guestUser();
    next();
  }
};

function guestUser() {
  return {
    id: "guest-" + Date.now(),
    email: "guest@learnify.local",
    profile: { id: "guest", name: "Student", email: "guest@learnify.local", role: "student", language: "en" },
  };
}
