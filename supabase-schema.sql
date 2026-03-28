-- =============================================
-- AI-Powered Adaptive Education Ecosystem
-- Supabase PostgreSQL Schema
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  class TEXT,
  language TEXT DEFAULT 'en',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COURSES
-- =============================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  class TEXT,
  subject TEXT NOT NULL,
  duration_days INTEGER DEFAULT 30,
  difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  generated_by UUID REFERENCES users(id),
  syllabus JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('text', 'diagram', 'animation')),
  content_text TEXT,
  animation_json JSONB,
  diagram_json JSONB,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STUDENT PROFILE & PERFORMANCE
-- =============================================
CREATE TABLE student_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  level TEXT DEFAULT 'medium' CHECK (level IN ('weak', 'medium', 'strong')),
  learning_speed FLOAT DEFAULT 1.0,
  preferred_mode TEXT DEFAULT 'text' CHECK (preferred_mode IN ('text', 'diagram', 'animation')),
  interests TEXT[],
  strengths TEXT[],
  weaknesses TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE student_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  subject TEXT,
  quiz_avg FLOAT DEFAULT 0,
  homework_avg FLOAT DEFAULT 0,
  exam_avg FLOAT DEFAULT 0,
  attention_avg FLOAT DEFAULT 0,
  emotion_avg FLOAT DEFAULT 0,
  performance_score FLOAT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- =============================================
-- ASSESSMENTS
-- =============================================
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id),
  questions JSONB NOT NULL,
  answers JSONB,
  score FLOAT,
  total FLOAT,
  time_taken INTEGER, -- seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE homework (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id),
  questions JSONB NOT NULL,
  submission TEXT,
  ai_feedback TEXT,
  score FLOAT,
  total FLOAT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  answers JSONB,
  score FLOAT,
  total FLOAT,
  time_taken INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STUDY PLANS & NOTES
-- =============================================
CREATE TABLE study_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_text TEXT,
  plan_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  original_text TEXT,
  summary TEXT,
  flashcards JSONB,
  source_type TEXT CHECK (source_type IN ('pdf', 'image', 'manual')),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CLASSROOMS (Live AI Classroom)
-- =============================================
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  course_id UUID REFERENCES courses(id),
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE classroom_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  ai_response TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EMOTION & ATTENTION TRACKING
-- =============================================
CREATE TABLE emotion_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  emotion TEXT CHECK (emotion IN ('happy', 'confused', 'bored', 'focused', 'frustrated', 'neutral')),
  attention_level FLOAT CHECK (attention_level >= 0 AND attention_level <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COURSE ENROLLMENTS
-- =============================================
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  progress FLOAT DEFAULT 0,
  current_topic_id UUID REFERENCES topics(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Courses are viewable by all authenticated users
CREATE POLICY "Courses viewable by authenticated" ON courses
  FOR SELECT USING (auth.role() = 'authenticated');

-- Students can view/update their own performance
CREATE POLICY "Own performance" ON student_performance
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Own profile" ON student_profile
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Own quizzes" ON quizzes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Own homework" ON homework
  FOR ALL USING (auth.uid() = user_id);

-- Messages viewable by classroom members
CREATE POLICY "Classroom messages" ON messages
  FOR SELECT USING (
    classroom_id IN (
      SELECT classroom_id FROM classroom_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Own emotion logs" ON emotion_logs
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_topics_lesson ON topics(lesson_id);
CREATE INDEX idx_content_topic ON content(topic_id);
CREATE INDEX idx_performance_user ON student_performance(user_id);
CREATE INDEX idx_quizzes_user ON quizzes(user_id);
CREATE INDEX idx_homework_user ON homework(user_id);
CREATE INDEX idx_messages_classroom ON messages(classroom_id);
CREATE INDEX idx_emotion_user ON emotion_logs(user_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to calculate performance score
CREATE OR REPLACE FUNCTION calculate_performance_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.performance_score := (
    COALESCE(NEW.quiz_avg, 0) +
    COALESCE(NEW.homework_avg, 0) +
    COALESCE(NEW.exam_avg, 0) +
    COALESCE(NEW.attention_avg, 0)
  ) / 4;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_performance_score
  BEFORE INSERT OR UPDATE ON student_performance
  FOR EACH ROW
  EXECUTE FUNCTION calculate_performance_score();

-- Function to update student level based on performance
CREATE OR REPLACE FUNCTION update_student_level()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE student_profile
  SET level = CASE
    WHEN NEW.performance_score < 40 THEN 'weak'
    WHEN NEW.performance_score < 70 THEN 'medium'
    ELSE 'strong'
  END,
  learning_speed = CASE
    WHEN NEW.performance_score < 40 THEN 0.7
    WHEN NEW.performance_score < 70 THEN 1.0
    ELSE 1.5
  END,
  updated_at = NOW()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_student_level
  AFTER INSERT OR UPDATE ON student_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_student_level();
