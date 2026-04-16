import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL_KEY = 'api_base_url';
const AUTH_TOKEN_KEY = 'auth_token';

let baseUrl = 'http://172.16.5.39:5050';

export async function initApiUrl() {
  const stored = await AsyncStorage.getItem(API_BASE_URL_KEY);
  if (stored) baseUrl = stored;
}

export async function setApiBaseUrl(url: string) {
  baseUrl = url.replace(/\/+$/, '');
  await AsyncStorage.setItem(API_BASE_URL_KEY, baseUrl);
}

export function getApiBaseUrl() {
  return baseUrl;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setToken(token: string) {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearToken() {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: { method?: string; body?: any; headers?: Record<string, string>; timeout?: number } = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, timeout = 30000 } = options;
  const token = await getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || `Request failed (${res.status})`);
    }
    return res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Request timed out.');
    throw err;
  }
}

// ===================== AUTH =====================

// POST /api/auth/signup
// Returns: { message, user: { id, name, email, role, class, language, ... } }
// NOTE: Supabase signup — after signup, user must login to get session token
export async function apiSignup(
  name: string, email: string, password: string, classLevel: number, language: string = 'en'
): Promise<{ user: any }> {
  return request('/api/auth/signup', {
    method: 'POST',
    body: { name, email, password, role: 'student', class: String(classLevel), language },
  });
}

// POST /api/auth/login
// Returns: { user: { id, name, email, role, class }, session: { access_token, refresh_token, expires_in } }
export async function apiLogin(email: string, password: string): Promise<{ user: any; session: any }> {
  const data = await request<{ user: any; session: any }>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  // Store Supabase access_token
  if (data.session?.access_token) {
    await setToken(data.session.access_token);
  }
  return data;
}

// GET /api/auth/profile
// Returns: { user: { id, name, email, role, class, language, parent_email }, profile: { level, learning_speed } }
export async function apiGetProfile(): Promise<any> {
  return request('/api/auth/profile');
}

// PUT /api/auth/profile
export async function apiUpdateProfile(updates: Record<string, any>): Promise<any> {
  return request('/api/auth/profile', { method: 'PUT', body: updates });
}

// ===================== COURSES =====================

// GET /api/courses
// Returns: { courses: [{ id, title, subject, class, duration_days, ... }] }
export async function apiGetCourses(): Promise<any[]> {
  const data = await request<{ courses: any[] }>('/api/courses');
  return data.courses || [];
}

// GET /api/courses/:id
// Returns: { course: { id, title, subject, modules: [{ lessons: [{ topics: [] }] }] } }
export async function apiGetCourseDetail(courseId: string): Promise<any> {
  return request(`/api/courses/${courseId}`);
}

// POST /api/courses/:id/enroll
export async function apiEnrollCourse(courseId: string): Promise<any> {
  return request(`/api/courses/${courseId}/enroll`, { method: 'POST' });
}

// GET /api/courses/enrollments
// Returns: { enrollments: [{ course_id, progress, courses: { title, subject } }] }
export async function apiGetEnrollments(): Promise<any> {
  return request('/api/courses/enrollments');
}

// GET /api/courses/progress/all
// Returns: { courses: [{ courseId, courseTitle, progress, completedTopics, quizAvg }], totalCourses, avgProgress, ... }
export async function apiGetAllProgress(): Promise<any> {
  return request('/api/courses/progress/all');
}

// GET /api/courses/:courseId/progress
// Returns: { progress, completedTopics: [], completedCount, totalTopics, courseCompleted }
export async function apiGetCourseProgress(courseId: string): Promise<any> {
  return request(`/api/courses/${courseId}/progress`);
}

// POST /api/courses/:courseId/topics/:topicId/complete
// Returns: { topicId, completedTopics, completedCount, totalTopics, progressPct, courseCompleted }
export async function apiMarkTopicComplete(courseId: string, topicId: string): Promise<any> {
  return request(`/api/courses/${courseId}/topics/${topicId}/complete`, { method: 'POST' });
}

// GET /api/courses/:courseId/lesson-status
// Returns: { lessons: [{ lessonId, lessonTitle, locked, testPassed, bestScore }] }
export async function apiGetLessonStatus(courseId: string): Promise<any> {
  return request(`/api/courses/${courseId}/lesson-status`);
}

// DELETE /api/courses/:id
export async function apiDeleteCourse(courseId: string): Promise<any> {
  return request(`/api/courses/${courseId}`, { method: 'DELETE' });
}

// ===================== COURSE GENERATION (SSE) =====================

// POST /api/courses/stream/generate-stream
// SSE stream: events — status, structure, saved, topic:ready, complete, error
export function apiGenerateCourseStream(
  config: { subject: string; classLevel: number; duration: number; language: string },
  onEvent: (event: { type: string; data: any }) => void,
  onComplete: (courseId: string) => void,
  onError: (error: string) => void,
): () => void {
  let aborted = false;

  (async () => {
    const token = await getToken();
    try {
      const res = await fetch(`${baseUrl}/api/courses/stream/generate-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: config.subject,
          classLevel: String(config.classLevel),
          duration: config.duration,
          language: config.language,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError(err.error || err.message || 'Generation failed');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { onError('Streaming not supported'); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'complete' || data.courseId && data.totalTopics) {
                onComplete(data.courseId);
              } else if (data.type === 'error' || data.error) {
                onError(data.message || data.error || 'Generation error');
              } else {
                onEvent({ type: data.type || data.phase || 'status', data });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (!aborted) onError(err.message || 'Connection error');
    }
  })();

  return () => { aborted = true; };
}

// ===================== LESSON TESTS =====================

// POST /api/courses/:courseId/lessons/:lessonId/test/generate
export async function apiGenerateLessonTest(courseId: string, lessonId: string): Promise<any> {
  return request(`/api/courses/${courseId}/lessons/${lessonId}/test/generate`, { method: 'POST' });
}

// POST /api/courses/:courseId/lessons/:lessonId/test/submit
export async function apiSubmitLessonTest(
  courseId: string, lessonId: string,
  questions: any[], answers: number[], timeTaken?: number
): Promise<any> {
  return request(`/api/courses/${courseId}/lessons/${lessonId}/test/submit`, {
    method: 'POST',
    body: { questions, answers, timeTaken },
  });
}

// ===================== AI / QUIZ =====================

// POST /api/ai/quiz/generate
// Request: { topic, count, difficulty, language }
export async function apiGenerateQuiz(
  topic: string, count: number = 10, difficulty: string = 'medium', language: string = 'en'
): Promise<any> {
  return request('/api/ai/quiz/generate', {
    method: 'POST',
    body: { topic, count, difficulty, language },
  });
}

// POST /api/ai/quiz/submit
// Request: { topic, questions, answers, timeTaken }
export async function apiSubmitQuiz(
  topic: string, questions: any[], answers: number[], timeTaken?: number
): Promise<any> {
  return request('/api/ai/quiz/submit', {
    method: 'POST',
    body: { topic, questions, answers, timeTaken },
  });
}

// POST /api/ai/homework/generate
export async function apiGenerateHomework(topic: string, count: number, difficulty: string): Promise<any> {
  return request('/api/ai/homework/generate', { method: 'POST', body: { topic, count, difficulty } });
}

// POST /api/ai/homework/submit
export async function apiSubmitHomework(topicId: string, courseId: string, questions: any[], submission: string[]): Promise<any> {
  return request('/api/ai/homework/submit', { method: 'POST', body: { topicId, courseId, questions, submission } });
}

// POST /api/ai/exam/generate
export async function apiGenerateExam(topics: string[], questionCount: number, totalMarks: number): Promise<any> {
  return request('/api/ai/exam/generate', { method: 'POST', body: { topics, questionCount, totalMarks } });
}

// POST /api/ai/exam/submit
export async function apiSubmitExam(questions: any[], submission: number[], timeTaken: number): Promise<any> {
  return request('/api/ai/exam/submit', { method: 'POST', body: { questions, submission, timeTaken } });
}

// POST /api/ai/tutor/chat
export async function apiTutorChat(
  topic: string, message: string, conversationHistory: any[] = [], language: string = 'en'
): Promise<any> {
  return request('/api/ai/tutor/chat', {
    method: 'POST',
    body: { topic, message, conversationHistory, language },
  });
}

// POST /api/ai/study-plan/generate
export async function apiGenerateStudyPlan(availableHours?: number): Promise<any> {
  return request('/api/ai/study-plan/generate', { method: 'POST', body: { availableHours } });
}

// POST /api/ai/career-guidance
export async function apiCareerGuidance(interests: string[], skills: string[]): Promise<any> {
  return request('/api/ai/career-guidance', { method: 'POST', body: { interests, skills } });
}

// POST /api/ai/doubt
export async function apiAskDoubt(topic: string, question: string, context?: string): Promise<any> {
  return request('/api/ai/doubt', { method: 'POST', body: { topic, question, context } });
}

// ===================== STUDENT / DASHBOARD =====================

// GET /api/student/dashboard
// Returns: { profile, enrollments, stats, recentQuizzes, recentHomework, currentPlan, performance }
export async function apiGetDashboard(): Promise<any> {
  return request('/api/student/dashboard');
}

// GET /api/student/performance
export async function apiGetPerformance(): Promise<any> {
  return request('/api/student/performance');
}

// GET /api/student/report
export async function apiGetReport(): Promise<any> {
  return request('/api/student/report');
}

// ===================== HEALTH CHECK =====================

export async function checkServerConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}
