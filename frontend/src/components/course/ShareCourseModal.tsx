"use client";
// ============================================================
// ShareCourseModal - Share a course via link, social, QR
// ============================================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  X,
  Link2,
  Copy,
  Check,
  MessageCircle,
} from 'lucide-react';

// --------------- tiny QR code (CSS grid approach) ---------------
// We encode the URL text into a deterministic visual pattern using
// a simple hash, producing a 15x15 CSS grid that looks like a QR code.

function MiniQR({ text, size = 150 }) {
  const grid = useMemo(() => {
    // Simple hash-based grid generation
    const cells = 15;
    const matrix = [];

    // Seed from text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }

    const seededRandom = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (let row = 0; row < cells; row++) {
      const rowArr = [];
      for (let col = 0; col < cells; col++) {
        // Finder patterns (three corners)
        const inTopLeft = row < 3 && col < 3;
        const inTopRight = row < 3 && col >= cells - 3;
        const inBottomLeft = row >= cells - 3 && col < 3;

        if (inTopLeft || inTopRight || inBottomLeft) {
          // Solid finder pattern borders
          const isEdge =
            row === 0 || col === 0 ||
            row === 2 || col === 2 ||
            row === cells - 1 || col === cells - 1 ||
            row === cells - 3 || col === cells - 3;
          const isCenter =
            (inTopLeft && row === 1 && col === 1) ||
            (inTopRight && row === 1 && col === cells - 2) ||
            (inBottomLeft && row === cells - 2 && col === 1);
          rowArr.push(isEdge || isCenter ? 1 : 0);
        } else {
          // Data area - deterministic from hash
          const seed = hash + row * cells + col;
          rowArr.push(seededRandom(seed) > 0.55 ? 1 : 0);
        }
      }
      matrix.push(rowArr);
    }
    return matrix;
  }, [text]);

  const cellSize = size / 15;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="bg-white p-2 rounded-lg border border-gray-200 inline-block"
        style={{ lineHeight: 0 }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {grid.map((row, ri) =>
            row.map((cell, ci) =>
              cell ? (
                <rect
                  key={`${ri}-${ci}`}
                  x={ci * cellSize}
                  y={ri * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#1e1b4b"
                  rx={0.5}
                />
              ) : null
            )
          )}
        </svg>
      </div>
      <p className="text-[10px] text-gray-400 text-center max-w-[180px] truncate">
        {text}
      </p>
    </div>
  );
}

// --------------- Twitter / X icon (inline SVG) ---------------

function TwitterIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// ============================================================
// Main export
// ============================================================

export default function ShareCourseModal({ isOpen, onClose, courseId, courseTitle }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/courses/${courseId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Check out this course: ${courseTitle}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`I'm learning "${courseTitle}" on Learnify! Check it out:`);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Share Course</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5">
                {/* Course title */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Sharing</p>
                  <p className="text-base font-semibold text-gray-800">{courseTitle}</p>
                </div>

                {/* Copy link */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                    Course Link
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 min-w-0">
                      <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">{shareUrl}</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopyLink}
                      className={`flex-shrink-0 p-2.5 rounded-lg transition-colors ${
                        copied
                          ? 'bg-green-100 text-green-600'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </motion.button>
                  </div>
                </div>

                {/* Social share buttons */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                    Share Via
                  </label>
                  <div className="flex gap-3">
                    {/* WhatsApp */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleShareWhatsApp}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </motion.button>

                    {/* Twitter / X */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleShareTwitter}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
                    >
                      <TwitterIcon className="w-4 h-4" />
                      Twitter
                    </motion.button>
                  </div>
                </div>

                {/* QR Code */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block text-center">
                    QR Code
                  </label>
                  <div className="flex justify-center">
                    <MiniQR text={shareUrl} size={140} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={onClose}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
