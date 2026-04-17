"use client";
// ============================================================
// CourseBadges - Progress ring, badges, share & certificate
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Share2,
  Download,
  Award,
  Trophy,
  Star,
  Flame,
  Sprout,
  CheckCircle2,
} from 'lucide-react';
import ShareCourseModal from './ShareCourseModal';

// --------------- badge definitions ---------------

const BADGES = [
  {
    key: 'started',
    emoji: '🌱',
    name: 'Started',
    description: 'Opened the course',
    icon: Sprout,
    check: () => true, // always earned
  },
  {
    key: 'five_topics',
    emoji: '📚',
    name: '5 Topics',
    description: 'Completed 5 topics',
    icon: Award,
    check: (completed) => completed >= 5,
  },
  {
    key: 'halfway',
    emoji: '🔥',
    name: 'Halfway',
    description: 'Completed 50%',
    icon: Flame,
    check: (completed, total) => total > 0 && completed / total >= 0.5,
  },
  {
    key: 'almost',
    emoji: '⭐',
    name: 'Almost There',
    description: 'Completed 75%',
    icon: Star,
    check: (completed, total) => total > 0 && completed / total >= 0.75,
  },
  {
    key: 'complete',
    emoji: '🏆',
    name: 'Course Complete',
    description: '100% finished!',
    icon: Trophy,
    check: (completed, total) => total > 0 && completed >= total,
  },
];

// --------------- progress ring ---------------

function ProgressRing({ percentage, size = 100, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold text-gray-900"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {percentage}%
        </motion.span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Complete</span>
      </div>
    </div>
  );
}

// --------------- badge item ---------------

function BadgeItem({ badge, earned, index }) {
  const Icon = badge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 * index, duration: 0.35 }}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
        earned
          ? 'bg-white shadow-sm border border-gray-100'
          : 'bg-gray-50 border border-gray-100 opacity-50 grayscale'
      }`}
      title={earned ? `${badge.name} - Earned!` : `${badge.name} - Locked`}
    >
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${
          earned
            ? 'bg-gradient-to-br from-indigo-50 to-purple-50'
            : 'bg-gray-100'
        }`}
      >
        <span role="img" aria-label={badge.name}>
          {badge.emoji}
        </span>
      </div>
      <span className={`text-xs font-semibold text-center leading-tight ${earned ? 'text-gray-700' : 'text-gray-400'}`}>
        {badge.name}
      </span>
      {earned && (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
      )}
    </motion.div>
  );
}

// --------------- certificate generator ---------------

function openCertificate(courseTitle, studentName) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const certWindow = window.open('', '_blank', 'width=900,height=650');
  if (!certWindow) {
    toast.error('Pop-up blocked. Please allow pop-ups to download the certificate.');
    return;
  }

  certWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Certificate of Completion</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #f8f9fa;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .cert {
      width: 800px;
      min-height: 560px;
      background: white;
      border: 3px solid #6366f1;
      border-radius: 12px;
      padding: 50px 60px;
      text-align: center;
      position: relative;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .cert::before {
      content: '';
      position: absolute;
      inset: 8px;
      border: 1.5px solid #c7d2fe;
      border-radius: 8px;
      pointer-events: none;
    }
    .brand {
      font-size: 14px;
      color: #6366f1;
      letter-spacing: 4px;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .title {
      font-size: 36px;
      color: #1e1b4b;
      margin: 12px 0 6px;
      font-weight: 700;
    }
    .subtitle {
      font-size: 15px;
      color: #6b7280;
      margin-bottom: 36px;
    }
    .label {
      font-size: 13px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 6px;
    }
    .student-name {
      font-size: 30px;
      color: #111827;
      font-style: italic;
      border-bottom: 2px solid #e5e7eb;
      display: inline-block;
      padding: 0 30px 6px;
      margin-bottom: 28px;
    }
    .course-name {
      font-size: 20px;
      color: #4338ca;
      font-weight: 600;
      margin-bottom: 32px;
    }
    .date {
      font-size: 14px;
      color: #6b7280;
    }
    .footer {
      margin-top: 36px;
      font-size: 12px;
      color: #9ca3af;
    }
    .trophy { font-size: 48px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="brand">Learnify</div>
    <div class="trophy">🏆</div>
    <div class="title">Certificate of Completion</div>
    <div class="subtitle">This is to certify that</div>
    <div class="label">Student</div>
    <div class="student-name">${studentName}</div>
    <div class="label">Has successfully completed</div>
    <div class="course-name">${courseTitle}</div>
    <div class="date">Awarded on ${today}</div>
    <div class="footer">Powered by Learnify &mdash; AI-Powered Learning Platform</div>
  </div>
  <script>
    window.onload = function() { setTimeout(function(){ window.print(); }, 400); };
  </script>
</body>
</html>`);
  certWindow.document.close();
}

// ============================================================
// Main export
// ============================================================

export default function CourseBadges({ course, completedTopics = 0, totalTopics = 0 }) {
  const [shareOpen, setShareOpen] = useState(false);

  const courseId = course?._id || course?.id || '';
  const courseTitle = course?.title || 'Course';
  const percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const isComplete = totalTopics > 0 && completedTopics >= totalTopics;

  const earnedBadges = BADGES.map((badge) => ({
    ...badge,
    earned: badge.check(completedTopics, totalTopics),
  }));

  const earnedCount = earnedBadges.filter((b) => b.earned).length;

  const handleShare = () => {
    setShareOpen(true);
  };

  const handleDownloadCertificate = () => {
    const studentName =
      localStorage.getItem('user_name') ||
      localStorage.getItem('userName') ||
      'Student';
    openCertificate(courseTitle, studentName);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card"
      >
        {/* Top row: progress ring + badges */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Progress ring */}
          <div className="flex-shrink-0">
            <ProgressRing percentage={percentage} size={100} strokeWidth={8} />
          </div>

          {/* Badges grid */}
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-500" />
                Badges Earned
                <span className="text-xs text-gray-400 font-normal ml-1">
                  {earnedCount}/{BADGES.length}
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {earnedBadges.map((badge, i) => (
                <BadgeItem key={badge.key} badge={badge} earned={badge.earned} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-gray-100">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share Course
          </motion.button>

          <AnimatePresence>
            {isComplete && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownloadCertificate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Certificate
              </motion.button>
            )}
          </AnimatePresence>

          {/* Progress summary */}
          <span className="ml-auto text-xs text-gray-400">
            {completedTopics}/{totalTopics} topics completed
          </span>
        </div>
      </motion.div>

      {/* Share modal */}
      <ShareCourseModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        courseId={courseId}
        courseTitle={courseTitle}
      />
    </>
  );
}
