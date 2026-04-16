import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { useNetwork } from '../../src/hooks/useNetwork';
import { apiGetCourseDetail, apiGetLessonStatus } from '../../src/services/api';
import { getFullCourseTree } from '../../src/services/database';
import { isCourseOffline, downloadCourseForOffline } from '../../src/services/offlineSync';
import { Card, ProgressBar, Badge, Button } from '../../src/components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<'api' | 'local'>('api');

  const loadCourse = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const offline = await isCourseOffline(id);
    setIsOffline(offline);

    // Try online first
    if (isOnline) {
      try {
        const data = await apiGetCourseDetail(id);
        const c = data.course || data;
        setCourse(c);
        setSource('api');
        if (c.modules?.length > 0) {
          setExpandedModules(new Set([c.modules[0].id]));
        }
        setLoading(false);
        return;
      } catch (e) {
        console.log('API failed, trying local');
      }
    }

    // Fallback to local
    if (offline) {
      const tree = await getFullCourseTree(id);
      if (tree) {
        setCourse(tree);
        setSource('local');
        if (tree.modules?.length > 0) {
          setExpandedModules(new Set([tree.modules[0].id]));
        }
      }
    }

    setLoading(false);
  }, [id, isOnline]);

  useEffect(() => { loadCourse(); }, [loadCourse]);

  async function handleDownload() {
    if (!user || !id) return;
    setDownloading(true);
    const success = await downloadCourseForOffline(id, user.id);
    setDownloading(false);
    if (success) {
      setIsOffline(true);
      Alert.alert('Downloaded!', 'Course is now available offline.');
    } else {
      Alert.alert('Error', 'Download failed. Try again.');
    }
  }

  function toggleModule(moduleId: string) {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  }

  function toggleLesson(lessonId: string) {
    setExpandedLessons(prev => {
      const next = new Set(prev);
      next.has(lessonId) ? next.delete(lessonId) : next.add(lessonId);
      return next;
    });
  }

  function handleTopicPress(topic: any, lesson: any) {
    if (lesson.is_locked) {
      Alert.alert('Locked', 'Complete the previous lesson to unlock.');
      return;
    }
    if (!isOnline && !isOffline) {
      Alert.alert('Offline', 'Download this course to read topics offline.');
      return;
    }
    router.push(`/learn/${topic.id}?courseId=${id}&source=${source}`);
  }

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading course...</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorTitle}>Course Not Available</Text>
        <Text style={styles.errorMsg}>
          {isOnline ? 'Could not load this course.' : 'Download this course while online to access it offline.'}
        </Text>
      </View>
    );
  }

  const modules = course.modules || [];
  const totalTopics = course.total_topics || course.totalTopics || 0;
  const completedTopics = course.completed_topics || course.completedTopics || 0;
  const progress = course.progress || (totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0);
  const color = course.image_color || Colors.primary;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
        </View>
        {isOffline && (
          <View style={styles.offlineIcon}>
            <Ionicons name="cloud-done" size={18} color={Colors.success} />
          </View>
        )}
      </View>

      {/* Progress + Download bar */}
      <Card style={styles.progressCard}>
        <View style={styles.progressRow}>
          <View style={{ flex: 1 }}>
            <ProgressBar progress={progress} color={color} height={8} />
          </View>
          <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.progressMeta}>
          <Badge text={course.subject || 'General'} color={color} size="md" />
          <Text style={styles.metaText}>{completedTopics}/{totalTopics} topics</Text>
          <Text style={styles.metaText}>Class {course.class || course.class_level || course.classLevel}</Text>
          <Text style={styles.metaText}>{course.duration_days || course.duration || 7}d</Text>
        </View>

        {/* Download button */}
        {!isOffline && isOnline && (
          <TouchableOpacity style={styles.downloadBar} onPress={handleDownload} disabled={downloading}>
            {downloading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="download-outline" size={18} color={Colors.primary} />
            )}
            <Text style={styles.downloadBarText}>
              {downloading ? 'Downloading...' : 'Download for Offline Access'}
            </Text>
          </TouchableOpacity>
        )}
        {isOffline && (
          <View style={[styles.downloadBar, { borderTopColor: Colors.success + '30' }]}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={[styles.downloadBarText, { color: Colors.success }]}>Available Offline</Text>
          </View>
        )}
      </Card>

      {/* Modules */}
      <ScrollView contentContainerStyle={styles.modulesList}>
        {modules.map((mod: any, mi: number) => {
          const isExpanded = expandedModules.has(mod.id);
          const lessons = mod.lessons || [];
          const modTopics = lessons.reduce((s: number, l: any) => s + (l.topics || []).length, 0);
          const modDone = lessons.reduce((s: number, l: any) =>
            s + (l.topics || []).filter((t: any) => t.is_completed).length, 0);

          return (
            <View key={mod.id} style={styles.moduleContainer}>
              <TouchableOpacity style={styles.moduleHeader} onPress={() => toggleModule(mod.id)} activeOpacity={0.7}>
                <View style={[styles.moduleIdx, { backgroundColor: color + '15' }]}>
                  <Text style={[styles.moduleIdxText, { color }]}>{mi + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moduleTitle}>{mod.title}</Text>
                  <Text style={styles.moduleMeta}>{modDone}/{modTopics} topics - {lessons.length} lessons</Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>

              {isExpanded && lessons.map((lesson: any, li: number) => {
                const isLessonExpanded = expandedLessons.has(lesson.id);
                const topics = lesson.topics || [];
                const lDone = topics.filter((t: any) => t.is_completed).length;
                const allDone = lDone === topics.length && topics.length > 0;

                return (
                  <View key={lesson.id} style={styles.lessonContainer}>
                    <TouchableOpacity style={styles.lessonHeader} onPress={() => toggleLesson(lesson.id)} activeOpacity={0.7}>
                      <View style={styles.lessonIcon}>
                        {lesson.is_locked ? (
                          <Ionicons name="lock-closed" size={16} color={Colors.textTertiary} />
                        ) : allDone ? (
                          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                        ) : (
                          <Ionicons name="play-circle" size={16} color={Colors.primary} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.lessonTitle, lesson.is_locked && { color: Colors.textTertiary }]}>
                          {lesson.title}
                        </Text>
                        <Text style={styles.lessonMeta}>{lDone}/{topics.length} topics</Text>
                      </View>
                      <Ionicons name={isLessonExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textTertiary} />
                    </TouchableOpacity>

                    {isLessonExpanded && topics.map((topic: any, ti: number) => (
                      <TouchableOpacity
                        key={topic.id}
                        style={styles.topicItem}
                        onPress={() => handleTopicPress(topic, lesson)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.topicDot, {
                          backgroundColor: topic.is_completed ? Colors.success :
                            lesson.is_locked ? Colors.textTertiary + '30' : Colors.primary + '30',
                        }]}>
                          {topic.is_completed ? (
                            <Ionicons name="checkmark" size={12} color="#FFF" />
                          ) : (
                            <Text style={[styles.topicDotText, { color: lesson.is_locked ? Colors.textTertiary : Colors.primary }]}>
                              {ti + 1}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.topicTitle, lesson.is_locked && { color: Colors.textTertiary }]} numberOfLines={2}>
                          {topic.title}
                        </Text>
                        {!lesson.is_locked && !topic.is_completed && (
                          <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  loadingText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.lg },
  errorTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.lg },
  errorMsg: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md, gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  courseTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  offlineIcon: { padding: 6, borderRadius: 16, backgroundColor: Colors.success + '15' },
  progressCard: { marginHorizontal: Spacing.xxl, marginBottom: Spacing.lg },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  progressPercent: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  progressMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sm },
  metaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  downloadBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.md, marginTop: Spacing.md,
  },
  downloadBarText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  modulesList: { paddingHorizontal: Spacing.xxl, paddingBottom: 100 },
  moduleContainer: { marginBottom: Spacing.md },
  moduleHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    padding: Spacing.lg, borderRadius: BorderRadius.lg, ...Shadow.sm,
  },
  moduleIdx: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  moduleIdxText: { fontSize: FontSize.md, fontWeight: '800' },
  moduleTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  moduleMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  lessonContainer: { marginLeft: Spacing.xl, marginTop: Spacing.sm },
  lessonHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    padding: Spacing.md, borderRadius: BorderRadius.md, ...Shadow.sm,
  },
  lessonIcon: { width: 28, alignItems: 'center', marginRight: Spacing.sm },
  lessonTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  lessonMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  topicItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md, marginLeft: Spacing.xxl,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  topicDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  topicDotText: { fontSize: FontSize.xs, fontWeight: '700' },
  topicTitle: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
});
