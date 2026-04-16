import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('learnify.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      class_level INTEGER DEFAULT 10,
      language TEXT DEFAULT 'en',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      class_level INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      language TEXT DEFAULT 'en',
      total_topics INTEGER DEFAULT 0,
      completed_topics INTEGER DEFAULT 0,
      progress REAL DEFAULT 0,
      image_color TEXT DEFAULT '#6C63FF',
      synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      is_locked INTEGER DEFAULT 1,
      is_passed INTEGER DEFAULT 0,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      is_completed INTEGER DEFAULT 0,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topic_content (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL UNIQUE,
      text_content TEXT NOT NULL,
      key_points TEXT DEFAULT '[]',
      examples TEXT DEFAULT '[]',
      language TEXT DEFAULT 'en',
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      questions TEXT NOT NULL,
      score REAL,
      total_questions INTEGER NOT NULL,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);
    CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
    CREATE INDEX IF NOT EXISTS idx_topics_lesson ON topics(lesson_id);
    CREATE INDEX IF NOT EXISTS idx_content_topic ON topic_content(topic_id);
    CREATE INDEX IF NOT EXISTS idx_quizzes_user ON quizzes(user_id);
  `);
}

// --- User Operations ---

export async function createUser(
  id: string, name: string, email: string, passwordHash: string,
  classLevel: number, language: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO users (id, name, email, password_hash, class_level, language) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, email, passwordHash, classLevel, language]
  );
}

export async function getUserByEmail(email: string): Promise<any> {
  const database = await getDatabase();
  return database.getFirstAsync('SELECT * FROM users WHERE email = ?', [email]);
}

export async function getUserById(id: string): Promise<any> {
  const database = await getDatabase();
  return database.getFirstAsync('SELECT * FROM users WHERE id = ?', [id]);
}

export async function updateUser(id: string, updates: Record<string, any>): Promise<void> {
  const database = await getDatabase();
  const keys = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  await database.runAsync(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
}

// --- Course Operations ---

export async function insertCourse(course: {
  id: string; userId: string; title: string; subject: string;
  classLevel: number; duration: number; language: string;
  totalTopics: number; imageColor: string;
}): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO courses (id, user_id, title, subject, class_level, duration, language, total_topics, image_color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [course.id, course.userId, course.title, course.subject, course.classLevel,
     course.duration, course.language, course.totalTopics, course.imageColor]
  );
}

export async function getCoursesByUser(userId: string): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    'SELECT * FROM courses WHERE user_id = ? ORDER BY created_at DESC', [userId]
  );
}

export async function getCourseById(courseId: string): Promise<any> {
  const database = await getDatabase();
  return database.getFirstAsync('SELECT * FROM courses WHERE id = ?', [courseId]);
}

export async function updateCourseProgress(courseId: string, completedTopics: number, totalTopics: number): Promise<void> {
  const database = await getDatabase();
  const progress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
  await database.runAsync(
    'UPDATE courses SET completed_topics = ?, progress = ? WHERE id = ?',
    [completedTopics, progress, courseId]
  );
}

export async function deleteCourse(courseId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM courses WHERE id = ?', [courseId]);
}

// --- Module Operations ---

export async function insertModule(module: {
  id: string; courseId: string; title: string; orderIndex: number;
}): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO modules (id, course_id, title, order_index) VALUES (?, ?, ?, ?)',
    [module.id, module.courseId, module.title, module.orderIndex]
  );
}

export async function getModulesByCourse(courseId: string): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    'SELECT * FROM modules WHERE course_id = ? ORDER BY order_index', [courseId]
  );
}

// --- Lesson Operations ---

export async function insertLesson(lesson: {
  id: string; moduleId: string; title: string; orderIndex: number; isLocked: boolean;
}): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO lessons (id, module_id, title, order_index, is_locked) VALUES (?, ?, ?, ?, ?)',
    [lesson.id, lesson.moduleId, lesson.title, lesson.orderIndex, lesson.isLocked ? 1 : 0]
  );
}

export async function getLessonsByModule(moduleId: string): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    'SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index', [moduleId]
  );
}

export async function updateLessonStatus(lessonId: string, isPassed: boolean): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE lessons SET is_passed = ? WHERE id = ?', [isPassed ? 1 : 0, lessonId]);
}

export async function unlockLesson(lessonId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE lessons SET is_locked = 0 WHERE id = ?', [lessonId]);
}

// --- Topic Operations ---

export async function insertTopic(topic: {
  id: string; lessonId: string; title: string; orderIndex: number;
}): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO topics (id, lesson_id, title, order_index) VALUES (?, ?, ?, ?)',
    [topic.id, topic.lessonId, topic.title, topic.orderIndex]
  );
}

export async function getTopicsByLesson(lessonId: string): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    'SELECT * FROM topics WHERE lesson_id = ? ORDER BY order_index', [lessonId]
  );
}

export async function markTopicComplete(topicId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE topics SET is_completed = 1 WHERE id = ?', [topicId]);
}

// --- Topic Content Operations ---

export async function insertTopicContent(content: {
  id: string; topicId: string; text: string; keyPoints: string[];
  examples: string[]; language: string;
}): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO topic_content (id, topic_id, text_content, key_points, examples, language)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [content.id, content.topicId, content.text,
     JSON.stringify(content.keyPoints), JSON.stringify(content.examples), content.language]
  );
}

export async function getTopicContent(topicId: string): Promise<any> {
  const database = await getDatabase();
  return database.getFirstAsync('SELECT * FROM topic_content WHERE topic_id = ?', [topicId]);
}

// --- Quiz Operations ---

export async function insertQuiz(quiz: {
  id: string; courseId: string | null; userId: string; title: string;
  questions: any[]; totalQuestions: number;
}): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO quizzes (id, course_id, user_id, title, questions, total_questions)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [quiz.id, quiz.courseId, quiz.userId, quiz.title,
     JSON.stringify(quiz.questions), quiz.totalQuestions]
  );
}

export async function updateQuizScore(quizId: string, score: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "UPDATE quizzes SET score = ?, completed_at = datetime('now') WHERE id = ?",
    [score, quizId]
  );
}

export async function getQuizzesByUser(userId: string): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    'SELECT * FROM quizzes WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]
  );
}

// --- Study Plan Operations ---

export async function insertStudyPlan(plan: {
  id: string; userId: string; planData: any;
}): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO study_plans (id, user_id, plan_data) VALUES (?, ?, ?)',
    [plan.id, plan.userId, JSON.stringify(plan.planData)]
  );
}

export async function getLatestStudyPlan(userId: string): Promise<any> {
  const database = await getDatabase();
  return database.getFirstAsync(
    'SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]
  );
}

// --- Settings Operations ---

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const row: any = await database.getFirstAsync(
    'SELECT value FROM app_settings WHERE key = ?', [key]
  );
  return row?.value ?? null;
}

// --- Stats ---

export async function getPerformanceStats(userId: string): Promise<{
  totalCourses: number; completedCourses: number;
  totalTopicsCompleted: number; averageProgress: number;
  averageQuizScore: number; totalQuizzes: number;
}> {
  const database = await getDatabase();

  const courseStats: any = await database.getFirstAsync(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN progress >= 100 THEN 1 ELSE 0 END) as completed,
            COALESCE(SUM(completed_topics), 0) as topics_done,
            COALESCE(AVG(progress), 0) as avg_progress
     FROM courses WHERE user_id = ?`, [userId]
  );

  const quizStats: any = await database.getFirstAsync(
    `SELECT COUNT(*) as total,
            COALESCE(AVG(score), 0) as avg_score
     FROM quizzes WHERE user_id = ? AND score IS NOT NULL`, [userId]
  );

  return {
    totalCourses: courseStats?.total ?? 0,
    completedCourses: courseStats?.completed ?? 0,
    totalTopicsCompleted: courseStats?.topics_done ?? 0,
    averageProgress: Math.round(courseStats?.avg_progress ?? 0),
    averageQuizScore: Math.round(quizStats?.avg_score ?? 0),
    totalQuizzes: quizStats?.total ?? 0,
  };
}

// --- Full Course Tree ---

export async function getFullCourseTree(courseId: string): Promise<any> {
  const database = await getDatabase();
  const course = await getCourseById(courseId);
  if (!course) return null;

  const modules = await getModulesByCourse(courseId);
  for (const mod of modules) {
    mod.lessons = await getLessonsByModule(mod.id);
    for (const lesson of mod.lessons) {
      lesson.topics = await getTopicsByLesson(lesson.id);
    }
  }
  return { ...course, modules };
}
