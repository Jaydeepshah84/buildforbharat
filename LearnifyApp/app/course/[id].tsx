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
import { apiGetCourseDetail } from '../../src/services/api';
import { getFullCourseTree } from '../../src/services/database';
import {
  downloadModuleForOffline, getDownloadedModuleIds,
  removeModuleOffline, isCourseOffline,
} from '../../src/services/offlineSync';
import { getSubjectColor } from '../../src/data/courseKnowledge';
import { Card, ProgressBar, Badge, Button } from '../../src/components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [downloadedModules, setDownloadedModules] = useState<Set<string>>(new Set());
  const [downloadingModule, setDownloadingModule] = useState<string | null>(null);
  const [dlProgress, setDlProgress] = useState('');
  const [dlPercent, setDlPercent] = useState(0);
  const [source, setSource] = useState<'api' | 'local'>('api');

  const loadCourse = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    // Check which modules are downloaded
    const dlIds = await getDownloadedModuleIds(id);
    setDownloadedModules(dlIds);

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
      } catch {}
    }

    // Fallback to local
    const hasLocal = await isCourseOffline(id);
    if (hasLocal) {
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

  async function handleDownloadModule(moduleId: string, moduleTitle: string) {
    if (!user || !id) return;
    setDownloadingModule(moduleId);
    setDlProgress('Starting...');
    setDlPercent(0);

    const success = await downloadModuleForOffline(id, moduleId, user.id, (p) => {
      setDlProgress(p.message);
      setDlPercent(p.percent);
      if (p.status === 'error') {
        Alert.alert('Download Failed', p.message);
      }
    });

    setDownloadingModule(null);
    if (success) {
      const dlIds = await getDownloadedModuleIds(id);
      setDownloadedModules(dlIds);
    }
  }

  async function handleRemoveModule(moduleId: string, moduleTitle: string) {
    Alert.alert('Remove Download', `Remove "${moduleTitle}" from offline?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await removeModuleOffline(moduleId);
          const dlIds = await getDownloadedModuleIds(id!);
          setDownloadedModules(dlIds);
        }
      },
    ]);
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
    const isDownloaded = downloadedModules.has(lesson.module_id);
    if (!isOnline && !isDownloaded) {
      Alert.alert('Offline', 'Download this module to watch videos offline.');
      return;
    }
    // Go directly to video player
    router.push(`/player/${topic.id}?courseId=${id}`);
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
          {isOnline ? 'Could not load this course.' : 'Connect to internet or download modules first.'}
        </Text>
      </View>
    );
  }

  const modules = course.modules || [];
  let totalTopics = course.total_topics || 0;
  if (totalTopics === 0) {
    for (const m of modules) for (const l of m.lessons || []) totalTopics += (l.topics || []).length;
  }
  let completedTopics = course.completed_topics || 0;
  if (completedTopics === 0) {
    for (const m of modules) for (const l of m.lessons || []) completedTopics += (l.topics || []).filter((t: any) => t.is_completed).length;
  }
  const progress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
  const color = course.image_color || getSubjectColor(course.subject || '');
  const downloadedCount = downloadedModules.size;

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
      </View>

      {/* Progress */}
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
          <Text style={styles.metaText}>Class {course.class || course.class_level}</Text>
          <Text style={styles.metaText}>{course.duration_days || course.duration || 7}d</Text>
        </View>
        {downloadedCount > 0 && (
          <View style={styles.dlSummary}>
            <Ionicons name="cloud-done" size={14} color={Colors.success} />
            <Text style={styles.dlSummaryText}>{downloadedCount}/{modules.length} modules offline</Text>
          </View>
        )}
      </Card>

      {/* Module List */}
      <ScrollView contentContainerStyle={styles.modulesList}>
        {modules.map((mod: any, mi: number) => {
          const isExpanded = expandedModules.has(mod.id);
          const lessons = mod.lessons || [];
          const modTopics = lessons.reduce((s: number, l: any) => s + (l.topics || []).length, 0);
          const modDone = lessons.reduce((s: number, l: any) =>
            s + (l.topics || []).filter((t: any) => t.is_completed).length, 0);
          const isDownloaded = downloadedModules.has(mod.id);
          const isDownloading = downloadingModule === mod.id;

          return (
            <View key={mod.id} style={styles.moduleContainer}>
              {/* Module Header */}
              <TouchableOpacity style={styles.moduleHeader} onPress={() => toggleModule(mod.id)} activeOpacity={0.7}>
                <View style={[styles.moduleIdx, { backgroundColor: color + '15' }]}>
                  <Text style={[styles.moduleIdxText, { color }]}>{mi + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.moduleTitle} numberOfLines={1}>{mod.title}</Text>
                    {isDownloaded && <Ionicons name="cloud-done" size={14} color={Colors.success} />}
                  </View>
                  <Text style={styles.moduleMeta}>{modDone}/{modTopics} topics - {lessons.length} lessons</Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>

              {/* Download/Remove Button for Module */}
              {isExpanded && (
                <View style={styles.moduleActions}>
                  {isDownloading ? (
                    <View style={styles.downloadingBar}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.downloadingText}>{dlProgress}</Text>
                      <Text style={styles.downloadingPct}>{dlPercent}%</Text>
                    </View>
                  ) : isDownloaded ? (
                    <View style={styles.moduleActionRow}>
                      <View style={styles.offlineBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                        <Text style={styles.offlineBadgeText}>Available Offline</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveModule(mod.id, mod.title)}>
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : isOnline ? (
                    <TouchableOpacity
                      style={styles.downloadModuleBtn}
                      onPress={() => handleDownloadModule(mod.id, mod.title)}
                    >
                      <Ionicons name="download-outline" size={16} color={Colors.primary} />
                      <Text style={styles.downloadModuleBtnText}>Download Module</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.offlineHint}>Connect to internet to download</Text>
                  )}
                </View>
              )}

              {/* Lessons */}
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

                    {isLessonExpanded && topics.map((topic: any, ti: number) => {
                      const topicTitle = typeof topic === 'string' ? topic : topic.title;
                      const topicId = typeof topic === 'string' ? `${lesson.id}-${ti}` : topic.id;
                      const isCompleted = typeof topic === 'object' && topic.is_completed;

                      return (
                        <TouchableOpacity
                          key={topicId}
                          style={styles.topicItem}
                          onPress={() => handleTopicPress(
                            typeof topic === 'string' ? { id: topicId, title: topic } : topic,
                            { ...lesson, module_id: mod.id }
                          )}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.topicDot, {
                            backgroundColor: isCompleted ? Colors.success :
                              lesson.is_locked ? Colors.textTertiary + '30' : Colors.primary + '30',
                          }]}>
                            {isCompleted ? (
                              <Ionicons name="checkmark" size={12} color="#FFF" />
                            ) : (
                              <Text style={[styles.topicDotText, {
                                color: lesson.is_locked ? Colors.textTertiary : Colors.primary
                              }]}>{ti + 1}</Text>
                            )}
                          </View>
                          <Text style={[styles.topicTitle, lesson.is_locked && { color: Colors.textTertiary }]} numberOfLines={2}>
                            {topicTitle}
                          </Text>
                          {!lesson.is_locked && !isCompleted && (
                            <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
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
  progressCard: { marginHorizontal: Spacing.xxl, marginBottom: Spacing.lg },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  progressPercent: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  progressMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sm, flexWrap: 'wrap' },
  metaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  dlSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm,
  },
  dlSummaryText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  modulesList: { paddingHorizontal: Spacing.xxl, paddingBottom: 100 },
  moduleContainer: { marginBottom: Spacing.md },
  moduleHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    padding: Spacing.lg, borderRadius: BorderRadius.lg, ...Shadow.sm,
  },
  moduleIdx: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  moduleIdxText: { fontSize: FontSize.md, fontWeight: '800' },
  moduleTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flex: 1 },
  moduleMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  moduleActions: {
    marginLeft: Spacing.xl, marginTop: Spacing.xs, marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  moduleActionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  downloadModuleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary + '10', paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  downloadModuleBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  downloadingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  downloadingText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  downloadingPct: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  offlineBadgeText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  offlineHint: { fontSize: FontSize.xs, color: Colors.textTertiary, fontStyle: 'italic' },
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
  topicDot: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  topicDotText: { fontSize: FontSize.xs, fontWeight: '700' },
  topicTitle: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
});
