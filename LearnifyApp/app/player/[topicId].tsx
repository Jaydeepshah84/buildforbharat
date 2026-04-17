import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import {
  getDatabase, markTopicComplete, updateCourseProgress, getTopicsByLesson,
} from '../../src/services/database';
import { apiMarkTopicComplete } from '../../src/services/api';
import {
  hasLocalAnimation, getLocalAnimation, generateAndSaveAnimation,
  hasSceneAudio, getSceneAudioPath, AnimationScene,
} from '../../src/services/animationService';
import { useNetwork } from '../../src/hooks/useNetwork';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';

const { width: SW, height: SH } = Dimensions.get('window');

export default function VideoPlayerScreen() {
  const { topicId, courseId } = useLocalSearchParams<{ topicId: string; courseId: string }>();
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const [scenes, setScenes] = useState<AnimationScene[]>([]);
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Loading...');
  const [topicTitle, setTopicTitle] = useState('');
  const [completed, setCompleted] = useState(false);
  const [nextTopic, setNextTopic] = useState<any>(null);
  const [prevTopic, setPrevTopic] = useState<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const elemFades = useRef<Animated.Value[]>([]);

  const loadAnimation = useCallback(async () => {
    if (!topicId) return;
    setLoading(true);

    // Get topic info
    const db = await getDatabase();
    const topic: any = await db.getFirstAsync('SELECT * FROM topics WHERE id = ?', [topicId]);
    const title = topic?.title || 'Topic';
    setTopicTitle(title);
    setCompleted(!!topic?.is_completed);

    // Get adjacent topics
    if (topic?.lesson_id) {
      const allTopics = await getTopicsByLesson(topic.lesson_id);
      const idx = allTopics.findIndex((t: any) => t.id === topicId);
      setPrevTopic(idx > 0 ? allTopics[idx - 1] : null);
      setNextTopic(idx < allTopics.length - 1 ? allTopics[idx + 1] : null);
    }

    // Check for local animation
    if (hasLocalAnimation(topicId)) {
      const anim = await getLocalAnimation(topicId);
      if (anim && anim.scenes.length > 0) {
        setScenes(anim.scenes);
        setLoading(false);
        return;
      }
    }

    // Generate if online
    if (isOnline) {
      setLoadingMsg('AI is creating your video...');
      const anim = await generateAndSaveAnimation(topicId, title, 'en', (msg, pct) => {
        setLoadingMsg(msg);
      });
      if (anim && anim.scenes.length > 0) {
        setScenes(anim.scenes);
      } else {
        setScenes([]);
      }
    }

    setLoading(false);
  }, [topicId, isOnline]);

  useEffect(() => { loadAnimation(); }, [loadAnimation]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  // Reset element animations when scene changes
  useEffect(() => {
    if (scenes.length > 0 && scenes[currentScene]) {
      const elCount = scenes[currentScene].animationData?.svgElements?.length || 0;
      elemFades.current = Array.from({ length: elCount }, () => new Animated.Value(0));
    }
  }, [currentScene, scenes]);

  async function stopPlayback() {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);
  }

  async function handleMarkComplete() {
    if (!topicId || !courseId || completed) return;
    try {
      await markTopicComplete(topicId);
      setCompleted(true);
      if (isOnline) {
        apiMarkTopicComplete(courseId, topicId).catch(() => {});
      }
      // Update course progress
      const db = await getDatabase();
      const totalRow: any = await db.getFirstAsync(
        `SELECT COUNT(*) as total FROM topics t JOIN lessons l ON t.lesson_id = l.id JOIN modules m ON l.module_id = m.id WHERE m.course_id = ?`, [courseId]
      );
      const doneRow: any = await db.getFirstAsync(
        `SELECT COUNT(*) as done FROM topics t JOIN lessons l ON t.lesson_id = l.id JOIN modules m ON l.module_id = m.id WHERE m.course_id = ? AND t.is_completed = 1`, [courseId]
      );
      await updateCourseProgress(courseId, doneRow?.done || 0, totalRow?.total || 1);
    } catch {}
  }

  function navigateToTopic(t: any) {
    stopPlayback();
    router.replace(`/player/${t.id}?courseId=${courseId}`);
  }

  async function playScene(index: number) {
    if (index >= scenes.length) {
      setIsPlaying(false);
      // Auto-mark complete when all scenes watched
      handleMarkComplete();
      return;
    }

    await stopPlayback();
    setCurrentScene(index);
    setIsPlaying(true);

    // Animate scene transition
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Animate elements appearing one by one
    const scene = scenes[index];
    const elCount = scene.animationData?.svgElements?.length || 0;
    elemFades.current = Array.from({ length: elCount }, () => new Animated.Value(0));

    for (let i = 0; i < elCount; i++) {
      setTimeout(() => {
        if (elemFades.current[i]) {
          Animated.timing(elemFades.current[i], {
            toValue: 1, duration: 400, useNativeDriver: true,
          }).start();
        }
      }, 300 + i * 500);
    }

    // Play scene audio
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      if (hasSceneAudio(topicId!, index)) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: getSceneAudioPath(topicId!, index) },
          { shouldPlay: true }
        );
        soundRef.current = sound;

        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            // Auto-advance to next scene
            timerRef.current = setTimeout(() => {
              playScene(index + 1);
            }, 800);
          }
        });
      } else {
        // No audio — auto-advance after duration
        const dur = (scene.duration || 5) * 1000;
        timerRef.current = setTimeout(() => playScene(index + 1), dur);
      }
    } catch {
      const dur = (scene.duration || 5) * 1000;
      timerRef.current = setTimeout(() => playScene(index + 1), dur);
    }
  }

  function togglePlayback() {
    if (isPlaying) {
      stopPlayback();
    } else {
      playScene(currentScene);
    }
  }

  function goToScene(index: number) {
    if (index >= 0 && index < scenes.length) {
      if (isPlaying) {
        playScene(index);
      } else {
        setCurrentScene(index);
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      }
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
        </View>
      </View>
    );
  }

  if (scenes.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.loadingCenter}>
          <Ionicons name="videocam-off" size={48} color={Colors.textTertiary} />
          <Text style={styles.loadingText}>No video available</Text>
          <Text style={styles.subText}>
            {isOnline ? 'Failed to generate. Try again.' : 'Download module to get video lessons.'}
          </Text>
        </View>
      </View>
    );
  }

  const scene = scenes[currentScene];
  const elements = scene?.animationData?.svgElements || [];
  const arrows = scene?.animationData?.arrows || [];
  const bg = scene?.background || scene?.animationData?.background || '#1a1a2e';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stopPlayback(); router.back(); }}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{topicTitle}</Text>
        <Text style={styles.sceneCount}>{currentScene + 1}/{scenes.length}</Text>
      </View>

      {/* Visual Stage */}
      <Animated.View style={[styles.stage, { opacity: fadeAnim, backgroundColor: bg }]}>
        {/* Scene Title */}
        <Text style={styles.sceneTitle}>{scene.title}</Text>

        {/* SVG Elements rendered as RN Views */}
        <View style={styles.canvas}>
          {elements.map((el: any, i: number) => {
            const attrs = el.attrs || {};
            const opacity = elemFades.current[i] || new Animated.Value(1);

            if (el.tag === 'circle') {
              const size = (attrs.r || 30) * 2 * (SW / 600);
              return (
                <Animated.View
                  key={i}
                  style={[styles.svgElement, {
                    opacity,
                    left: (attrs.cx || 0) * (SW / 600) - size / 2,
                    top: (attrs.cy || 0) * (SW / 600) - size / 2,
                    width: size, height: size, borderRadius: size / 2,
                    backgroundColor: attrs.fill || Colors.primary,
                  }]}
                >
                  {el.label ? <Text style={styles.elLabel}>{el.label}</Text> : null}
                </Animated.View>
              );
            }

            if (el.tag === 'rect') {
              const w = (attrs.width || 80) * (SW / 600);
              const h = (attrs.height || 50) * (SW / 600);
              return (
                <Animated.View
                  key={i}
                  style={[styles.svgElement, {
                    opacity,
                    left: (attrs.x || 0) * (SW / 600),
                    top: (attrs.y || 0) * (SW / 600),
                    width: w, height: h, borderRadius: 8,
                    backgroundColor: attrs.fill || Colors.accent,
                  }]}
                >
                  {el.label ? <Text style={styles.elLabel}>{el.label}</Text> : null}
                </Animated.View>
              );
            }

            if (el.tag === 'text') {
              return (
                <Animated.View
                  key={i}
                  style={[styles.svgTextElement, {
                    opacity,
                    left: (attrs.x || 0) * (SW / 600),
                    top: (attrs.y || 0) * (SW / 600),
                  }]}
                >
                  <Text style={[styles.svgText, { color: attrs.fill || '#FFF' }]}>
                    {el.label || attrs.text || ''}
                  </Text>
                </Animated.View>
              );
            }

            // Generic shape
            return (
              <Animated.View
                key={i}
                style={[styles.svgElement, {
                  opacity,
                  left: (attrs.x || attrs.cx || 100) * (SW / 600),
                  top: (attrs.y || attrs.cy || 100) * (SW / 600),
                  width: 60, height: 60, borderRadius: 8,
                  backgroundColor: attrs.fill || '#FCD34D',
                }]}
              >
                {el.label ? <Text style={styles.elLabel}>{el.label}</Text> : null}
              </Animated.View>
            );
          })}

          {/* Arrows */}
          {arrows.map((arrow: any, i: number) => {
            if (!arrow.from || !arrow.to) return null;
            const scale = SW / 600;
            return (
              <View key={`arrow-${i}`} style={[styles.arrowLabel, {
                left: ((arrow.from[0] + arrow.to[0]) / 2) * scale - 30,
                top: ((arrow.from[1] + arrow.to[1]) / 2) * scale - 10,
              }]}>
                <Text style={[styles.arrowText, { color: arrow.color || '#F59E0B' }]}>
                  {arrow.label || '→'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* On-screen text */}
        {scene.on_screen_text ? (
          <View style={styles.onScreenText}>
            <Text style={styles.onScreenTextContent}>{scene.on_screen_text}</Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Narration Subtitle */}
      <View style={styles.subtitle}>
        <Text style={styles.subtitleText}>{scene.narration || ''}</Text>
      </View>

      {/* Scene Dots */}
      <View style={styles.dots}>
        {scenes.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToScene(i)}>
            <View style={[styles.dot, i === currentScene && styles.dotActive, i < currentScene && styles.dotDone]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity onPress={() => goToScene(currentScene - 1)} disabled={currentScene === 0}
          style={currentScene === 0 ? { opacity: 0.3 } : undefined}>
          <Ionicons name="play-skip-back" size={28} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => goToScene(0)}>
          <Ionicons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.playBtn} onPress={togglePlayback}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color={Colors.dark} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => goToScene(scenes.length - 1)}>
          <Ionicons name="arrow-forward" size={24} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => goToScene(currentScene + 1)} disabled={currentScene === scenes.length - 1}
          style={currentScene === scenes.length - 1 ? { opacity: 0.3 } : undefined}>
          <Ionicons name="play-skip-forward" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Next/Prev Topic + Complete */}
      <View style={[styles.topicNav, { paddingBottom: insets.bottom + 6 }]}>
        {prevTopic ? (
          <TouchableOpacity style={styles.topicNavBtn} onPress={() => navigateToTopic(prevTopic)}>
            <Ionicons name="arrow-back" size={14} color={Colors.primaryLight} />
            <Text style={styles.topicNavText}>Prev Topic</Text>
          </TouchableOpacity>
        ) : <View />}

        {completed ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.completedText}>Done</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.markDoneBtn} onPress={handleMarkComplete}>
            <Ionicons name="checkmark" size={14} color="#FFF" />
            <Text style={styles.markDoneText}>Mark Done</Text>
          </TouchableOpacity>
        )}

        {nextTopic ? (
          <TouchableOpacity style={styles.topicNavBtn} onPress={() => navigateToTopic(nextTopic)}>
            <Text style={styles.topicNavText}>Next Topic</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primaryLight} />
          </TouchableOpacity>
        ) : <View />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: FontSize.md, color: '#AAA', marginTop: Spacing.lg },
  subText: { fontSize: FontSize.sm, color: '#666', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  closeBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 8 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.sm,
  },
  headerTitle: { fontSize: FontSize.md, fontWeight: '600', color: '#FFF', flex: 1, textAlign: 'center', marginHorizontal: 10 },
  sceneCount: { fontSize: FontSize.sm, color: Colors.primaryLight, fontWeight: '600' },
  stage: {
    flex: 1, marginHorizontal: Spacing.md, borderRadius: BorderRadius.xl,
    overflow: 'hidden', position: 'relative',
  },
  sceneTitle: {
    fontSize: FontSize.lg, fontWeight: '800', color: '#333',
    textAlign: 'center', paddingTop: Spacing.lg, paddingHorizontal: Spacing.md,
  },
  canvas: {
    flex: 1, position: 'relative',
  },
  svgElement: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  elLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: '#FFF', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 2,
  },
  svgTextElement: { position: 'absolute' },
  svgText: { fontSize: FontSize.md, fontWeight: '700' },
  arrowLabel: { position: 'absolute' },
  arrowText: { fontSize: FontSize.sm, fontWeight: '700', textAlign: 'center' },
  onScreenText: {
    position: 'absolute', bottom: Spacing.lg, left: Spacing.lg, right: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  onScreenTextContent: { fontSize: FontSize.md, color: '#FFF', textAlign: 'center', fontWeight: '600' },
  subtitle: {
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md,
    minHeight: 60,
  },
  subtitleText: { fontSize: FontSize.md, color: '#CCC', textAlign: 'center', lineHeight: 24 },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: Colors.primary, width: 20 },
  dotDone: { backgroundColor: Colors.success },
  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xxl, paddingTop: Spacing.md,
    backgroundColor: '#16162A', borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xxl,
  },
  playBtn: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  topicNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xxl, backgroundColor: '#16162A',
  },
  topicNavBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm,
  },
  topicNavText: { fontSize: FontSize.xs, color: Colors.primaryLight, fontWeight: '600' },
  completedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  completedText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '700' },
  markDoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  markDoneText: { fontSize: FontSize.xs, color: '#FFF', fontWeight: '600' },
});
