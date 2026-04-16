export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
  classLevel: number;
  language: string;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  classLevel: number;
  duration: number;
  language: string;
  totalTopics: number;
  completedTopics: number;
  progress: number;
  createdAt: string;
  imageColor: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  orderIndex: number;
  isLocked: boolean;
  isPassed: boolean;
  topics: Topic[];
}

export interface Topic {
  id: string;
  lessonId: string;
  title: string;
  orderIndex: number;
  isCompleted: boolean;
  content?: TopicContent;
}

export interface TopicContent {
  id: string;
  topicId: string;
  text: string;
  keyPoints: string[];
  examples: string[];
  language: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  questions: QuizQuestion[];
  score?: number;
  totalQuestions: number;
  completedAt?: string;
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  selectedIndex?: number;
}

export interface StudyPlan {
  id: string;
  userId: string;
  days: StudyDay[];
  createdAt: string;
}

export interface StudyDay {
  day: number;
  date: string;
  tasks: StudyTask[];
}

export interface StudyTask {
  title: string;
  type: 'study' | 'quiz' | 'revision' | 'exercise';
  duration: string;
  completed: boolean;
  courseId?: string;
}

export interface PerformanceStats {
  totalCourses: number;
  completedCourses: number;
  totalTopicsCompleted: number;
  averageProgress: number;
  averageQuizScore: number;
  totalQuizzes: number;
  streak: number;
}

export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

export interface CourseGenerationConfig {
  subject: string;
  classLevel: number;
  duration: number;
  language: string;
}
