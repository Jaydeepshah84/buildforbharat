/* Landing page content. Every figure is sourced from README.md and
   LEARNIFY_PROJECT_COMPLETE.md so the page describes the real product. */

export const NAV = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Engine", href: "#engine" },
  { label: "Architecture", href: "#architecture" },
];

export const STACK = ["Next.js 15", "React 19", "TypeScript", "Express", "Socket.io", "WebRTC", "LangChain", "Supabase", "edge-tts", "Whisper", "face-api.js", "Expo"];

export const GAPS = [
  { title: "Language", body: "Most quality digital learning is English-first, while the majority of Indian students study in regional languages. LearnerAI runs its interface in 4 languages, generates content in 8, and narrates in every major Indian language." },
  { title: "Understanding", body: "Text-based learning retains roughly 10 to 20 percent of what is read. Visual learning retains 70 to 80. Every explanation here is generated as a step-by-step animation with synchronised voice." },
  { title: "Attention", body: "One teacher cannot notice sixty confused faces. On-device emotion detection senses confusion or boredom and adapts the lesson, and a low-bandwidth mode plus an offline mobile app reach rural learners." },
];

export const PIPELINE = [
  { t: "0 s", title: "Ask", body: "Typed or spoken, in any of 8 languages. Input is schema-validated before it reaches the model." },
  { t: "3 s", title: "Instant explanation", body: "The doubt agent streams a short plain-language answer so the learner is never waiting on a spinner." },
  { t: "4 s", title: "First visual", body: "The visual agent streams a structured animation spec. Each completed step is parsed from the token stream and sent to the browser immediately." },
  { t: "26 s", title: "Full lesson", body: "Four to six animated steps with per-sentence narration pre-fetched in parallel from the neural voice service. Subtitles follow the same timeline." },
  { t: "Any time", title: "Interrupt", body: "Tap to speak. The teacher pauses, answers with voice and a supporting visual, then resumes." },
];

export const JOURNEY = [
  { title: "Sign up and pick a class", body: "Class 6 to graduate level, any subject, any of 8 languages." },
  { title: "Generate a course", body: "Modules, lessons and topics stream in live. Lesson 1 opens while the rest is still generating." },
  { title: "Learn with the AI teacher", body: "Animated visual lessons, text-and-voice slides, or Indian Sign Language, per topic." },
  { title: "Solve doubts and make notes", body: "A Socratic doubt solver and notes generated from topics, PDFs, audio lectures or pasted questions." },
  { title: "Test for mastery", body: "Quizzes, timed exams and AI-graded homework. The next lesson unlocks only after a 60 percent pass." },
  { title: "Review analytics", body: "Performance trends, emotion and attention charts, and a weak-topic list built from real data." },
  { title: "Follow a study plan", body: "A day-by-day schedule generated from weak topics and available hours." },
  { title: "Study with a friend", body: "A two-person live room with video, whiteboard, shared notes, synced quizzes and a shared AI teacher." },
  { title: "Keep parents informed", body: "Automatic email reports at every milestone." },
  { title: "Plan a career", body: "Matched career paths with required skills, an education roadmap and outlook." },
];

export type FeatureGroup = { title: string; items: { name: string; desc: string }[] };

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "Learning core",
    items: [
      { name: "AI course generation", desc: "Any subject, 3 to 90 day plans, streamed topic by topic." },
      { name: "AI avatar teacher", desc: "Two-phase visual lessons with live two-way voice." },
      { name: "Three learning modes", desc: "Text and voice slides, visual animation, or sign language." },
      { name: "Adaptive text and voice lessons", desc: "Auto-split slides with synced narration and a scrubber." },
      { name: "Mastery-gated progression", desc: "Lessons unlock after a 60 percent pass, computed server-side." },
      { name: "Progress and certificates", desc: "Module bars, badges, streaks and a printable certificate." },
    ],
  },
  {
    title: "Assessment",
    items: [
      { name: "Quizzes", desc: "5, 10 or 15 questions by topic and difficulty, with explanations." },
      { name: "Timed exams", desc: "Up to 75 questions, countdown, auto-submit, section breakdown." },
      { name: "AI-graded homework", desc: "Short and long answers with score, tips and per-question feedback." },
      { name: "Lesson tests", desc: "The gated per-lesson test with review and retry." },
    ],
  },
  {
    title: "Tutoring and voice",
    items: [
      { name: "AI tutor chat", desc: "Level-adaptive answers, speech input, read-aloud per message." },
      { name: "Voice assistant", desc: "Hands-free calls with continuous listening and tap-to-interrupt." },
      { name: "Doubt solver", desc: "Quick Socratic answers, also embedded in study rooms." },
    ],
  },
  {
    title: "Content tools",
    items: [
      { name: "Visual Lab", desc: "Any topic becomes a narrated animation with follow-up questions." },
      { name: "Notes maker", desc: "Notes from a topic, an audio lecture, a PDF or pasted questions." },
      { name: "Study planner", desc: "Day-by-day schedule with checkable tasks and history." },
      { name: "Career guidance", desc: "Matched career cards with roadmap and match percentage." },
      { name: "Video lessons", desc: "Script, narration and FFmpeg render into a shareable MP4." },
    ],
  },
  {
    title: "Collaboration",
    items: [
      { name: "Two-person study room", desc: "WebRTC video, whiteboard, notes, synced quizzes, shared AI teacher." },
      { name: "Virtual classrooms", desc: "Password-protected rooms with chat history." },
    ],
  },
  {
    title: "Adaptation and accessibility",
    items: [
      { name: "Emotion detection", desc: "Runs on-device every 30 seconds and triggers re-explanations or quizzes." },
      { name: "Indian Sign Language", desc: "Signing avatar with fingerspelling and large captions." },
      { name: "Multilingual end to end", desc: "4 interface languages, 8 content languages, neural voices." },
      { name: "Low-bandwidth mode", desc: "Cuts data usage across lessons." },
    ],
  },
  {
    title: "Insight and oversight",
    items: [
      { name: "Analytics dashboard", desc: "Performance, subject, emotion and attention charts, weak topics." },
      { name: "Student dashboard", desc: "Progress, recent work and today's plan at a glance." },
      { name: "Parent email reports", desc: "Sent at every milestone from sign-up to course completion." },
    ],
  },
  {
    title: "Surfaces",
    items: [
      { name: "Offline-first mobile app", desc: "Expo app with a local SQLite cache that reconciles on reconnect." },
      { name: "Tap launcher", desc: "Desk taps and offline wake-words open app pages for kiosks and accessibility." },
    ],
  },
];

export const AGENTS = [
  { name: "course", job: "Course, module, lesson and topic structure" },
  { name: "visual", job: "Step-by-step animation specifications" },
  { name: "doubt", job: "Socratic doubt solving" },
  { name: "quiz", job: "Multiple-choice questions with explanations" },
  { name: "homework", job: "Open questions and grading" },
  { name: "notes", job: "Structured, exam-oriented notes" },
  { name: "progress", job: "Performance analysis and study plans" },
  { name: "career", job: "Career paths with roadmaps" },
  { name: "classroom", job: "Shared in-room group assistant" },
];

export const PRINCIPLES = [
  { title: "Deterministic scoring", body: "The model writes questions but never grades them. A score is the count of correct indices, so every submission is auditable." },
  { title: "Streaming first", body: "Courses, plans and animations arrive over server-sent events. Perceived latency drops from about 15 seconds to 2." },
  { title: "Sandboxed rendering", body: "Generated scenes render in a scripts-only iframe controlled by postMessage, with no access to cookies or the parent page." },
  { title: "Cached and de-duplicated", body: "A one-hour result cache and in-flight de-duplication make repeated questions instant." },
  { title: "Private emotion detection", body: "Webcam frames never leave the browser. Only a small emotion vector is sent every 30 seconds." },
  { title: "Portable models", body: "Agents talk to any OpenAI-compatible endpoint and have run on Azure, Bedrock and Z.ai unchanged." },
];

export const NUMBERS = [
  { v: 9, suffix: "", label: "AI agents" },
  { v: 29, suffix: "", label: "Features" },
  { v: 40, suffix: "+", label: "API endpoints" },
  { v: 18, suffix: "", label: "Database tables" },
  { v: 8, suffix: "", label: "Content languages" },
  { v: 5, suffix: "", label: "Services" },
  { v: 3, suffix: "", label: "Learning modes" },
  { v: 60, suffix: "%", label: "Mastery gate" },
];
