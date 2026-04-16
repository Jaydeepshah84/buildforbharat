"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Bookmark, Wand2, Loader2, Timer, BarChart2, ChevronRight,
  Trophy, Globe, CalendarDays, PlayCircle, Search, X, Plus,
  ArrowRight, Layers, Folder, Hand,
} from 'lucide-react';
import { courses } from '@/services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

/* ── Topic-to-image mapping using free Unsplash photos ── */
const TOPIC_IMAGES: Record<string, string> = {
  // Math
  math: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=300&fit=crop",
  algebra: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=300&fit=crop",
  geometry: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&h=300&fit=crop",
  calculus: "https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=600&h=300&fit=crop",
  quadratic: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=300&fit=crop",
  equation: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=300&fit=crop",
  trigonometry: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&h=300&fit=crop",
  statistics: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=300&fit=crop",
  // Science
  science: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=300&fit=crop",
  physics: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&h=300&fit=crop",
  chemistry: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=600&h=300&fit=crop",
  biology: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&h=300&fit=crop",
  // Technology
  python: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&h=300&fit=crop",
  programming: "https://images.unsplash.com/photo-1515879218367-8466d910auj7?w=600&h=300&fit=crop",
  coding: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=300&fit=crop",
  computer: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=300&fit=crop",
  database: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&h=300&fit=crop",
  digital: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=300&fit=crop",
  electronic: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=300&fit=crop",
  machine: "https://images.unsplash.com/photo-1555255707-c07966088b7b?w=600&h=300&fit=crop",
  artificial: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=300&fit=crop",
  web: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&h=300&fit=crop",
  javascript: "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=600&h=300&fit=crop",
  software: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=300&fit=crop",
  data: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=300&fit=crop",
  // Nature / Environment
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=300&fit=crop",
  chain: "https://images.unsplash.com/photo-1470058869958-2a77bde3e86a?w=600&h=300&fit=crop",
  ecosystem: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=300&fit=crop",
  environment: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=300&fit=crop",
  plant: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=300&fit=crop",
  animal: "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=600&h=300&fit=crop",
  photosynthesis: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=300&fit=crop",
  cell: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&h=300&fit=crop",
  // History / Social
  history: "https://images.unsplash.com/photo-1461360370896-922624d12a74?w=600&h=300&fit=crop",
  geography: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=300&fit=crop",
  economics: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=300&fit=crop",
  political: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&h=300&fit=crop",
  // English / Literature
  english: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&h=300&fit=crop",
  literature: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&h=300&fit=crop",
  grammar: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&h=300&fit=crop",
  writing: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&h=300&fit=crop",
  // Business
  business: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=300&fit=crop",
  marketing: "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=600&h=300&fit=crop",
  finance: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=300&fit=crop",
  // Art / Design
  art: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=300&fit=crop",
  design: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=300&fit=crop",
  music: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=300&fit=crop",
  // Health
  health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&h=300&fit=crop",
  medical: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&h=300&fit=crop",
  anatomy: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=600&h=300&fit=crop",
  // Space
  space: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=300&fit=crop",
  astronomy: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&h=300&fit=crop",
  solar: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=600&h=300&fit=crop",
};

// Fallback images for when no keyword matches
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=300&fit=crop", // education
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=300&fit=crop", // books
  "https://images.unsplash.com/photo-1523050854058-8df90110c476?w=600&h=300&fit=crop", // study
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=300&fit=crop", // learning
  "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600&h=300&fit=crop", // notebook
  "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&h=300&fit=crop", // classroom
];

function getCourseImage(title: string, subject?: string): string {
  const search = `${title || ''} ${subject || ''}`.toLowerCase();
  // Try to match keywords from the title/subject
  for (const [keyword, url] of Object.entries(TOPIC_IMAGES)) {
    if (search.includes(keyword)) return url;
  }
  // Fallback: use a hash to pick a consistent education image
  const hash = search.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
}

/* ── Course Card ── */
function CourseCard({ course, onClick, onDelete }) {
  const progress = course.progress ?? 0;
  const gradients = [
    "from-[#284ce3] to-[#6366f1]",
    "from-[#0891b2] to-[#3b82f6]",
    "from-[#7c3aed] to-[#a78bfa]",
    "from-[#059669] to-[#10b981]",
    "from-[#d97706] to-[#f59e0b]",
    "from-[#e11d48] to-[#f43f5e]",
  ];
  const hash = (course.title || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const gradient = gradients[hash % gradients.length];
  const imageUrl = getCourseImage(course.title, course.subject);
  const [imgError, setImgError] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) {
      onDelete(course._id || course.id);
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer group hover:shadow-lg transition-all"
    >
      {/* Image thumbnail header */}
      <div className="h-36 relative flex items-end overflow-hidden">
        {/* Background image */}
        {!imgError ? (
          <img
            src={imageUrl}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        )}
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* Duration badge (YouTube style) */}
        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded px-2 py-0.5 text-[11px] font-bold text-white">
          {(course.duration || course.duration_days) ? `${course.duration || course.duration_days} days` : 'Course'}
        </div>
        {/* Delete */}
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 backdrop-blur text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/60 hover:text-white transition-all z-10"
          title="Delete course"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        {/* Title on image */}
        <h3 className="text-white font-bold text-[15px] leading-snug line-clamp-2 relative z-[1] px-4 pb-3">
          {course.title}
        </h3>
        {/* Progress bar at bottom of image (YouTube watch-progress style) */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-[2]">
            <div className="h-full bg-red-600" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {course.subject && (
            <span className="flex items-center gap-1">
              <Bookmark className="w-3 h-3" /> {course.subject}
            </span>
          )}
          {(course.duration || course.duration_days) && (
            <span className="flex items-center gap-1">
              <Timer className="w-3 h-3" /> {course.duration || course.duration_days}d
            </span>
          )}
        </div>

        {/* Difficulty */}
        {(course.difficulty || course.difficulty_level) && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
            ["easy","beginner"].includes((course.difficulty || course.difficulty_level || "").toLowerCase())
              ? "bg-emerald-50 text-emerald-600"
              : ["hard","advanced"].includes((course.difficulty || course.difficulty_level || "").toLowerCase())
              ? "bg-red-50 text-red-600"
              : "bg-amber-50 text-amber-600"
          }`}>
            {course.difficulty || course.difficulty_level}
          </span>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-gray-400 font-medium">Progress</span>
            <span className="font-bold text-gray-700">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* CTA */}
        <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-50 text-sm font-medium text-gray-600 group-hover:bg-[#284ce3] group-hover:text-white transition-all">
          <PlayCircle className="w-3.5 h-3.5" />
          {progress > 0 ? "Continue" : "Start Learning"}
        </button>
      </div>
    </motion.div>
  );
}

/* ── Skeleton ── */
function CoursesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
          <div className="h-28 bg-gray-100" />
          <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-100 rounded w-2/3" />
            <div className="h-2 bg-gray-50 rounded w-1/3" />
            <div className="h-2 bg-gray-100 rounded-full" />
            <div className="h-9 bg-gray-50 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Generation loader ── */
function GenerationLoader({ status, topicsReady, totalTopics }) {
  const pct = totalTopics > 0 ? Math.round((topicsReady / totalTopics) * 100) : 0;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16 px-6">
      <div className="relative mx-auto w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#284ce3] to-[#6366f1] animate-spin opacity-20" />
        <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
          <Wand2 className="w-8 h-8 text-[#284ce3] animate-pulse" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">AI is creating your course...</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">{status || "Building a personalized learning path just for you."}</p>
      {totalTopics > 0 && (
        <div className="max-w-xs mx-auto">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Generating topics</span>
            <span>{topicsReady} / {totalTopics}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-[#284ce3] to-[#6366f1]" animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════ */

export default function CoursesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState('my-courses');
  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('10');
  const [duration, setDuration] = useState(3);
  const [language, setLanguage] = useState('english');
  const [signLanguage, setSignLanguage] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [genTopicsReady, setGenTopicsReady] = useState(0);
  const [genTotalTopics, setGenTotalTopics] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchCourses() {
      try {
        const enrollRes = await courses.getEnrollments();
        let list = enrollRes.enrollments || enrollRes.data || enrollRes || [];
        list = list.map(item => {
          if (item.courses && typeof item.courses === 'object') {
            return { ...item.courses, enrollment_id: item.id, progress: item.progress };
          }
          return item;
        });
        try {
          const allRes = await courses.getCourses();
          const allCourses = allRes.courses || allRes.data || allRes || [];
          const existingIds = new Set(list.map(c => c.id || c._id));
          allCourses.forEach(c => { if (!existingIds.has(c.id) && !existingIds.has(c._id)) list.push(c); });
        } catch {}
        if (!cancelled) setEnrollments(list.filter(c => c && (c.id || c._id)));
      } catch {
        try {
          const allRes = await courses.getCourses();
          if (!cancelled) setEnrollments(allRes.courses || allRes.data || []);
        } catch {}
      } finally { if (!cancelled) setLoadingEnrollments(false); }
    }
    fetchCourses();
    return () => { cancelled = true; };
  }, [t]);

  const handleDeleteCourse = async (courseId) => {
    try {
      await courses.deleteCourse(courseId);
      setEnrollments(prev => prev.filter(c => (c._id || c.id) !== courseId));
      localStorage.removeItem(`course_${courseId}`);
      toast.success('Course deleted');
    } catch (err: any) { toast.error(err.message || 'Failed to delete course'); }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!subject.trim()) { toast.error(t('courses.subjectRequired', 'Please enter a subject.')); return; }
    setGenerating(true);
    setGenStatus('Creating course structure...');
    setGenTopicsReady(0);
    setGenTotalTopics(0);
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token') || '';
    let navigated = false;
    try {
      const resp = await fetch(`${API}/courses/stream/generate-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subject: subject.trim(), classLevel, duration: Number(duration), language }),
      });
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let courseId: any = null;
      let courseData: any = null;
      let topicContents: any = {};
      let readyCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.phase) setGenStatus(data.message);
            if (data.title && data.modules) {
              courseData = { id: 'pending', title: data.title, description: data.description, modules: data.modules, subject: subject.trim(), duration_days: Number(duration), topicContents: {}, signLanguage };
              setGenTotalTopics(data.totalTopics || 0);
              setGenStatus('Structure ready! Generating content...');
            }
            if (data.courseId && !data.totalTopics) { courseId = data.courseId; if (courseData) courseData.id = courseId; }
            if (data.index !== undefined && data.content) {
              readyCount++;
              setGenTopicsReady(readyCount);
              setGenStatus(`Generated topic ${readyCount}: ${data.title}`);
              topicContents[data.index] = { title: data.title, content: data.content };
              if (courseData) courseData.topicContents = { ...topicContents };
              if (readyCount === 2 && !navigated && courseData) {
                navigated = true;
                const id = courseId || 'generated-' + Date.now();
                courseData.id = id;
                courseData.topicContents = { ...topicContents };
                localStorage.setItem(`course_${id}`, JSON.stringify(courseData));
                setEnrollments(prev => [courseData, ...prev]);
                setGenerating(false);
                router.push(`/courses/${id}`);
              }
              if (navigated && courseData) {
                courseData.topicContents = { ...topicContents };
                localStorage.setItem(`course_${courseData.id}`, JSON.stringify(courseData));
                window.dispatchEvent(new CustomEvent('topic-streamed', { detail: { index: data.index, title: data.title, content: data.content, ready: readyCount, total: genTotalTopics } }));
              }
            }
            if (data.totalTopics && data.courseId) {
              window.dispatchEvent(new CustomEvent('course-complete', { detail: { courseId: data.courseId, totalTopics: data.totalTopics } }));
            }
          } catch {}
        }
      }
      if (!navigated && courseData) {
        const id = courseId || 'generated-' + Date.now();
        courseData.id = id;
        courseData.topicContents = { ...topicContents };
        localStorage.setItem(`course_${id}`, JSON.stringify(courseData));
        setEnrollments(prev => [courseData, ...prev]);
        router.push(`/courses/${id}`);
      }
    } catch (err: any) { toast.error(err.message || 'Generation failed'); }
    finally { setGenerating(false); setGenStatus(''); }
  };

  const classLevels = [
    { value: '6', label: 'Class 6' }, { value: '7', label: 'Class 7' }, { value: '8', label: 'Class 8' },
    { value: '9', label: 'Class 9' }, { value: '10', label: 'Class 10' }, { value: '11', label: 'Class 11' },
    { value: '12', label: 'Class 12' }, { value: 'undergraduate', label: 'Undergraduate' }, { value: 'graduate', label: 'Graduate' },
  ];
  const languages = [
    { value: 'english', label: 'English' }, { value: 'hindi', label: 'Hindi' }, { value: 'tamil', label: 'Tamil' },
    { value: 'telugu', label: 'Telugu' }, { value: 'kannada', label: 'Kannada' }, { value: 'marathi', label: 'Marathi' },
    { value: 'bengali', label: 'Bengali' }, { value: 'gujarati', label: 'Gujarati' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage your courses and create new ones with AI.</p>
          </div>
          <button
            onClick={() => setTab(tab === 'generate' ? 'my-courses' : 'generate')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all ${
              tab === 'generate'
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-[#284ce3] text-white hover:bg-blue-700'
            }`}
          >
            {tab === 'generate' ? (
              <><Bookmark className="w-4 h-4" /> My Courses</>
            ) : (
              <><Plus className="w-4 h-4" /> Generate Course</>
            )}
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {tab === 'my-courses' && (
            <motion.div key="my-courses" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              {loadingEnrollments ? (
                <CoursesGridSkeleton />
              ) : enrollments.length === 0 ? (
                /* Empty state */
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm text-center py-20 px-6">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-[#284ce3]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No courses yet</h3>
                  <p className="text-sm text-gray-400 mb-8 max-w-md mx-auto">
                    Generate your first AI-powered course to start your learning journey. It only takes a few seconds.
                  </p>
                  <button
                    onClick={() => setTab('generate')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#284ce3] text-white font-semibold hover:bg-blue-700 shadow-md shadow-blue-200/40 hover:shadow-lg transition-all"
                  >
                    <Wand2 className="w-5 h-5" /> Generate Your First Course
                  </button>
                </div>
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {(Array.isArray(enrollments) ? enrollments : []).map((course: any, i: number) => (
                    <CourseCard
                      key={course._id || course.id || i}
                      course={course}
                      onClick={() => router.push(`/courses/${course._id || course.courseId || course.id}`)}
                      onDelete={handleDeleteCourse}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {tab === 'generate' && (
            <motion.div key="generate" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              {generating ? (
                <GenerationLoader status={genStatus} topicsReady={genTopicsReady} totalTopics={genTotalTopics} />
              ) : (
                <div className="max-w-3xl mx-auto">
                  {/* Hero header */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#284ce3] to-[#5b7cf7] p-8 mb-6">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 right-16 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
                    <div className="relative z-10">
                      <p className="text-white/60 text-sm font-medium mb-1">AI-Powered</p>
                      <h2 className="text-2xl font-extrabold text-white mb-2">Create Your Course</h2>
                      <p className="text-white/50 text-sm max-w-md">Tell us what you want to learn and our AI builds a complete, structured course in seconds.</p>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <form onSubmit={handleGenerate}>
                      {/* Subject — full width prominent input */}
                      <div className="p-6 pb-5 border-b border-gray-50">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">What do you want to learn?</label>
                        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                          placeholder="e.g., Photosynthesis, Machine Learning, Indian History..."
                          className="w-full px-0 py-2 text-xl font-semibold text-gray-900 placeholder:text-gray-300 border-0 border-b-2 border-gray-100 focus:border-[#284ce3] focus:outline-none transition bg-transparent" />
                      </div>

                      {/* Options row */}
                      <div className="grid grid-cols-3 divide-x divide-gray-50">
                        <div className="p-5">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Level</label>
                          <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)}
                            className="w-full px-0 py-1.5 text-sm font-semibold text-gray-800 border-0 bg-transparent focus:outline-none cursor-pointer appearance-none">
                            {classLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                          </select>
                        </div>
                        <div className="p-5">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Language</label>
                          <select value={language} onChange={(e) => setLanguage(e.target.value)}
                            className="w-full px-0 py-1.5 text-sm font-semibold text-gray-800 border-0 bg-transparent focus:outline-none cursor-pointer appearance-none">
                            {languages.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                          </select>
                        </div>
                        <div className="p-5">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Duration — <span className="text-[#284ce3]">{duration}d</span>
                          </label>
                          <input type="range" min={3} max={90} step={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#284ce3] mt-2" />
                          <div className="flex justify-between text-[10px] text-gray-300 mt-1">
                            <span>3d</span><span>90d</span>
                          </div>
                        </div>
                      </div>

                      {/* Accessibility: Sign Language */}
                      <div className="px-6 py-4 border-t border-gray-50">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={`relative w-11 h-6 rounded-full transition-colors ${signLanguage ? 'bg-purple-600' : 'bg-gray-200'}`}
                            onClick={() => setSignLanguage(!signLanguage)}>
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${signLanguage ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Hand className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-semibold text-gray-800">Sign Language Mode</span>
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Accessible</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              AI avatar will explain topics using sign language gestures with large text captions. No audio required.
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Submit */}
                      <div className="p-6 pt-4">
                        <button type="submit" disabled={generating}
                          className="w-full py-4 rounded-xl bg-[#284ce3] text-white font-bold text-base hover:bg-blue-700 shadow-lg shadow-blue-200/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                          {generating ? (
                            <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Generating...</span>
                          ) : (
                            signLanguage ? 'Generate Course (Sign Language)' : 'Generate Course'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
