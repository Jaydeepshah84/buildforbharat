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
import PageHero from "@/components/common/PageHero";

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
    weak: 'bg-red-50 text-red-600 border-red-100 shadow-red-100/50',
    beginner: 'bg-orange-50 text-orange-600 border-orange-100 shadow-orange-100/50',
    medium: 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/50',
    intermediate: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100/50',
    strong: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/50',
    advanced: 'bg-blue-50 text-[#284ce3] border-blue-100 shadow-purple-100/50',
  };

  const colors =
    colorMap[(level || '').toLowerCase()] || 'bg-gray-50 text-gray-600 border-gray-100';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-sm capitalize ${colors}`}
    >
      <Sparkles className="w-3 h-3" />
      {level || 'N/A'}
    </span>
  );
}

// --------------- typing indicator ---------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-[#284ce3]"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.7,
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
        className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-blue-200'
            : 'bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] text-white shadow-blue-200'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-gradient-to-br from-[#284ce3] to-blue-700 text-white rounded-2xl rounded-tr-md shadow-md shadow-blue-200/50'
              : 'bg-white border border-gray-100/80 text-gray-700 rounded-2xl rounded-tl-md shadow-sm hover:shadow-md transition-shadow duration-300'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Read aloud button for AI messages */}
        {!isUser && (
          <button
            onClick={() => onReadAloud(message)}
            disabled={ttsLoading}
            className={`mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              isReading
                ? 'text-red-500 bg-red-50 hover:bg-red-100'
                : 'text-gray-400 hover:text-[#284ce3] hover:bg-blue-50'
            }`}
          >
            {ttsLoading && readingId === message.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isReading ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
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

  // Quick suggestions for empty state
  const suggestions = [
    { icon: '📐', text: 'Explain Pythagoras theorem' },
    { icon: '🧪', text: 'What is photosynthesis?' },
    { icon: '📜', text: 'Summarize the French Revolution' },
    { icon: '💻', text: 'How does a computer work?' },
  ];

  const isWelcomeOnly = messages.length === 1 && messages[0].id === 'welcome';

  // --------------- Render ---------------

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50/30">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-5 lg:px-6 py-3 border-b border-gray-100/80 bg-white/80 backdrop-blur-xl flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-blue-200/50">
              <Bot className="w-5 h-5" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">
              {t('tutor.title', 'AI Tutor')}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {t('tutor.online', 'Online')}
              </span>
              {studentLevel && (
                <>
                  <span className="text-gray-200">·</span>
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
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm border border-gray-200/80 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all max-w-[200px] shadow-sm"
            >
              <BookOpen className="w-4 h-4 flex-shrink-0 text-blue-400" />
              <span className="truncate text-[13px]">
                {selectedTopic
                  ? topicOptions.find((t) => t.id === selectedTopic)?.title || 'Topic'
                  : t('tutor.selectTopic', 'Select Topic')}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${topicDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {topicDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1.5 z-30 w-72 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-200/50"
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
                      className={`w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors ${
                        selectedTopic === topic.id ? 'bg-blue-50' : ''
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
            className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm border border-transparent hover:border-red-100"
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
        className="flex-1 overflow-y-auto px-4 lg:px-6 py-6"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.03) 0%, transparent 50%),
                            radial-gradient(circle at 0% 100%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)`,
        }}
      >
        {/* Welcome / empty state with suggestions */}
        {isWelcomeOnly && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full max-w-xl mx-auto text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] flex items-center justify-center text-white mb-5 shadow-xl shadow-blue-200/50">
              <Bot className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t('tutor.welcomeTitle', 'How can I help you today?')}
            </h2>
            <p className="text-sm text-gray-500 mb-8 max-w-md">
              {t('tutor.welcomeDesc', "I'm your personal AI tutor. Ask me questions about any subject and I'll explain step by step at your level.")}
            </p>

            {/* Suggestion cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {suggestions.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendMessage(s.text)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 bg-white hover:border-[#284ce3]/30 hover:bg-blue-50/50 hover:shadow-md transition-all text-left group"
                >
                  <span className="text-3xl flex-shrink-0">{s.icon}</span>
                  <span className="text-sm text-gray-700 group-hover:text-[#284ce3] transition-colors">{s.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Chat messages */}
        {!isWelcomeOnly && (
          <div className="space-y-5">
            {messages.filter(m => m.id !== 'welcome').map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onReadAloud={handleReadAloud}
                readingId={readingId}
                ttsLoading={ttsLoading}
              />
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] text-white flex items-center justify-center shadow-sm shadow-blue-200">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-gray-100/80 rounded-2xl rounded-tl-md shadow-sm">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 lg:px-6 py-3 border-t border-gray-100/80 bg-white/80 backdrop-blur-xl"
      >
        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 px-4 py-2.5 mb-2 rounded-xl bg-red-50 border border-red-100">
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-red-600 font-medium">Recording... Tap mic to stop</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          {/* Mic button */}
          <button
            onClick={toggleRecording}
            disabled={isTyping || sttLoading}
            className={`flex-shrink-0 p-3 rounded-xl transition-all duration-200 ${
              isRecording
                ? 'bg-red-500 text-white shadow-md shadow-red-200 hover:bg-red-600'
                : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-[#284ce3]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isRecording ? 'Stop recording' : 'Voice input'}
          >
            {sttLoading ? <Loader2 className="w-5 h-5 animate-spin" /> :
              isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-[#284ce3]/20 focus:border-[#284ce3]/40
                disabled:bg-gray-50 disabled:cursor-not-allowed placeholder-gray-400
                transition-all duration-200"
              style={{ maxHeight: 120 }}
              onInput={(e: any) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping || isRecording || sttLoading}
            className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-[#284ce3] to-[#5b7cf7] text-white
              hover:shadow-lg hover:shadow-blue-200/50 transition-all duration-200
              disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
          >
            {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>

        <p className="text-[10px] text-gray-400 mt-2 text-center">
          {t('tutor.disclaimer', 'AI responses may not always be accurate. Verify important information.')}
        </p>
      </motion.div>
    </div>
  );
}
