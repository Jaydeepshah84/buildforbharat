"use client";
// ============================================================
// StudyPlannerPage - Generate and track AI study plans
// ============================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import {
  CalendarDays,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  Target,
  Zap,
  Star,
  ChevronDown,
  ChevronUp,
  Timer,
  GraduationCap,
  LayoutList,
  RefreshCw,
} from 'lucide-react';
import { ai, student } from '@/services/api';
import { useAuth } from '@/components/AuthProvider';

// --------------- animation helpers ---------------

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

// --------------- helpers ---------------

function getTypeIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('quiz') || t.includes('test') || t.includes('practice')) return Target;
  if (t.includes('revision') || t.includes('review')) return RefreshCw;
  if (t.includes('read') || t.includes('study') || t.includes('learn')) return BookOpen;
  if (t.includes('exercise') || t.includes('problem')) return Zap;
  return BookOpen;
}

function getTypeColor(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('quiz') || t.includes('test') || t.includes('practice'))
    return 'bg-purple-100 text-purple-700 border-purple-200';
  if (t.includes('revision') || t.includes('review'))
    return 'bg-blue-100 text-blue-700 border-blue-200';
  if (t.includes('exercise') || t.includes('problem'))
    return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ============================================================
// Generate Study Plan Form
// ============================================================

function GenerateForm({ onGenerate, loading }) {
  const { t } = useTranslation();
  const [availableHours, setAvailableHours] = useState(4);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (availableHours < 1) {
      toast.error(t('studyPlan.minHours', 'Please enter at least 1 hour per day.'));
      return;
    }
    onGenerate({ availableHours });
  };

  return (
    <motion.form variants={fadeIn} onSubmit={handleSubmit} className="card space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {t('studyPlan.generateTitle', 'Generate Study Plan')}
          </h2>
          <p className="text-sm text-gray-500">
            {t('studyPlan.generateSubtitle', 'Get a personalized day-by-day study schedule')}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('studyPlan.hoursLabel', 'Available Hours Per Day')}
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={12}
            step={0.5}
            value={availableHours}
            onChange={(e) => setAvailableHours(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
            disabled={loading}
          />
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 min-w-[80px] justify-center">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-indigo-700">{availableHours}h</span>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
          <span>1h</span>
          <span>6h</span>
          <span>12h</span>
        </div>
      </div>

      {/* Quick presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('studyPlan.quickPresets', 'Quick Presets')}
        </label>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Light (2h)', value: 2 },
            { label: 'Moderate (4h)', value: 4 },
            { label: 'Intensive (6h)', value: 6 },
            { label: 'Full Day (8h)', value: 8 },
          ].map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setAvailableHours(p.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all duration-200 ${
                availableHours === p.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('studyPlan.generating', 'Generating Study Plan...')}
          </>
        ) : (
          <>
            <CalendarDays className="w-5 h-5" />
            {t('studyPlan.generate', 'Generate Study Plan')}
          </>
        )}
      </button>
    </motion.form>
  );
}

// ============================================================
// Task Card
// ============================================================

function TaskCard({ task, index, checked, onToggle, isFocus }) {
  const { t } = useTranslation();
  const Icon = getTypeIcon(task.type);
  const typeColor = getTypeColor(task.type);

  return (
    <motion.div
      variants={fadeIn}
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
        isFocus
          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-sm'
          : checked
          ? 'bg-gray-50 border-gray-100 opacity-75'
          : 'bg-white border-gray-100 hover:border-gray-200'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(index)}
        className="flex-shrink-0 mt-0.5"
      >
        {checked ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-300 hover:text-indigo-400 transition-colors" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-sm font-medium ${checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.topic || task.title || task.name || 'Study Task'}
          </span>
          {isFocus && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
              <Star className="w-3 h-3" />
              {t('studyPlan.focus', 'Focus')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {task.type && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${typeColor}`}>
              <Icon className="w-3 h-3" />
              {task.type}
            </span>
          )}
          {task.duration && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Timer className="w-3 h-3" />
              {task.duration}
            </span>
          )}
          {task.description && (
            <span className="text-xs text-gray-500 truncate">{task.description}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Day Schedule
// ============================================================

function DaySchedule({ day, dayIndex, checkedTasks, onToggleTask }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(dayIndex < 3); // Auto-expand first 3 days

  const tasks = day.tasks || day.activities || day.items || [];
  const dateLabel = formatDate(day.date) || day.day || `${t('studyPlan.day', 'Day')} ${dayIndex + 1}`;
  const focusTopic = day.focusTopic || day.focus || null;

  const completedCount = tasks.filter((_, i) => checkedTasks[`${dayIndex}-${i}`]).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <motion.div variants={fadeIn} className="card">
      {/* Day header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            progress === 100
              ? 'bg-green-100 text-green-600'
              : progress > 0
              ? 'bg-indigo-100 text-indigo-600'
              : 'bg-gray-100 text-gray-500'
          }`}>
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">{dateLabel}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{tasks.length} {t('studyPlan.tasks', 'tasks')}</span>
              {completedCount > 0 && (
                <span className="text-green-500">
                  {completedCount}/{tasks.length} {t('studyPlan.done', 'done')}
                </span>
              )}
              {focusTopic && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1 text-indigo-500">
                    <Star className="w-3 h-3" />
                    {focusTopic}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mini progress bar */}
          <div className="hidden sm:block w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                progress === 100 ? 'bg-green-500' : 'bg-indigo-500'
              }`}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Tasks */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">
                  {t('studyPlan.noTasks', 'No tasks for this day.')}
                </p>
              ) : (
                tasks.map((task, i) => {
                  const taskKey = `${dayIndex}-${i}`;
                  const isFocus =
                    focusTopic &&
                    ((task.topic || task.title || '').toLowerCase().includes(focusTopic.toLowerCase()) ||
                      task.isFocus);

                  return (
                    <TaskCard
                      key={taskKey}
                      task={task}
                      index={taskKey}
                      checked={!!checkedTasks[taskKey]}
                      onToggle={() => onToggleTask(taskKey)}
                      isFocus={isFocus}
                    />
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================
// Previous Plans List
// ============================================================

function PreviousPlansList({ plans }) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState(null);

  if (!plans || plans.length === 0) {
    return (
      <motion.div variants={fadeIn} className="card text-center py-8">
        <LayoutList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">
          {t('studyPlan.noPrevious', 'No previous study plans found. Generate your first one above!')}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((plan, idx) => {
        const id = plan._id || plan.id || idx;
        const isExpanded = expandedId === id;
        const days = plan.days || plan.schedule || [];
        const totalTasks = days.reduce((acc, d) => acc + (d.tasks || d.activities || d.items || []).length, 0);

        return (
          <motion.div
            key={id}
            variants={fadeIn}
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setExpandedId(isExpanded ? null : id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {plan.title || `${days.length}-Day Study Plan`}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {plan.createdAt && (
                      <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                    )}
                    <span>{days.length} {t('studyPlan.days', 'days')}</span>
                    <span>{totalTasks} {t('studyPlan.tasks', 'tasks')}</span>
                    {plan.availableHours && (
                      <span>{plan.availableHours}h/day</span>
                    )}
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {days.map((day, di) => {
                      const tasks = day.tasks || day.activities || day.items || [];
                      const dateLabel = formatDate(day.date) || day.day || `Day ${di + 1}`;

                      return (
                        <div key={di} className="p-3 rounded-lg bg-gray-50">
                          <p className="text-xs font-semibold text-gray-700 mb-2">{dateLabel}</p>
                          <ul className="space-y-1">
                            {tasks.map((task, ti) => (
                              <li key={ti} className="text-xs text-gray-600 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                <span className="truncate">{task.topic || task.title || task.name || 'Task'}</span>
                                {task.duration && (
                                  <span className="text-gray-400 ml-auto flex-shrink-0">{task.duration}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function StudyPlannerPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [previousPlans, setPreviousPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Local checked state for task completion
  const [checkedTasks, setCheckedTasks] = useState({});

  // Fetch existing plans from dashboard
  useEffect(() => {
    let cancelled = false;

    async function fetchPlans() {
      try {
        const res = await student.getDashboard();
        const data = res || {};
        // Dashboard now returns studyPlans array
        const rawPlans = data.studyPlans || [];
        const currentFromDash = data.currentPlan;
        if (!cancelled) {
          const planList = rawPlans.map((p: any) => {
            // Each plan has plan_json containing the actual data
            const planData = p.plan_json || p;
            return { ...planData, id: p.id, createdAt: p.created_at, availableHours: planData.availableHours };
          });
          setPreviousPlans(planList);
        }
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    }

    fetchPlans();
    return () => { cancelled = true; };
  }, [currentPlan]);

  // --------------- Generate ---------------

  const handleGenerate = async ({ availableHours }) => {
    setGenerating(true);
    try {
      const res = await ai.generateStudyPlan({ availableHours });
      const planData = res.plan || res.studyPlan || res.data || res;

      if (!planData) {
        toast.error(t('studyPlan.failed', 'Failed to generate study plan. Try again.'));
        return;
      }

      setCurrentPlan({ ...planData, availableHours });
      setCheckedTasks({});
      toast.success(t('studyPlan.generated', 'Study plan generated!'));
    } catch (err) {
      toast.error(err.message || t('common.error', 'Something went wrong.'));
    } finally {
      setGenerating(false);
    }
  };

  // --------------- Toggle task ---------------

  const toggleTask = (taskKey) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [taskKey]: !prev[taskKey],
    }));
  };

  // --------------- Derived data ---------------

  const days = currentPlan?.days || currentPlan?.schedule || [];
  const totalTasks = days.reduce((acc, d) => acc + (d.tasks || d.activities || d.items || []).length, 0);
  const completedTasks = Object.values(checkedTasks).filter(Boolean).length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // --------------- Render ---------------

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Page header */}
        <motion.div variants={fadeIn} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('studyPlan.pageTitle', 'Study Planner')}
          </h1>
          <p className="text-gray-500 mt-2">
            {t('studyPlan.pageSubtitle', 'Get a personalized study plan powered by AI')}
          </p>
        </motion.div>

        {/* Generate form */}
        <GenerateForm onGenerate={handleGenerate} loading={generating} />

        {/* Current plan */}
        {currentPlan && days.length > 0 && (
          <motion.div variants={fadeIn} className="mt-8 space-y-4">
            {/* Plan header with progress */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-600" />
                {t('studyPlan.yourPlan', 'Your Study Plan')}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {completedTasks}/{totalTasks} {t('studyPlan.tasksCompleted', 'completed')}
                </span>
                <div className="w-24 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      overallProgress === 100 ? 'bg-green-500' : 'bg-indigo-500'
                    }`}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-sm font-bold text-indigo-600">{overallProgress}%</span>
              </div>
            </div>

            {/* Plan overview card */}
            <motion.div variants={fadeIn} className="card bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
              <div className="flex items-center justify-around text-center">
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{days.length}</p>
                  <p className="text-xs text-indigo-500">{t('studyPlan.days', 'Days')}</p>
                </div>
                <div className="w-px h-10 bg-indigo-200" />
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{totalTasks}</p>
                  <p className="text-xs text-indigo-500">{t('studyPlan.totalTasks', 'Total Tasks')}</p>
                </div>
                <div className="w-px h-10 bg-indigo-200" />
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{currentPlan.availableHours || '?'}h</p>
                  <p className="text-xs text-indigo-500">{t('studyPlan.perDay', 'Per Day')}</p>
                </div>
              </div>
            </motion.div>

            {/* Day-by-day schedule */}
            {days.map((day, di) => (
              <DaySchedule
                key={di}
                day={day}
                dayIndex={di}
                checkedTasks={checkedTasks}
                onToggleTask={toggleTask}
              />
            ))}
          </motion.div>
        )}

        {/* Previous plans */}
        <motion.div variants={fadeIn} className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <LayoutList className="w-5 h-5 text-indigo-600" />
            {t('studyPlan.previousPlans', 'Previous Plans')}
          </h2>

          {loadingPlans ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : (
            <PreviousPlansList plans={previousPlans} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
