// Offline quiz generation from cached course content
// Courses are generated online and downloaded for offline access

export function generateQuizFromContent(
  topicTitle: string,
  content: string,
  keyPoints: string[],
  count: number = 5
): {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}[] {
  const questions: any[] = [];

  // Generate questions from key points
  keyPoints.forEach((point, idx) => {
    if (questions.length >= count) return;

    questions.push({
      question: `Which of the following is correct about "${topicTitle}"?`,
      options: [
        point,
        `${topicTitle} is not related to this concept`,
        `This topic has no practical applications`,
        `None of the above`,
      ],
      correctIndex: 0,
      explanation: `Correct! ${point}`,
    });
  });

  // True/false from content
  if (questions.length < count && keyPoints.length > 0) {
    questions.push({
      question: `True or False: ${keyPoints[0]}`,
      options: ['True', 'False', 'Partially True', 'Cannot be determined'],
      correctIndex: 0,
      explanation: `This statement is True. ${keyPoints[0]}`,
    });
  }

  // Topic identification
  if (questions.length < count) {
    questions.push({
      question: `What is the main topic being discussed here?`,
      options: [topicTitle, `Advanced ${topicTitle}`, `History of Science`, `General Knowledge`],
      correctIndex: 0,
      explanation: `The topic is "${topicTitle}".`,
    });
  }

  return questions.slice(0, count);
}

// Generate a simple study plan from locally cached courses
export function generateStudyPlan(
  courses: { id: string; title: string; progress: number }[],
  daysCount: number = 7
): { day: number; date: string; tasks: { title: string; type: string; duration: string; completed: boolean; courseId?: string }[] }[] {
  const plan: any[] = [];
  const today = new Date();
  const incomplete = courses.filter(c => c.progress < 100);
  const pool = incomplete.length > 0 ? incomplete : courses;

  for (let d = 0; d < daysCount; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);

    const tasks: any[] = [];
    const course = pool[d % pool.length];

    if (course) {
      tasks.push({ title: `Study: ${course.title}`, type: 'study', duration: '45 min', completed: false, courseId: course.id });
      if (d % 2 === 0) tasks.push({ title: `Quiz: ${course.title}`, type: 'quiz', duration: '20 min', completed: false, courseId: course.id });
      if (d % 3 === 0) tasks.push({ title: 'Revision: Review previous topics', type: 'revision', duration: '30 min', completed: false });
    }

    tasks.push({
      title: d % 2 === 0 ? 'Practice exercises' : 'Read supplementary material',
      type: 'exercise', duration: '20 min', completed: false,
    });

    plan.push({ day: d + 1, date: date.toISOString().split('T')[0], tasks });
  }

  return plan;
}
