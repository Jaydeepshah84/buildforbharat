"use client";
// ============================================================
// CoursesPage - My Courses grid + Generate New Course form
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Sparkles,
  Loader2,
  Clock,
  BarChart2,
  ChevronRight,
  GraduationCap,
  Languages,
  Calendar,
  Play,
  Search,
  Trash2,
} from 'lucide-react';
import { courses } from '@/services/api';

// --------------- animation helpers ---------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
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
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${colors}`}
    >
      {difficulty || 'N/A'}
    </span>
  );
}

// --------------- course card ---------------

function CourseCard({ course, onClick, onDelete }) {
  const progress = course.progress ?? 0;

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
      className="card cursor-pointer hover:shadow-md transition-shadow group relative"
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all z-10 shadow-sm"
        title="Delete course"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Header accent bar */}
      <div className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 mb-4" />

      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-700 transition-colors">
          {course.title}
        </h3>
        <DifficultyBadge difficulty={course.difficulty || course.difficulty_level} />
      </div>

      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5" />
        {course.subject}
      </p>

      {(course.duration || course.duration_days) && (
        <p className="text-sm text-gray-400 mb-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {course.duration || course.duration_days} days
        </p>
      )}

      {/* Progress bar */}
      <div className="mt-auto">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium text-gray-700">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// --------------- loading skeleton ---------------

function CoursesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-1.5 bg-gray-200 rounded-full mb-4 w-full" />
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
          <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
          <div className="h-2 bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// --------------- generation loading ---------------

function GenerationLoader({ status, topicsReady, totalTopics }) {
  const pct = totalTopics > 0 ? Math.round((topicsReady / totalTopics) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card text-center py-12"
    >
      <div className="relative mx-auto w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-spin opacity-20" />
        <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        AI is creating your course...
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
        {status || 'Building a personalized learning path just for you.'}
      </p>
      {totalTopics > 0 && (
        <div className="max-w-xs mx-auto">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Generating topics</span>
            <span>{topicsReady} / {totalTopics}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// Tabs
// ============================================================

const TABS = ['my-courses', 'generate'];

// ============================================================
// Main component
// ============================================================

export default function CoursesPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [tab, setTab] = useState('my-courses');

  // --- My Courses state ---
  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);

  // --- Generate state ---
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('10');
  const [duration, setDuration] = useState(3);
  const [language, setLanguage] = useState('english');
  const [generating, setGenerating] = useState(false);

  // Fetch all courses on mount (enrollments + all courses as fallback)
  useEffect(() => {
    let cancelled = false;

    async function fetchCourses() {
      try {
        // Try enrollments first
        const enrollRes = await courses.getEnrollments();
        let list = enrollRes.enrollments || enrollRes.data || enrollRes || [];

        // Extract nested course object if enrollments have { courses: {...} }
        list = list.map(item => {
          if (item.courses && typeof item.courses === 'object') {
            return { ...item.courses, enrollment_id: item.id, progress: item.progress };
          }
          return item;
        });

        // Also fetch all courses and merge (in case some aren't enrolled)
        try {
          const allRes = await courses.getCourses();
          const allCourses = allRes.courses || allRes.data || allRes || [];
          const existingIds = new Set(list.map(c => c.id || c._id));
          allCourses.forEach(c => {
            if (!existingIds.has(c.id) && !existingIds.has(c._id)) {
              list.push(c);
            }
          });
        } catch {}

        if (!cancelled) setEnrollments(list.filter(c => c && (c.id || c._id)));
      } catch (err) {
        // Fallback: try just getCourses
        try {
          const allRes = await courses.getCourses();
          if (!cancelled) setEnrollments(allRes.courses || allRes.data || []);
        } catch {}
      } finally {
        if (!cancelled) setLoadingEnrollments(false);
      }
    }

    fetchCourses();
    return () => { cancelled = true; };
  }, [t]);

  // Delete course handler
  const handleDeleteCourse = async (courseId) => {
    try {
      await courses.deleteCourse(courseId);
      setEnrollments(prev => prev.filter(c => (c._id || c.id) !== courseId));
      // Also remove from localStorage
      localStorage.removeItem(`course_${courseId}`);
      toast.success('Course deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete course');
    }
  };

  // Progressive streaming course generation
  const [genStatus, setGenStatus] = useState('');
  const [genTopicsReady, setGenTopicsReady] = useState(0);
  const [genTotalTopics, setGenTotalTopics] = useState(0);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error(t('courses.subjectRequired', 'Please enter a subject.'));
      return;
    }

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

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let courseId = null;
      let courseData = null;
      let topicContents = {}; // index -> { title, content }
      let readyCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            // Phase status updates
            if (data.phase) setGenStatus(data.message);

            // Structure received
            if (data.title && data.modules) {
              courseData = {
                id: 'pending', title: data.title, description: data.description,
                modules: data.modules, subject: subject.trim(),
                duration_days: Number(duration), topicContents: {},
              };
              setGenTotalTopics(data.totalTopics || 0);
              setGenStatus(`Structure ready! Generating content...`);
            }

            // Course saved to DB
            if (data.courseId && !data.totalTopics) {
              courseId = data.courseId;
              if (courseData) courseData.id = courseId;
            }

            // Topic content ready
            if (data.index !== undefined && data.content) {
              readyCount++;
              setGenTopicsReady(readyCount);
              setGenStatus(`Generated topic ${readyCount}: ${data.title}`);
              topicContents[data.index] = { title: data.title, content: data.content };

              // Update courseData with content
              if (courseData) {
                courseData.topicContents = { ...topicContents };
              }

              // ★ After 2 topics are ready → navigate immediately & start teaching
              if (readyCount === 2 && !navigated && courseData) {
                navigated = true;
                const id = courseId || 'generated-' + Date.now();
                courseData.id = id;
                courseData.topicContents = { ...topicContents };
                localStorage.setItem(`course_${id}`, JSON.stringify(courseData));
                setEnrollments(prev => [courseData, ...prev]);
                setGenerating(false);

                // Navigate to course — student starts learning NOW
                router.push(`/courses/${id}`, {
                  state: { autoStart: true, streaming: true }
                });
              }

              // Keep updating localStorage as more topics stream in
              if (navigated && courseData) {
                const id = courseData.id;
                courseData.topicContents = { ...topicContents };
                localStorage.setItem(`course_${id}`, JSON.stringify(courseData));

                // Dispatch custom event so CoursePage picks up new topics
                window.dispatchEvent(new CustomEvent('topic-streamed', {
                  detail: { index: data.index, title: data.title, content: data.content, ready: readyCount, total: genTotalTopics }
                }));
              }
            }

            // All done
            if (data.totalTopics && data.courseId) {
              window.dispatchEvent(new CustomEvent('course-complete', {
                detail: { courseId: data.courseId, totalTopics: data.totalTopics }
              }));
            }
          } catch {}
        }
      }

      // If never navigated (e.g., 0-1 topics), navigate now
      if (!navigated && courseData) {
        const id = courseId || 'generated-' + Date.now();
        courseData.id = id;
        courseData.topicContents = { ...topicContents };
        localStorage.setItem(`course_${id}`, JSON.stringify(courseData));
        setEnrollments(prev => [courseData, ...prev]);
        router.push(`/courses/${id}`);
      }
    } catch (err) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
      setGenStatus('');
    }
  };

  // --------------- class levels ---------------
  const classLevels = [
    { value: '6', label: 'Class 6' },
    { value: '7', label: 'Class 7' },
    { value: '8', label: 'Class 8' },
    { value: '9', label: 'Class 9' },
    { value: '10', label: 'Class 10' },
    { value: '11', label: 'Class 11' },
    { value: '12', label: 'Class 12' },
    { value: 'undergraduate', label: 'Undergraduate' },
    { value: 'graduate', label: 'Graduate' },
  ];

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'tamil', label: 'Tamil' },
    { value: 'telugu', label: 'Telugu' },
    { value: 'kannada', label: 'Kannada' },
    { value: 'marathi', label: 'Marathi' },
    { value: 'bengali', label: 'Bengali' },
    { value: 'gujarati', label: 'Gujarati' },
  ];

  // --------------- render ---------------

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t('courses.title', 'Courses')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('courses.subtitle', 'Manage your courses and create new ones with AI.')}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setTab('my-courses')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'my-courses'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {t('courses.myCourses', 'My Courses')}
            </span>
          </button>
          <button
            onClick={() => setTab('generate')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'generate'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t('courses.generateNew', 'Generate New Course')}
            </span>
          </button>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {tab === 'my-courses' && (
            <motion.div
              key="my-courses"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.3 }}
            >
              {loadingEnrollments ? (
                <CoursesGridSkeleton />
              ) : enrollments.length === 0 ? (
                <div className="card text-center py-16">
                  <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {t('courses.noCourses', 'No courses yet')}
                  </h3>
                  <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
                    {t(
                      'courses.noCoursesDesc',
                      'Generate your first AI-powered course to start learning.'
                    )}
                  </p>
                  <button
                    onClick={() => setTab('generate')}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('courses.generateFirst', 'Generate Your First Course')}
                  </button>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {(Array.isArray(enrollments) ? enrollments : []).map((course, i) => (
                    <CourseCard
                      key={course._id || course.id || i}
                      course={course}
                      onClick={() =>
                        router.push(`/courses/${course._id || course.courseId || course.id}`)
                      }
                      onDelete={handleDeleteCourse}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {tab === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.3 }}
            >
              {generating ? (
                <GenerationLoader status={genStatus} topicsReady={genTopicsReady} totalTopics={genTotalTopics} />
              ) : (
                <div className="max-w-2xl mx-auto">
                  <div className="card">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {t('courses.generateTitle', 'Generate a New Course')}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {t(
                            'courses.generateDesc',
                            'Our AI will create a personalized course just for you.'
                          )}
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleGenerate} className="space-y-5">
                      {/* Subject */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {t('courses.subject', 'Subject')}
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder={t(
                              'courses.subjectPlaceholder',
                              'e.g., Photosynthesis, Algebra, Indian History...'
                            )}
                            className="input-field pl-10"
                          />
                        </div>
                      </div>

                      {/* Class level */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4" />
                            {t('courses.classLevel', 'Class Level')}
                          </span>
                        </label>
                        <select
                          value={classLevel}
                          onChange={(e) => setClassLevel(e.target.value)}
                          className="input-field"
                        >
                          {classLevels.map((lvl) => (
                            <option key={lvl.value} value={lvl.value}>
                              {lvl.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Duration slider */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {t('courses.duration', 'Duration')}:{' '}
                            <span className="text-primary-600 font-semibold">{duration} days</span>
                          </span>
                        </label>
                        <input
                          type="range"
                          min={3}
                          max={90}
                          step={1}
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>3 days</span>
                          <span>90 days</span>
                        </div>
                      </div>

                      {/* Language */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <Languages className="w-4 h-4" />
                            {t('courses.language', 'Language')}
                          </span>
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="input-field"
                        >
                          {languages.map((lang) => (
                            <option key={lang.value} value={lang.value}>
                              {lang.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={generating}
                        className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                      >
                        {generating ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                        {generating
                          ? t('courses.generating', 'Generating...')
                          : t('courses.generateBtn', 'Generate Course')}
                      </button>
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
