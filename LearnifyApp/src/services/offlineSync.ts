import 'react-native-get-random-values';
import { randomUUID } from 'expo-crypto';
import { apiGetCourseDetail, apiGetCourseContent, apiGetLessonStatus } from './api';
import {
  insertCourse, insertModule, insertLesson, insertTopic,
  insertTopicContent, getCourseById, getModulesByCourse,
  updateCourseProgress, deleteCourse, getDatabase,
} from './database';
import { getSubjectColor } from '../data/courseKnowledge';
import { downloadTopicVideo, deleteModuleVideos } from './videoService';

export type DownloadStatus = 'idle' | 'downloading' | 'complete' | 'error';

export interface DownloadProgress {
  status: DownloadStatus;
  message: string;
  percent: number;
}

export async function downloadModuleForOffline(
  courseId: string,
  moduleId: string,
  userId: string,
  onProgress?: (p: DownloadProgress) => void
): Promise<boolean> {
  try {
    onProgress?.({ status: 'downloading', message: 'Fetching course...', percent: 5 });

    // Fetch course detail
    const data = await apiGetCourseDetail(courseId);
    const course = data?.course || data;
    if (!course) throw new Error('Course not found');

    const allModules = course.modules || [];
    const targetModule = allModules.find((m: any) => m.id === moduleId);
    if (!targetModule) throw new Error('Module not found');

    // Ensure course row exists
    const existingCourse = await getCourseById(courseId);
    if (!existingCourse) {
      let totalTopics = 0;
      for (const m of allModules) for (const l of m.lessons || []) totalTopics += (l.topics || []).length;
      await insertCourse({
        id: course.id, userId,
        title: course.title || 'Untitled',
        subject: course.subject || 'General',
        classLevel: parseInt(course.class || '10') || 10,
        duration: course.duration_days || 7,
        language: course.language || 'en',
        totalTopics,
        imageColor: getSubjectColor(course.subject || ''),
      });
    }

    onProgress?.({ status: 'downloading', message: `Saving: ${targetModule.title}`, percent: 10 });

    // Save module structure
    await insertModule({
      id: targetModule.id, courseId: course.id,
      title: targetModule.title,
      orderIndex: targetModule.order_index ?? allModules.indexOf(targetModule),
    });

    // Get lesson statuses
    let lessonStatuses: Record<string, { locked: boolean; testPassed: boolean }> = {};
    try {
      const s = await apiGetLessonStatus(courseId);
      if (s?.lessons) for (const ls of s.lessons) lessonStatuses[ls.lessonId] = { locked: ls.locked, testPassed: ls.testPassed };
    } catch {}

    // Save lessons + topics
    const lessons = targetModule.lessons || [];
    const topicIds: string[] = [];
    const topicTitles: Record<string, string> = {};

    for (let li = 0; li < lessons.length; li++) {
      const les = lessons[li];
      const lessonId = les.id || randomUUID();
      const st = lessonStatuses[lessonId];

      await insertLesson({
        id: lessonId, moduleId: targetModule.id,
        title: les.title || `Lesson ${li + 1}`,
        orderIndex: les.order_index ?? li,
        isLocked: st ? st.locked : (li === 0 ? false : true),
      });

      if (st?.testPassed) {
        const db = await getDatabase();
        await db.runAsync('UPDATE lessons SET is_passed = 1 WHERE id = ?', [lessonId]);
      }

      for (let ti = 0; ti < (les.topics || []).length; ti++) {
        const top = les.topics[ti];
        const topicId = typeof top === 'string' ? randomUUID() : (top.id || randomUUID());
        const title = typeof top === 'string' ? top : (top.title || `Topic ${ti + 1}`);

        await insertTopic({
          id: topicId, lessonId,
          title, orderIndex: typeof top === 'string' ? ti : (top.order_index ?? ti),
        });

        topicIds.push(topicId);
        topicTitles[topicId] = title;
      }
    }

    onProgress?.({ status: 'downloading', message: `Structure saved. Generating videos...`, percent: 15 });

    // Save content (if available)
    try {
      const contentList = await apiGetCourseContent(courseId);
      const topicIdSet = new Set(topicIds);
      for (const c of contentList) {
        if (c.topic_id && topicIdSet.has(c.topic_id) && c.content_text) {
          await insertTopicContent({
            id: c.id || randomUUID(), topicId: c.topic_id,
            text: c.content_text, keyPoints: [], examples: [],
            language: c.language || 'en',
          }).catch(() => {});
        }
      }
    } catch {}

    // Generate + download MP4 videos for each topic
    let videoCount = 0;
    for (let i = 0; i < topicIds.length; i++) {
      const tid = topicIds[i];
      const title = topicTitles[tid] || `Topic ${i + 1}`;

      onProgress?.({
        status: 'downloading',
        message: `Recording video ${i + 1}/${topicIds.length}: ${title}`,
        percent: 15 + Math.round((i / topicIds.length) * 80),
      });

      const ok = await downloadTopicVideo(tid, course.language || 'en', (msg) => {
        onProgress?.({
          status: 'downloading',
          message: `${title}: ${msg}`,
          percent: 15 + Math.round(((i + 0.5) / topicIds.length) * 80),
        });
      });

      if (ok) videoCount++;
    }

    onProgress?.({ status: 'complete', message: `${videoCount} videos ready!`, percent: 100 });
    return true;
  } catch (err: any) {
    console.error('[Download]', err.message);
    onProgress?.({ status: 'error', message: err.message, percent: 0 });
    return false;
  }
}

export async function isModuleDownloaded(moduleId: string): Promise<boolean> {
  const db = await getDatabase();
  const mod: any = await db.getFirstAsync('SELECT id FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return false;
  const lessons: any[] = await db.getAllAsync('SELECT id FROM lessons WHERE module_id = ?', [moduleId]);
  return lessons.length > 0;
}

export async function getDownloadedModuleIds(courseId: string): Promise<Set<string>> {
  const modules = await getModulesByCourse(courseId);
  const ids = new Set<string>();
  const db = await getDatabase();
  for (const m of modules) {
    const lessons: any[] = await db.getAllAsync('SELECT id FROM lessons WHERE module_id = ?', [m.id]);
    if (lessons.length > 0) ids.add(m.id);
  }
  return ids;
}

export async function removeModuleOffline(moduleId: string): Promise<void> {
  const db = await getDatabase();
  const lessons: any[] = await db.getAllAsync('SELECT id FROM lessons WHERE module_id = ?', [moduleId]);
  const allTopicIds: string[] = [];
  for (const les of lessons) {
    const topics: any[] = await db.getAllAsync('SELECT id FROM topics WHERE lesson_id = ?', [les.id]);
    for (const top of topics) {
      allTopicIds.push(top.id);
      await db.runAsync('DELETE FROM topic_content WHERE topic_id = ?', [top.id]);
    }
    await db.runAsync('DELETE FROM topics WHERE lesson_id = ?', [les.id]);
  }
  await db.runAsync('DELETE FROM lessons WHERE module_id = ?', [moduleId]);
  await db.runAsync('DELETE FROM modules WHERE id = ?', [moduleId]);
  deleteModuleVideos(allTopicIds);
}

export async function isCourseOffline(courseId: string): Promise<boolean> {
  const course = await getCourseById(courseId);
  if (!course) return false;
  const modules = await getModulesByCourse(courseId);
  return modules.length > 0;
}

export async function removeCourseOffline(courseId: string): Promise<void> {
  await deleteCourse(courseId);
}
