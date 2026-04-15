"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import EmotionDetector from "@/components/EmotionDetector";
import { ai } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BookOpen, Brain, FileQuestion, ClipboardList,
  Users, BarChart3, StickyNote, Compass, CalendarDays, Settings,
  LogOut, Menu, X, ChevronDown, Mic, Beaker, Sparkles,
} from "lucide-react";

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/courses", icon: BookOpen, label: "Courses" },
  { path: "/voice-assistant", icon: Mic, label: "Voice Assistant" },
  { path: "/visual-lab", icon: Beaker, label: "Visual Lab" },
  { path: "/tutor", icon: Brain, label: "AI Tutor" },
  { path: "/quiz", icon: FileQuestion, label: "Quiz" },
  { path: "/homework", icon: ClipboardList, label: "Homework" },
  { path: "/exam", icon: ClipboardList, label: "Exam" },
  { path: "/classroom", icon: Users, label: "Study Room" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/notes", icon: StickyNote, label: "Notes" },
  { path: "/study-planner", icon: CalendarDays, label: "Study Planner" },
  { path: "/career", icon: Compass, label: "Career Guidance" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const sessionIdRef = useRef(`session-${Date.now()}`);

  // Map raw face-api emotions to DB-allowed values
  // DB CHECK constraint allows: happy, confused, bored, focused, frustrated, neutral
  const mapEmotionForDb = (raw: string): string => {
    const map: Record<string, string> = {
      happy: 'happy',
      neutral: 'focused',
      sad: 'confused',
      angry: 'frustrated',
      surprised: 'happy',
      fearful: 'confused',
      disgusted: 'bored',
    };
    return map[raw] || 'neutral';
  };

  // Send detected emotions to backend for analytics storage
  const handleEmotionDetected = useCallback((emotion: string, attention: number) => {
    ai.processEmotion({
      emotionData: { emotion: mapEmotionForDb(emotion), attention },
      sessionId: sessionIdRef.current,
    }).catch(() => {
      // Non-critical, fail silently
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/80">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-gray-100
        transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        flex flex-col`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100/80">
          <div className="relative">
            <img src="/logo-brain.png" alt="Ed.Ai" className="h-10 w-10 object-contain rounded-xl shadow-sm" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Ed.Ai
            </span>
            <p className="text-[10px] font-medium text-gray-400 -mt-0.5 tracking-wide">LEARN SMARTER</p>
          </div>
          <button className="ml-auto lg:hidden p-1 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = pathname === path || pathname?.startsWith(path + "/");
            return (
              <Link key={path} href={path} onClick={() => setSidebarOpen(false)}
                className={`sidebar-link group ${isActive ? "active" : ""}`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                }`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <span className="text-[13px] font-medium">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 p-3">
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
                <span className="text-sm font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Student
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 py-1.5 overflow-hidden">
                  <button onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 lg:px-8 py-3.5 flex items-center gap-4 sticky top-0 z-30">
          <button className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">
              Welcome, <span className="font-semibold text-gray-700">{userName}</span>
            </span>
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm sm:hidden">
              <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </header>
        <main className={`flex-1 overflow-y-auto ${pathname === "/classroom" ? "p-0" : "p-4 lg:p-8"}`}>{children}</main>
      </div>

      {/* Emotion Detection Camera */}
      <EmotionDetector
        enabled={typeof window !== "undefined" && localStorage.getItem("webcam_enabled") !== "false"}
        checkInterval={30000}
        displayDuration={6000}
        onEmotionDetected={handleEmotionDetected}
      />
    </div>
  );
}
