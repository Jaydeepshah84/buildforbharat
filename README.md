# Learnify - AI-Powered Education Platform

An intelligent, full-stack education platform that uses AI to generate courses, teach with voice + visual animations, track progress with lesson tests, and enable collaborative learning between students.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Express.js, TypeScript, Socket.io, LangChain |
| Database | Supabase (PostgreSQL) — 18 tables |
| AI Engine | Azure OpenAI GPT-5.4 — 9 LangChain Agents |
| Voice TTS | Edge Neural TTS (Hindi SwaraNeural, English AriaNeural, 10 languages) |
| Voice STT | Faster Whisper (real-time speech-to-text) |
| Real-time | Socket.io (sync), WebRTC (video/voice) |
| Emotion | face-api.js (TinyFaceDetector + FaceExpressions) |
| Charts | Chart.js + react-chartjs-2 |

---

## Project Structure

```
Build For bharat/
├── frontend/              → Next.js 15 App Router (port 3000)
├── backend/               → Express + Socket.io API (port 5000)
├── tts-service/           → Python Flask TTS/STT microservice (port 5001)
└── supabase-schema.sql    → Database schema (18 tables)
```

---

## Features

### 1. AI Course Generation
- Enter any subject (e.g., "Photosynthesis", "Machine Learning", "Food Chain")
- Select class level (1-12), duration (3-90 days), and language
- AI generates complete course structure: **Course → Modules → Lessons → Topics**
- Course saved to database with auto-enrollment
- Supports **Hindi, English, Gujarati, Spanish** content generation
- Progressive streaming — first topics load instantly, rest generate in background

### 2. Visual Animation Explanations (AI-Generated)
- AI generates **interactive HTML/CSS/JS animations** for every topic
- Two-phase pipeline:
  - **Phase 1**: Quick text explanation (~3 seconds)
  - **Phase 2**: Full animated visual with step-by-step narration (~15-30 seconds)
- Animations include: diagrams, flowcharts, algorithms, emoji-based visualizations, scientific processes
- **Synchronized voice narration**:
  - Voice script split into sentences
  - All audio pre-loaded in parallel BEFORE animation starts
  - Animation paused during preload, then both start together
  - Sentence-by-sentence playback in perfect sync with animation steps
- **Subtitles** overlay on animation (like Netflix captions)
- Controls: Play/Pause (pauses BOTH animation + voice), Restart, Fullscreen
- Animation rendered in sandboxed iframe with `postMessage` communication
- `pauseAnimation()` / `resumeAnimation()` injected into every generated HTML

### 3. Text + Voice Learning Mode
- AI explains topics with text slides and voice narration
- **Edge Neural TTS** for natural Hindi voice (`hi-IN-SwaraNeural`) with SSML prosody tuning
- Browser SpeechSynthesis as fallback
- Slide-by-slide auto-play with pause/resume
- No overlapping audio — previous audio stopped before new slide plays
- Supports: English, Hindi, Gujarati, Spanish

### 4. Lesson Tests (After Every Lesson)
- **Animated MCQ test** appears as a row inside every lesson accordion
- Test states visible in course structure:
  - Grey lock icon: "Complete all topics first"
  - Purple pulsing "TAKE NOW" badge: all topics done, ready to take
  - Green checkmark + score: test passed
- 3 questions for short lessons (<=3 topics), 10 for longer ones
- **Dark gradient animated UI** with:
  - Intro screen (question count, pass threshold, format)
  - Animated question transitions (Framer Motion slide-in)
  - Instant feedback per question (green check / red X + explanation)
  - Auto-advance after 1.5 seconds
  - Timer + progress bar + bottom dots (correct/wrong per question)
- **60% pass threshold** to unlock next lesson
- Results screen with **animated circular score**, review mode
- Retry button regenerates fresh questions
- Scores saved to `quizzes` table with deterministic server-side scoring

### 5. Lesson Locking (Strict Chronological Progression)
- First lesson always unlocked, all others locked
- Student must **pass the lesson test** (score >= 60%) to unlock the next lesson
- Locking is **cumulative across modules**: Lesson 5 requires ALL previous lessons (1-4) passed
- Locked lessons show:
  - Lock icon instead of file icon
  - "Locked" badge in header
  - Greyed out (opacity 60%), can't expand
  - Toast message on click: "Pass the previous lesson's test to unlock"
- Topic clicks in locked lessons also blocked with toast
- **Cross-lesson-boundary navigation**: "Next Topic" button auto-triggers lesson test when last topic of a lesson is completed

### 6. Progress Tracking
- **Topic completion**: marked when clicking "Next Topic" or "Back to Course"
- Completed topic IDs stored in `student_performance.subject` field (CSV)
- `enrollments.progress` updated as percentage
- **Per-module progress bars** in course accordion
- **Badges**: Started, 5 Topics, Halfway, Almost There, Course Complete
- **Dashboard stats**: Enrolled Courses, Topics Completed, Avg Progress, Courses Completed
- Auto-enrollment when viewing any course

### 7. Dashboard
- Welcome message with student name from Supabase auth
- **4 stat cards**: Enrolled Courses, Topics Completed, Avg Progress, Courses Completed
- **Quick actions**: Start Quiz, Ask Tutor, Generate Course
- **Recent Quizzes**: lesson/topic names resolved from DB (not UUIDs), score bars
- **Recent Homework**: submission status (completed/pending)
- **Study Plan**: goal from AI plan, today's tasks, duration
- **Performance Overview**: course-by-course progress bars with color coding

### 8. Analytics (Fully Dynamic)
- **Zero hardcoded values** — all data from real API responses
- 4 metric cards: Avg Progress, Topics Completed, Quiz Average, Total Assessments
- **Performance chart** (Line): quiz/homework/exam scores over time
- **Subject chart** (Bar): course-by-course progress
- **Emotion chart** (Doughnut): from real face-api.js emotion logs
- **Attention radar**: focus, engagement, consistency, quiz score, completion
- **Improvement trend** (Line): course completion progression
- **Weak topics**: courses with < 50% progress highlighted

### 9. Quiz System
- Generate MCQ quizzes on any topic
- Select: 5, 10, or 15 questions + Easy/Medium/Hard difficulty
- AI generates structured MCQs with 4 options, correct answer index (0-3), explanation
- **Deterministic server-side scoring** (compare `answers[i] === questions[i].correct`)
- Results saved to `quizzes` table, shown in dashboard and analytics

### 10. Exam System
- Generate MCQ-only exams with **15, 30, 50, or 75 questions**
- Timed exam with countdown timer (configurable minutes)
- Question navigation sidebar with answered/unanswered color indicators
- Auto-submit on time expiry with confirmation dialog
- **Deterministic MCQ scoring** with per-question review (correct answer, user answer, explanation)
- AI feedback based on percentage

### 11. Homework
- Generate homework questions on any topic (short/long answer types)
- AI evaluates submissions with score (0-100) and detailed feedback
- Submission history with status tracking
- Saved to `homework` table

### 12. AI Tutor Chat
- Real-time chat with AI teacher
- **Server-Sent Events** (SSE) for streaming responses
- Voice input via microphone (Faster Whisper STT)
- Permission check before mic access with clear error messages
- Conversation history maintained per session
- Topic-aware responses

### 13. Voice Assistant
- Full-screen voice interaction with animated orb UI
- States: idle (blue), listening (green pulse), speaking (purple wave)
- Push-to-talk or tap-to-speak
- AI responds with Edge Neural TTS voice
- Caption/subtitle display during speech
- End button to stop session

### 14. Visual Lab
- Standalone visual explanation tool
- Enter any topic → AI generates animated visual explanation
- Same animation engine as course visual mode
- Follow-up chat for deeper questions

### 15. 2-Person Collaborative Study Room
- **Create room** with auto-generated 6-character code
- **Join** via code or invite link (`?code=XXXXXX`)
- Max 2 students per room
- **New layout** (redesigned):
  - Full-width main content (no side panels)
  - Floating PIP video tiles (bottom-left corner)
  - Chat in floating modal (toggled by icon with unread badge)
  - Media controls in top bar
- **Learn Together tab**:
  - Browse creator's enrolled courses (cards with title, subject, module count)
  - Click course → browse modules → lessons → topics
  - Each topic has "Text + Voice" and "Visual" buttons
  - Content synced between both users via Socket.io
- **Shared Whiteboard**: both draw in real-time (pen, eraser, 6 colors, clear)
- **Shared Notes**: both edit simultaneously, changes sync live (debounced)
- **Quiz Together**: generate quiz, both answer, see each other's picks + scores
- **WebRTC video/voice**: auto-start camera+mic, STUN + TURN servers
- Socket.io events for all sync features

### 16. Career Guidance
- Enter interests and skills (tag input with `onBlur` auto-add)
- AI suggests 5 career paths with: title, field, description, required skills, education path, salary range, growth outlook, match score
- Career icon mapping by field (technology, medicine, arts, etc.)

### 17. Study Planner
- AI generates **7-day personalized study plan** based on enrolled courses
- Day-by-day tasks with duration, type (study/quiz/revision/exercise), topic
- Task completion tracking with checkboxes (localStorage)
- Previous plans saved to `study_plans` table and browsable

### 18. Notes Management
- Upload **PDF** → AI extracts text and generates structured notes
- Upload **Image** → OCR via Tesseract.js → generate notes
- View and manage all saved notes

### 19. Emotion Detection
- Real-time webcam emotion detection using face-api.js
- Detects: focused, confused, bored, happy, distracted, neutral
- Mini camera feed with emotion badge (top-right corner)
- Checks every 30 seconds
- Emotion logs saved to `emotion_logs` table for analytics
- **Adaptive learning interventions**:
  - Confused (3+ streak) → AI simplifies explanation
  - Bored (3+ streak) → AI generates engaging quiz
  - Distracted (attention < 0.3) → Refocus message

### 20. Multilingual Support
- 4 languages: English, Hindi, Gujarati, Spanish
- i18next translations for all UI elements
- Course generation in selected language
- Voice narration with language-specific TTS voices:
  - Hindi: `hi-IN-SwaraNeural` (female, natural)
  - English: `en-US-AriaNeural`
  - Gujarati: `gu-IN-DhwaniNeural`
- Dynamic TTS URL: uses `window.location.hostname` (works on any device)

### 21. Authentication
- Supabase Auth (email + password)
- Login / Signup with role, class level, language selection
- Token stored in `localStorage` and auto-refreshed from Supabase session
- Guest user fallback for API access
- Protected dashboard routes with auth check

---

## 9 LangChain AI Agents

| Agent | Purpose |
|-------|---------|
| **Course** | Generate course structures (modules → lessons → topics) |
| **Notes** | Create structured study notes with key points, definitions |
| **Quiz** | Generate MCQ questions with 4 options, correct index, explanation |
| **Homework** | Generate homework problems (short/long answer) |
| **Career** | Career path recommendations with match scores |
| **Doubt** | Answer student questions as a friendly AI teacher |
| **Visual** | Generate visual/diagram explanations |
| **Classroom** | Facilitate group learning and activities |
| **Progress** | Analyze student performance across dimensions |

All agents use `HumanMessage`/`SystemMessage` directly (not prompt templates) to avoid curly brace escaping issues with GPT-5.4. Uses `max_completion_tokens` instead of `max_tokens`.

---

## Database Schema (18 Tables)

```
users, student_profile, courses, modules, lessons, topics, content,
enrollments, quizzes, homework, exams, study_plans, notes,
student_performance, emotion_logs, classrooms, classroom_users, messages
```

Key relationships: `courses → modules → lessons → topics`
Progress: `enrollments.progress` (percentage), `student_performance.subject` (completed topic IDs)

---

## API Endpoints (40+)

### Auth
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/profile` | Get profile |

### Courses & Progress
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/courses` | List courses |
| GET | `/api/courses/:id` | Course with modules/lessons/topics (sorted) |
| POST | `/api/courses/generate` | AI generate course |
| POST | `/api/courses/:id/enroll` | Enroll in course |
| DELETE | `/api/courses/:id` | Delete course (cascade) |
| POST | `/api/courses/:courseId/topics/:topicId/complete` | Mark topic complete |
| GET | `/api/courses/:courseId/progress` | Get course progress |
| GET | `/api/courses/progress/all` | All course progress (dashboard) |
| GET | `/api/courses/:courseId/lesson-status` | Lesson lock statuses |
| POST | `/api/courses/:courseId/lessons/:lessonId/test/generate` | Generate lesson test |
| POST | `/api/courses/:courseId/lessons/:lessonId/test/submit` | Submit lesson test |

### AI Features
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/ai/tutor/chat` | AI tutor chat |
| POST | `/api/ai/quiz/generate` | Generate MCQ quiz |
| POST | `/api/ai/quiz/submit` | Submit quiz (deterministic scoring) |
| POST | `/api/ai/homework/generate` | Generate homework |
| POST | `/api/ai/homework/submit` | Submit homework (AI evaluation) |
| POST | `/api/ai/exam/generate` | Generate MCQ exam |
| POST | `/api/ai/exam/submit` | Submit exam (deterministic scoring) |
| POST | `/api/ai/study-plan/generate` | Generate 7-day study plan |
| POST | `/api/ai/career-guidance` | Career guidance (5 paths) |
| POST | `/api/ai/doubt` | Doubt solver |

### Voice & Animation
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/voice/stream` | SSE voice streaming |
| POST | `/api/tutor/pipeline/generate` | Two-phase animation pipeline (SSE) |
| POST | `/api/tts` | Text-to-speech |
| POST | `/api/tts/stt` | Speech-to-text |
| GET | `/api/tts/voices` | Available voices |

### Student
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/student/dashboard` | Dashboard stats + recent activity |
| GET | `/api/student/performance` | Performance metrics |
| GET | `/api/student/report` | Full report (quiz/homework/exam history) |

---

## Socket.io Events

### Study Room
```
room:create, room:join, room:leave
room:partner-joined, room:partner-left, room:members
lesson:load, lesson:play, lesson:pause
wb:draw, wb:clear
notes:update
chat:message
quiz:start, quiz:answer, quiz:next
ai:ask, ai:response, ai:thinking
ai:gen-notes, ai:notes-ready
screen:start, screen:stop
```

### WebRTC Signaling
```
webrtc:offer, webrtc:answer, webrtc:ice
webrtc:renegotiate, webrtc:renegotiate-answer
```

### Adaptive Learning
```
session:start, session:end
emotion:update, emotion:summary
adaptive:intervention
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Supabase account (free tier works)
- Azure OpenAI API key

### 1. Database Setup
```sql
-- Run supabase-schema.sql in Supabase SQL Editor
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env  # Fill in your keys
npx tsx src/server.ts
# Runs on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
# Create .env.local with your keys
npx next dev -H 0.0.0.0 -p 3000
# Runs on http://localhost:3000
```

### 4. TTS Service
```bash
cd tts-service
pip install flask flask-cors edge-tts faster-whisper
python server.py
# Runs on http://localhost:5001
```

### Environment Variables

**Backend (`.env`)**
```env
PORT=5000
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=your-azure-endpoint
AZURE_OPENAI_DEPLOYMENT=gpt-5.4
AZURE_OPENAI_API_VERSION=2024-08-01-preview
FRONTEND_URL=http://localhost:3000
```

**Frontend (`.env.local`)**
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=your-azure-endpoint
AZURE_OPENAI_DEPLOYMENT=gpt-5.4
AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

---

## Architecture

```
┌──────────────────┐    HTTP/SSE     ┌────────────────┐    SQL    ┌───────────┐
│     Frontend     │ ◄─────────────► │    Backend     │ ◄──────► │  Supabase │
│   (Next.js 15)   │                 │  (Express.js)  │          │ (Postgres) │
│   Port 3000      │                 │   Port 5000    │          └───────────┘
└────────┬─────────┘                 └───────┬────────┘
         │                                   │
         │  Socket.io (real-time sync)       │ HTTP
         │◄─────────────────────────────────►│
         │                                   │
         │                            ┌──────▼────────┐
         │                            │  TTS Service   │
         │                            │  (Python Flask) │
         │                            │   Port 5001    │
         │                            └───────────────┘
         │
    ┌────▼─────┐
    │ Azure    │
    │ OpenAI   │  (GPT-5.4 via LangChain)
    └──────────┘
```

---

## License

MIT

---

Built with AI for Bharat
