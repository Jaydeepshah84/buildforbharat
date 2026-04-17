import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { useNetwork } from '../../src/hooks/useNetwork';
import { getCoursesByUser } from '../../src/services/database';
import { apiGetCourses, apiGenerateCourseStream, apiEnrollCourse } from '../../src/services/api';
import { isCourseOffline, getDownloadedModuleIds } from '../../src/services/offlineSync';
import { POPULAR_SUBJECTS } from '../../src/data/courseKnowledge';
import { Card, Button, ProgressBar, Badge, EmptyState } from '../../src/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';

export default function CoursesScreen() {
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'online' | 'downloaded'>('online');
  const [serverCourses, setServerCourses] = useState<any[]>([]);
  const [localCourses, setLocalCourses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOnline, setLoadingOnline] = useState(false);

  // Generation state
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [genPercent, setGenPercent] = useState(0);
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState(String(user?.classLevel || 10));
  const [duration, setDuration] = useState('7');
  const [language, setLanguage] = useState(user?.language || 'en');

  const [offlineIds, setOfflineIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!user) return;

    // Always load local courses
    const local = await getCoursesByUser(user.id);
    setLocalCourses(local);
    setOfflineIds(new Set(local.map((c: any) => c.id)));

    // Fetch from server if online
    if (isOnline) {
      setLoadingOnline(true);
      try {
        const courses = await apiGetCourses();
        setServerCourses(courses || []);
      } catch (e) {
        console.log('Failed to fetch online courses');
      } finally {
        setLoadingOnline(false);
      }
    }
  }, [user, isOnline]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!isOnline) setTab('downloaded');
  }, [isOnline]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  async function handleGenerate() {
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    if (!isOnline) {
      Alert.alert('No Internet', 'Course generation requires internet.');
      return;
    }

    setGenerating(true);
    setGenProgress('Starting AI course generation...');
    setGenPercent(5);

    apiGenerateCourseStream(
      {
        subject: subject.trim(),
        classLevel: parseInt(classLevel) || 10,
        duration: parseInt(duration) || 7,
        language,
      },
      (event) => {
        setGenProgress(event.data.message || event.data.status || 'Generating...');
        setGenPercent(prev => Math.min(90, prev + 5));
      },
      async (courseId) => {
        setGenPercent(95);
        setGenProgress('Course created! You can download it for offline access.');
        setGenerating(false);
        setShowGenerate(false);
        setSubject('');
        setGenPercent(0);
        loadData();
        Alert.alert('Course Created!', 'Your course is ready. Open it to download modules.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Open Course', onPress: () => router.push(`/course/${courseId}`) },
        ]);
      },
      (error) => {
        setGenerating(false);
        setGenPercent(0);
        Alert.alert('Error', error);
      }
    );
  }

  const displayCourses = tab === 'online' ? serverCourses : localCourses;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Courses</Text>
        {isOnline && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowGenerate(true)}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'online' && styles.tabActive]}
          onPress={() => isOnline ? setTab('online') : Alert.alert('Offline', 'Connect to internet to browse online courses.')}
        >
          <Ionicons name="globe-outline" size={16} color={tab === 'online' ? Colors.primary : Colors.textTertiary} />
          <Text style={[styles.tabText, tab === 'online' && styles.tabTextActive]}>Online</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'downloaded' && styles.tabActive]}
          onPress={() => setTab('downloaded')}
        >
          <Ionicons name="download-outline" size={16} color={tab === 'downloaded' ? Colors.primary : Colors.textTertiary} />
          <Text style={[styles.tabText, tab === 'downloaded' && styles.tabTextActive]}>
            Downloaded ({localCourses.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Loading */}
        {tab === 'online' && loadingOnline && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ color: Colors.textSecondary, marginTop: 10 }}>Loading courses...</Text>
          </View>
        )}

        {/* Empty states */}
        {!loadingOnline && displayCourses.length === 0 && (
          <EmptyState
            icon={tab === 'online' ? 'globe-outline' : 'download-outline'}
            title={tab === 'online' ? 'No Courses Yet' : 'No Downloads'}
            message={tab === 'online'
              ? (isOnline ? 'Generate your first AI-powered course!' : 'Connect to internet to browse courses.')
              : 'Download courses to access them offline without internet.'}
            action={tab === 'online' && isOnline ? { title: 'Generate Course', onPress: () => setShowGenerate(true) } : undefined}
          />
        )}

        {/* Course cards */}
        {displayCourses.map((course: any) => {
          const courseId = course.id;
          const isDownloaded = offlineIds.has(courseId);
          const color = course.image_color || course.color || Colors.primary;

          return (
            <Card key={courseId} style={styles.courseCard}>
              <TouchableOpacity
                onPress={() => router.push(`/course/${courseId}`)}

                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.courseColorBar, { backgroundColor: color }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                      {isDownloaded && <Ionicons name="cloud-done" size={18} color={Colors.success} />}
                    </View>
                    <View style={styles.metaRow}>
                      <Badge text={course.subject || 'General'} color={color} />
                      <Text style={styles.metaText}>Class {course.class || course.class_level || course.classLevel}</Text>
                      <Text style={styles.metaText}>{course.duration_days || course.duration || 7}d</Text>
                    </View>
                    <ProgressBar
                      progress={course.progress || 0}
                      color={color}
                      showLabel
                      style={{ marginTop: Spacing.sm }}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Action bar */}
              <View style={styles.cardActions}>
                {isDownloaded ? (
                  <View style={styles.downloadedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <Text style={styles.downloadedText}>Modules available offline</Text>
                  </View>
                ) : (
                  <View style={styles.downloadedBadge}>
                    <Ionicons name="arrow-forward-circle" size={14} color={Colors.primary} />
                    <Text style={[styles.downloadedText, { color: Colors.primary }]}>Open to download modules</Text>
                  </View>
                )}
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {/* Generate Course Modal */}
      <Modal visible={showGenerate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate New Course</Text>
              <TouchableOpacity onPress={() => !generating && setShowGenerate(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {generating ? (
              <View style={styles.genProgress}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.genProgressTitle}>AI is creating your course...</Text>
                <Text style={styles.genProgressMsg}>{genProgress}</Text>
                <ProgressBar progress={genPercent} color={Colors.primary} style={{ width: '100%', marginTop: Spacing.lg }} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Subject</Text>
                <View style={styles.subjectGrid}>
                  {POPULAR_SUBJECTS.map(s => (
                    <TouchableOpacity
                      key={s.name}
                      style={[styles.subjectChip, subject === s.name && { backgroundColor: s.color + '20', borderColor: s.color }]}
                      onPress={() => setSubject(s.name)}
                    >
                      <Ionicons name={s.icon as any} size={16} color={subject === s.name ? s.color : Colors.textSecondary} />
                      <Text style={[styles.subjectChipText, subject === s.name && { color: s.color }]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.customInput}
                  placeholder="Or type any subject..."
                  placeholderTextColor={Colors.textTertiary}
                  value={subject}
                  onChangeText={setSubject}
                />

                <Text style={styles.fieldLabel}>Class Level</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(level => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setClassLevel(String(level))}
                      style={[styles.chip, parseInt(classLevel) === level && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, parseInt(classLevel) === level && { color: '#FFF' }]}>{level}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.fieldLabel}>Duration (days)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
                  {[3, 7, 14, 21, 30, 60, 90].map(d => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setDuration(String(d))}
                      style={[styles.chip, { width: 52 }, parseInt(duration) === d && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, parseInt(duration) === d && { color: '#FFF' }]}>{d}d</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.fieldLabel}>Language</Text>
                <View style={styles.langRow}>
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'hi', label: 'Hindi' },
                    { code: 'gu', label: 'Gujarati' },
                    { code: 'es', label: 'Spanish' },
                  ].map(l => (
                    <TouchableOpacity
                      key={l.code}
                      onPress={() => setLanguage(l.code)}
                      style={[styles.langChip, language === l.code && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, language === l.code && { color: '#FFF' }]}>{l.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button
                  title="Generate Course"
                  onPress={handleGenerate}
                  icon="sparkles"
                  fullWidth
                  size="lg"
                  style={{ marginTop: Spacing.lg, marginBottom: Spacing.xxl }}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row', marginHorizontal: Spacing.xxl, marginBottom: Spacing.lg,
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: BorderRadius.sm,
  },
  tabActive: { backgroundColor: Colors.surface },
  tabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textTertiary },
  tabTextActive: { color: Colors.primary },
  list: { paddingHorizontal: Spacing.xxl, paddingBottom: 100 },
  courseCard: { marginBottom: Spacing.lg },
  cardTop: { flexDirection: 'row' },
  courseColorBar: { width: 4, borderRadius: 2, marginRight: Spacing.md },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  courseTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  metaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  cardActions: {
    borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.md, marginTop: Spacing.md,
  },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 6,
  },
  downloadBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  downloadedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  downloadedText: { fontSize: FontSize.sm, color: Colors.success, fontWeight: '600' },
  downloadingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  downloadingText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  downloadingPercent: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingVertical: 10, borderRadius: BorderRadius.md,
  },
  openBtnText: { fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xxl, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  subjectChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceAlt, gap: 5,
  },
  subjectChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  customInput: {
    borderWidth: 1.5, borderColor: Colors.borderLight, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 12, fontSize: FontSize.md,
    color: Colors.text, marginBottom: Spacing.lg, backgroundColor: Colors.surfaceAlt,
  },
  chip: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  langRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  langChip: {
    flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  genProgress: { alignItems: 'center', paddingVertical: 40 },
  genProgressTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginTop: Spacing.lg },
  genProgressMsg: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
});
