import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../../src/hooks/useNetwork';
import { apiMarkTopicComplete, apiTutorChat } from '../../src/services/api';
import {
  getTopicContent, markTopicComplete as markTopicCompleteLocal,
  getTopicsByLesson, updateCourseProgress, getDatabase,
  insertTopicContent,
} from '../../src/services/database';
import { isCourseOffline } from '../../src/services/offlineSync';
import { hasLocalAudio } from '../../src/services/audioService';
import { hasLocalAnimation } from '../../src/services/animationService';
import { Card, Button } from '../../src/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';

export default function LearnScreen() {
  const { topicId, courseId, source } = useLocalSearchParams<{ topicId: string; courseId: string; source: string }>();
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState<any>(null);
  const [topicInfo, setTopicInfo] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [marking, setMarking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adjacentTopics, setAdjacentTopics] = useState<{ prev: any; next: any }>({ prev: null, next: null });

  const loadContent = useCallback(async () => {
    if (!topicId) return;
    setLoading(true);

    try {
      const db = await getDatabase();

      // Get topic info from local DB
      const topic: any = await db.getFirstAsync('SELECT * FROM topics WHERE id = ?', [topicId]);
      if (topic) {
        setTopicInfo(topic);
        setIsCompleted(!!topic.is_completed);

        // Check for video/audio
        const animExists = hasLocalAnimation(topicId);
        const audioExists = await hasLocalAudio(topicId);
        setAudioAvailable(animExists || audioExists);

        // Get adjacent topics for navigation
        if (topic.lesson_id) {
          const allTopics = await getTopicsByLesson(topic.lesson_id);
          const idx = allTopics.findIndex((t: any) => t.id === topicId);
          setAdjacentTopics({
            prev: idx > 0 ? allTopics[idx - 1] : null,
            next: idx < allTopics.length - 1 ? allTopics[idx + 1] : null,
          });
        }

        // Try local content first
        const localContent = await getTopicContent(topicId);
        if (localContent && localContent.text_content) {
          const keyPoints = typeof localContent.key_points === 'string'
            ? JSON.parse(localContent.key_points) : (localContent.key_points || []);
          const examples = typeof localContent.examples === 'string'
            ? JSON.parse(localContent.examples) : (localContent.examples || []);
          setContent({ ...localContent, key_points: keyPoints, examples });
        } else if (isOnline) {
          // No local content — generate via AI on the fly
          setContent({ text_content: 'Loading content from server...', key_points: [], examples: [] });
          try {
            const resp = await apiTutorChat(
              topic.title,
              `Explain "${topic.title}" in detail for a student. Include 2-3 paragraphs of explanation, then list key points and examples.`,
              [],
              'en'
            );
            const text = resp?.response || resp?.answer || '';
            if (text) {
              setContent({ text_content: text, key_points: [], examples: [] });
              // Save to local DB for offline
              const { randomUUID } = await import('expo-crypto');
              await insertTopicContent({
                id: randomUUID(),
                topicId,
                text,
                keyPoints: [],
                examples: [],
                language: 'en',
              }).catch(() => {});
            }
          } catch {
            setContent({
              text_content: 'Could not load content. Please try again or download the full course.',
              key_points: [],
              examples: [],
            });
          }
        } else {
          setContent({
            text_content: 'No content available offline. Download the course while online to access all topics.',
            key_points: [],
            examples: [],
          });
        }
      } else {
        setTopicInfo({ id: topicId, title: 'Topic' });
        if (isOnline) {
          setContent({ text_content: 'Topic not found locally. Go back and re-download the course.', key_points: [], examples: [] });
        } else {
          setContent({ text_content: 'Not available offline.', key_points: [], examples: [] });
        }
      }
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [topicId, isOnline]);

  useEffect(() => { loadContent(); }, [loadContent]);

  async function handleMarkComplete() {
    if (!topicId || !courseId) return;
    setMarking(true);

    try {
      // Mark on server if online
      if (isOnline) {
        try {
          await apiMarkTopicComplete(courseId, topicId);
        } catch {}
      }

      // Mark locally if downloaded
      const offline = await isCourseOffline(courseId);
      if (offline) {
        await markTopicCompleteLocal(topicId);

        // Update course progress
        const db = await getDatabase();
        const totalRow: any = await db.getFirstAsync(
          `SELECT COUNT(*) as total FROM topics t
           JOIN lessons l ON t.lesson_id = l.id
           JOIN modules m ON l.module_id = m.id
           WHERE m.course_id = ?`, [courseId]
        );
        const doneRow: any = await db.getFirstAsync(
          `SELECT COUNT(*) as done FROM topics t
           JOIN lessons l ON t.lesson_id = l.id
           JOIN modules m ON l.module_id = m.id
           WHERE m.course_id = ? AND t.is_completed = 1`, [courseId]
        );
        await updateCourseProgress(courseId, doneRow?.done || 0, totalRow?.total || 1);
      }

      setIsCompleted(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to mark complete');
    } finally {
      setMarking(false);
    }
  }

  function navigateTopic(topic: any) {
    router.replace(`/learn/${topic.id}?courseId=${courseId}&source=${source}`);
  }

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const paragraphs = content?.text_content?.split('\n').filter((p: string) => p.trim()) || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{topicInfo?.title || 'Topic'}</Text>
        </View>
        {audioAvailable && (
          <TouchableOpacity
            style={styles.playHeaderBtn}
            onPress={() => router.push(`/player/${topicId}?courseId=${courseId}`)}
          >
            <Ionicons name="play-circle" size={28} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {isCompleted && <Ionicons name="checkmark-circle" size={22} color={Colors.success} />}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!content ? (
          <View style={styles.noContent}>
            <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.noContentText}>No content available.</Text>
            <Text style={styles.noContentHint}>Download the course for offline access to all topics.</Text>
          </View>
        ) : (
          <>
            {/* Main Content */}
            <Card style={styles.contentCard}>
              {paragraphs.map((paragraph: string, i: number) => {
                const trimmed = paragraph.trim();
                const isHeader = trimmed.endsWith(':') && trimmed.length < 60 && !trimmed.includes('.');
                const isNumbered = /^\d+[\.\)]/.test(trimmed);
                const isBullet = trimmed.startsWith('-') || trimmed.startsWith('*');

                return (
                  <Text key={i} style={[
                    styles.paragraph,
                    isHeader && styles.contentHeader,
                    isNumbered && styles.numberedItem,
                    isBullet && styles.bulletItem,
                  ]}>
                    {trimmed}
                  </Text>
                );
              })}
            </Card>

            {/* Key Points */}
            {content.key_points?.length > 0 && (
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bulb" size={20} color={Colors.warning} />
                  <Text style={styles.sectionTitle}>Key Points</Text>
                </View>
                {content.key_points.map((point: string, i: number) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={[styles.bullet, { backgroundColor: Colors.warning }]} />
                    <Text style={styles.bulletText}>{point}</Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Examples */}
            {content.examples?.length > 0 && (
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="flash" size={20} color={Colors.accent} />
                  <Text style={styles.sectionTitle}>Examples</Text>
                </View>
                {content.examples.map((ex: string, i: number) => (
                  <View key={i} style={styles.exampleRow}>
                    <Text style={styles.exampleNum}>{i + 1}</Text>
                    <Text style={styles.bulletText}>{ex}</Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Mark Complete */}
            {!isCompleted && (
              <Button
                title="Mark as Complete"
                onPress={handleMarkComplete}
                loading={marking}
                icon="checkmark-circle"
                fullWidth
                size="lg"
                style={{ marginTop: Spacing.lg }}
              />
            )}

            {isCompleted && (
              <View style={styles.completedBanner}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.completedText}>Topic Completed</Text>
              </View>
            )}

            {/* Navigation */}
            <View style={styles.navRow}>
              {adjacentTopics.prev ? (
                <TouchableOpacity style={styles.navBtn} onPress={() => navigateTopic(adjacentTopics.prev)}>
                  <Ionicons name="arrow-back" size={18} color={Colors.primary} />
                  <Text style={styles.navBtnText}>Previous</Text>
                </TouchableOpacity>
              ) : <View />}
              {adjacentTopics.next ? (
                <TouchableOpacity style={[styles.navBtn, { flexDirection: 'row-reverse' }]} onPress={() => navigateTopic(adjacentTopics.next)}>
                  <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
                  <Text style={styles.navBtnText}>Next Topic</Text>
                </TouchableOpacity>
              ) : <View />}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md, gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  playHeaderBtn: { padding: 2 },
  content: { paddingHorizontal: Spacing.xxl, paddingBottom: 100 },
  noContent: { alignItems: 'center', paddingVertical: 60 },
  noContentText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
  noContentHint: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 4, textAlign: 'center' },
  playLessonCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.primary, padding: Spacing.lg, borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  playLessonIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  playLessonTitle: { fontSize: FontSize.lg, fontWeight: '700', color: '#FFF' },
  playLessonDesc: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  contentCard: { padding: Spacing.xl },
  paragraph: { fontSize: FontSize.md, color: Colors.text, lineHeight: 26, marginBottom: Spacing.md },
  contentHeader: { fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.md, marginBottom: Spacing.sm },
  numberedItem: { marginLeft: Spacing.md, marginBottom: Spacing.sm },
  bulletItem: { marginLeft: Spacing.md, marginBottom: Spacing.sm },
  sectionCard: { marginTop: Spacing.lg, padding: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 7, marginRight: Spacing.md },
  bulletText: { flex: 1, fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
  exampleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  exampleNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.accent + '20',
    textAlign: 'center', lineHeight: 24, fontSize: FontSize.xs, fontWeight: '700',
    color: Colors.accent, marginRight: Spacing.md, overflow: 'hidden',
  },
  completedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.success + '10', borderRadius: BorderRadius.md,
  },
  completedText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.success },
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: Spacing.xxl, paddingTop: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: Spacing.sm },
  navBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
});
