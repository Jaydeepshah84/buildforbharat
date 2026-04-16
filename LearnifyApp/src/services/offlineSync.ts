import { randomUUID } from 'expo-crypto';
import { apiGetCourseDetail, apiGetCourseProgress, checkServerConnection } from './api';
import {
  insertCourse, insertModule, insertLesson, insertTopic,
  insertTopicContent, getCourseById, getModulesByCourse,
  updateCourseProgress, getFullCourseTree, deleteCourse,
  getDatabase,
} from './database';
import { getSubjectColor } from '../data/courseKnowledge';

export type DownloadStatus = 'idle' | 'downloading' | 'complete' | 'error';

export interface DownloadProgress {
  status: DownloadStatus;
  message: string;
  percent: number;
  courseId?: string;
}

// Download a course from the backend and save to local SQLite for offline access
export async function downloadCourseForOffline(
  courseId: string,
  userId: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<boolean> {
  try {
    onProgress?.({ status: 'downloading', message: 'Fetching course from server...', percent: 10 });

    // Check if already fully downloaded
    const existing = await getCourseById(courseId);
    if (existing) {
      const existingModules = await getModulesByCourse(courseId);
      if (existingModules.length > 0) {
        onProgress?.({ status: 'complete', message: 'Already available offline!', percent: 100, courseId });
        return true;
      }
      await deleteCourse(courseId);
    }

    // GET /api/courses/:id → { course: { id, title, subject, class, duration_days, modules: [...] } }
    const data = await apiGetCourseDetail(courseId);
    const course = data.course || data;
    const modules = course.modules || [];

    onProgress?.({ status: 'downloading', message: 'Saving course structure...', percent: 20 });

    // Count total topics
    let totalTopics = 0;
    for (const mod of modules) {
      for (const les of mod.lessons || []) {
        totalTopics += (les.topics || []).length;
      }
    }

    const color = getSubjectColor(course.subject || '');

    // Insert course into SQLite
    await insertCourse({
      id: course.id || courseId,
      userId,
      title: course.title || 'Untitled Course',
      subject: course.subject || 'General',
      classLevel: parseInt(course.class || course.class_level || '10') || 10,
      duration: course.duration_days || course.duration || 7,
      language: course.language || 'en',
      totalTopics,
      imageColor: color,
    });

    // Get lesson lock status from server
    let lessonStatuses: Record<string, { locked: boolean; testPassed: boolean }> = {};
    try {
      const statusData = await import('./api').then(m => m.apiGetLessonStatus(courseId));
      if (statusData?.lessons) {
        for (const ls of statusData.lessons) {
          lessonStatuses[ls.lessonId] = { locked: ls.locked, testPassed: ls.testPassed };
        }
      }
    } catch {}

    // Get completed topics
    let completedTopicIds = new Set<string>();
    try {
      const progressData = await apiGetCourseProgress(courseId);
      if (progressData?.completedTopics) {
        for (const tid of progressData.completedTopics) {
          completedTopicIds.add(tid);
        }
      }
    } catch {}

    // Insert modules → lessons → topics → content
    let processed = 0;

    for (let mi = 0; mi < modules.length; mi++) {
      const mod = modules[mi];
      const moduleId = mod.id || randomUUID();

      await insertModule({
        id: moduleId,
        courseId: course.id || courseId,
        title: mod.title || `Module ${mi + 1}`,
        orderIndex: mod.order_index ?? mi,
      });

      const lessons = mod.lessons || [];
      for (let li = 0; li < lessons.length; li++) {
        const les = lessons[li];
        const lessonId = les.id || randomUUID();
        const status = lessonStatuses[lessonId];

        await insertLesson({
          id: lessonId,
          moduleId,
          title: les.title || `Lesson ${li + 1}`,
          orderIndex: les.order_index ?? li,
          isLocked: status ? status.locked : (mi === 0 && li === 0 ? false : true),
        });

        // If lesson status says passed, update
        if (status?.testPassed) {
          const db = await getDatabase();
          await db.runAsync('UPDATE lessons SET is_passed = 1 WHERE id = ?', [lessonId]);
        }

        const topics = les.topics || [];
        for (let ti = 0; ti < topics.length; ti++) {
          const top = topics[ti];
          const topicId = top.id || randomUUID();

          await insertTopic({
            id: topicId,
            lessonId,
            title: top.title || `Topic ${ti + 1}`,
            orderIndex: top.order_index ?? ti,
          });

          // Mark as completed if server says so
          if (completedTopicIds.has(topicId)) {
            const db = await getDatabase();
            await db.runAsync('UPDATE topics SET is_completed = 1 WHERE id = ?', [topicId]);
          }

          // Save content (from the content table joined in the API response)
          const contentText = top.content?.text_content || top.content?.text || top.text_content || top.content || '';
          if (typeof contentText === 'string' && contentText.length > 0) {
            let keyPoints: string[] = [];
            let examples: string[] = [];

            if (top.content?.key_points) {
              keyPoints = typeof top.content.key_points === 'string'
                ? JSON.parse(top.content.key_points) : top.content.key_points;
            }
            if (top.content?.examples) {
              examples = typeof top.content.examples === 'string'
                ? JSON.parse(top.content.examples) : top.content.examples;
            }

            await insertTopicContent({
              id: randomUUID(),
              topicId,
              text: contentText,
              keyPoints,
              examples,
              language: course.language || 'en',
            });
          }

          processed++;
          const percent = 20 + Math.round((processed / Math.max(totalTopics, 1)) * 75);
          onProgress?.({
            status: 'downloading',
            message: `Saving: ${top.title || 'topic'}`,
            percent,
            courseId: course.id || courseId,
          });
        }
      }
    }

    // Update course progress
    await updateCourseProgress(course.id || courseId, completedTopicIds.size, totalTopics);

    onProgress?.({
      status: 'complete',
      message: 'Course downloaded for offline access!',
      percent: 100,
      courseId: course.id || courseId,
    });

    return true;
  } catch (err: any) {
    onProgress?.({ status: 'error', message: err.message || 'Download failed', percent: 0 });
    return false;
  }
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

export async function getOfflineCourseIds(): Promise<string[]> {
  const db = await getDatabase();
  const rows: any[] = await db.getAllAsync('SELECT id FROM courses');
  return rows.map(r => r.id);
}
