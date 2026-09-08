# Learnify — AI-Powered Education Platform for Bharat

An end-to-end, multi-surface learning platform that uses Large Language Models to generate complete courses, teach topics with synchronized voice + visual animations, adapt to a learner's emotions in real time, and enable collaborative 2-person study rooms. Built for Indian learners across web, mobile, and even ambient hardware (desk-tap + voice launcher).

This README covers the **entire project** — architecture, components, data flow, design decisions, and setup — across four runtimes: **Web**, **Mobile (React Native)**, **Backend (Node)**, and **Voice/TTS microservice (Python)**, plus a **Tap Launcher** hardware-UX prototype.

---

## 1. Project Vision

Indian classrooms are under-served by most edtech: content is English-first, one-size-fits-all, and non-interactive. Learnify addresses this with:

- **Multilingual AI course generation** (Hindi, English, Gujarati, Spanish) — any topic, any class level
- **AI-generated interactive visual animations** with synchronized vernacular voice narration
- **Real-time emotion-adaptive learning** — the platform detects confusion/boredom via webcam and adjusts content
- **Strict mastery-based progression** — lesson tests gate the next lesson (60% pass threshold)
- **Collaborative study rooms** — 2 learners can co-watch, co-draw, co-quiz with live video/voice
- **Offline-first mobile experience** for low-connectivity regions
- **Ambient interaction** — desk-tap and wake-word launcher for accessibility

---

## 2. System Architecture

```
                                   ┌──────────────────────────┐
                                   │   Z.ai  (OpenAI-compat)  │
                                   │     GLM-5  (LangChain)   │
                                   └────────────┬─────────────┘
                                                │
                                     9 Agent Pipelines
                                                │
┌──────────────────┐  HTTP/SSE   ┌──────────────▼────────────┐  SQL   ┌──────────────┐
│   Web Frontend   │◄───────────►│        Backend API         │◄──────►│   Supabase   │
│   Next.js 15     │             │    Express + Socket.io     │        │  PostgreSQL  │
│   (port 3000)    │             │       (port 5050)          │        │   18 tables  │
└────────┬─────────┘             └───┬────────────────┬───────┘        └──────────────┘
         │                           │                │
         │   Socket.io (real-time)   │                │  HTTP
         └───────────────────────────┘                │
                                                ┌────▼────────────┐
                                                │   TTS Service    │
                                                │  Python / Flask  │
                                                │  Edge-TTS + Whisper │
                                                │   (port 5001)    │
                                                └──────────────────┘

┌──────────────────┐   HTTP    ┌────────────────────┐       ┌─────────────────────┐
│  Mobile App      │──────────►│      Backend       │       │   Tap Launcher       │
│  LearnifyApp     │           │      (shared)      │       │  (Python, MacBook)   │
│  Expo / RN 0.81  │           └────────────────────┘       │  desk-tap + whisper  │
└──────────────────┘                                        └─────────────────────┘
```

### Runtime Topology

| Service | Runtime | Port | Purpose |
|---|---|---|---|
| `frontend/` | Next.js 15 (Node) | 3000 | Web SPA — learner + teacher surfaces |
| `backend/` | Express + Socket.io (Node) | 5050 | REST API, SSE streams, real-time sockets, AI orchestration |
| `tts-service/` | Flask (Python) | 5001 | Edge Neural TTS, Faster-Whisper STT |
| `LearnifyApp/` | Expo / React Native | — | Mobile app with offline SQLite cache |
| `tap-launcher/` | Python CLI | — | Ambient desk-tap + voice launcher for the web app |

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion |
| Mobile | Expo 54, React Native 0.81, Expo Router, expo-sqlite, expo-av/expo-video |
| Backend | Node.js, Express, TypeScript, Socket.io, LangChain, Zod |
| Database | Supabase (PostgreSQL) — 18 tables |
| AI Engine | GLM-5 via Z.ai (any OpenAI-compatible provider) — 9 LangChain agents |
| TTS | Edge Neural TTS (10 languages, per-language rate/pitch tuning) |
| STT | Faster-Whisper (local, CPU/GPU) |
| Real-time | Socket.io (state sync), WebRTC (video/voice, STUN+TURN) |
| Sign Language | CWASA / JASigning 3D avatar (UEA) driven by SiGML + HamNoSys |
| Emotion AI | face-api.js (TinyFaceDetector + FaceExpressions) |
| Charts | Chart.js + react-chartjs-2 |
| OCR | Tesseract.js (client-side image-to-text) |
| PDF | pdf-parse (server-side text extraction) |
| Ambient | sounddevice + whisper (desk-tap + voice launcher) |

---

## 4. Repository Layout

```
buildforbharat/
├── frontend/              → Next.js 15 web app            (port 3000)
├── backend/               → Express + Socket.io API       (port 5050)
├── tts-service/           → Python Flask TTS/STT          (port 5001)
├── LearnifyApp/           → Expo React Native mobile app
├── tap-launcher/          → Desk-tap + voice launcher (Python)
└── supabase-schema.sql    → PostgreSQL schema (18 tables)
```

### Key module maps

- **[backend/src/agents/](backend/src/agents/)** — 9 LangChain agents (course, quiz, notes, homework, career, doubt, visual, classroom, progress)
- **[backend/src/routes/](backend/src/routes/)** — REST + SSE routes (auth, courses, ai, tutor, tts, animation, signLanguage, student, upload, video, classroom, stream)
- **[backend/src/socket/handler.ts](backend/src/socket/handler.ts)** — Room/WebRTC/whiteboard/notes/quiz sync
- **[backend/src/pipelines/aiGenerator.ts](backend/src/pipelines/aiGenerator.ts)** — 2-phase animation pipeline
- **[frontend/src/app/](frontend/src/app/)** — App Router pages, grouped `(auth)` and `(dashboard)`
- **[frontend/src/components/animation/](frontend/src/components/animation/)** — Iframe-sandboxed animation runner
- **[LearnifyApp/src/services/](LearnifyApp/src/services/)** — offline sync, SQLite cache, animation/audio/video services
- **[tts-service/server.py](tts-service/server.py)** — Flask TTS/STT endpoints
- **[tap-launcher/tap_launcher.py](tap-launcher/tap_launcher.py)** — desk-tap + wake-word launcher

---

## 5. Technical Approach

This section explains **how** the platform works — the decisions, pipelines, and trade-offs behind the headline features.

### 5.1 AI Orchestration — 9 LangChain Agents

Every AI capability is encapsulated in a specialized agent inheriting from `BaseAgent` ([backend/src/agents/baseAgent.ts](backend/src/agents/baseAgent.ts)). Each agent owns its system prompt, schema, and post-processing logic.

| Agent | Responsibility |
|---|---|
| `courseAgent` | Generate course structure: Course → Modules → Lessons → Topics |
| `notesAgent` | Structured notes with key points, definitions |
| `quizAgent` | MCQ with 4 options, correct index, explanation |
| `homeworkAgent` | Short/long-answer problems + evaluation |
| `careerAgent` | 5 career paths with match scores |
| `doubtAgent` | Socratic AI teacher chat |
| `visualAgent` | Interactive HTML/CSS/JS animations |
| `classroomAgent` | Group-learning facilitation |
| `progressAgent` | Multi-dimensional performance analysis |

**Design decisions:**
- Agents use `HumanMessage` / `SystemMessage` directly (**not** prompt templates) — avoids brittle curly-brace escaping that models trip on when generating JSON/JSX.
- **Provider-agnostic**: [backend/src/config/llm.ts](backend/src/config/llm.ts) targets any OpenAI-compatible endpoint (Z.ai, Groq, OpenAI, Bedrock) via the `LLM_*` env vars. It normalizes the differences: GLM's `thinking` mode is disabled by default (it added ~5 min per lesson), and `max_completion_tokens` is mirrored into `max_tokens` for providers that only honour the older name.
- Every agent returns **validated JSON** via Zod schemas before hitting the DB.
- Long generations (full courses) are **streamed** over SSE so the UI paints Lesson 1 while Lessons 2–N are still being produced.

### 5.2 Two-Phase Animation Pipeline

The standout teaching experience is the AI-generated visual animation. Naively asking GPT to "return an animation" is slow (15–30s) and blocks the learner. We use a **two-phase SSE pipeline** ([backend/src/pipelines/aiGenerator.ts](backend/src/pipelines/aiGenerator.ts)):

1. **Phase 1 — Fast text explanation (~3s)**: `doubtAgent` emits a short plain-text explanation. The UI renders this immediately.
2. **Phase 2 — Structured animation spec (~20–40s)**: the model streams an `AnimationSpec` — JSON describing 4–5 steps, each with one narration sentence and a `scene` array of positioned objects (`text`, `emoji`, `shape`, `arrow`) in normalized 0..1 coordinates.

**Why a spec instead of generated HTML.** Letting the model write raw HTML/JS produced unpredictable layout and unsandboxable code. A declarative spec is validated, repairable, and rendered deterministically by [AnimationCanvas.tsx](frontend/src/components/animation/AnimationCanvas.tsx). The legacy HTML-in-an-iframe path is still supported as a fallback when no valid spec is produced.

**Robustness — the spec is parsed from a partial stream:**
- Steps are extracted with **brace-balanced, string-aware scanning** as soon as each `{...}` closes, so step 0 renders while later steps are still generating.
- `repairJson()` tolerates the mistakes models actually make: unescaped quotes inside narration, raw newlines in strings, comments copied from the prompt template, trailing commas. Without it, one bad quote silently truncated the lesson halfway.
- Streamed step indices are kept **contiguous** — a gap would stall the player's narration loop.
- `normalizeScene()` keeps diagrams readable: it snaps node values into their boxes, widens a box whose keys were placed beside it, adds a missing box behind a dark unboxed value, and fixes label contrast.
- The stream is **aborted once the closing tag arrives** (or at 60 KB / 180 s), so a looping model cannot hold a lesson open.
- Any response that still fails to parse is written to `$TMPDIR/learnify-failed-specs/` for diagnosis.

**Rendering & narration sync (frontend):**
- Each step's scene is a **complete visible state**; objects sharing an `id` across steps tween smoothly between positions.
- Narration is per-step and 1:1 with scenes. TTS audio is pre-fetched per step; playback starts on the user's first Play click (browsers block autoplay).
- If a TTS request fails, the slot is marked failed so the player falls back to browser `SpeechSynthesis` **immediately** instead of waiting out its grace period.
- Play/Pause controls animation and narration together.

### 5.3 Deterministic vs. Generative Scoring

Quizzes and exams must be **tamper-proof and reproducible**, so scoring is deterministic server-side:

```
score = Σ (answers[i] === questions[i].correct_index)
```

We never ask the LLM to "grade" MCQs — it only generates them. This eliminates LLM hallucination risk in scoring and makes every submission auditable. Homework (free-text) **does** use the LLM (`homeworkAgent`) but stores both rubric and score for review.

### 5.4 Lesson Locking & Mastery Progression

Learnify enforces **strict chronological progression**:

- First lesson unlocked by default; all others locked.
- Unlock rule: **all previous lessons' tests passed** at ≥60%, across module boundaries.
- Lock state computed server-side (`/api/courses/:id/lesson-status`) to prevent client bypass.
- UI surfaces three states: grey lock, pulsing "TAKE NOW" badge, green check + score.
- When a learner finishes the last topic of a lesson, "Next Topic" auto-triggers the lesson test instead of jumping forward.

Completed topic IDs are stored as CSV in `student_performance.subject` (historical choice — keeps writes cheap without a junction table for a feature that's read far more than it's written).

### 5.5 Real-time Collaboration — Socket.io + WebRTC

The 2-person Study Room uses **two parallel real-time channels**:

- **Socket.io** for application state: room membership, whiteboard strokes, shared-notes edits (debounced), quiz progression, AI prompts/responses, and WebRTC signaling.
- **WebRTC** for audio/video (P2P) using STUN + TURN. Renegotiation is handled explicitly on track changes (e.g., toggling screen share).

Key events ([backend/src/socket/handler.ts](backend/src/socket/handler.ts)):
- Room: `room:create|join|leave|members|partner-joined|partner-left`
- Teaching: `lesson:load|play|pause`, `ai:ask|response|thinking`, `ai:gen-notes|notes-ready`
- Whiteboard: `wb:draw|clear` (per-stroke payload; broadcast to room)
- Notes: `notes:update` (debounced server-side to avoid fan-out storms)
- Quiz: `quiz:start|answer|next`
- WebRTC: `webrtc:offer|answer|ice|renegotiate|renegotiate-answer`
- Adaptive: `session:start|end`, `emotion:update|summary`, `adaptive:intervention`

### 5.6 Emotion-Adaptive Learning Loop

Every 30 seconds, the web client runs **face-api.js** (TinyFaceDetector + FaceExpressions) on the local webcam and posts a lightweight emotion vector. The server maintains per-session streaks and fires **adaptive interventions**:

| Signal | Intervention |
|---|---|
| `confused` streak ≥ 3 | `doubtAgent` re-explains the current topic in simpler language |
| `bored` streak ≥ 3 | `quizAgent` injects a short engagement quiz |
| `attention < 0.3` | Soft refocus toast with a micro-break prompt |

All vectors persist to `emotion_logs` so analytics can visualize emotional patterns over time (doughnut chart + attention radar).

### 5.7 Voice Pipeline (TTS + STT)

The Python TTS service ([tts-service/server.py](tts-service/server.py)) runs independently so it can be GPU-pinned or scaled separately.

- **TTS**: `edge-tts` (Microsoft Edge Neural voices) over a dedicated asyncio event loop. Defaults: `hi-IN-SwaraNeural`, `en-US-AriaNeural`, `gu-IN-DhwaniNeural`, `es-ES-ElviraNeural`, plus Tamil/Telugu/Bengali/Marathi/French/German.
- **Per-language rate/pitch tuning** for natural pacing in Indic languages. Note: the `edge-tts` CLI reads its `-f` input as plain text, so SSML markup is spoken aloud as tags — prosody is applied with `--rate=`/`--pitch=` flags on plain text instead (pitch in Hz, and the `--opt=value` form, since argparse rejects a bare negative value).
- **STT**: Faster-Whisper (local). Permission check before mic access with user-facing error messages (not silent failure).
- Frontend uses **dynamic TTS URL** via `window.location.hostname` so the same build works on `localhost`, LAN IPs, and tunnels.
- Browser `SpeechSynthesis` is a **graceful fallback** when the TTS service is unavailable.

### 5.8 Content Generation — Streaming-First UX

All long generations (courses, study plans, exams) use **Server-Sent Events (SSE)** instead of waiting for a monolithic response:

- `/api/courses/generate` emits topics as they're generated — the UI renders Lesson 1 in ~2s even if the full course takes 30s.
- `/api/tutor/pipeline/generate` drives the two-phase animation pipeline.
- `/api/voice/stream` streams tutor chat tokens.

This shifts perceived latency from ~15s to ~2s without any infra changes.

### 5.9 Mobile — Offline-First React Native

[LearnifyApp/](LearnifyApp/) targets the low-connectivity "Bharat" user.

- **expo-sqlite** ([LearnifyApp/src/services/database.ts](LearnifyApp/src/services/database.ts)) caches full course trees, lesson content, and completed-topic state locally.
- **offlineSync.ts** reconciles on reconnect (write-through with conflict-free merges for completion state).
- **expo-av / expo-video** play pre-rendered narration + animation clips; animations fall back to simpler static visuals when no network.
- **Expo Router** mirrors the web app's URL structure so deep-linking from SMS/WhatsApp works.
- Uses AsyncStorage for token/session, expo-crypto for IDs, and `react-native-get-random-values` for Supabase polyfill.

### 5.10 Tap Launcher — Ambient UX Prototype

[tap-launcher/tap_launcher.py](tap-launcher/tap_launcher.py) is a MacBook-side Python process that opens Learnify pages via physical desk taps or spoken commands — designed for accessibility and kiosk/classroom scenarios.

- **Tap detection**: single/double/triple taps on the laptop body via microphone RMS energy + inter-tap window timing. Thresholds tuned for the MacBook Pro M1 Pro chassis.
- **Voice commands**: offline **Whisper** (no cloud round-trip) maps keywords (`dashboard`, `courses`, `quiz`, `tutor`, …) to routes.
- Launches the frontend URL via the default browser.

### 5.11 Security & Auth

- **Supabase Auth** (email + password) with JWT in `localStorage`; auto-refreshed from the Supabase session on mount.
- Backend validates Bearer tokens against the Supabase service key on protected routes.
- **Guest fallback** for read-only endpoints so anonymous demos don't require signup.
- All AI inputs are passed through **Zod schemas** before reaching the LLM to strip prompt-injection vectors from user fields.
- Animation HTML runs in a **sandboxed iframe** (`sandbox="allow-scripts"` only) — no access to parent DOM, cookies, or storage.
- Env vars live in `.env` / `.env.local` (gitignored); never commit service-role keys.

### 5.12 Database Design

18 tables centered around the learning hierarchy:

```
users ── student_profile
courses → modules → lessons → topics → content
enrollments (users ↔ courses, with progress %)
quizzes, homework, exams, study_plans, notes
student_performance (CSV of completed topic ids)
emotion_logs
classrooms, classroom_users, messages  (study rooms)
```

Design notes:
- `courses → modules → lessons → topics` is a strict 4-level hierarchy; all reads go through `/api/courses/:id` which returns the sorted tree in a single query.
- `enrollments.progress` is denormalized (percentage) for dashboard performance — recomputed on each topic-complete write.
- `student_performance.subject` stores CSV of completed topic IDs (chosen over a junction table for read simplicity; works fine at current scale).

---

### 5.13 Sign Language (ISL)

Sign-language mode is offered per topic, and whole courses can be generated in it. Four
paths back it, only one of which is a real signing engine:

| Path | Driven by | What renders |
|---|---|---|
| **3D avatar** | Backend gloss → SiGML → CWASA | [CWASA / JASigning](https://vhg.cmp.uea.ac.uk) 3D avatar (University of East Anglia), loaded in an isolated iframe ([cwasa-player.html](frontend/public/cwasa-player.html)) and driven via `postMessage` |
| Step breakdown | LLM per-word gesture description | 2D SVG avatar that moves between fixed signing zones |
| Generated animation | LLM-authored CSS/HTML | A standalone signing page in an iframe |
| Course captions | Lesson text split into phrases | Large adjustable captions + fingerspelling hand shapes |

**Honest scope.** Translating arbitrary English into linguistically correct ISL is an unsolved
research problem; no library does it reliably. [backend/src/services/sigml.ts](backend/src/services/sigml.ts)
therefore produces *structurally valid* SiGML two ways: a small hand-authored dictionary of
whole-word signs, and **fingerspelling** (one HamNoSys handshape per letter) for everything
else, which gives universal coverage. The pipeline is the deliverable — sign accuracy grows by
extending the dictionary. The avatar itself is WebGL and must be viewed in a real browser.

---

## 6. Feature Catalog

Organized by learner surface. Every feature below is implemented and reachable from the UI.

### Learning core
1. **AI Course Generation** — any subject, class 1–12, 3–90 day plans, 4 languages, streaming topic-by-topic
2. **Visual Animation Explanations** — two-phase pipeline, synchronized voice + subtitles, pause/resume/restart/fullscreen
3. **Text + Voice Slides** — SSML-tuned Hindi narration with auto-play and no audio overlap
4. **Lesson Tests** — animated MCQs inline in each lesson, 60% pass threshold, circular-score results
5. **Lesson Locking** — strict chronological progression across modules
6. **Progress Tracking** — per-module bars, badges, dashboard stats, auto-enrollment

### Assessment
7. **Quizzes** — 5/10/15 questions, E/M/H difficulty, deterministic scoring
8. **Exams** — 15/30/50/75 MCQs, timed with countdown, per-question navigation, auto-submit
9. **Homework** — short/long answer, AI-evaluated with feedback
10. **AI Tutor Chat** — SSE streaming, voice input via Whisper STT
11. **Voice Assistant** — full-screen orb UI with idle/listening/speaking states

### Content & tools
12. **Visual Lab** — standalone animation generator with follow-up chat
13. **Notes** — PDF text extraction + image OCR → structured notes
14. **Study Planner** — 7-day personalized plan from enrolled courses
15. **Career Guidance** — 5 paths with match scores

### Collaboration & adaptation
16. **2-Person Study Room** — shared video, whiteboard, notes, quizzes; synced course browsing
17. **Emotion Detection** — face-api.js webcam loop with adaptive interventions
18. **Multilingual UI & Content** — i18next + per-language TTS voices

### Surfaces
19. **Web Dashboard & Analytics** — zero-hardcoded charts (line, bar, doughnut, radar)
20. **Mobile App (LearnifyApp)** — offline SQLite cache, Expo Router
21. **Tap Launcher** — desk-tap + voice wake-word opens app pages

---

## 7. API Surface (40+ endpoints)

### Auth
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Profile |

### Courses & Progress
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/courses` | List |
| GET | `/api/courses/:id` | Full tree (modules/lessons/topics) |
| POST | `/api/courses/generate` | AI generate (SSE) |
| POST | `/api/courses/:id/enroll` | Enroll |
| DELETE | `/api/courses/:id` | Delete (cascade) |
| POST | `/api/courses/:courseId/topics/:topicId/complete` | Mark topic complete |
| GET | `/api/courses/:courseId/progress` | Progress % |
| GET | `/api/courses/progress/all` | All (dashboard) |
| GET | `/api/courses/:courseId/lesson-status` | Lock states |
| POST | `/api/courses/:courseId/lessons/:lessonId/test/generate` | Lesson test |
| POST | `/api/courses/:courseId/lessons/:lessonId/test/submit` | Submit lesson test |

### AI
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/ai/tutor/chat` | Tutor |
| POST | `/api/ai/quiz/generate` | Quiz |
| POST | `/api/ai/quiz/submit` | Submit (deterministic) |
| POST | `/api/ai/homework/generate` | Homework |
| POST | `/api/ai/homework/submit` | AI-evaluate |
| POST | `/api/ai/exam/generate` | Exam |
| POST | `/api/ai/exam/submit` | Submit (deterministic) |
| POST | `/api/ai/study-plan/generate` | 7-day plan |
| POST | `/api/ai/career-guidance` | 5 paths |
| POST | `/api/ai/doubt` | Doubt solver |

### Voice / Animation / Sign Language
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/voice/stream` | SSE tutor stream |
| POST | `/api/tutor/pipeline/generate` | 2-phase animation (SSE) |
| POST | `/api/tts` | Text → audio |
| POST | `/api/tts/stt` | Audio → text |
| GET | `/api/tts/voices` | Available voices |
| POST | `/api/sign-language/sigml` | Text → ISL gloss → SiGML for the CWASA 3D avatar |
| POST | `/api/sign-language/explain-stream` | SSE per-word sign breakdown |
| POST | `/api/sign-language/generate` | Standalone CSS/HTML signing animation |

### Student
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/student/dashboard` | Stats + recent activity |
| GET | `/api/student/performance` | Metrics |
| GET | `/api/student/report` | Full history |

---

## 8. Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Supabase account (free tier)
- An API key for any **OpenAI-compatible** LLM endpoint (the project is configured for [Z.ai](https://z.ai) GLM-5; Groq, OpenAI and Bedrock also work by changing `LLM_*` only)

### 8.1 Database
Run [supabase-schema.sql](supabase-schema.sql) in the Supabase SQL Editor.

### 8.2 Backend
```bash
cd backend
npm install
cp .env.example .env    # fill keys below
npx tsx src/server.ts   # or: npm run dev
# → http://localhost:5050
```

### 8.3 Web Frontend
```bash
cd frontend
npm install
# create .env.local with keys below
npx next dev -H 0.0.0.0 -p 3000
# → http://localhost:3000
```

### 8.4 TTS Service
```bash
cd tts-service
pip install -r requirements.txt
python server.py
# → http://localhost:5001
```

### 8.5 Mobile App
```bash
cd LearnifyApp
npm install
npx expo start
# scan QR with Expo Go or run on simulator
```

### 8.6 Tap Launcher (optional)
```bash
cd tap-launcher
pip install -r requirements.txt
python tap_launcher.py
# tap desk once = home, twice = dashboard, etc.
# or say: "open courses" / "open quiz"
```

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Backend won't bind port 5000 | macOS AirPlay Receiver owns it | Use `PORT=5050` (the default here), or disable AirPlay Receiver |
| Every AI call returns `401 invalid_api_key` | `LLM_API_KEY` expired or revoked | Issue a new key; verify with a direct `POST $LLM_BASE_URL/chat/completions` |
| Lesson generation takes ~5 minutes | GLM "thinking" mode is on | Handled automatically in [llm.ts](backend/src/config/llm.ts); a call can opt back in with `thinking` |
| Lesson stops halfway through | Model emitted unparseable JSON | Handled by `repairJson()`; check the backend log for `Salvaged N steps` and the dump in `$TMPDIR/learnify-failed-specs/` |
| Narration silent, `/tts` returns 500 instantly | TTS server started before the project folder was renamed, so its recorded interpreter path is stale | Restart it: `cd tts-service && ./venv/bin/python server.py` |
| Node values sit *beside* their boxes | Model placed labels outside the shape | Handled by `normalizeScene()` in [aiGenerator.ts](backend/src/pipelines/aiGenerator.ts) |

### Environment Variables

**backend/.env**
```env
PORT=5050

# AI provider — any OpenAI-compatible endpoint.
# Do NOT use AZURE_OPENAI_* names: LangChain forces Azure mode on those.
LLM_API_KEY=
LLM_BASE_URL=https://api.z.ai/api/paas/v4
LLM_MODEL=glm-5
LLM_PROJECT=                 # only Bedrock needs this (sent as the OpenAI-Project header)

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_URL=http://localhost:3000

# Optional — parent progress emails (Gmail App Password, not your login password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
```

> **Why port 5050?** macOS Monterey and later bind port 5000 to the AirPlay Receiver, so the
> default silently collides. Disable AirPlay Receiver in System Settings if you prefer 5000.

**frontend/.env.local**
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:5050/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5050
NEXT_PUBLIC_TTS_URL=http://localhost:5001
```

---

## 9. Design Trade-offs & Future Work

**Trade-offs made**
- **CSV of completed topics** in `student_performance.subject` — simple, but doesn't scale past ~10k topics per student. Move to a junction table when needed.
- **Client-side emotion detection** — zero server cost, but varies with device cam/lighting. Consider server-side verification for high-stakes use.
- **Deterministic MCQ scoring only** — free-response auto-grading is intentionally limited to homework.
- **Sandboxed iframe animations** — safe, but rules out importing external libs. Everything is vanilla JS/CSS.

**Next**
- Sign-language avatar for hearing-impaired learners (routes scaffolded in `signLanguage.ts`)
- Teacher dashboard (cohort analytics)
- Offline course generation via a smaller local model
- Push notifications for study-plan reminders

---

