"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import EmotionDetector from "@/components/EmotionDetector";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BookOpen, Brain, FileQuestion, ClipboardList,
  Users, BarChart3, StickyNote, Compass, CalendarDays, Settings,
  LogOut, Menu, X, ChevronDown, Mic, Beaker,
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

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <img src="/logo-brain.png" alt="Ed.Ai" className="h-9 w-9 object-contain rounded-lg" />
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-400 bg-clip-text text-transparent">Ed.Ai</span>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = pathname === path || pathname?.startsWith(path + "/");
              return (
                <Link key={path} href={path} onClick={() => setSidebarOpen(false)}
                  className={`sidebar-link ${isActive ? "active" : ""}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="border-t border-gray-100 p-4">
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-700">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-500">Student</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="w-4 h-4" /> Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center gap-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1" />
          <span className="text-sm text-gray-500 hidden sm:block">Welcome, {userName}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>

      {/* Emotion Detection Camera — top right corner */}
      <EmotionDetector
        enabled={typeof window !== "undefined" && localStorage.getItem("webcam_enabled") !== "false"}
        checkInterval={30000}
        displayDuration={6000}
      />
    </div>
  );
}
