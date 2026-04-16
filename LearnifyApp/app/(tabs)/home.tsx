import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { useNetwork } from '../../src/hooks/useNetwork';
import { apiGetDashboard, apiGetAllProgress } from '../../src/services/api';
import { getCoursesByUser } from '../../src/services/database';
import { Card, StatCard, ProgressBar, SectionHeader, Badge } from '../../src/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<any>(null);
  const [onlineCourses, setOnlineCourses] = useState<any[]>([]);
  const [downloadedCourses, setDownloadedCourses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // Always load downloaded courses from SQLite
      const local = await getCoursesByUser(user.id);
      setDownloadedCourses(local);

      // Fetch online data
      if (isOnline) {
        try {
          const [dashData, progressData] = await Promise.all([
            apiGetDashboard(),
            apiGetAllProgress(),
          ]);
          setDashboard(dashData);
          if (progressData?.courses) {
            setOnlineCourses(progressData.courses);
          }
        } catch (e) {
          console.log('API fetch failed, using local data');
        }
      }
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, isOnline]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const stats = dashboard?.stats || {};
  const recentQuizzes = dashboard?.recentQuizzes || [];

  // Display courses: online if available, otherwise downloaded
  const displayCourses = isOnline && onlineCourses.length > 0 ? onlineCourses : downloadedCourses;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.userName}>{user?.name || 'Student'}</Text>
        </View>
        <View style={styles.headerRight}>
          {!isOnline && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline" size={14} color={Colors.warning} />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.avatarText}>{(user?.name || 'S')[0].toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard
          title="Enrolled"
          value={stats.totalCourses || downloadedCourses.length || 0}
          icon="book-outline"
          color={Colors.primary}
          style={{ marginRight: 10 }}
        />
        <StatCard
          title="Topics Done"
          value={stats.totalTopicsCompleted || 0}
          icon="checkmark-circle-outline"
          color={Colors.success}
          style={{ marginLeft: 10 }}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Avg Progress"
          value={`${Math.round(stats.avgProgress || 0)}%`}
          icon="trending-up-outline"
          color={Colors.accent}
          style={{ marginRight: 10 }}
        />
        <StatCard
          title="Completed"
          value={stats.coursesCompleted || 0}
          icon="trophy-outline"
          color={Colors.warning}
          style={{ marginLeft: 10 }}
        />
      </View>

      {/* Continue Learning (Online courses) */}
      {displayCourses.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title={isOnline ? 'Continue Learning' : 'Downloaded Courses'}
            action={{ text: 'See All', onPress: () => router.push('/(tabs)/courses') }}
          />
          {displayCourses.slice(0, 4).map((course: any) => {
            const title = course.title || course.course_title || 'Untitled';
            const progress = course.progress || 0;
            const color = course.image_color || course.color || Colors.primary;
            const completed = course.completed_topics || 0;
            const total = course.total_topics || course.totalTopics || 0;
            const courseId = course.id || course.course_id;

            return (
              <Card
                key={courseId}
                onPress={() => router.push(`/course/${courseId}`)}
                style={styles.courseCard}
              >
                <View style={styles.courseCardContent}>
                  <View style={[styles.courseIcon, { backgroundColor: color + '20' }]}>
                    <Ionicons name="book" size={24} color={color} />
                  </View>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.courseMeta}>{completed}/{total} topics</Text>
                    <ProgressBar progress={progress} color={color} style={{ marginTop: 6 }} />
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Downloaded for Offline */}
      {isOnline && downloadedCourses.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Available Offline" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {downloadedCourses.slice(0, 5).map((course: any) => (
              <TouchableOpacity
                key={course.id}
                style={styles.offlineCourseChip}
                onPress={() => router.push(`/course/${course.id}`)}
              >
                <Ionicons name="cloud-done" size={16} color={Colors.success} />
                <Text style={styles.offlineCourseText} numberOfLines={1}>{course.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Quizzes */}
      {recentQuizzes.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Recent Quizzes" />
          {recentQuizzes.slice(0, 3).map((quiz: any, i: number) => (
            <Card key={quiz.id || i} style={styles.quizCard}>
              <View style={styles.quizRow}>
                <View style={[styles.quizIcon, {
                  backgroundColor: ((quiz.score || 0) >= 70 ? Colors.success : Colors.warning) + '15'
                }]}>
                  <Ionicons
                    name={(quiz.score || 0) >= 70 ? 'checkmark-circle' : 'alert-circle'}
                    size={22}
                    color={(quiz.score || 0) >= 70 ? Colors.success : Colors.warning}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quizTitle} numberOfLines={1}>{quiz.title || 'Quiz'}</Text>
                  <Text style={styles.quizMeta}>{quiz.total_questions || 0} questions</Text>
                </View>
                <Badge
                  text={`${Math.round(quiz.score || 0)}%`}
                  color={(quiz.score || 0) >= 70 ? Colors.success : Colors.warning}
                  size="md"
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionsGrid}>
          {[
            { icon: 'add-circle', label: 'New Course', color: Colors.primary, route: '/(tabs)/courses' },
            { icon: 'help-circle', label: 'Take Quiz', color: Colors.secondary, route: '/(tabs)/quiz' },
            { icon: 'download', label: 'Downloads', color: Colors.success, route: '/(tabs)/courses' },
            { icon: 'person', label: 'Profile', color: Colors.textSecondary, route: '/(tabs)/profile' },
          ].map((action, i) => (
            <TouchableOpacity
              key={i}
              style={styles.actionItem}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                <Ionicons name={action.icon as any} size={26} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Empty state */}
      {displayCourses.length === 0 && !loading && (
        <Card style={styles.emptyCard}>
          <Ionicons name="school-outline" size={48} color={Colors.primary} />
          <Text style={styles.emptyTitle}>Welcome to Learnify!</Text>
          <Text style={styles.emptyMessage}>
            {isOnline
              ? 'Generate your first AI-powered course and start learning.'
              : 'Connect to the internet to browse courses. Downloaded courses will appear here.'}
          </Text>
          {isOnline && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/courses')}
            >
              <Text style={styles.emptyButtonText}>Create Course</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: FontSize.md, color: Colors.textSecondary },
  userName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.warning + '15', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  offlineText: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: '600' },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.xxl, marginTop: Spacing.md,
  },
  section: { paddingHorizontal: Spacing.xxl, marginTop: Spacing.xxl },
  courseCard: { marginBottom: Spacing.md },
  courseCardContent: { flexDirection: 'row', alignItems: 'center' },
  courseIcon: {
    width: 48, height: 48, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  courseInfo: { flex: 1, marginRight: Spacing.sm },
  courseTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  courseMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  offlineCourseChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.success + '10', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: BorderRadius.full, marginRight: 8, borderWidth: 1, borderColor: Colors.success + '30',
  },
  offlineCourseText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.success, maxWidth: 150 },
  quizCard: { marginBottom: Spacing.sm },
  quizRow: { flexDirection: 'row', alignItems: 'center' },
  quizIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  quizTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  quizMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  actionItem: { width: '22%', alignItems: 'center' },
  actionIcon: {
    width: 52, height: 52, borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  actionLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  emptyCard: {
    marginHorizontal: Spacing.xxl, marginTop: 20, alignItems: 'center', padding: 32,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.lg },
  emptyMessage: {
    fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center',
    marginTop: Spacing.sm, lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: BorderRadius.md,
    marginTop: Spacing.xl, gap: 8,
  },
  emptyButtonText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.md },
});
