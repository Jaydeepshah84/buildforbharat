"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Mail,
  Lock,
  User,
  GraduationCap,
  BookOpen,
  Globe,
  CheckCircle2,
  Users,
  Star,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
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
      });
      toast.success("Account created!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full pl-12 pr-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all";
  const selectCls =
    "w-full pl-12 pr-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer";

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-800">
      {/* LEFT — branding */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col justify-between py-14 pl-14 pr-6">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-indigo-500/15 blur-[150px] -translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-purple-400/10 blur-[120px] translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full bg-[#c3f53c]/5 blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Logo */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="h-11 w-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl font-bold">L</span>
            <span className="text-2xl font-extrabold text-white">Learnify</span>
          </Link>
        </motion.div>

        {/* Center content */}
        <div className="relative z-10 max-w-lg -mt-10">
          <motion.div
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <Sparkles size={14} className="text-[#c3f53c]" />
            <span className="text-xs font-medium text-white/70">Free forever for students</span>
          </motion.div>

          <motion.h1
            className="text-4xl xl:text-[44px] font-extrabold text-white leading-[1.15] mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Start your learning journey today
          </motion.h1>
          <motion.p
            className="text-white/45 text-base leading-relaxed max-w-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            Join thousands of Indian students learning smarter with 9 AI agents — from adaptive courses and voice tutoring to emotion detection and career guidance.
          </motion.p>

          {/* Feature highlights */}
          <motion.div
            className="mt-10 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {[
              "Personal AI tutor that adapts to your pace 24/7",
              "Voice assistant in Hindi, Gujarati & English",
              "3D visual lab, smart quizzes & emotion detection",
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#c3f53c]/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={12} className="text-[#c3f53c]" />
                </div>
                <span className="text-sm text-white/50">{text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom stats */}
        <motion.div
          className="relative z-10 flex gap-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          {[
            { value: "20K+", label: "Active Students", icon: Users },
            { value: "1,200+", label: "Total Courses", icon: BookOpen },
            { value: "400+", label: "Expert Mentors", icon: Star },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-2xl px-4 py-3 hover:bg-white/[0.10] hover:border-white/[0.12] transition-all duration-300">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <s.icon size={16} className="text-[#c3f53c]" />
              </div>
              <div>
                <p className="text-base font-bold text-white leading-none">{s.value}</p>
                <p className="text-[10px] text-white/35 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex items-center justify-center bg-white lg:rounded-[36px] lg:my-3 lg:mr-3 relative overflow-hidden">
        <div className="absolute inset-0 lg:rounded-[36px] overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-[300px] h-[300px] bg-indigo-50/60 rounded-full blur-[80px]" />
          <div className="absolute -bottom-20 -left-20 w-[250px] h-[250px] bg-purple-50/40 rounded-full blur-[80px]" />
        </div>

        <motion.div
          className="w-full max-w-[460px] px-12 py-4 relative z-10"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-lg font-bold">L</span>
              <span className="text-2xl font-extrabold text-gray-900">Learnify</span>
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="text-[28px] font-bold text-gray-900 mb-2">Create account</h1>
            <p className="text-[14px] text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>

          {/* Social login */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-300 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={update("name")}
                  placeholder="John Doe"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Email address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-300 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-300 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={form.password}
                  onChange={update("password")}
                  placeholder="Min 6 characters"
                  className={inputCls}
                  style={{ paddingRight: "2.75rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">Role</label>
                <div className="relative group">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-300 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                  <select value={form.role} onChange={update("role")} className={selectCls}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">Class</label>
                <div className="relative group">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-300 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                  <select value={form.classLevel} onChange={update("classLevel")} className={selectCls}>
                    {["6", "7", "8", "9", "10", "11", "12"].map((v) => (
                      <option key={v} value={v}>Class {v}</option>
                    ))}
                    <option value="undergraduate">UG</option>
                    <option value="graduate">PG</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">Language</label>
                <div className="relative group">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-300 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                  <select value={form.language} onChange={update("language")} className={selectCls}>
                    <option value="en">EN</option>
                    <option value="hi">HI</option>
                    <option value="gu">GU</option>
                    <option value="es">ES</option>
                  </select>
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-[18px] h-[18px] mt-0.5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-[12px] text-gray-400 leading-relaxed">
                I agree to the{" "}
                <a href="#" className="text-indigo-600 hover:underline font-medium">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-indigo-600 hover:underline font-medium">Privacy Policy</a>
              </span>
            </label>

            <motion.button
              type="submit"
              disabled={loading || !agreed}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm rounded-2xl disabled:opacity-40 transition-all shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/25"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
