"use client";
// ============================================================
// CoursePage - Single course view with accordion modules/lessons
// ============================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Clock,
  BarChart2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Play,
  Loader2,
  ArrowLeft,
  Layers,
  FileText,
  GraduationCap,
  Volume2,
  Lock,
  Brain,
  Trophy,
  Hand,
} from 'lucide-react';
import { courses } from '@/services/api';
import AdaptiveLesson from '@/components/course/AdaptiveLesson';
import AnimationPlayer from '@/components/animation/AnimationPlayer';
import CourseBadges from '@/components/course/CourseBadges';
import LessonTestPlayer from '@/components/course/LessonTestPlayer';

// --------------- playlist thumbnail colors ---------------

const COLORS = [
  'from-primary-600 to-primary-700', 'from-primary-600 to-cyan-600',
  'from-primary-600 to-pink-600', 'from-teal-600 to-emerald-600',
  'from-orange-500 to-red-500', 'from-primary-600 to-primary-600',
];

// --------------- animation helpers ---------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// --------------- difficulty badge ---------------

function DifficultyBadge({ difficulty }) {
  const map = {
    easy: 'bg-green-100 text-green-700 border-green-200',
    beginner: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    hard: 'bg-red-100 text-red-700 border-red-200',
    advanced: 'bg-red-100 text-red-700 border-red-200',
  };
  const colors = map[(difficulty || '').toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${colors}`}
    >
      {difficulty || 'N/A'}
    </span>
  );
}

// --------------- skeleton ---------------

function CourseSkeleton() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-24" />
      <div className="card">
        <div className="h-8 bg-gray-200 rounded w-2/3 mb-4" />
        <div className="flex gap-4">
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-4 bg-gray-100 rounded w-20" />
          <div className="h-4 bg-gray-100 rounded w-28" />
        </div>
        <div className="h-2 bg-gray-100 rounded-full mt-6" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

// --------------- topic row ---------------

function TopicRow({ topic, courseId, onNavigate }) {
  const isCompleted = topic.completed || topic.status === 'completed';

  return (
    <button
      onClick={() => onNavigate(topic._id || topic.id)}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-primary-50 transition-colors text-left group"
    >
      {isCompleted ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-gray-300 group-hover:text-primary-400 flex-shrink-0 transition-colors" />
      )}
      <span
        className={`text-sm flex-1 ${
          isCompleted ? 'text-gray-500 line-through' : 'text-gray-800 group-hover:text-primary-700'
        }`}
        style={{ color: isCompleted ? '#6b7280' : '#1f2937' }}
      >
        {topic.title || topic.name || `Topic ${topic.order_index ?? ''}`}
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-500 transition-colors" />
    </button>
  );
}

// --------------- lesson accordion ---------------

function LessonAccordion({ lesson, courseId, onNavigateTopic, locked, testPassed, bestScore, allTopicsComplete, onStartTest }) {
  const [open, setOpen] = useState(false);
  const topics = lesson.topics || [];
  const completedTopics = topics.filter((t) => t.completed || t.status === 'completed').length;
  const testReady = allTopicsComplete && !testPassed;

  return (
    <div className={`border rounded-lg overflow-hidden ${locked ? 'border-gray-200 bg-gray-50/50' : 'border-gray-100'}`}>
      <button
        onClick={() => { if (!locked) setOpen(!open); else toast.error("Pass the previous lesson's test to unlock this lesson"); }}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${locked ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {locked ? <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" /> :
           testPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> :
           <FileText className="w-4 h-4 text-primary-400 flex-shrink-0" />}
          <span className={`text-sm font-medium truncate ${locked ? 'text-gray-400' : 'text-gray-800'}`}>
            {lesson.title || lesson.name}
          </span>
          {topics.length > 0 && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              {completedTopics}/{topics.length}
            </span>
          )}
          {testPassed && bestScore != null && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
              Test: {bestScore}%
            </span>
          )}
          {locked && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Locked</span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className={`w-4 h-4 ${locked ? 'text-gray-300' : 'text-gray-400'}`} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && !locked && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }} className="overflow-hidden">
            <div className="px-2 pb-2 space-y-0.5 border-t border-gray-50 pt-1">
              {/* Topic rows */}
              {topics.map((topic, i) => (
                <TopicRow key={topic._id || topic.id || i} topic={topic} courseId={courseId} onNavigate={onNavigateTopic} />
              ))}

              {/* ── Lesson Test Row — always visible ── */}
              <div className="mt-1 border-t border-gray-100 pt-1">
                {testPassed ? (
                  /* Passed state */
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-emerald-50">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-emerald-700 flex-1">Lesson Test</span>
                    <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-600">{bestScore}%</span>
                  </div>
                ) : testReady ? (
                  /* Ready to take — all topics done */
                  <button onClick={() => onStartTest?.(lesson)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary-50 to-primary-50 border border-primary-200 hover:from-primary-100 hover:to-primary-100 transition-colors group">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Brain className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-primary-700 flex-1 text-left">Lesson Test</span>
                    <span className="text-[10px] bg-primary-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">TAKE NOW</span>
                    <ChevronRight className="w-3.5 h-3.5 text-primary-400" />
                  </button>
                ) : (
                  /* Not ready — still have topics to complete */
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gray-50 opacity-60">
                    <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-400 flex-1">Lesson Test</span>
                    <span className="text-[10px] text-gray-400">Complete all topics first</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --------------- module accordion ---------------

function ModuleAccordion({ module, index, courseId, onNavigateTopic, lessonStatuses, completedTopicIds, onStartTest }) {
  const [open, setOpen] = useState(index === 0); // first module open by default
  const lessons = module.lessons || [];

  // Count completed topics across all lessons
  const allTopics = lessons.flatMap((l) => l.topics || []);
  const completedCount = allTopics.filter((t) => t.completed || t.status === 'completed').length;
  const totalCount = allTopics.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <motion.div variants={itemVariants} className="card p-0 overflow-hidden">
      {/* Module header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <span className="text-sm font-bold text-primary-600">{index + 1}</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {module.title || module.name}
            </h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-gray-400">
                {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
              </span>
              {totalCount > 0 && (
                <span className="text-xs text-gray-400">
                  {completedCount}/{totalCount} topics
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Mini progress */}
          {totalCount > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 min-w-[2.5rem]">{progressPct}%</span>
            </div>
          )}
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </motion.div>
        </div>
      </button>

      {/* Lessons */}
      <AnimatePresence>
        {open && lessons.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4 space-y-2 border-t border-gray-100 pt-3">
              {lessons.map((lesson, i) => {
                const lid = lesson._id || lesson.id;
                const status = lessonStatuses?.[lid] || {};
                const lessonTopicIds = (lesson.topics || []).map((t: any) => t._id || t.id);
                const allTopicsComplete = lessonTopicIds.length > 0 && lessonTopicIds.every((tid: string) => completedTopicIds?.has(tid));
                return (
                  <LessonAccordion
                    key={lid || i}
                    lesson={lesson}
                    courseId={courseId}
                    onNavigateTopic={onNavigateTopic}
                    locked={status.locked || false}
                    testPassed={status.testPassed || false}
                    bestScore={status.bestScore}
                    allTopicsComplete={allTopicsComplete}
                    onStartTest={onStartTest}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function CoursePage() {
  const params = useParams(); const id = params?.id as string;
  const { t } = useTranslation();
  const router = useRouter();
  const location = window.location;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [allTopicsList, setAllTopicsList] = useState([]);
  const [completedTopicIds, setCompletedTopicIds] = useState<Set<string>>(new Set());
  const [lessonStatuses, setLessonStatuses] = useState<Record<string, any>>({});
  const [activeLessonTest, setActiveLessonTest] = useState<any>(null);
  const [streamingInProgress, setStreamingInProgress] = useState(false);
  const [streamedCount, setStreamedCount] = useState(0);
  const [streamTotal, setStreamTotal] = useState(0);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchCourse() {
      try {
        // Try API first (returns proper data with IDs from DB)
        const res = await courses.getCourse(id);
        const courseData = res?.course || res?.data || res;

        if (!cancelled && courseData && courseData.modules?.length > 0) {
          setCourse(courseData);
          return;
        }

        // Fallback: localStorage (for courses not yet in DB)
        const cached = localStorage.getItem(`course_${id}`);
        if (!cancelled && cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed) {
              // Normalize topics: convert strings to objects
              if (parsed.modules) {
                parsed.modules = parsed.modules.map((m: any) => ({
                  ...m,
                  lessons: (m.lessons || []).map((l: any) => ({
                    ...l,
                    topics: (l.topics || []).map((t: any, ti: number) =>
                      typeof t === 'string' ? { id: `t-${ti}`, title: t } : t
                    ),
                  })),
                }));
              }
              setCourse(parsed);
            }
          } catch {}
        }
      } catch (err) {
        // Last resort: localStorage
        if (!cancelled) {
          const cached = localStorage.getItem(`course_${id}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed?.modules) {
                parsed.modules = parsed.modules.map((m: any) => ({
                  ...m,
                  lessons: (m.lessons || []).map((l: any) => ({
                    ...l,
                    topics: (l.topics || []).map((t: any, ti: number) =>
                      typeof t === 'string' ? { id: `t-${ti}`, title: t } : t
                    ),
                  })),
                }));
              }
              setCourse(parsed);
            } catch {}
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCourse();
    return () => { cancelled = true; };
  }, [id, t]);

  // Load progress + lesson statuses from backend
  const loadProgress = () => {
    if (!id) return;
    // Fetch progress
    courses.getProgress(id).then((res: any) => {
      if (res?.completedTopics?.length) {
        setCompletedTopicIds(new Set(res.completedTopics));
        setCourse((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          updated.modules = (updated.modules || []).map((m: any) => ({
            ...m,
            lessons: (m.lessons || []).map((l: any) => ({
              ...l,
              topics: (l.topics || []).map((t: any) => ({
                ...t,
                completed: res.completedTopics.includes(t.id),
              })),
            })),
          }));
          return updated;
        });
      }
    }).catch(() => {});

    // Fetch lesson lock statuses
    courses.getLessonStatuses(id).then((res: any) => {
      if (res?.lessons?.length) {
        const map: Record<string, any> = {};
        res.lessons.forEach((l: any) => { map[l.lessonId] = l; });
        setLessonStatuses(map);
      }
    }).catch(() => {});
  };

  useEffect(() => { if (course) loadProgress(); }, [course?.id, id]);

  // Find first incomplete topic for "Start Learning" button
  const firstIncompleteTopic = useMemo(() => {
    if (!course) return null;
    const modules = course.modules || [];
    for (const mod of modules) {
      for (const lesson of mod.lessons || []) {
        for (const topic of lesson.topics || []) {
          if (!topic.completed && topic.status !== 'completed') {
            return topic;
          }
        }
      }
    }
    return null;
  }, [course]);

  // Overall progress
  const progressData = useMemo(() => {
    if (!course) return { completed: 0, total: 0, pct: 0 };
    const modules = course.modules || [];
    const allTopics = modules.flatMap((m) =>
      (m.lessons || []).flatMap((l) => l.topics || [])
    );
    const completed = allTopics.filter(
      (t) => t.completed || t.status === 'completed'
    ).length;
    const total = allTopics.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, pct };
  }, [course]);

  // Build flat list of all topics for prev/next navigation
  useEffect(() => {
    if (!course) return;
    const topics = [];
    (course.modules || []).forEach(mod => {
      (mod.lessons || []).forEach(les => {
        (les.topics || []).forEach(top => {
          topics.push(top);
        });
      });
    });
    setAllTopicsList(topics);

    // Auto-start first topic if navigated from course generation
    const params = new URLSearchParams(window.location.search);
    const navState = window.history.state?.usr;
    if ((navState?.autoStart || params.get('autoStart')) && !autoStartedRef.current && topics.length > 0) {
      autoStartedRef.current = true;
      setSelectedTopic(topics[0]);
      setStreamingInProgress(true);
    }
  }, [course]);

  // Listen for new topics streamed from the background generation
  useEffect(() => {
    const handleTopicStreamed = (e) => {
      const { index, title, content, ready, total } = e.detail;
      setStreamedCount(ready);
      setStreamTotal(total);

      // Refresh course data from localStorage
      const cached = localStorage.getItem(`course_${id}`);
      if (cached) {
        try {
          const updated = JSON.parse(cached);
          setCourse(prev => ({ ...prev, topicContents: updated.topicContents }));
        } catch {}
      }
    };

    const handleCourseComplete = () => {
      setStreamingInProgress(false);
      // Reload full course from localStorage
      const cached = localStorage.getItem(`course_${id}`);
      if (cached) {
        try { setCourse(JSON.parse(cached)); } catch {}
      }
    };

    window.addEventListener('topic-streamed', handleTopicStreamed);
    window.addEventListener('course-complete', handleCourseComplete);
    return () => {
      window.removeEventListener('topic-streamed', handleTopicStreamed);
      window.removeEventListener('course-complete', handleCourseComplete);
    };
  }, [id]);

  const [showModeModal, setShowModeModal] = useState(null); // topic object or null
  const [lessonMode, setLessonMode] = useState('text'); // 'text', 'visual', or 'sign'

  // Auto-select sign language mode if course was generated with sign language preference
  useEffect(() => {
    if (course?.signLanguage) setLessonMode('sign');
  }, [course?.signLanguage]);

  const handleNavigateTopic = (topicId) => {
    const topic = allTopicsList.find(t => (t._id || t.id) === topicId);
    if (!topic) return;

    // Check if the topic's lesson is locked
    const lesson = findLessonForTopic(topicId);
    if (lesson) {
      const lid = lesson._id || lesson.id;
      const status = lessonStatuses[lid];
      if (status?.locked) {
        toast.error("Pass the previous lesson's test to unlock this content");
        return;
      }
    }

    // If course was generated with sign language preference, skip mode modal and go directly
    if (course?.signLanguage) {
      setLessonMode('sign');
      setSelectedTopic(topic);
      return;
    }

    setShowModeModal(topic);
  };

  const currentTopicIndex = selectedTopic
    ? allTopicsList.findIndex(t => (t._id || t.id) === (selectedTopic._id || selectedTopic.id))
    : -1;

  const markCurrentTopicComplete = async () => {
    if (!selectedTopic) return;
    const topicId = selectedTopic._id || selectedTopic.id;
    if (!topicId || completedTopicIds.has(topicId)) return;

    // Optimistic update
    setCompletedTopicIds(prev => new Set([...prev, topicId]));

    // Update course data locally
    setCourse((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.modules = (updated.modules || []).map((m: any) => ({
        ...m,
        lessons: (m.lessons || []).map((l: any) => ({
          ...l,
          topics: (l.topics || []).map((t: any) =>
            (t._id || t.id) === topicId ? { ...t, completed: true } : t
          ),
        })),
      }));
      return updated;
    });

    // Save to backend
    try {
      await courses.completeTopic(id, topicId);
    } catch (err) {
      console.warn("Failed to save progress:", err);
    }
  };

  // Find which lesson a topic belongs to
  const findLessonForTopic = (topicId: string) => {
    for (const mod of (course?.modules || [])) {
      for (const les of (mod.lessons || [])) {
        for (const top of (les.topics || [])) {
          if ((top._id || top.id) === topicId) return les;
        }
      }
    }
    return null;
  };

  const handleStartTest = (lesson: any) => {
    setActiveLessonTest({
      lessonId: lesson._id || lesson.id,
      lessonTitle: lesson.title || lesson.name,
      topicCount: (lesson.topics || []).length,
    });
  };

  const handleTestPass = () => {
    setActiveLessonTest(null);
    loadProgress(); // Refresh lesson statuses
    toast.success("Lesson test passed! Next lesson unlocked.");
  };

  const handleNextTopic = async () => {
    await markCurrentTopicComplete();

    const curTopicId = selectedTopic?._id || selectedTopic?.id;
    const currentLesson = findLessonForTopic(curTopicId);
    const curLessonId = currentLesson?._id || currentLesson?.id;

    // Check if this is the last topic in the current lesson
    const lessonTopics = currentLesson?.topics || [];
    const isLastTopicInLesson = lessonTopics.length > 0 &&
      (lessonTopics[lessonTopics.length - 1]?._id || lessonTopics[lessonTopics.length - 1]?.id) === curTopicId;

    // If last topic in lesson and test not passed → trigger test
    if (isLastTopicInLesson && curLessonId) {
      const status = lessonStatuses[curLessonId];
      if (status && !status.testPassed) {
        setSelectedTopic(null);
        handleStartTest(currentLesson);
        return;
      }
      // If no status data (first time), also trigger test
      if (Object.keys(lessonStatuses).length > 0 && !status?.testPassed) {
        setSelectedTopic(null);
        handleStartTest(currentLesson);
        return;
      }
    }

    // Move to next topic
    if (currentTopicIndex < allTopicsList.length - 1) {
      const nextTopic = allTopicsList[currentTopicIndex + 1];
      const nextLesson = findLessonForTopic(nextTopic?._id || nextTopic?.id);
      const nextLessonId = nextLesson?._id || nextLesson?.id;

      // If next topic is in a different (locked) lesson, trigger test first
      if (curLessonId && nextLessonId && curLessonId !== nextLessonId) {
        const nextStatus = lessonStatuses[nextLessonId];
        if (nextStatus?.locked) {
          setSelectedTopic(null);
          handleStartTest(currentLesson);
          return;
        }
      }

      setSelectedTopic(nextTopic);
    } else {
      // Last topic of the entire course — trigger final lesson test
      if (curLessonId && !lessonStatuses[curLessonId]?.testPassed) {
        setSelectedTopic(null);
        handleStartTest(currentLesson);
      }
    }
  };

  const handlePrevTopic = () => {
    if (currentTopicIndex > 0) {
      setSelectedTopic(allTopicsList[currentTopicIndex - 1]);
    }
  };

  // --------------- loading ---------------

  if (loading) return <CourseSkeleton />;

  if (!course) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="card text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            {t('courses.notFound', 'Course not found')}
          </h2>
          <button
            onClick={() => router.push('/courses')}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back', 'Back to Courses')}
          </button>
        </div>
      </div>
    );
  }

  const modules = course.modules || [];

  // ── Lesson Test Player ──────────────────────────────────
  if (activeLessonTest) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
        <button onClick={() => setActiveLessonTest(null)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to Course
        </button>
        <LessonTestPlayer
          courseId={id}
          lessonId={activeLessonTest.lessonId}
          lessonTitle={activeLessonTest.lessonTitle}
          topicCount={activeLessonTest.topicCount}
          onPass={handleTestPass}
          onClose={() => setActiveLessonTest(null)}
        />
      </div>
    );
  }

  // ── Mode selection modal ────────────────────────────────
  if (showModeModal && !selectedTopic) {
    const topicName = typeof showModeModal === 'string' ? showModeModal : (showModeModal?.title || 'Topic');
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => setShowModeModal(null)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Course
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How do you want to learn?</h2>
          <p className="text-gray-500">"{topicName}"</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Option 1: Text + Voice */}
          <button
            onClick={() => { setLessonMode('text'); setSelectedTopic(showModeModal); setShowModeModal(null); }}
            className="group card hover:shadow-xl hover:border-primary-300 transition-all p-6 text-left border-2 border-transparent hover:border-primary-200"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">Text + Voice</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              AI explains with text slides and voice narration. Includes subtitles.
            </p>
            <div className="mt-4 flex items-center gap-2 text-primary-600 text-sm font-medium">
              <Play className="w-4 h-4" /> Start Learning
            </div>
          </button>

          {/* Option 2: Visual Explanation */}
          <button
            onClick={() => { setLessonMode('visual'); setSelectedTopic(showModeModal); setShowModeModal(null); }}
            className="group card hover:shadow-xl hover:border-emerald-300 transition-all p-6 text-left border-2 border-transparent hover:border-emerald-200"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">Visual Explanation</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Step-by-step visual animations with diagrams and interactive elements.
            </p>
            <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <Play className="w-4 h-4" /> Start Visual
            </div>
          </button>

          {/* Option 3: Sign Language */}
          <button
            onClick={() => { setLessonMode('sign'); setSelectedTopic(showModeModal); setShowModeModal(null); }}
            className="group card hover:shadow-xl hover:border-primary-300 transition-all p-6 text-left border-2 border-transparent hover:border-primary-200 relative overflow-hidden"
          >
            {/* Accessibility badge */}
            <div className="absolute top-3 right-3 bg-primary-100 text-primary-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Accessible
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-pink-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Hand className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">Sign Language</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              A 3D avatar signs every step of the visual lesson beside the diagrams, with large captions, and signs the answers to your questions. No audio needed.
            </p>
            <div className="mt-4 flex items-center gap-2 text-primary-600 text-sm font-medium">
              <Play className="w-4 h-4" /> Start Signing
            </div>
          </button>
        </div>
      </div>
    );
  }

  // If a topic is selected, show YouTube-like layout
  if (selectedTopic) {
    const currentLesson = findLessonForTopic(selectedTopic?._id || selectedTopic?.id);

    return (
      <div className="p-4 lg:px-6 lg:py-4 max-w-[1400px] mx-auto">
        {/* Background generation banner */}
        {streamingInProgress && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary-50 to-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-sm font-medium text-primary-700">Generating remaining topics in background...</p>
                <p className="text-xs text-primary-500">You can keep learning while we prepare the rest</p>
              </div>
            </div>
            {streamTotal > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-primary-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${(streamedCount / streamTotal) * 100}%` }} />
                </div>
                <span className="text-xs font-medium text-primary-600">{streamedCount}/{streamTotal}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── YouTube two-column layout ── */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left: Video player ── */}
          <div className="flex-1 min-w-0">
            {lessonMode === 'visual' ? (
              <AnimationPlayer
                key="visual"
                topic={typeof selectedTopic === 'string' ? selectedTopic : selectedTopic?.title || 'Topic'}
                classLevel="10"
                language={localStorage.getItem('app_language') || 'en'}
                onNext={currentTopicIndex < allTopicsList.length - 1 ? handleNextTopic : undefined}
              />
            ) : lessonMode === 'sign' ? (
              /* Same animated lesson (diagrams + captions); the 3D avatar signs the narration and answers questions. */
              <AnimationPlayer
                key="sign"
                topic={typeof selectedTopic === 'string' ? selectedTopic : selectedTopic?.title || 'Topic'}
                classLevel="10"
                language={localStorage.getItem('app_language') || 'en'}
                onNext={currentTopicIndex < allTopicsList.length - 1 ? handleNextTopic : undefined}
                signLanguage
              />
            ) : (
              <AdaptiveLesson
                topic={selectedTopic}
                language={localStorage.getItem('app_language') || 'en'}
                onNext={currentTopicIndex < allTopicsList.length - 1 ? handleNextTopic : null}
                onPrev={currentTopicIndex > 0 ? handlePrevTopic : null}
                lowBandwidth={localStorage.getItem('low_bandwidth') === 'true'}
              />
            )}

            {/* ── Channel-like info under the player ── */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{course?.title || 'Course'}</p>
                  <p className="text-xs text-gray-500">
                    {currentLesson?.title || currentLesson?.name || 'Lesson'} &middot; Topic {currentTopicIndex + 1} of {allTopicsList.length}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { markCurrentTopicComplete(); setSelectedTopic(null); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Course
              </button>
            </div>
          </div>

          {/* ── Right: YouTube-style playlist sidebar ── */}
          <div className="lg:w-[360px] xl:w-[400px] flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4">
              {/* Playlist header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{course?.title || 'Course Topics'}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {currentTopicIndex + 1}/{allTopicsList.length} &middot; {progressData.pct}% complete
                    </p>
                  </div>
                  <button
                    onClick={() => { markCurrentTopicComplete(); setSelectedTopic(null); }}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                  >
                    View all
                  </button>
                </div>
                {/* Mini progress */}
                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 rounded-full transition-all duration-500" style={{ width: `${progressData.pct}%` }} />
                </div>
              </div>

              {/* Playlist items */}
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto divide-y divide-gray-100">
                {allTopicsList.map((t, i) => {
                  const tid = t._id || t.id;
                  const isActive = (selectedTopic?._id || selectedTopic?.id) === tid;
                  const isCompleted = t.completed || t.status === 'completed' || completedTopicIds.has(tid);
                  const topicLesson = findLessonForTopic(tid);
                  const lessonTitle = topicLesson?.title || topicLesson?.name || '';

                  // Show module/lesson dividers
                  const prevTopic = i > 0 ? allTopicsList[i - 1] : null;
                  const prevLesson = prevTopic ? findLessonForTopic(prevTopic._id || prevTopic.id) : null;
                  const showLessonHeader = !prevLesson || (prevLesson?._id || prevLesson?.id) !== (topicLesson?._id || topicLesson?.id);

                  return (
                    <div key={tid || i}>
                      {/* Lesson divider */}
                      {showLessonHeader && lessonTitle && (
                        <div className="px-4 py-2 bg-gray-50/80">
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">
                            {lessonTitle}
                          </p>
                        </div>
                      )}
                      {/* Topic row */}
                      <button
                        onClick={() => {
                          const lesson = findLessonForTopic(tid);
                          if (lesson) {
                            const lid = lesson._id || lesson.id;
                            const status = lessonStatuses[lid];
                            if (status?.locked) {
                              toast.error("Pass the previous lesson's test to unlock this content");
                              return;
                            }
                          }
                          markCurrentTopicComplete();
                          setSelectedTopic(t);
                        }}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 ${
                          isActive ? 'bg-primary-50 border-l-2 border-l-blue-600' : ''
                        }`}
                      >
                        {/* Index / status */}
                        <div className="flex-shrink-0 w-6 pt-0.5 text-center">
                          {isActive ? (
                            <div className="flex items-center justify-center">
                              <Play className="w-3.5 h-3.5 text-primary-600 fill-blue-600" />
                            </div>
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-xs text-gray-400">{i + 1}</span>
                          )}
                        </div>

                        {/* Thumbnail placeholder */}
                        <div className={`flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden relative ${
                          isActive ? 'ring-2 ring-primary-500' : ''
                        }`}>
                          <div className={`w-full h-full bg-gradient-to-br ${COLORS[i % COLORS.length]} flex items-center justify-center`}>
                            <Play className="w-5 h-5 text-white/60" />
                          </div>
                          {/* Duration badge */}
                          <span className="absolute bottom-1 right-1 text-[10px] bg-black/80 text-white px-1 rounded font-mono">
                            ~{Math.ceil(15 * (3 + (i % 4))/ 60)}:{((15 * (i % 4)) % 60).toString().padStart(2, '0')}
                          </span>
                          {/* Completed overlay */}
                          {isCompleted && !isActive && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Title & meta */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className={`text-sm font-medium line-clamp-2 leading-tight ${
                            isActive ? 'text-primary-700' : isCompleted ? 'text-gray-500' : 'text-gray-900'
                          }`}>
                            {t.title || t.name || `Topic ${i + 1}`}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1 truncate">
                            {course?.title || 'Course'}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Back button */}
        <motion.div variants={itemVariants}>
          <button
            onClick={() => router.push('/courses')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.backToCourses', 'Back to Courses')}
          </button>
        </motion.div>

        {/* Course header card */}
        <motion.div variants={itemVariants} className="card">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                {course.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {course.subject && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    {course.subject}
                  </span>
                )}
                {(course.difficulty || course.difficulty_level) && (
                  <DifficultyBadge difficulty={course.difficulty || course.difficulty_level} />
                )}
                {(course.duration || course.duration_days) && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {course.duration || course.duration_days} days
                  </span>
                )}
                {modules.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    {modules.length} module{modules.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Start learning button */}
            {firstIncompleteTopic && (
              <button
                onClick={() => handleNavigateTopic(firstIncompleteTopic._id || firstIncompleteTopic.id)}
                className="btn-primary flex items-center gap-2 flex-shrink-0"
              >
                <Play className="w-4 h-4" />
                {t('courses.startLearning', 'Start Learning')}
              </button>
            )}
          </div>

          {/* Overall progress bar */}
          {progressData.total > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">
                  {t('courses.overallProgress', 'Overall Progress')}
                </span>
                <span className="font-semibold text-gray-700">
                  {progressData.completed}/{progressData.total} topics ({progressData.pct}%)
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressData.pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Badges & Progress */}
        <CourseBadges
          course={course}
          completedTopics={progressData.completed}
          totalTopics={progressData.total}
        />

        {/* Modules */}
        {modules.length > 0 ? (
          modules.map((module, i) => (
            <ModuleAccordion
              key={module._id || module.id || i}
              module={module}
              index={i}
              courseId={id}
              onNavigateTopic={handleNavigateTopic}
              lessonStatuses={lessonStatuses}
              completedTopicIds={completedTopicIds}
              onStartTest={handleStartTest}
            />
          ))
        ) : (
          <motion.div variants={itemVariants} className="card text-center py-12">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {t('courses.noModules', 'This course has no modules yet.')}
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
