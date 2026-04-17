"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Play,
  Users,
  Award,
  Star,
  ArrowRight,
  GraduationCap,
  Menu,
  X,
  CheckCircle2,
  MessageSquare,
  Quote,
  Shield,
  Heart,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Github,
  Linkedin,
  Monitor,
  Headphones,
  UserCheck,
  MessageCircle,
  ChevronRight,
} from "lucide-react";

/* ================================================================
   ANIMATION HELPERS
   ================================================================ */

function FadeUp({ children, delay = 0, className = "" }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ScaleIn({ children, delay = 0, className = "" }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ================================================================
   DATA
   ================================================================ */

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Programs", href: "#features" },
  { label: "Mentors", href: "#how-it-works" },
  { label: "Pricing", href: "#cta" },
  { label: "Contact", href: "#contact" },
];

const featureCards = [
  {
    Icon: UserCheck,
    title: "AI Tutor 24/7",
    desc: "Your personal AI tutor adapts to your learning style, answers doubts instantly, and is always available — even at 2 AM.",
    highlighted: false,
  },
  {
    Icon: Award,
    title: "Free for Students",
    desc: "World-class AI education at zero cost. No credit card needed — just sign up and start learning immediately.",
    highlighted: true,
  },
  {
    Icon: Monitor,
    title: "Visual & Interactive",
    desc: "3D models, animated diagrams, and interactive simulations make complex Physics, Chemistry & Biology concepts click.",
    highlighted: false,
  },
  {
    Icon: MessageCircle,
    title: "Multilingual Voice",
    desc: "Ask questions in Hindi, Gujarati, or English and get clear spoken explanations — like a tutor in your pocket.",
    highlighted: false,
  },
];

const programs = [
  {
    title: "AI-Powered Learning",
    desc: "Personalized lessons that adapt to your pace with smart AI recommendations.",
    icon: "🤖",
    students: "12,000+",
  },
  {
    title: "Voice Assistant",
    desc: "Ask questions in your own language and get clear explanations anytime.",
    icon: "🎙️",
    students: "8,500+",
  },
  {
    title: "Visual Learning",
    desc: "Interactive 3D models and animated diagrams for complex concepts.",
    icon: "🎨",
    students: "15,000+",
  },
  {
    title: "Smart Assessments",
    desc: "Real-time feedback on quizzes and homework with detailed analytics.",
    icon: "📊",
    students: "10,200+",
  },
  {
    title: "Group Learning",
    desc: "Collaborative rooms with AI-moderated discussions and team challenges.",
    icon: "👥",
    students: "6,800+",
  },
  {
    title: "Emotion Detection",
    desc: "AI adjusts difficulty and pace based on your engagement levels.",
    icon: "💡",
    students: "9,300+",
  },
];

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Class 10 Student, Delhi",
    text: "Learnify turned physics from my worst subject into my favourite. The visual models for electricity and magnetism are absolutely mind-blowing.",
    avatar: "PS",
    rating: 5,
  },
  {
    name: "Rahul Menon",
    role: "Mathematics Teacher, Kochi",
    text: "The analytics dashboard saves me hours every week. I can instantly see which students need help and on which exact topics.",
    avatar: "RM",
    rating: 5,
  },
  {
    name: "Ananya Gupta",
    role: "Class 12 Student, Mumbai",
    text: "The voice assistant helped me prep for my board exams at 2 AM when no tutor was available. Got 95% — my best score ever.",
    avatar: "AG",
    rating: 5,
  },
];

const footerColumns = [
  {
    title: "Platform",
    links: ["AI Tutor", "Visual Lab", "Voice Assistant", "Smart Assessments", "Study Planner"],
  },
  {
    title: "Resources",
    links: ["CBSE Courses", "ICSE Courses", "JEE Prep", "NEET Prep", "Career Guidance"],
  },
  {
    title: "Company",
    links: ["About Us", "Blog", "Careers", "Contact"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Data Protection", "Cookie Policy"],
  },
];

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ============================================================
          NAVBAR
          ============================================================ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-teal-700/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/5"
            : "bg-teal-700"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="text-2xl font-extrabold text-white tracking-tight">
            Learnify
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop Log In */}
          <div className="hidden md:flex items-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-white/20 hover:shadow-lg hover:shadow-black/5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Users size={16} />
              Log In
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded-lg p-2 text-white/80 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden bg-teal-800/95 backdrop-blur-xl"
            >
              <div className="flex flex-col gap-1 px-6 py-4">
                {navLinks.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {l.label}
                  </a>
                ))}
                <hr className="my-2 border-white/10" />
                <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm text-white hover:bg-white/10">
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="mt-1 rounded-lg bg-[#c3f53c] px-4 py-2.5 text-center text-sm font-semibold text-gray-900"
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ============================================================
          HERO SECTION
          ============================================================ */}
      <section className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 pt-28 pb-0 overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-teal-500/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-10 w-72 h-72 rounded-full bg-teal-400/10 blur-3xl animate-pulse [animation-delay:1.5s]" />

        {/* Background grid lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />

        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
            {/* Left column — text */}
            <div className="max-w-xl pb-16 lg:pb-24">
              <FadeUp>
                <p className="text-sm font-medium text-teal-200/80 tracking-wide uppercase">
                  AI-Powered Education for Every Indian Student
                </p>
              </FadeUp>

              <FadeUp delay={0.1}>
                <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Learn Smarter with{" "}
                  <span className="text-[#c3f53c]">AI-Powered</span> Education
                </h1>
              </FadeUp>

              <FadeUp delay={0.2}>
                <p className="mt-6 text-base leading-relaxed text-white/70 max-w-md">
                  9 specialized AI agents adapt to your pace, detect your emotions, speak your language, and build personalized learning paths — making world-class education accessible to every student in India.
                </p>
              </FadeUp>

              <FadeUp delay={0.3}>
                <div className="mt-8">
                  <Link
                    href="/signup"
                    className="group inline-flex items-center gap-2 rounded-full bg-[#c3f53c] px-8 py-4 text-sm font-bold text-gray-900 transition-all hover:bg-[#d4ff5c] hover:shadow-xl hover:shadow-[#c3f53c]/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Get Started Now
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </FadeUp>

              {/* Student review */}
              <FadeUp delay={0.4}>
                <div className="mt-10 flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {["PS", "RM", "AG"].map((initials, i) => (
                      <div
                        key={i}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-teal-700 bg-gradient-to-br from-teal-400 to-emerald-500 text-xs font-bold text-white"
                      >
                        {initials}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-lg font-bold text-white">4.8</span>
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Student Review</p>
                    <p className="text-xs text-white/60">Based on more than 10,000 feedbacks</p>
                  </div>
                </div>
              </FadeUp>
            </div>

            {/* Right column — hero visual with floating stats */}
            <div className="relative hidden lg:block">
              <div className="relative mx-auto w-[420px] h-[500px]">
                {/* Hero student image */}
                <img
                  src="/hero-student.png"
                  alt="Student"
                  className="absolute inset-0 w-full h-full object-contain object-bottom z-0"
                />

                {/* Floating stat: Total Courses */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="absolute top-8 -right-4 z-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3 shadow-lg hover:bg-white/15 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/30 flex items-center justify-center">
                      <BookOpen size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white/70">Total Courses</p>
                      <p className="text-lg font-extrabold text-white">1200+</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating stat: Total Students */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="absolute bottom-32 left-0 z-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3 shadow-lg hover:bg-white/15 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#c3f53c]/30 flex items-center justify-center">
                      <GraduationCap size={20} className="text-[#c3f53c]" />
                    </div>
                    <div>
                      <p className="text-xs text-white/70">Total Students</p>
                      <p className="text-lg font-extrabold text-white">20,000+</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating stat: Total Instructors */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.0, duration: 0.5 }}
                  className="absolute top-1/2 -right-8 z-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3 shadow-lg hover:bg-white/15 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/30 flex items-center justify-center">
                      <Users size={20} className="text-teal-300" />
                    </div>
                    <div>
                      <p className="text-xs text-white/70">Total Instructors</p>
                      <p className="text-lg font-extrabold text-white">400+</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURE CARDS
          ============================================================ */}
      <section className="relative z-10 -mt-6">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 bg-white rounded-2xl shadow-xl overflow-hidden">
            {featureCards.map((f, i) => (
              <ScaleIn key={f.title} delay={i * 0.08}>
                <div
                  className={`group/card p-8 h-full border-r last:border-r-0 border-gray-100 transition-all duration-300 ${
                    f.highlighted
                      ? "bg-[#c3f53c] text-gray-900"
                      : "bg-white text-gray-900 hover:bg-gray-50/80"
                  }`}
                >
                  <div
                    className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover/card:scale-110 ${
                      f.highlighted
                        ? "bg-gray-900/10"
                        : "bg-teal-50"
                    }`}
                  >
                    <f.Icon
                      size={28}
                      className={f.highlighted ? "text-gray-900" : "text-teal-600"}
                    />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className={`text-sm leading-relaxed ${f.highlighted ? "text-gray-800" : "text-gray-500"}`}>
                    {f.desc}
                  </p>
                </div>
              </ScaleIn>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          PROGRAMS / COURSES
          ============================================================ */}
      <section id="features" className="py-24 lg:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <FadeUp className="text-center">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-widest">Our Programs</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-gray-900">
              Explore Our <span className="text-teal-600">Programs</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-500">
              Six specialized AI agents — from course generation to emotion detection — working together to create the most adaptive learning experience.
            </p>
          </FadeUp>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p, i) => (
              <ScaleIn key={p.title} delay={i * 0.08}>
                <div className="group bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-teal-600/5 hover:border-teal-200 hover:-translate-y-1 transition-all duration-300">
                  <div className="text-5xl mb-4 transition-transform duration-300 group-hover:scale-110">{p.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-teal-700 transition-colors">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{p.desc}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xs font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
                      {p.students} students
                    </span>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </ScaleIn>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS
          ============================================================ */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <FadeUp className="text-center">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-widest">How It Works</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-gray-900">
              Start Learning in <span className="text-teal-600">3 Steps</span>
            </h2>
          </FadeUp>

          <div className="relative mt-20">
            {/* Connecting line */}
            <div className="absolute left-0 right-0 top-16 hidden h-0.5 bg-gradient-to-r from-teal-300 via-[#c3f53c] to-teal-300 opacity-40 lg:block" />

            <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
              {[
                { num: "01", title: "Create Your Profile", desc: "Sign up, choose your board (CBSE/ICSE/State), select subjects, and set your language. Our AI maps your starting knowledge level." },
                { num: "02", title: "Learn Your Way", desc: "Dive into voice-guided lessons, 3D visual labs, adaptive quizzes, and AI-moderated group classrooms — all personalized for you." },
                { num: "03", title: "Track & Achieve", desc: "Monitor progress on real-time analytics dashboards. Emotion detection adjusts difficulty. AI study planner keeps you on track." },
              ].map((s, i) => (
                <FadeUp key={s.num} delay={i * 0.15}>
                  <div className="relative text-center group">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 text-xl font-extrabold text-white shadow-lg shadow-teal-600/20 transition-transform duration-300 group-hover:scale-110">
                      {s.num}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{s.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-gray-500 max-w-xs mx-auto">
                      {s.desc}
                    </p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          TESTIMONIALS
          ============================================================ */}
      <section id="testimonials" className="py-24 lg:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <FadeUp className="text-center">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-widest">Testimonials</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-gray-900">
              What Our <span className="text-teal-600">Students Say</span>
            </h2>
          </FadeUp>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <ScaleIn key={t.name} delay={i * 0.1}>
                <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-teal-600/5 hover:border-teal-100 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                  <Quote size={28} className="mb-4 text-teal-400/40" />
                  <div className="mb-4 flex gap-1">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} size={14} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-gray-600">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-xs font-bold text-white shadow-sm">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </ScaleIn>
            ))}
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              { value: "20,000+", label: "Active Students" },
              { value: "4.8/5", label: "Average Rating" },
              { value: "1,200+", label: "Total Courses" },
              { value: "400+", label: "Expert Instructors" },
            ].map((s, i) => (
              <FadeUp key={s.label} delay={i * 0.08}>
                <div className="bg-white rounded-2xl py-8 text-center shadow-sm border border-gray-100 hover:shadow-lg hover:border-teal-100 hover:-translate-y-0.5 transition-all duration-300">
                  <p className="text-3xl font-extrabold text-teal-600">{s.value}</p>
                  <p className="mt-1 text-xs text-gray-500">{s.label}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA SECTION
          ============================================================ */}
      <section id="cta" className="py-24 lg:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <FadeUp>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 p-10 text-center shadow-2xl sm:p-16">
              <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-[#c3f53c]/10 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-teal-400/10 blur-3xl" />

              <div className="relative z-10">
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Ready to transform your learning?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
                  Join 20,000+ students already learning smarter with 9 AI agents. Free forever for students — no credit card needed.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link
                    href="/signup"
                    className="group inline-flex items-center gap-2 rounded-full bg-[#c3f53c] px-8 py-4 text-sm font-bold text-gray-900 transition-all hover:bg-[#d4ff5c] hover:shadow-xl hover:shadow-[#c3f53c]/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Get Started Free
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#features"
                    className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20"
                  >
                    <Play size={16} />
                    See It in Action
                  </a>
                </div>
                <p className="mt-6 text-xs text-white/50">
                  <Shield size={13} className="mr-1 inline" />
                  No credit card required &middot; Cancel anytime &middot; 256-bit SSL
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer id="contact" className="bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-6">
            {/* Brand column */}
            <div className="lg:col-span-2">
              <Link href="/" className="text-2xl font-extrabold tracking-tight">
                Learnify
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
                Making world-class education accessible to every student in India through the power of artificial intelligence.
              </p>
              <div className="mt-6 flex gap-3">
                {[Twitter, Github, Linkedin].map((SocialIcon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-400 transition-all duration-300 hover:bg-white/10 hover:text-white hover:scale-110 hover:border-white/20"
                  >
                    <SocialIcon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold tracking-wide text-white">{col.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-gray-400 transition-colors hover:text-white">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} Learnify. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              Made with <Heart size={12} className="mx-0.5 text-red-500" /> in India
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
