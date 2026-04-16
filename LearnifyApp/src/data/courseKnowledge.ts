// Subject color mapping for course cards
export const SUBJECT_COLORS: Record<string, string> = {
  mathematics: '#6C63FF',
  math: '#6C63FF',
  maths: '#6C63FF',
  science: '#4CAF50',
  physics: '#2196F3',
  chemistry: '#FF5722',
  biology: '#8BC34A',
  english: '#FF6584',
  hindi: '#E91E63',
  history: '#FF9800',
  geography: '#795548',
  'computer science': '#00BCD4',
  programming: '#00BCD4',
  economics: '#9C27B0',
  'social science': '#FF9800',
  'social studies': '#FF9800',
  default: '#6C63FF',
};

export function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject.toLowerCase().trim()] || SUBJECT_COLORS.default;
}

// Popular subjects for quick course generation
export const POPULAR_SUBJECTS = [
  { name: 'Mathematics', icon: 'calculator-outline' as const, color: '#6C63FF' },
  { name: 'Science', icon: 'flask-outline' as const, color: '#4CAF50' },
  { name: 'English', icon: 'book-outline' as const, color: '#FF6584' },
  { name: 'Hindi', icon: 'language-outline' as const, color: '#E91E63' },
  { name: 'History', icon: 'time-outline' as const, color: '#FF9800' },
  { name: 'Geography', icon: 'earth-outline' as const, color: '#795548' },
  { name: 'Computer Science', icon: 'code-slash-outline' as const, color: '#00BCD4' },
  { name: 'Physics', icon: 'rocket-outline' as const, color: '#2196F3' },
  { name: 'Chemistry', icon: 'beaker-outline' as const, color: '#FF5722' },
  { name: 'Biology', icon: 'leaf-outline' as const, color: '#8BC34A' },
];
