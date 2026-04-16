import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '../../src/hooks/useAuth';
import { useNetwork } from '../../src/hooks/useNetwork';
import { apiGetCourses, apiGenerateQuiz } from '../../src/services/api';
import {
  getCoursesByUser, getQuizzesByUser, getFullCourseTree,
  getTopicContent, insertQuiz,
} from '../../src/services/database';
import { generateQuizFromContent } from '../../src/services/courseGenerator';
import { Card, Badge, Button, EmptyState } from '../../src/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';

export default function QuizScreen() {
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const [courses, setCourses] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(10);

  const loadData = useCallback(async () => {
    if (!user) return;

    // Get quiz history from local DB
    const q = await getQuizzesByUser(user.id);
    setQuizzes(q);

    // Get courses (online or downloaded)
    if (isOnline) {
      try {
        const online = await apiGetCourses();
        setCourses(online || []);
        if (online?.length > 0 && !selectedCourse) setSelectedCourse(online[0].id);
        return;
      } catch {}
    }

    // Fallback to downloaded courses
    const local = await getCoursesByUser(user.id);
    setCourses(local);
    if (local.length > 0 && !selectedCourse) setSelectedCourse(local[0].id);
  }, [user, isOnline, selectedCourse]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  async function handleGenerateQuiz() {
    if (!selectedCourse || !user) {
      Alert.alert('Select a Course', 'Please select a course first.');
      return;
    }

    setGenerating(true);

    // Find selected course details to use subject as topic
    const selectedCourseData = courses.find((c: any) => c.id === selectedCourse);
    const topicName = selectedCourseData?.subject || selectedCourseData?.title || 'General';

    // Try online AI quiz first
    if (isOnline) {
      try {
        const result = await apiGenerateQuiz(topicName, questionCount, difficulty);
        if (result?.quiz) {
          const quizId = randomUUID();
          const questions = result.quiz.questions || [];
          await insertQuiz({
            id: quizId,
            courseId: selectedCourse,
            userId: user.id,
            title: `${topicName} - ${difficulty} Quiz`,
            questions,
            totalQuestions: questions.length,
          });
          setGenerating(false);
          router.push(`/quiz-take/${quizId}`);
          return;
        }
      } catch (e) {
        console.log('Online quiz failed, trying offline');
      }
    }

    // Fallback: generate from downloaded content
    try {
      const tree = await getFullCourseTree(selectedCourse);
      if (!tree) throw new Error('Course not downloaded. Download the course first for offline quizzes.');

      const allTopics: any[] = [];
      for (const mod of tree.modules || []) {
        for (const les of mod.lessons || []) {
          for (const top of les.topics || []) allTopics.push(top);
        }
      }
      if (allTopics.length === 0) throw new Error('No topics found.');

      const shuffled = allTopics.sort(() => Math.random() - 0.5).slice(0, 5);
      let allQuestions: any[] = [];

      for (const topic of shuffled) {
        const content = await getTopicContent(topic.id);
        if (content) {
          const kp = typeof content.key_points === 'string' ? JSON.parse(content.key_points) : (content.key_points || []);
          allQuestions.push(...generateQuizFromContent(topic.title, content.text_content, kp, 2));
        }
      }
      if (allQuestions.length === 0) throw new Error('Could not generate questions.');

      allQuestions = allQuestions.slice(0, questionCount);
      const quizId = randomUUID();
      await insertQuiz({
        id: quizId, courseId: selectedCourse, userId: user.id,
        title: `${tree.title} - Offline Quiz`,
        questions: allQuestions, totalQuestions: allQuestions.length,
      });
      router.push(`/quiz-take/${quizId}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate quiz');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quiz</Text>
        {!isOnline && <Badge text="Offline" color={Colors.warning} />}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {courses.length === 0 ? (
          <EmptyState
            icon="help-circle-outline"
            title="No Courses"
            message={isOnline ? 'Create a course first to take quizzes.' : 'Download a course to take quizzes offline.'}
          />
        ) : (
          <>
            {/* Course selector */}
            <Text style={styles.label}>Select Course</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xl }}>
              {courses.map((c: any) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedCourse(c.id)}
                  style={[
                    styles.courseChip,
                    selectedCourse === c.id && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                  ]}
                >
                  <Text style={[styles.courseChipText, selectedCourse === c.id && { color: '#FFF' }]} numberOfLines={1}>
                    {c.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Difficulty */}
            <Text style={styles.label}>Difficulty</Text>
            <View style={styles.optRow}>
              {['Easy', 'Medium', 'Hard'].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.optChip, difficulty === d && styles.optChipActive]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[styles.optChipText, difficulty === d && { color: '#FFF' }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Question count */}
            <Text style={styles.label}>Questions</Text>
            <View style={styles.optRow}>
              {[5, 10, 15].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.optChip, questionCount === n && styles.optChipActive]}
                  onPress={() => setQuestionCount(n)}
                >
                  <Text style={[styles.optChipText, questionCount === n && { color: '#FFF' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Generate */}
            <Card style={styles.generateCard}>
              <Ionicons name={isOnline ? 'sparkles' : 'document-text'} size={36} color={Colors.primary} />
              <Text style={styles.generateTitle}>
                {isOnline ? 'AI-Powered Quiz' : 'Offline Quiz'}
              </Text>
              <Text style={styles.generateDesc}>
                {isOnline
                  ? 'Generate a quiz using AI based on your course content.'
                  : 'Generate a quiz from your downloaded course content.'}
              </Text>
              <Button
                title={generating ? 'Generating...' : 'Start Quiz'}
                onPress={handleGenerateQuiz}
                loading={generating}
                icon="play"
                fullWidth
                style={{ marginTop: Spacing.lg }}
              />
            </Card>

            {/* History */}
            {quizzes.length > 0 && (
              <>
                <Text style={[styles.label, { marginTop: Spacing.xxl }]}>Quiz History</Text>
                {quizzes.map(q => (
                  <Card key={q.id} style={styles.quizCard} onPress={q.score == null ? () => router.push(`/quiz-take/${q.id}`) : undefined}>
                    <View style={styles.quizRow}>
                      <View style={[styles.quizIcon, {
                        backgroundColor: (q.score != null
                          ? (q.score >= 70 ? Colors.success : q.score >= 40 ? Colors.warning : Colors.error)
                          : Colors.primary) + '15',
                      }]}>
                        <Ionicons
                          name={q.score != null ? (q.score >= 70 ? 'trophy' : 'close-circle') : 'play-circle'}
                          size={22}
                          color={q.score != null ? (q.score >= 70 ? Colors.success : q.score >= 40 ? Colors.warning : Colors.error) : Colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.quizTitle} numberOfLines={1}>{q.title}</Text>
                        <Text style={styles.quizMeta}>
                          {q.total_questions} questions
                          {q.completed_at ? ` - ${new Date(q.completed_at).toLocaleDateString()}` : ''}
                        </Text>
                      </View>
                      {q.score != null && (
                        <View style={[styles.scoreBadge, {
                          backgroundColor: (q.score >= 70 ? Colors.success : q.score >= 40 ? Colors.warning : Colors.error) + '15',
                        }]}>
                          <Text style={[styles.scoreText, {
                            color: q.score >= 70 ? Colors.success : q.score >= 40 ? Colors.warning : Colors.error,
                          }]}>{Math.round(q.score)}%</Text>
                        </View>
                      )}
                    </View>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg,
  },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  content: { paddingHorizontal: Spacing.xxl, paddingBottom: 100 },
  label: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  courseChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.surface,
    marginRight: 8, maxWidth: 200,
  },
  courseChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  optRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.xl },
  optChip: {
    flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  optChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  generateCard: { alignItems: 'center', padding: Spacing.xxl },
  generateTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginTop: Spacing.md },
  generateDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 20 },
  quizCard: { marginBottom: Spacing.sm },
  quizRow: { flexDirection: 'row', alignItems: 'center' },
  quizIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  quizTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  quizMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  scoreText: { fontSize: FontSize.md, fontWeight: '700' },
});
