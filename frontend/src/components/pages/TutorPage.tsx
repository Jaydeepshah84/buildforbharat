"use client";
// ============================================================
// TutorPage - AI Tutor chat interface with voice I/O
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  Bot,
  User,
  BookOpen,
  ChevronDown,
  Sparkles,
  Trash2,
  Square,
} from 'lucide-react';
import { ai, courses } from '@/services/api';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';

// --------------- animation helpers ---------------

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const messageVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25 } },
};

// --------------- level badge ---------------

function LevelBadge({ level }) {
  const colorMap = {
    weak: 'bg-red-100 text-red-700 border-red-200',
    beginner: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    intermediate: 'bg-blue-100 text-blue-700 border-blue-200',
    strong: 'bg-green-100 text-green-700 border-green-200',
    advanced: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  const colors =
    colorMap[(level || '').toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${colors}`}
    >
      {level || 'N/A'}
    </span>
  );
}

// --------------- typing indicator ---------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-gray-400"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// --------------- message bubble ---------------

function MessageBubble({ message, onReadAloud, readingId, ttsLoading }) {
  const isUser = message.role === 'user';
  const isReading = readingId === message.id;

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-md'
              : 'bg-white border border-gray-100 text-gray-800 rounded-tl-md shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Read aloud button for AI messages */}
        {!isUser && (
          <button
            onClick={() => onReadAloud(message)}
            disabled={ttsLoading}
            className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              isReading
                ? 'text-red-500 hover:bg-red-50'
                : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            {ttsLoading && readingId === message.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isReading ? (
              <VolumeX className="w-3 h-3" />
            ) : (
              <Volume2 className="w-3 h-3" />
            )}
            {isReading ? 'Stop' : 'Read Aloud'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function TutorPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();

  // State
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'ai',
      content: t(
        'tutor.welcome',
        "Hello! I'm your AI tutor. Pick a topic or ask me anything you'd like to learn about. I'll adapt to your level and help you understand step by step.",
      ),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [studentLevel, setStudentLevel] = useState(null);

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [sttLoading, setSttLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // TTS
  const [readingId, setReadingId] = useState(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const audioRef = useRef(null);

  // Scroll
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Fetch enrolled courses for topic selector
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await courses.getEnrollments();
        const courseList = res.enrollments || res.courses || res.data || [];
        if (!cancelled) setEnrolledCourses(Array.isArray(courseList) ? courseList : []);
      } catch {
        // Non-critical, ignore
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Fetch student level
  useEffect(() => {
    if (user) {
      setStudentLevel(
        user.user_metadata?.level || user.level || null,
      );
    }
  }, [user]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Generate unique message id
  const nextId = useCallback(() => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, []);

  // --------------- Send message ---------------

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed || isTyping) return;

      const userMsg = { id: nextId(), role: 'user', content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsTyping(true);

      try {
        const payload = {
          message: trimmed,
          language,
          topic: selectedTopic || undefined,
          history: messages
            .filter((m) => m.id !== 'welcome')
            .slice(-20)
            .map((m) => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
        };

        const res = await ai.tutorChat(payload);
        const reply =
          res.response || res.message || res.reply || res.data?.response || 'I could not generate a response.';

        // Update student level if returned
        if (res.level || res.studentLevel) {
          setStudentLevel(res.level || res.studentLevel);
        }

        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'ai', content: reply },
        ]);
      } catch (err) {
        toast.error(err.message || t('common.error'));
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'ai',
            content: 'Sorry, something went wrong. Please try again.',
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, language, messages, nextId, selectedTopic, t],
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // --------------- Voice input ---------------

  const startRecording = async () => {
    try {
      // Check permission state first
      if (navigator.permissions) {
        try {
          const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (perm.state === 'denied') {
            toast.error('Microphone blocked. Click the lock/site-settings icon in your browser address bar → Allow Microphone → Reload page.');
            return;
          }
        } catch {}
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) return;

        setSttLoading(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', language);

          const res = await ai.speechToText(formData);
          const transcribed =
            res.text || res.transcript || res.transcription || res.data?.text || '';

          if (transcribed.trim()) {
            sendMessage(transcribed.trim());
          } else {
            toast.error(t('tutor.noSpeech', 'Could not detect speech. Try again.'));
          }
        } catch (err) {
          toast.error(err.message || 'Speech-to-text failed.');
        } finally {
          setSttLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        toast.error('Microphone blocked. Click the lock icon in your browser address bar → Allow Microphone → Reload.', { duration: 6000 });
      } else if (err?.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone.');
      } else {
        toast.error('Microphone error: ' + (err?.message || 'Unknown error'));
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // --------------- TTS for AI messages ---------------

  const handleReadAloud = async (message) => {
    // Toggle off
    if (readingId === message.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis?.cancel();
      setReadingId(null);
      return;
    }

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setTtsLoading(true);
    setReadingId(message.id);

    try {
      const res = await ai.textToSpeech({ text: message.content, language });
      const audioUrl = res.audioUrl || res.audio_url || res.url || res.data?.audioUrl;

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setReadingId(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setReadingId(null);
          audioRef.current = null;
        };
        await audio.play();
      } else {
        // Fallback
        const utterance = new SpeechSynthesisUtterance(message.content.slice(0, 3000));
        utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
        utterance.onend = () => setReadingId(null);
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Fallback to browser TTS
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(message.content.slice(0, 3000));
        utterance.onend = () => setReadingId(null);
        window.speechSynthesis.speak(utterance);
      } else {
        toast.error('Text-to-speech unavailable.');
        setReadingId(null);
      }
    } finally {
      setTtsLoading(false);
    }
  };

  // --------------- Clear chat ---------------

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'ai',
        content: t(
          'tutor.welcome',
          "Hello! I'm your AI tutor. Pick a topic or ask me anything you'd like to learn about.",
        ),
      },
    ]);
  };

  // --------------- Extract topics from courses ---------------

  const topicOptions = [];
  enrolledCourses.forEach((course) => {
    const modules = course.modules || [];
    modules.forEach((mod) => {
      (mod.lessons || []).forEach((lesson) => {
        (lesson.topics || []).forEach((topic) => {
          topicOptions.push({
            id: topic._id || topic.id,
            title: topic.title || topic.name,
            course: course.title,
          });
        });
      });
    });
  });

  // --------------- Render ---------------

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-6 py-3 border-b border-gray-100 bg-white flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate">
              {t('tutor.title', 'AI Tutor')}
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-400">{t('tutor.online', 'Online')}</span>
              {studentLevel && (
                <>
                  <span className="text-xs text-gray-300">|</span>
                  <LevelBadge level={studentLevel} />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Topic selector */}
          <div className="relative">
            <button
              onClick={() => setTopicDropdownOpen(!topicDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors max-w-[200px]"
            >
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {selectedTopic
                  ? topicOptions.find((t) => t.id === selectedTopic)?.title || 'Topic'
                  : t('tutor.selectTopic', 'Select Topic')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>

            <AnimatePresence>
              {topicDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-30 w-72 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl"
                >
                  <button
                    onClick={() => {
                      setSelectedTopic('');
                      setTopicDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    {t('tutor.allTopics', 'General (no specific topic)')}
                  </button>
                  {topicOptions.length === 0 && (
                    <p className="px-4 py-3 text-xs text-gray-400">
                      {t('tutor.noTopics', 'Enroll in courses to see topics here.')}
                    </p>
                  )}
                  {topicOptions.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => {
                        setSelectedTopic(topic.id);
                        setTopicDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left hover:bg-indigo-50 transition-colors ${
                        selectedTopic === topic.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">{topic.title}</p>
                      <p className="text-xs text-gray-400 truncate">{topic.course}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Clear chat */}
          <button
            onClick={clearChat}
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title={t('tutor.clearChat', 'Clear chat')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Close dropdown on outside click */}
      {topicDropdownOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setTopicDropdownOpen(false)}
        />
      )}

      {/* Messages area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gray-50/50"
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onReadAloud={handleReadAloud}
            readingId={readingId}
            ttsLoading={ttsLoading}
          />
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md shadow-sm">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white"
      >
        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100">
                <motion.div
                  className="w-3 h-3 rounded-full bg-red-500"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-sm text-red-600 font-medium">
                  {t('tutor.recording', 'Recording... Click mic to stop')}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {sttLoading && (
          <div className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span className="text-sm text-indigo-600">
              {t('tutor.transcribing', 'Transcribing your speech...')}
            </span>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Voice input button */}
          <button
            onClick={toggleRecording}
            disabled={sttLoading || isTyping}
            className={`flex-shrink-0 p-3 rounded-xl transition-all duration-200 ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('tutor.placeholder', 'Ask me anything...')}
              disabled={isTyping || isRecording || sttLoading}
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              style={{ maxHeight: 120 }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping || isRecording || sttLoading}
            className="flex-shrink-0 p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
          >
            {isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-2 text-center">
          {t(
            'tutor.disclaimer',
            'AI responses may not always be accurate. Verify important information.',
          )}
        </p>
      </motion.div>
    </div>
  );
}
