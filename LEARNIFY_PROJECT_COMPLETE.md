# Learnify — Complete Project Document

**A Complete AI-Powered Education Ecosystem — multilingual, visual, and emotion-adaptive — built for Bharat.**
*(Originally conceived as "IgniteX".)*

This document explains the project end-to-end: the vision, the problem it solves, the full architecture, and **every single feature** — what it does and what real problem it resolves for a student.

---

## 1. The Vision

> **The core product: an AI *avatar teacher* that visually explains any topic — like a YouTube video you can talk to.**
> The student watches a visible AI teacher explain a concept with live animations and voice, and can **interrupt at any moment to ask a question out loud** — the avatar pauses, answers with voice and supporting visuals, then resumes the lesson. Like a real class, one-on-one, in the student's own language, on any device, even on a weak connection.

Everything else in the platform (courses, quizzes, notes, planner, analytics) exists to support this one central experience: **a personal AI teacher you can see, hear, and talk to.**

**The core insight driving everything:**

> **Students remember only 10–20% of what they read as text — but 70–80% of what they learn visually.**

Traditional learning (and even most "AI tutors," which reply in plain text) sits at the bottom of that range. Learnify's entire flagship — an AI teacher that *shows* concepts with animation and voice instead of *telling* them in text — exists to move every student from the 10–20% band to the 70–80% band. This single retention gap is the empirical foundation of the product.

Indian education has three chronic gaps:

1. **Language gap** — Over 250 million school students, and the majority study in regional languages, yet almost all quality digital learning is English-first.
2. **Understanding gap** — Learning is dominated by rote text and memorization. Students memorize *what* without ever *seeing* the concept, so intuition never forms.
3. **Access & attention gap** — One teacher cannot give 60 students individual attention, cannot detect who is confused, and cannot teach at 60 different speeds. Rural students face weak internet and no personal tutoring.

**Learnify closes all three.** A student types or speaks a question, and the platform instantly generates a **step-by-step animated visual explanation with synchronized human-like voice narration in their own language** — then adapts to their level, senses confusion through the webcam, and lets them learn together with a friend in a live study room.

It is not a chatbot and not a video library. It **generates fresh, unique, animated lessons on demand** for any topic.

---

## 2. The Problem We Are Solving (in detail)

| Problem in Indian education | How Learnify resolves it |
|---|---|
| Content is English-only | UI in 4 languages (English, Hindi, Gujarati, Spanish); AI content in 8 (adds Tamil, Telugu, Kannada, Marathi, Bengali); neural voice narration in all major Indian languages |
| Rote text learning, no visual intuition | AI auto-generates animated visual explanations for any concept, narrated step-by-step |
| No personalization — one pace for all | Adapts depth/vocabulary to class level; regenerates simpler explanations on demand; emotion-driven pacing |
| Teacher can't detect confusion | Webcam emotion detection senses confused/bored/frustrated and intervenes automatically |
| No individual tutoring / doubt solving | 24/7 AI tutor (text + voice), instant doubt solver, hands-free voice assistant |
| Weak rural internet | Low-bandwidth mode, offline mobile app with local caching, progressive streaming so lessons start in seconds |
| Deaf/hard-of-hearing students excluded | Indian Sign Language (ISL) avatar players with captions, no audio required |
| Parents can't track progress | Automatic parent email reports at every milestone (course, module, quiz, exam, analytics) |
| Learning is isolating | Real-time 2-person study rooms with shared video, whiteboard, notes, quizzes, and a shared AI teacher |
| Assessment is slow and manual | Instant AI-generated quizzes/exams with deterministic scoring; AI-graded homework with feedback |

---

## 3. How It Works — The Student Journey

The complete flow a student experiences (this is the "system workflow" from the original concept, now realized in code):

```
1.  Login / Signup  ───────────────►  2. Select Class & Subject
                                                │
                                                ▼
3.  AI Avatar Teacher  ◄── the core ──►  Voice + Visual explanation of any topic
        │                                       │  (student can interrupt & ask live)
        ▼                                       ▼
4.  Doubt Solver  +  Smart Notes  (auto-generated from the lesson)
        │
        ▼
5.  Quiz / Homework / Exams  ──►  AI Evaluation  ──►  instant score + feedback
        │
        ▼
6.  Performance Analytics
        ├─ Attention + Emotion Detection (webcam, live)
        ├─ Weak-Topic Detection
        └─ Improvement trend
        │
        ▼
7.  AI Study Planner  (personalized daily schedule from weak topics)
        │
        ▼
8.  Collaborative Classroom  (learn with a friend + shared AI teacher)
        │
        ▼
9.  Exam Mode  ──►  AI Feedback  ──►  Report Card
        │
        ▼
10. Career Guidance  (matched paths + education roadmap)
```

Every stage feeds the next: what the student struggles with (analytics + emotion) shapes the study plan, which schedules the revision, which is taught again by the AI teacher — a closed adaptive loop rather than a set of disconnected tools.

---

## 4. System Architecture

Learnify runs as **five coordinated services** across web, mobile, and ambient hardware:

```
                        ┌─────────────────────────────┐
                        │        Azure OpenAI         │
                        │   GPT-5.4  (9 AI agents)    │
                        └──────────────┬──────────────┘
                                       │
┌──────────────────┐   HTTP / SSE   ┌──▼───────────────────┐   SQL   ┌───────────────┐
│   Web Frontend   │◄──────────────►│    Backend API        │◄──────►│   Supabase    │
│   Next.js 15     │                │  Express + Socket.io  │        │  PostgreSQL   │
│   (port 3000)    │◄──Socket.io───►│    (port 5050)        │        │  (18 tables)  │
└────────┬─────────┘   (realtime)   └──────────┬────────────┘        └───────────────┘
         │                                     │ HTTP
         │                          ┌──────────▼────────────┐
         └──────── HTTP ───────────►│   Neural TTS Service  │
                                    │   Python / Flask      │
                                    │  edge-tts + Whisper   │
                                    │     (port 5001)       │
                                    └───────────────────────┘

┌──────────────────┐            ┌──────────────────────┐
│   Mobile App     │            │    Tap Launcher      │
│   Expo / RN 0.81 │            │  Python (desk-tap +  │
│  offline SQLite  │            │  voice wake-word)    │
└──────────────────┘            └──────────────────────┘
```

| Service | Runtime | Port | Purpose |
|---|---|---|---|
| **Web frontend** | Next.js 15, React 19 | 3000 | Main learning app (20 pages) |
| **Backend API** | Express + Socket.io | 5050 | REST, SSE streams, realtime sockets, AI orchestration |
| **Neural TTS service** | Flask (Python) | 5001 | Human-like voice (edge-tts neural) + speech-to-text (Whisper) |
| **Mobile app** | Expo / React Native | — | Offline-first learning for low-connectivity users |
| **Tap launcher** | Python CLI | — | Ambient desk-tap + wake-word navigation (accessibility/kiosk) |

---

## 5. Tech Stack

| Layer | Technology |
|---|---|
| Web | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion |
| Mobile | Expo 54, React Native 0.81, Expo Router, expo-sqlite, expo-av/expo-video |
| Backend | Node.js, Express, TypeScript, Socket.io, LangChain, Zod |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| AI engine | Azure OpenAI GPT-5.4 via 9 LangChain agents + a raw streaming client |
| Voice (TTS) | edge-tts — Microsoft Neural voices (SwaraNeural/AriaNeural/DhwaniNeural + more), SSML prosody |
| Voice (STT) | Faster-Whisper (local) |
| Realtime | Socket.io (state sync) + WebRTC (P2P video/voice, STUN+TURN) |
| Emotion AI | face-api.js (TinyFaceDetector + FaceExpressions + landmarks) |
| 3D graphics | three.js, react-three-fiber, drei, ogl (WebGL) |
| Charts | Chart.js + react-chartjs-2 |
| Documents | pdf-parse (PDF text), Tesseract.js (image OCR) |
| Video | fluent-ffmpeg (MP4 lesson rendering) |
| Email | nodemailer (parent notifications) |
| i18n | i18next + react-i18next |

---

## 6. Complete Feature Catalog

Every feature below is grouped by purpose. For each: **what it does** and **what it resolves**.

### A. Learning Core

**1. AI Course Generation**
Generate a full structured course (Course → Modules → Lessons → Topics) on *any* subject, for class 6 to graduate level, in any of 8 languages, for a 3–90 day plan. Content **streams live** — the course opens after the first 2 topics are ready while the rest generate in the background.
*Resolves:* No textbook or coaching needed — any student gets a personalized, structured syllabus on any topic instantly, in their language.

**2. ⭐ AI Avatar Teacher — Visual Lessons with Live Two-Way Conversation (THE FLAGSHIP)**
This is the heart of the product. A student asks a question and an **AI avatar teacher** explains it like a YouTube video: the AI builds a **4–6 step animated explanation** (moving shapes, emojis, arrows, labels, equations) on a canvas, narrated sentence-by-sentence in a natural neural voice, with a visible teacher avatar lip-synced to the speech. Crucially, the student can **interrupt and talk to the teacher live** — raise a hand / tap to speak, ask a doubt out loud, and the avatar pauses, answers with voice + a supporting visual, then resumes the lesson. Powered by a **two-phase progressive pipeline** (instant text ~3s, then animated steps streaming in one-by-one; first visual in ~4s).
*Resolves:* Replaces both the passive one-way YouTube lecture *and* the faceless text chatbot with a single experience — a teacher you can watch, hear, **and question in real time** — turning abstract concepts into concrete, conversational understanding.

> **Current status of the flagship (honest):** The three ingredients all exist in the codebase but are not yet fused into one screen:
> - ✅ Visual animated lesson — working (`AnimationPlayer` + `AnimationCanvas`)
> - ✅ Neural voice narration — working (edge-tts service)
> - ✅ Live two-way voice conversation — working, but as a *separate page* (`VoiceAssistantPage`: continuous listening, tap-to-interrupt, streamed spoken replies)
> - ⚠️ Visible avatar teacher with lip-sync — built but **not wired into lessons** (`AITeacherAvatar`, `AvatarCreator` 3D)
>
> **The remaining work is integration, not invention:** embed the avatar into the animation player and route the Voice-Assistant conversation loop into it so the student can pause the lesson, talk to the teacher, and resume. Realistic round-trip latency for a spoken answer is ~2–4 seconds (speech → AI → voice → lip-sync) — smooth for "pause and ask," not sub-second real-time.

**3. Course Player with 3 Learning Modes**
Every topic can be learned three ways, chosen by the student: **Text + Voice slides**, **Visual Animation**, or **Sign Language**.
*Resolves:* Different learners (readers, visual learners, deaf students) each get the format that works for them.

**4. Adaptive Text + Voice Lessons**
AI explanation auto-split into clean slides, auto-played with synchronized neural narration (with browser-speech fallback), YouTube-style scrubber and controls, low-bandwidth aware.
*Resolves:* Paced, narrated reading for auditory learners; works on weak connections.

**5. Mastery-Gated Lesson Progression**
Lessons unlock strictly in order — the next lesson stays locked until the previous lesson's test is passed at ≥60%. Lock state is computed server-side so it can't be bypassed. Finishing the last topic auto-triggers the lesson test.
*Resolves:* Stops students skipping ahead without understanding; enforces genuine mastery like a real curriculum.

**6. Progress Tracking & Gamification**
Per-topic completion, per-module progress bars, achievement badges (Started / 5 Topics / Halfway / Almost / Complete), streaks, and a printable **Certificate of Completion** at 100%.
*Resolves:* Keeps students motivated with visible progress and rewards.

### B. Assessment

**7. Quizzes**
Generate 5/10/15 MCQs by topic and difficulty; take with a timer and question navigator; **deterministic server-side scoring** (never AI-graded, so it's tamper-proof); circular-score results with per-question explanations and retry.
*Resolves:* Instant self-testing with trustworthy scoring and learning-focused explanations.

**8. Timed Exams**
Multi-topic MCQ exams of 15/30/50/75 questions with a countdown timer, auto-submit at zero, question navigation, section-wise breakdown, and AI feedback.
*Resolves:* Realistic board-exam practice under exam conditions.

**9. Homework (AI-graded)**
Generate short/long-answer questions; student writes free-text answers; AI grades with a score, overall feedback, improvement tips, and per-question feedback; full history saved.
*Resolves:* Open-ended practice with instant, actionable feedback — impossible to get at scale from a human teacher.

**10. Lesson Tests**
The gated per-lesson MCQ test (AI-generated, 60% to pass, animated feedback, review, retry) that unlocks the next lesson.
*Resolves:* Verifies mastery before allowing progress.

### C. Tutoring & Voice

**11. AI Tutor Chat**
Conversational tutor with markdown answers that adapt to the student's level, topic picker from enrolled courses, **voice input (speech-to-text)** and **read-aloud (TTS)** per message, and conversation history.
*Resolves:* 24/7 doubt solving at the right level, in the right language, hands-free capable.

**12. Voice Assistant (hands-free)**
A full "call" experience: an animated voice orb reflecting idle/listening/thinking/speaking states, continuous speech recognition, streamed AI replies spoken via neural TTS, tap-to-interrupt, live transcript (EN/HI).
*Resolves:* Completely screen-free learning — ideal for low-literacy learners, small children, or learning on the move.

**13. Doubt Solver**
Dedicated Socratic-style doubt-solving agent (also embedded in study rooms).
*Resolves:* Quick, friendly answers to one-off doubts without starting a full course.

### D. Content Tools

**14. Visual Lab**
A standalone playground: type any topic → get a narrated AI animation, with a Visual ↔ Sign Language toggle and a follow-up Q&A chat about the topic.
*Resolves:* On-demand visual explanations for anything, outside the course structure.

**15. AI Notes Maker**
Generate structured study notes from **4 sources**: a topic name, an **uploaded audio lecture** (speech-to-text → notes), a **PDF** (text extraction → notes), or **pasted questions** (→ detailed answers). Download as PDF; searchable notes library.
*Resolves:* Auto-creates revision notes from lectures, textbooks, or question banks — saves hours of manual note-making.

**16. Study Planner**
AI generates a day-by-day study schedule from the student's available hours; checkable tasks, per-day and overall progress, plan history.
*Resolves:* Turns vague goals into a concrete, trackable daily routine.

**17. Career Guidance**
Student enters interests + skills; AI returns matched career cards with description, required skills, education roadmap, growth outlook, salary, and a match percentage.
*Resolves:* Helps students discover suitable careers and the exact education path to reach them.

**18. AI Video Lessons (MP4)**
Backend generates a full downloadable MP4 lesson: AI slide script → neural narration → FFmpeg renders narrated text slides into a shareable video.
*Resolves:* Offline, shareable lesson videos for students without constant connectivity.

### E. Collaboration

**19. 2-Person Live Study Room**
A real-time collaborative room (Socket.io + WebRTC) joined by code or link, with **peer-to-peer video/audio**, camera/mic/screen-share, and four shared tabs:
- **Learn Together** — co-load and watch a topic in sync
- **Shared Whiteboard** — synced drawing
- **Shared Notes** — real-time collaborative text
- **Quiz Together** — both answer the same quiz, see each other's picks and scores
- Plus live chat and a **shared in-room AI teacher** (generates notes, visuals, quizzes on request).
*Resolves:* Recreates peer learning and group study remotely — with an AI tutor both friends share.

**20. Virtual Classrooms**
Create/join classrooms (optional password), classroom chat history.
*Resolves:* Larger group learning spaces beyond the 2-person room.

### F. Adaptation & Accessibility

**21. Emotion Detection & Adaptive Interventions**
A small corner webcam widget runs face-api.js locally (never uploads video), detecting the dominant expression and an attention level every ~30s, mapping raw emotions to learning states (engaged/focused/confused/frustrated/curious/anxious/bored). The backend tracks streaks and **intervenes**: a "confused" streak → re-explain in simpler language; "bored" streak → inject an engagement quiz; low attention → a refocus prompt.
*Resolves:* Gives every student the thing a good human tutor provides — noticing when they're lost and changing approach — at scale.

**22. Sign Language Support (ISL)**
Two Indian Sign Language players: an animated signing avatar with fingerspelling hand shapes and large adjustable captions (no audio needed), plus a step-by-step sign breakdown (per-word gesture, handshape, movement) streamed from the backend. Selectable per topic; whole courses can be generated in sign-language mode.
*Resolves:* Makes the entire platform accessible to deaf and hard-of-hearing students — a group almost entirely ignored by edtech.

**23. Multilingual UI & Content**
4 fully translated UI languages (English, Hindi, Gujarati, Spanish) + 8 AI content-generation languages + neural voice narration in all major Indian languages.
*Resolves:* Students learn in their mother tongue end-to-end — interface, content, and voice.

**24. Low-Bandwidth Mode**
A toggle that reduces data usage across lessons.
*Resolves:* Makes the platform usable on slow/expensive rural connections.

### G. Insights & Oversight

**25. Analytics Dashboard**
Chart.js visualizations built entirely from real data: performance-over-time line, subject-wise bar, **emotion analytics doughnut** (from webcam logs), **attention radar**, improvement trend, and a weak-topics list.
*Resolves:* Shows students (and parents) exactly where they're strong, weak, disengaged, or improving.

**26. Student Dashboard**
Personalized home: greeting, stat cards (enrolled/topics/progress/completed), recent quizzes and homework, today's study-plan tasks, per-subject bars.
*Resolves:* One glance shows a student where they stand and what to do next.

**27. Parent Email Reports**
Automatic branded emails to a parent/guardian at every milestone: welcome, course created, module completed, quiz result, exam result, and full analytics on course completion.
*Resolves:* Keeps parents involved and informed without any manual effort from the student.

### H. Surfaces & Ambient

**28. Mobile App (offline-first)**
Expo/React Native app caching full course trees and completion state in local SQLite, reconciling on reconnect, mirroring the web URL structure for deep-linking from SMS/WhatsApp.
*Resolves:* Learning continues with no/intermittent internet — the core "Bharat" scenario.

**29. Tap Launcher (ambient hardware)**
A MacBook-side Python process that opens Learnify pages via physical desk taps or spoken commands (offline Whisper), tuned for accessibility and classroom/kiosk use.
*Resolves:* Screen-free, keyboard-free access for accessibility and shared-device settings.

---

## 7. The AI Engine — 9 Specialized Agents

Every AI capability is a dedicated LangChain agent with its own prompt, schema, and validation. All return **Zod-validated JSON** before touching the database.

| Agent | Job |
|---|---|
| **course** | Build course structure (modules → lessons → topics) |
| **notes** | Structured exam-oriented notes (key points, definitions, practice Qs) |
| **quiz** | MCQs with options, correct index, explanation |
| **homework** | Short/long questions with marks and hints |
| **career** | Career-path counseling from performance |
| **doubt** | Friendly doubt-solving and free-text answer evaluation |
| **visual** | Step-by-step visual explanation specs |
| **classroom** | Shared in-room group-learning assistant |
| **progress** | Performance analysis + study-plan generation |

**Two-phase animation pipeline** (the flagship experience) runs on a raw streaming Azure client for speed: Phase 1 emits instant text; Phase 2 **streams a structured animation spec step-by-step**, parsing each complete step out of the token stream and sending it to the browser the moment it's ready. It includes a 1-hour result cache and in-flight request de-duplication so repeated questions are instant.

**Design principles:**
- MCQ scoring is **deterministic** server-side (`score = Σ correct answers`) — the LLM only *writes* questions, never *grades* them. Tamper-proof and auditable.
- Long generations use **Server-Sent Events** so the UI paints in ~2–4s instead of waiting 15–30s.
- User input is validated through schemas to reduce prompt-injection risk.

---

## 8. Data Model

18 PostgreSQL tables centered on the learning hierarchy:

```
users ── student_profile
courses → modules → lessons → topics → content
enrollments (users ↔ courses, with progress %)
quizzes · homework · exams · study_plans · notes
student_performance (completed topic IDs)
emotion_logs (emotion + attention over time)
classrooms · classroom_users · messages (study rooms)
```

---

## 9. Current Implementation Status (honest)

**Fully working and wired into the app:**
Course generation & streaming, visual animation pipeline (structured-spec, progressive), neural voice narration (edge-tts on port 5001), all 3 learning modes, mastery gating, quizzes/exams/homework, AI tutor + voice assistant, notes (all 4 sources), study planner, career guidance, analytics, emotion detection, sign-language players, 2-person study rooms, parent emails, dashboard.

**Built but experimental / not yet wired into the main page tree:**
- `AITeacherAvatar` (lip-sync teacher) — component exists, not imported
- `Avatar3D` (2D SVG gesturing avatar) — standalone
- `AvatarCreator` (real three.js 3D avatar customizer) — standalone
- `TapDetector` (in-browser accelerometer tap-nav) — standalone
- MP4 video generation and full sign-language routes are implemented backend-side; surface them further as needed.

**Notes on the stack as-built:**
- Backend runs on **port 5050** (some older docs say 5000).
- Primary narration is **edge-tts neural voices** via the Python service on 5001 (the frontend calls it directly); the Node backend also has a Google-TTS path as an alternate.
- The animation engine evolved from self-contained HTML in an iframe to a **structured JSON scene graph** rendered on a canvas with progressive step streaming — faster and more reliable.

---

## 10. Impact & Target Market

**Who it helps and how:**
- **Personalized learning for every student** — each learner gets a teacher tuned to their level and pace.
- **Helps weak students improve** — weak-topic detection + targeted re-teaching + adaptive study plans.
- **Reduces teacher workload** — auto-generates courses, notes, homework, quizzes, exams, and grading.
- **Improves exam performance** — exam mode, timed practice, report cards, weak-area drills.
- **Makes learning interactive** — visual + voice + conversation instead of passive reading.
- **Reaches rural learners** — multilingual AI, low-bandwidth mode, offline mobile app.
- **Encourages collaborative learning** — 2-person study rooms with a shared AI teacher.
- **Guides futures** — career discovery with concrete education roadmaps.

**Target markets:**
- Schools (K–12) and Colleges
- Coaching & tutoring institutes (B2B licensing / white-label)
- Online education platforms
- Rural & vernacular education (the core under-served segment)
- Government & NEP-2020 digital-education initiatives

---

## 11. Feasibility

The system is buildable today because it composes proven, available technology rather than inventing new science:
- **AI models** — existing LLMs (Azure OpenAI GPT; portable to Llama/others).
- **Web stack** — React / Next.js + Node.js (mature, widely supported).
- **Database & auth** — Supabase (managed PostgreSQL).
- **Live classroom** — WebRTC (standard peer-to-peer video/voice).
- **Attention & emotion** — face-api.js in the browser (no special hardware, runs on a normal webcam).
- **Voice** — edge-tts neural voices + local Whisper STT (free, offline-capable).
- **Modular build** — each capability is an independent agent/route, so the product can grow feature-by-feature.
- **Scalable** — stateless API + managed DB + a separable voice microservice deploy cleanly to the cloud.

Cost is controlled by caching generated lessons (1-hour cache + request de-duplication) and by using a deterministic render instead of expensive generative video.

---

## 12. What Makes Learnify Unique

1. **A teacher you can watch AND talk to** — not a passive YouTube video (one-way) and not a faceless chatbot (no visuals) — a visible AI avatar that teaches with live animations *and* answers your spoken questions mid-lesson. This fusion is the core differentiator.
2. **Retention-first** — built on the 10–20% (text) → 70–80% (visual) learning-retention gap; the whole product is engineered to put students in the higher band.
3. **Generates lessons, doesn't serve them** — every explanation is created fresh for the student's exact question, not pulled from a fixed library.
4. **Fast + accurate + cheap at once** — the deterministic animation-spec approach gives near-instant, correct visuals without the cost or hallucination of generative video.
5. **Mother-tongue end-to-end** — interface, content, and human-like voice all in the student's language.
6. **Emotion-adaptive** — senses confusion and changes its teaching, like a real tutor.
7. **Inclusive by design** — sign language, low-bandwidth, offline mobile, voice-only, ambient hardware.
8. **Whole learning loop** — teach → test → track → involve parents → learn with friends, in one platform.

---

## 13. Honest Evaluation

**Strengths**
- A genuinely **working prototype** spanning web, mobile, backend, and voice — rare at this stage.
- Real technical novelty in the progressive animation pipeline and emotion-adaptive loop.
- Strong alignment with national priorities (mother-tongue and conceptual learning).
- Broad, coherent feature set that covers the full student journey.
- Accessibility depth (sign language, low-bandwidth, voice-only) that most edtech ignores.

**Risks / gaps to strengthen**
- **AI accuracy at scale** — generated content can occasionally be wrong; needs a validation/review layer for high-stakes topics.
- **Running cost** — depends on Azure OpenAI; needs a clear cost-per-lesson model and caching strategy (partly addressed by the 1-hour cache).
- **Content quality consistency** across subjects and languages needs testing.
- **No independent users/traction yet** — currently pre-pilot.
- **Some components are experimental** (avatars, tap-nav) and not yet integrated.
- **Data/privacy** — webcam emotion detection is local-only today; keep it that way and document it clearly for trust.

---

## 14. Roadmap

**Priority 1 — Complete the flagship (integration, not invention):**
- Embed the avatar teacher (lip-synced to narration) directly inside the lesson/animation player
- Route the live Voice-Assistant conversation loop into the lesson: "raise hand" → pause animation → speak → AI answers with voice + supporting visual → resume
- Reduce spoken-answer round-trip latency (stream STT + TTS) toward the ~2s floor

**Then:**
- Content-accuracy validation layer (fact-check pass on generated lessons)
- Teacher/cohort dashboard for schools (B2B)
- Offline course generation with a smaller local model
- Push notifications for study-plan reminders
- Pilot with a school/coaching centre to gather real usage data

---

*This document reflects the actual current implementation of the codebase as well as its design intent. It is safe to use as an internal reference; for any public/funding submission that forbids identifying details, remove the "Learnify" brand name and any personal or institutional identifiers.*
