import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  getDatabase, markTopicComplete, updateCourseProgress, getTopicsByLesson,
} from '../../src/services/database';
import { apiMarkTopicComplete } from '../../src/services/api';
import { hasLocalVideo, getVideoPath, downloadTopicVideo } from '../../src/services/videoService';
import { useNetwork } from '../../src/hooks/useNetwork';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';

export default function VideoPlayerScreen() {
  const { topicId, courseId } = useLocalSearchParams<{ topicId: string; courseId: string }>();
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const [topicTitle, setTopicTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Loading...');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [nextTopic, setNextTopic] = useState<any>(null);
  const [prevTopic, setPrevTopic] = useState<any>(null);
  const [error, setError] = useState('');

  const player = useVideoPlayer(videoUri || '', (p) => {
    p.loop = false;
  });

  const loadVideo = useCallback(async () => {
    if (!topicId) return;
    setLoading(true);
    setError('');

    // Get topic info
    const db = await getDatabase();
    const topic: any = await db.getFirstAsync('SELECT * FROM topics WHERE id = ?', [topicId]);
    setTopicTitle(topic?.title || 'Topic');
    setCompleted(!!topic?.is_completed);

    // Get adjacent topics
    if (topic?.lesson_id) {
      const allTopics = await getTopicsByLesson(topic.lesson_id);
      const idx = allTopics.findIndex((t: any) => t.id === topicId);
      setPrevTopic(idx > 0 ? allTopics[idx - 1] : null);
      setNextTopic(idx < allTopics.length - 1 ? allTopics[idx + 1] : null);
    }

    // Check for local video
    if (hasLocalVideo(topicId)) {
      setVideoUri(getVideoPath(topicId));
      setLoading(false);
      return;
    }

    // Generate online if not available
    if (isOnline) {
      setLoadingMsg('AI is recording your video lesson...');
      const ok = await downloadTopicVideo(topicId, 'en', (msg) => setLoadingMsg(msg));
      if (ok && hasLocalVideo(topicId)) {
        setVideoUri(getVideoPath(topicId));
      } else {
        setError('Failed to generate video. Try again.');
      }
    } else {
      setError('Video not downloaded. Connect to internet to generate.');
    }

    setLoading(false);
  }, [topicId, isOnline]);

  useEffect(() => { loadVideo(); }, [loadVideo]);

  async function handleMarkComplete() {
    if (!topicId || !courseId || completed) return;
    try {
      await markTopicComplete(topicId);
      setCompleted(true);
      if (isOnline) apiMarkTopicComplete(courseId, topicId).catch(() => {});
      const db = await getDatabase();
      const total: any = await db.getFirstAsync(
        `SELECT COUNT(*) as c FROM topics t JOIN lessons l ON t.lesson_id=l.id JOIN modules m ON l.module_id=m.id WHERE m.course_id=?`, [courseId]
      );
      const done: any = await db.getFirstAsync(
        `SELECT COUNT(*) as c FROM topics t JOIN lessons l ON t.lesson_id=l.id JOIN modules m ON l.module_id=m.id WHERE m.course_id=? AND t.is_completed=1`, [courseId]
      );
      await updateCourseProgress(courseId!, done?.c || 0, total?.c || 1);
    } catch {}
  }

  function navigateToTopic(t: any) {
    player.pause();
    router.replace(`/player/${t.id}?courseId=${courseId}`);
  }

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
          <Text style={styles.subText}>This may take a minute...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !videoUri) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.center}>
          <Ionicons name="videocam-off" size={48} color={Colors.textTertiary} />
          <Text style={styles.loadingText}>{error || 'Video not available'}</Text>
          {isOnline && (
            <TouchableOpacity style={styles.retryBtn} onPress={loadVideo}>
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { player.pause(); router.back(); }}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{topicTitle}</Text>
        {completed && <Ionicons name="checkmark-circle" size={22} color={Colors.success} />}
      </View>

      {/* Video Player */}
      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={true}
        />
      </View>

      {/* Bottom Controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        {/* Nav row */}
        <View style={styles.navRow}>
          {prevTopic ? (
            <TouchableOpacity style={styles.navBtn} onPress={() => navigateToTopic(prevTopic)}>
              <Ionicons name="play-skip-back" size={20} color="#FFF" />
              <Text style={styles.navText}>Previous</Text>
            </TouchableOpacity>
          ) : <View />}

          {completed ? (
            <View style={styles.doneBadge}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.doneText}>Completed</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.markDoneBtn} onPress={handleMarkComplete}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
              <Text style={styles.markDoneText}>Mark Complete</Text>
            </TouchableOpacity>
          )}

          {nextTopic ? (
            <TouchableOpacity style={styles.navBtn} onPress={() => navigateToTopic(nextTopic)}>
              <Text style={styles.navText}>Next</Text>
              <Ionicons name="play-skip-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : <View />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  closeBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 8 },
  loadingText: { fontSize: FontSize.md, color: '#AAA', marginTop: 16, textAlign: 'center' },
  subText: { fontSize: FontSize.sm, color: '#666', marginTop: 4 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20,
    backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: '#FFF', fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: '#FFF', flex: 1 },
  videoContainer: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1, width: '100%' },
  bottomBar: {
    backgroundColor: '#111', paddingTop: Spacing.md, paddingHorizontal: Spacing.xxl,
  },
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  navText: { fontSize: FontSize.sm, color: '#FFF', fontWeight: '600' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneText: { fontSize: FontSize.sm, color: Colors.success, fontWeight: '700' },
  markDoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  markDoneText: { fontSize: FontSize.sm, color: '#FFF', fontWeight: '600' },
});
