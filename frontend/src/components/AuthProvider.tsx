"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (params: { email: string; password: string }) => Promise<any>;
  signup: (params: { email: string; password: string; name: string; role?: string; classLevel?: string; language?: string; parentEmail?: string }) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Fast timeout — don't block the UI for more than 2 seconds
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    supabase.auth.getSession().then(({ data, error }) => {
      clearTimeout(timeout);
      if (!mounted) return;
      if (error) {
        console.warn("[Auth] getSession error:", error.message);
        setLoading(false);
        return;
      }
      const session = data?.session;
      setUser(session?.user ?? null);
      if (session?.access_token) localStorage.setItem("token", session.access_token);
      setLoading(false);
    }).catch((err) => {
      clearTimeout(timeout);
      console.warn("[Auth] getSession failed:", err);
      if (mounted) setLoading(false);
    });

    let subscription: any;
    try {
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        if (session?.access_token) localStorage.setItem("token", session.access_token);
        else localStorage.removeItem("token");
        setLoading(false);
      });
      subscription = result.data.subscription;
    } catch {}

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe?.();
    };
  }, []);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signup = useCallback(async ({ email, password, name, role, classLevel, language, parentEmail }: {
    email: string; password: string; name: string; role?: string; classLevel?: string; language?: string; parentEmail?: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;

    // Register with backend (saves parent_email, sends welcome email)
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";
    const token = data.session?.access_token || "";
    await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ email, name, role, class: classLevel, language, parentEmail }),
    }).catch(() => {});

    return data;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
