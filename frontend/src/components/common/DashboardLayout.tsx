"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import EmotionDetector from "@/components/EmotionDetector";
import { ai } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, Briefcase, BookOpen, DollarSign, FileText,
  MessageCircle, Activity, ArrowRight,
  LogOut, Menu, X, ChevronDown, Sparkles,
  ChevronsLeft, ChevronsRight, Bell, SlidersHorizontal,
} from "lucide-react";

/* ── Nav structure with section headers ── */
const navSections = [
  {
    items: [
      { path: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
      { path: "/courses", icon: BookOpen, label: "Courses" },
      { path: "/voice-assistant", icon: Briefcase, label: "Voice Assistant" },
      { path: "/visual-lab", icon: Activity, label: "Visual Lab" },
      { path: "/tutor", icon: MessageCircle, label: "AI Tutor" },
    ],
  },
  {
    header: "Learning",
    items: [
      { path: "/quiz", icon: FileText, label: "Quiz" },
      { path: "/homework", icon: DollarSign, label: "Homework" },
      { path: "/exam", icon: BookOpen, label: "Exam" },
      { path: "/classroom", icon: Activity, label: "Study Room" },
    ],
  },
  {
    header: "Insights",
    items: [
      { path: "/analytics", icon: Briefcase, label: "Analytics" },
      { path: "/notes", icon: FileText, label: "Notes" },
      { path: "/study-planner", icon: LayoutGrid, label: "Study Planner" },
      { path: "/career", icon: MessageCircle, label: "Career Guidance" },
      { path: "/settings", icon: Activity, label: "Settings" },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const sessionIdRef = useRef(`session-${Date.now()}`);

  const mapEmotionForDb = (raw: string): string => {
    const map: Record<string, string> = {
      happy: "happy", neutral: "focused", sad: "confused",
      angry: "frustrated", surprised: "happy", fearful: "confused", disgusted: "bored",
    };
    return map[raw] || "neutral";
  };

  const handleEmotionDetected = useCallback((emotion: string, attention: number) => {
    ai.processEmotion({
      emotionData: { emotion: mapEmotionForDb(emotion), attention },
      sessionId: sessionIdRef.current,
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const nameParts = userName.split(" ");
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : userName.slice(0, 2).toUpperCase();

  const sidebarWidth = collapsed ? "w-[78px]" : "w-[300px]";

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 ${sidebarWidth}
          bg-white
          transform transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          flex flex-col`}
      >
        {/* Logo + toggle */}
        <div className={`flex items-center ${collapsed ? "justify-center px-3" : "px-6"} pt-7 pb-6`}>
          {collapsed ? (
            <span className="text-[20px] font-extrabold text-[#284ce3] tracking-tight">Le</span>
          ) : (
            <>
              <span className="text-[20px] font-extrabold text-[#284ce3] tracking-tight">Le</span>
              <span className="text-[20px] font-extrabold text-gray-900 tracking-tight">arnify</span>
            </>
          )}

          {/* Desktop toggle — right of logo */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex ml-auto p-2 rounded-lg hover:bg-gray-100 transition-colors group"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <ChevronsRight className="w-[18px] h-[18px] text-gray-400 group-hover:text-[#284ce3] transition-colors" />
              : <ChevronsLeft className="w-[18px] h-[18px] text-gray-400 group-hover:text-[#284ce3] transition-colors" />
            }
          </button>

          {/* Mobile close */}
          <button
            className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-4"} space-y-5`}>
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.header && !collapsed && (
                <p className="px-3 mb-2 text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
                  {section.header}
                </p>
              )}
              {section.header && collapsed && (
                <div className="mx-auto w-6 border-t border-gray-200 mb-2" />
              )}
              <div className="space-y-1">
                {section.items.map(({ path, icon: Icon, label, badge }: any) => {
                  const isActive = pathname === path || pathname?.startsWith(path + "/");
                  return (
                    <Link
                      key={path}
                      href={path}
                      onClick={() => setSidebarOpen(false)}
                      title={collapsed ? label : undefined}
                      className={`flex items-center ${collapsed ? "justify-center px-0 py-3" : "gap-3.5 px-4 py-3"} rounded-xl text-[15px] transition-all duration-200 group relative
                        ${isActive
                          ? "bg-[#284ce3] text-white font-semibold shadow-lg shadow-blue-300/30"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-800 font-medium"
                        }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-gray-500 group-hover:text-gray-700"}`} />
                      {!collapsed && <span className="flex-1">{label}</span>}
                      {!collapsed && badge && !isActive && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {badge}
                        </span>
                      )}
                      {!collapsed && isActive && (
                        <ArrowRight className="w-4 h-4 text-white/80" />
                      )}
                      {/* Tooltip for collapsed */}
                      {collapsed && (
                        <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-gray-900 text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                          {label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className={`border-t border-gray-100 ${collapsed ? "px-2 py-3" : "px-4 py-3"}`}>
          <div className="relative">
            <button
              onClick={() => !collapsed && setProfileOpen(!profileOpen)}
              className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} w-full px-2 py-2 rounded-xl hover:bg-gray-50 transition-all`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#284ce3] to-[#a78bfa] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 truncate">{userName}</p>
                    <p className="text-[11px] text-gray-400">Student</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
                </>
              )}
            </button>

            <AnimatePresence>
              {profileOpen && !collapsed && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden"
                >
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="px-5 lg:px-8 py-3.5 flex items-center sticky top-0 z-30 bg-white border-b border-gray-100">
          {/* Mobile hamburger */}
          <button
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="ml-3 flex items-baseline lg:hidden">
            <span className="text-lg font-extrabold text-[#284ce3]">Le</span>
            <span className="text-lg font-extrabold text-gray-800">arnify</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: notification + user */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </button>

            {/* User avatar + name + dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 pl-3 pr-1 py-1 rounded-full hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
              >
                <span className="hidden sm:block text-sm font-semibold text-gray-700">{userName}</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#284ce3] to-[#6366f1] flex items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-sm font-semibold text-gray-800">{userName}</p>
                      <p className="text-xs text-gray-400 truncate">{user?.email || ""}</p>
                    </div>
                    <Link href="/settings" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      <SlidersHorizontal className="w-4 h-4" /> Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto ${pathname === "/classroom" ? "p-0" : "p-5 lg:p-8"}`}>
          {children}
        </main>
      </div>

      <EmotionDetector
        enabled={typeof window !== "undefined" && localStorage.getItem("webcam_enabled") !== "false"}
        checkInterval={30000}
        displayDuration={6000}
        onEmotionDetected={handleEmotionDetected}
      />
    </div>
  );
}
