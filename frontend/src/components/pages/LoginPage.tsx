"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";

const inputCls =
  "w-full h-12 px-4 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/40 focus:bg-white/[0.05] transition-all";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
      toast.success("Welcome back");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex font-sans">
      {/* LEFT — editorial branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-14 border-r border-white/10">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <Link href="/" className="relative z-10 inline-flex items-center gap-2.5">
          <span className="h-8 w-8 grid place-items-center rounded-md border border-white/20 text-sm font-bold font-display">L</span>
          <span className="text-lg font-semibold tracking-tight font-display">LearnerAI</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="text-xs uppercase tracking-[0.22em] text-white/40 mb-6">AI Learning Platform</p>
          <h1 className="font-display text-4xl xl:text-5xl font-semibold leading-[1.08] tracking-tight">
            Welcome back to your learning journey.
          </h1>
          <p className="mt-6 text-white/50 leading-relaxed max-w-sm">
            Pick up right where you left off — your AI tutor, adaptive courses, and real-time analytics are ready.
          </p>

          <div className="mt-12 h-px w-full bg-white/10" />

          <div className="mt-8 space-y-4">
            {[
              "9 AI agents personalize your path",
              "Voice tutor in Hindi, Gujarati & English",
              "Visual lab, quizzes & emotion detection",
            ].map((t) => (
              <div key={t} className="flex items-center gap-3 text-sm text-white/50">
                <span className="h-1 w-1 rounded-full bg-white/40" />
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-10">
          {[
            ["20K+", "Students"],
            ["1,200+", "Courses"],
            ["4.8", "Rating"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="font-display text-2xl font-semibold">{v}</p>
              <p className="text-xs text-white/40 mt-1">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden inline-flex items-center gap-2.5 mb-10">
            <span className="h-8 w-8 grid place-items-center rounded-md border border-white/20 text-sm font-bold font-display">L</span>
            <span className="text-lg font-semibold tracking-tight font-display">LearnerAI</span>
          </Link>

          <h2 className="font-display text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm text-white/40">
            New here?{" "}
            <Link href="/signup" className="text-white hover:underline underline-offset-4">Create an account</Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-[11px] font-medium text-white/50 mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Password</label>
                <button type="button" className="text-[11px] text-white/40 hover:text-white transition-colors">Forgot?</button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls + " pr-11"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all"
              whileTap={{ scale: 0.99 }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : (
                <>Sign in <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>

          <p className="mt-8 text-xs text-white/25 leading-relaxed">
            By signing in you agree to our{" "}
            <a href="#" className="text-white/50 hover:text-white underline underline-offset-2">Terms</a>{" "}
            and{" "}
            <a href="#" className="text-white/50 hover:text-white underline underline-offset-2">Privacy Policy</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
