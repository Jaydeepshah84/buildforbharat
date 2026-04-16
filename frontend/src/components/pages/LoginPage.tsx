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
  CheckCircle2,
  BookOpen,
  Users,
  Star,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";

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
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#284ce3] via-[#3b5ef5] to-[#284ce3]">
      {/* LEFT — branding */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col justify-between py-14 pl-14 pr-6">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-[#284ce3]/15 blur-[150px] -translate-x-1/3 -translate-y-1/3" />
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
            <span className="h-11 w-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] text-white text-xl font-bold">L</span>
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
            <span className="text-xs font-medium text-white/70">AI-Powered Learning Platform</span>
          </motion.div>

          <motion.h1
            className="text-4xl xl:text-[44px] font-extrabold text-white leading-[1.15] mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Welcome back to your learning journey
          </motion.h1>
          <motion.p
            className="text-white/45 text-base leading-relaxed max-w-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            Pick up right where you left off. Your personalized AI tutor, adaptive courses, and real-time analytics are waiting.
          </motion.p>

          {/* Feature highlights */}
          <motion.div
            className="mt-10 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {[
              "9 AI agents personalize your learning path",
              "Voice tutor in Hindi, Gujarati & English",
              "3D visual lab, quizzes & emotion detection",
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
            { value: "4.8/5", label: "User Rating", icon: Star },
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
          <div className="absolute -top-20 -right-20 w-[300px] h-[300px] bg-blue-50/60 rounded-full blur-[80px]" />
          <div className="absolute -bottom-20 -left-20 w-[250px] h-[250px] bg-purple-50/40 rounded-full blur-[80px]" />
        </div>

        <motion.div
          className="w-full max-w-[460px] px-12 relative z-10"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Mobile logo */}
          <div className="text-center mb-10 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] text-white text-lg font-bold">L</span>
              <span className="text-2xl font-extrabold text-gray-900">Learnify</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-[28px] font-bold text-gray-900 mb-2">Sign in</h1>
            <p className="text-[14px] text-gray-400">
              New to Learnify?{" "}
              <Link href="/signup" className="text-[#284ce3] font-semibold hover:underline">Create an account</Link>
            </p>
          </div>

          {/* Social login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Email address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-300 group-focus-within:text-[#284ce3] transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:bg-white focus:border-[#284ce3] focus:ring-4 focus:ring-[#284ce3]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[13px] font-semibold text-gray-700">Password</label>
                <button type="button" className="text-[12px] text-[#284ce3] hover:text-indigo-700 font-medium transition-colors">Forgot password?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-300 group-focus-within:text-[#284ce3] transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:bg-white focus:border-[#284ce3] focus:ring-4 focus:ring-[#284ce3]/10 transition-all"
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

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-gradient-to-r from-[#284ce3] to-[#4a6cf7] hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-sm rounded-2xl disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/25"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>

          <p className="text-center text-[11px] text-gray-300 mt-8 leading-relaxed">
            By signing in you agree to our{" "}
            <a href="#" className="text-gray-400 hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-gray-400 hover:underline">Privacy Policy</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
