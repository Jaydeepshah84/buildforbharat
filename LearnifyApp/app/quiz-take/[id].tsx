import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabase, updateQuizScore } from '../../src/services/database';
import { Card, Button, ProgressBar } from '../../src/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Question {
  question: string;
  options: string[];
  correct?: number;       // Backend uses "correct"
  correctIndex?: number;  // Offline generator uses "correctIndex"
  explanation: string;
}

function getCorrectIndex(q: Question): number {
  return q.correct ?? getCorrectIndex(q) ?? 0;
}

export default function QuizTakeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const loadQuiz = useCallback(async () => {
    if (!id) return;
    const db = await getDatabase();
    const row: any = await db.getFirstAsync('SELECT * FROM quizzes WHERE id = ?', [id]);
    if (row) {
      setQuiz(row);
      const qs = typeof row.questions === 'string' ? JSON.parse(row.questions) : (row.questions || []);
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));

      // If already completed, show results
      if (row.score != null) {
        setScore(row.score);
        setShowResult(true);
      }
    }
  }, [id]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  function selectAnswer(optionIndex: number) {
    if (showResult) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);
    setShowExplanation(true);
  }

  function goNext() {
    setShowExplanation(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function goPrev() {
    setShowExplanation(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  async function handleSubmit() {
    const unanswered = answers.filter(a => a === null).length;
    if (unanswered > 0) {
      Alert.alert('Incomplete', `You have ${unanswered} unanswered questions. Submit anyway?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: doSubmit },
      ]);
    } else {
      doSubmit();
    }
  }

  async function doSubmit() {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === getCorrectIndex(q)) correct++;
    });
    const finalScore = questions.length > 0 ? (correct / questions.length) * 100 : 0;
    setScore(finalScore);
    setShowResult(true);
    setShowExplanation(false);

    if (id) {
      await updateQuizScore(id, finalScore);
    }
  }

  if (!quiz || questions.length === 0) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Results View
  if (showResult) {
    const correct = questions.filter((q, i) => answers[i] === getCorrectIndex(q)).length;
    const percentage = Math.round(score);
    const passed = percentage >= 60;

    return (
      <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Results</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.resultCenter}>
          <View style={[styles.resultCircle, {
            borderColor: passed ? Colors.success : Colors.error,
          }]}>
            <Text style={[styles.resultScore, { color: passed ? Colors.success : Colors.error }]}>
              {percentage}%
            </Text>
            <Text style={styles.resultLabel}>{passed ? 'Passed!' : 'Try Again'}</Text>
          </View>
          <Text style={styles.resultSummary}>
            {correct} out of {questions.length} correct
          </Text>
        </View>

        {/* Review each question */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewTitle}>Review Answers</Text>
          {questions.map((q, qi) => {
            const userAnswer = answers[qi];
            const isCorrect = userAnswer === getCorrectIndex(q);

            return (
              <Card key={qi} style={[styles.reviewCard, {
                borderLeftColor: isCorrect ? Colors.success : Colors.error,
                borderLeftWidth: 3,
              }]}>
                <Text style={styles.reviewQuestion}>Q{qi + 1}. {q.question}</Text>
                {q.options.map((opt, oi) => (
                  <View key={oi} style={[
                    styles.reviewOption,
                    oi === getCorrectIndex(q) && styles.reviewCorrect,
                    oi === userAnswer && oi !== getCorrectIndex(q) && styles.reviewWrong,
                  ]}>
                    <Ionicons
                      name={oi === getCorrectIndex(q) ? 'checkmark-circle' : oi === userAnswer ? 'close-circle' : 'ellipse-outline'}
                      size={18}
                      color={oi === getCorrectIndex(q) ? Colors.success : oi === userAnswer ? Colors.error : Colors.textTertiary}
                    />
                    <Text style={[styles.reviewOptionText, oi === getCorrectIndex(q) && { fontWeight: '700', color: Colors.success }]}>
                      {opt}
                    </Text>
                  </View>
                ))}
                <Text style={styles.explanationText}>{q.explanation}</Text>
              </Card>
            );
          })}
        </View>

        <Button
          title="Done"
          onPress={() => router.back()}
          fullWidth
          size="lg"
          style={{ marginHorizontal: Spacing.xxl, marginTop: Spacing.lg }}
        />
      </ScrollView>
    );
  }

  // Quiz Taking View
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          Alert.alert('Exit Quiz', 'Your progress will be lost. Exit anyway?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', style: 'destructive', onPress: () => router.back() },
          ]);
        }} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{quiz.title}</Text>
        <Text style={styles.questionCount}>{currentIndex + 1}/{questions.length}</Text>
      </View>

      <ProgressBar progress={progress} color={Colors.primary} style={{ marginHorizontal: Spacing.xxl }} />

      {/* Question Navigator */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navigator}>
        {questions.map((_, qi) => (
          <TouchableOpacity
            key={qi}
            style={[
              styles.navDot,
              qi === currentIndex && styles.navDotActive,
              answers[qi] !== null && styles.navDotAnswered,
            ]}
            onPress={() => { setCurrentIndex(qi); setShowExplanation(answers[qi] !== null); }}
          >
            <Text style={[
              styles.navDotText,
              qi === currentIndex && { color: '#FFF' },
              answers[qi] !== null && qi !== currentIndex && { color: Colors.success },
            ]}>
              {qi + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Question */}
      <ScrollView contentContainerStyle={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        {currentQuestion.options.map((option, oi) => {
          const isSelected = answers[currentIndex] === oi;
          const isCorrect = showExplanation && oi === getCorrectIndex(currentQuestion);
          const isWrong = showExplanation && isSelected && oi !== getCorrectIndex(currentQuestion);

          return (
            <TouchableOpacity
              key={oi}
              style={[
                styles.optionBtn,
                isSelected && styles.optionSelected,
                isCorrect && styles.optionCorrect,
                isWrong && styles.optionWrong,
              ]}
              onPress={() => selectAnswer(oi)}
              disabled={answers[currentIndex] !== null}
              activeOpacity={0.7}
            >
              <View style={[styles.optionLetter, isSelected && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}>
                <Text style={[styles.optionLetterText, isSelected && { color: '#FFF' }]}>
                  {String.fromCharCode(65 + oi)}
                </Text>
              </View>
              <Text style={[styles.optionText, isSelected && { fontWeight: '600' }]}>{option}</Text>
              {isCorrect && <Ionicons name="checkmark-circle" size={22} color={Colors.success} />}
              {isWrong && <Ionicons name="close-circle" size={22} color={Colors.error} />}
            </TouchableOpacity>
          );
        })}

        {/* Explanation */}
        {showExplanation && currentQuestion.explanation && (
          <Card style={styles.explanationCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Ionicons name="bulb" size={18} color={Colors.warning} />
              <Text style={styles.explanationTitle}>Explanation</Text>
            </View>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </Card>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={[styles.bottomBtn, currentIndex === 0 && { opacity: 0.3 }]}
          onPress={goPrev}
          disabled={currentIndex === 0}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.bottomBtnText}>Prev</Text>
        </TouchableOpacity>

        {currentIndex === questions.length - 1 ? (
          <Button title="Submit Quiz" onPress={handleSubmit} size="md" icon="checkmark" />
        ) : (
          <TouchableOpacity style={styles.bottomBtn} onPress={goNext}>
            <Text style={styles.bottomBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: FontSize.md, color: Colors.textSecondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, flex: 1, textAlign: 'center' },
  questionCount: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  navigator: { paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md },
  navDot: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  navDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  navDotAnswered: { borderColor: Colors.success },
  navDotText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  questionContainer: { paddingHorizontal: Spacing.xxl, paddingBottom: 120 },
  questionText: {
    fontSize: FontSize.xl, fontWeight: '700', color: Colors.text,
    lineHeight: 30, marginBottom: Spacing.xxl,
  },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  optionCorrect: { borderColor: Colors.success, backgroundColor: Colors.success + '08' },
  optionWrong: { borderColor: Colors.error, backgroundColor: Colors.error + '08' },
  optionLetter: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  optionLetterText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  optionText: { flex: 1, fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
  explanationCard: {
    marginTop: Spacing.md, backgroundColor: Colors.warning + '08',
    borderLeftWidth: 3, borderLeftColor: Colors.warning,
  },
  explanationTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.warning },
  explanationText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginTop: 4 },
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xxl, paddingTop: Spacing.md,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  bottomBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: Spacing.sm },
  bottomBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },

  // Results
  resultCenter: { alignItems: 'center', paddingVertical: Spacing.xxl },
  resultCircle: {
    width: 160, height: 160, borderRadius: 80, borderWidth: 6,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
  },
  resultScore: { fontSize: 42, fontWeight: '800' },
  resultLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
  resultSummary: { fontSize: FontSize.lg, color: Colors.textSecondary },
  reviewSection: { paddingHorizontal: Spacing.xxl, marginTop: Spacing.lg },
  reviewTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  reviewCard: { marginBottom: Spacing.md },
  reviewQuestion: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  reviewOption: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: Spacing.sm,
  },
  reviewCorrect: { backgroundColor: Colors.success + '10', borderRadius: 8 },
  reviewWrong: { backgroundColor: Colors.error + '10', borderRadius: 8 },
  reviewOptionText: { fontSize: FontSize.sm, color: Colors.text, flex: 1 },
});
