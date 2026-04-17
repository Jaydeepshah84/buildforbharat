// ============================================================
// API Service - Native fetch wrapper for all backend endpoints
// ============================================================

// Dynamic API URL: use the current page's hostname so it works from any device on the network
function getBaseUrl() {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
  const envUrl = process.env.NEXT_PUBLIC_API_URL || '';
  // If env URL points to localhost but we're accessing from a different host, use current hostname
  if (envUrl.includes('localhost') && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:5050/api`;
  }
  return envUrl || `http://${window.location.hostname}:5050/api`;
}
const BASE_URL = typeof window !== 'undefined' ? getBaseUrl() : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api');

// --------------- helpers ---------------

function getAuthHeaders() {
  let token = localStorage.getItem('token');

  // Fallback: get from Supabase session storage
  if (!token) {
    try {
      const keys = Object.keys(localStorage);
      const sbKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (sbKey) {
        const raw = localStorage.getItem(sbKey) || '{}';
        const session = JSON.parse(raw);
        token = session?.access_token || session?.currentSession?.access_token || null;
        // Also save it for next time
        if (token) localStorage.setItem('token', token);
      }
    } catch {}
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function authHeadersMultipart() {
  let token = localStorage.getItem('token');
  if (!token) {
    try {
      const keys = Object.keys(localStorage);
      const sbKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (sbKey) {
        const session = JSON.parse(localStorage.getItem(sbKey) || '{}');
        token = session?.access_token || null;
      }
    } catch {}
  }
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const config = {
    headers: options.multipart ? authHeadersMultipart() : getAuthHeaders(),
    ...options,
  };

  // Remove our custom flag so fetch doesn't choke
  delete config.multipart;

  try {
    const response = await fetch(url, config);

    // Handle 204 No Content
    if (response.status === 204) return { success: true };

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (data && (data.message || data.error)) ||
        `Request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // Re-throw API errors as-is; wrap network errors
    if (err.status) throw err;
    throw new Error(err.message || 'Network error – please check your connection.');
  }
}

function get(endpoint) {
  return request(endpoint, { method: 'GET' });
}

function post(endpoint, body) {
  return request(endpoint, { method: 'POST', body: JSON.stringify(body) });
}

function put(endpoint, body) {
  return request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
}

function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

function upload(endpoint, formData) {
  return request(endpoint, { method: 'POST', body: formData, multipart: true });
}

// ============================================================
// Auth
// ============================================================

export const auth = {
  signup: (payload) => post('/auth/signup', payload),
  login: (payload) => post('/auth/login', payload),
  getProfile: () => get('/auth/profile'),
  updateProfile: (payload) => put('/auth/profile', payload),
};

// ============================================================
// Courses
// ============================================================

export const courses = {
  getCourses: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get(`/courses${qs}`);
  },
  getCourse: (id) => get(`/courses/${id}`),
  generateCourse: (payload) => post('/courses/generate', payload),
  enrollCourse: (courseId) => post(`/courses/${courseId}/enroll`, {}),
  deleteCourse: (courseId) => del(`/courses/${courseId}`),
  getEnrollments: () => get('/courses/enrollments'),
  getTopicContent: (courseId, topicId) =>
    get(`/courses/${courseId}/topics/${topicId}/content`),
  // Progress tracking
  completeTopic: (courseId, topicId) => post(`/courses/${courseId}/topics/${topicId}/complete`, {}),
  getProgress: (courseId) => get(`/courses/${courseId}/progress`),
  getAllProgress: () => get('/courses/progress/all'),
  // Lesson tests
  generateLessonTest: (courseId, lessonId) => post(`/courses/${courseId}/lessons/${lessonId}/test/generate`, {}),
  submitLessonTest: (courseId, lessonId, payload) => post(`/courses/${courseId}/lessons/${lessonId}/test/submit`, payload),
  getLessonStatuses: (courseId) => get(`/courses/${courseId}/lesson-status`),
};

// ============================================================
// AI
// ============================================================

export const ai = {
  tutorChat: (payload) => post('/ai/tutor/chat', payload),
  generateQuiz: (payload) => post('/ai/quiz/generate', payload),
  submitQuiz: (payload) => post('/ai/quiz/submit', payload),
  generateHomework: (payload) => post('/ai/homework/generate', payload),
  submitHomework: (payload) => post('/ai/homework/submit', payload),
  evaluate: (payload) => post('/ai/evaluate', payload),
  generateStudyPlan: (payload) => post('/ai/study-plan/generate', payload),
  careerGuidance: (payload) => post('/ai/career-guidance', payload),
  translateContent: (payload) => post('/ai/translate', payload),
  textToSpeech: (payload) => post('/ai/tts', payload),
  speechToText: (formData) => upload('/tts/stt', formData),
  processEmotion: (payload) => post('/ai/emotion', payload),
  solveDoubt: (payload) => post('/ai/doubt', payload),
  generateExam: (payload) => post('/ai/exam/generate', payload),
  submitExam: (payload) => post('/ai/exam/submit', payload),
};

// ============================================================
// Student
// ============================================================

export const student = {
  getDashboard: () => get('/student/dashboard'),
  getPerformance: () => get('/student/performance'),
  getReport: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get(`/student/report${qs}`);
  },
};

// ============================================================
// Upload
// ============================================================

export const uploadService = {
  uploadPDF: (formData) => upload('/upload/pdf', formData),
  uploadImage: (formData) => upload('/upload/image', formData),
  getNotes: () => get('/upload/notes'),
};

// ============================================================
// Classroom
// ============================================================

export const classroom = {
  getClassrooms: () => get('/classrooms'),
  createClassroom: (payload) => post('/classrooms', payload),
  joinClassroom: (classroomId, body = {}) => post(`/classrooms/${classroomId}/join`, body),
  getMessages: (classroomId, params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get(`/classrooms/${classroomId}/messages${qs}`);
  },
};

// ============================================================
// Default export (convenience)
// ============================================================

const api = { auth, courses, ai, student, upload: uploadService, classroom };
export default api;
