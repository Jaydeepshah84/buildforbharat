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
const selectCls =
  "w-full h-12 px-3 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/40 transition-all appearance-none cursor-pointer [color-scheme:dark]";
const labelCls = "block text-[11px] font-medium text-white/50 mb-2 uppercase tracking-wider";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    parentEmail: "",
    role: "student",
    classLevel: "10",
    language: "en",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const update =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signup({
        email: form.email,
        password: form.password,
        name: form.name,
        role: form.role,
        classLevel: form.classLevel,
        language: form.language,
        parentEmail: form.parentEmail,
      });
      toast.success("Account created");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Signup failed");
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
          <p className="text-xs uppercase tracking-[0.22em] text-white/40 mb-6">Free forever for students</p>
          <h1 className="font-display text-4xl xl:text-5xl font-semibold leading-[1.08] tracking-tight">
            Start your learning journey today.
          </h1>
          <p className="mt-6 text-white/50 leading-relaxed max-w-sm">
            Join thousands of Indian students learning smarter with 9 AI agents — adaptive courses, voice tutoring, and career guidance.
          </p>

          <div className="mt-12 h-px w-full bg-white/10" />

          <div className="mt-8 space-y-4">
            {[
              "Personal AI tutor that adapts 24/7",
              "Voice assistant in Hindi, Gujarati & English",
              "Visual lab, smart quizzes & emotion detection",
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
            ["400+", "Mentors"],
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
          className="w-full max-w-[430px]"
        >
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden inline-flex items-center gap-2.5 mb-8">
            <span className="h-8 w-8 grid place-items-center rounded-md border border-white/20 text-sm font-bold font-display">L</span>
            <span className="text-lg font-semibold tracking-tight font-display">LearnerAI</span>
          </Link>

          <h2 className="font-display text-2xl font-semibold tracking-tight">Create account</h2>
          <p className="mt-2 text-sm text-white/40">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline underline-offset-4">Sign in</Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className={labelCls}>Full name</label>
              <input type="text" required value={form.name} onChange={update("name")} placeholder="John Doe" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Email address</label>
              <input type="email" required value={form.email} onChange={update("email")} placeholder="you@example.com" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>
                Parent / Guardian email <span className="text-white/25 normal-case tracking-normal">(optional)</span>
              </label>
              <input type="email" value={form.parentEmail} onChange={update("parentEmail")} placeholder="parent@example.com" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={form.password}
                  onChange={update("password")}
                  placeholder="Min 6 characters"
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

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Role</label>
                <select value={form.role} onChange={update("role")} className={selectCls}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Class</label>
                <select value={form.classLevel} onChange={update("classLevel")} className={selectCls}>
                  {["6", "7", "8", "9", "10", "11", "12"].map((v) => (
                    <option key={v} value={v}>Class {v}</option>
                  ))}
                  <option value="undergraduate">UG</option>
                  <option value="graduate">PG</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Lang</label>
                <select value={form.language} onChange={update("language")} className={selectCls}>
                  <option value="en">EN</option>
                  <option value="hi">HI</option>
                  <option value="gu">GU</option>
                  <option value="es">ES</option>
                </select>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-white/20 bg-transparent text-white focus:ring-0 focus:ring-offset-0 cursor-pointer accent-white"
              />
              <span className="text-xs text-white/40 leading-relaxed">
                I agree to the{" "}
                <a href="#" className="text-white/70 hover:text-white underline underline-offset-2">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-white/70 hover:text-white underline underline-offset-2">Privacy Policy</a>
              </span>
            </label>

            <motion.button
              type="submit"
              disabled={loading || !agreed}
              className="w-full h-12 flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 disabled:opacity-40 transition-all"
              whileTap={{ scale: 0.99 }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
              ) : (
                <>Create account <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
