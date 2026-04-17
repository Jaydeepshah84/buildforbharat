import 'react-native-get-random-values';
import { randomUUID } from 'expo-crypto';
import {
  apiGetCourseDetail, apiGetCourseContent, apiGetLessonStatus,
} from './api';
import {
  insertCourse, insertModule, insertLesson, insertTopic,
  insertTopicContent, getCourseById, getModulesByCourse,
  updateCourseProgress, deleteCourse, getDatabase,
} from './database';
import { getSubjectColor } from '../data/courseKnowledge';
import { downloadTopicAudio, deleteModuleAudio } from './audioService';
import { generateAndSaveAnimation, deleteTopicAnimation } from './animationService';

export type DownloadStatus = 'idle' | 'downloading' | 'complete' | 'error';

export interface DownloadProgress {
  status: DownloadStatus;
  message: string;
  percent: number;
}

// Download a SINGLE MODULE from a course and save to SQLite
export async function downloadModuleForOffline(
  courseId: string,
  moduleId: string,
  userId: string,
  onProgress?: (p: DownloadProgress) => void
): Promise<boolean> {
  try {
    onProgress?.({ status: 'downloading', message: 'Fetching course data...', percent: 5 });

    // Step 1: Fetch course detail
    const data = await apiGetCourseDetail(courseId);
    const course = data?.course || data;
    if (!course) throw new Error('Course not found');

    const allModules = course.modules || [];
    const targetModule = allModules.find((m: any) => m.id === moduleId);
    if (!targetModule) throw new Error('Module not found');

    onProgress?.({ status: 'downloading', message: `Saving: ${targetModule.title}`, percent: 10 });

    // Step 2: Ensure course row exists in SQLite
    const existingCourse = await getCourseById(courseId);
    if (!existingCourse) {
      let totalTopics = 0;
      for (const m of allModules) {
        for (const l of m.lessons || []) totalTopics += (l.topics || []).length;
      }
      await insertCourse({
        id: course.id,
        userId,
        title: course.title || 'Untitled',
        subject: course.subject || 'General',
        classLevel: parseInt(course.class || '10') || 10,
        duration: course.duration_days || 7,
        language: course.language || 'en',
        totalTopics,
        imageColor: getSubjectColor(course.subject || ''),
      });
    }

    // Step 3: Get lesson lock statuses
    let lessonStatuses: Record<string, { locked: boolean; testPassed: boolean }> = {};
    try {
      const statusData = await apiGetLessonStatus(courseId);
      if (statusData?.lessons) {
        for (const ls of statusData.lessons) {
          lessonStatuses[ls.lessonId] = { locked: ls.locked, testPassed: ls.testPassed };
        }
      }
    } catch {}

    // Step 4: Save module
    await insertModule({
      id: targetModule.id,
      courseId: course.id,
      title: targetModule.title,
      orderIndex: targetModule.order_index ?? allModules.indexOf(targetModule),
    });

    // Step 5: Save lessons and topics
    const lessons = targetModule.lessons || [];
    let totalTopics = 0;
    let processed = 0;
    for (const l of lessons) totalTopics += (l.topics || []).length;

    const topicIds: string[] = [];

    for (let li = 0; li < lessons.length; li++) {
      const les = lessons[li];
      const lessonId = les.id || randomUUID();
      const status = lessonStatuses[lessonId];

      await insertLesson({
        id: lessonId,
        moduleId: targetModule.id,
        title: les.title || `Lesson ${li + 1}`,
        orderIndex: les.order_index ?? li,
        isLocked: status ? status.locked : (li === 0 ? false : true),
      });

      if (status?.testPassed) {
        const db = await getDatabase();
        await db.runAsync('UPDATE lessons SET is_passed = 1 WHERE id = ?', [lessonId]);
      }

      const topics = les.topics || [];
      for (let ti = 0; ti < topics.length; ti++) {
        const top = topics[ti];
        const topicId = typeof top === 'string' ? randomUUID() : (top.id || randomUUID());

        await insertTopic({
          id: topicId,
          lessonId,
          title: typeof top === 'string' ? top : (top.title || `Topic ${ti + 1}`),
          orderIndex: typeof top === 'string' ? ti : (top.order_index ?? ti),
        });

        topicIds.push(topicId);
        processed++;
        const percent = 10 + Math.round((processed / Math.max(totalTopics, 1)) * 50);
        onProgress?.({ status: 'downloading', message: `Saved ${processed}/${totalTopics} topics`, percent });
      }
    }

    // Step 6: Fetch content for this module's topics
    onProgress?.({ status: 'downloading', message: 'Downloading content...', percent: 65 });
    try {
      const contentList = await apiGetCourseContent(courseId);
      const topicIdSet = new Set(topicIds);
      let saved = 0;
      for (const c of contentList) {
        if (c.topic_id && topicIdSet.has(c.topic_id) && c.content_text) {
          try {
            await insertTopicContent({
              id: c.id || randomUUID(),
              topicId: c.topic_id,
              text: c.content_text,
              keyPoints: [],
              examples: [],
              language: c.language || 'en',
            });
            saved++;
          } catch {}
        }
      }
      onProgress?.({ status: 'downloading', message: `Saved ${saved} topic contents`, percent: 70 });

      // Step 7: Generate video animations + voice for each topic
      onProgress?.({ status: 'downloading', message: 'Generating video lessons...', percent: 72 });

      // Get topic titles for animation generation
      const db2 = await getDatabase();
      let videoCount = 0;
      for (let i = 0; i < topicIds.length; i++) {
        const tid = topicIds[i];
        const topicRow: any = await db2.getFirstAsync('SELECT title FROM topics WHERE id = ?', [tid]);
        const title = topicRow?.title || `Topic ${i + 1}`;

        onProgress?.({
          status: 'downloading',
          message: `Creating video ${i + 1}/${topicIds.length}: ${title}`,
          percent: 72 + Math.round((i / topicIds.length) * 25),
        });

        const anim = await generateAndSaveAnimation(tid, title, course?.language || 'en');
        if (anim) videoCount++;
      }
      onProgress?.({ status: 'downloading', message: `${videoCount} video lessons ready`, percent: 98 });
    } catch {
      onProgress?.({ status: 'downloading', message: 'Content will load on demand', percent: 98 });
    }

    onProgress?.({ status: 'complete', message: 'Module downloaded with audio!', percent: 100 });
    return true;
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Unknown error';
    console.error('[Module Download Error]', msg);
    onProgress?.({ status: 'error', message: msg, percent: 0 });
    return false;
  }
}

// Check if a specific module is downloaded
export async function isModuleDownloaded(moduleId: string): Promise<boolean> {
  const db = await getDatabase();
  const mod: any = await db.getFirstAsync('SELECT id FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return false;
  const lessons: any[] = await db.getAllAsync('SELECT id FROM lessons WHERE module_id = ?', [moduleId]);
  return lessons.length > 0;
}

// Get all downloaded module IDs for a course
export async function getDownloadedModuleIds(courseId: string): Promise<Set<string>> {
  const modules = await getModulesByCourse(courseId);
  const ids = new Set<string>();
  for (const m of modules) {
    const db = await getDatabase();
    const lessons: any[] = await db.getAllAsync('SELECT id FROM lessons WHERE module_id = ?', [m.id]);
    if (lessons.length > 0) ids.add(m.id);
  }
  return ids;
}

// Remove a single module from offline (including audio files)
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
  // Delete audio + animation files
  await deleteModuleAudio(allTopicIds);
  for (const tid of allTopicIds) deleteTopicAnimation(tid);
}

// Legacy helpers
export async function isCourseOffline(courseId: string): Promise<boolean> {
  const course = await getCourseById(courseId);
  if (!course) return false;
  const modules = await getModulesByCourse(courseId);
  return modules.length > 0;
}

export async function removeCourseOffline(courseId: string): Promise<void> {
  await deleteCourse(courseId);
}
