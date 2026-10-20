export type Difficulty = '쉬움' | '보통' | '어려움'
export type ConceptLevel = '기초' | '심화' | '시험 대비'
export type QuestionMode = 'single' | 'multiple'
export type QuestionLearningStage = '기초' | '원리' | '적용' | '종합'

export interface SourceFile {
  id: string
  title: string
  shortTitle: string
  path: string
  pdfUrl: string
  week: number
  kind: '노션' | '웹사이트'
  pageCount: number
  analyzedPages: number[]
  unreadablePages: number[]
  excludedPages?: number[]
  partialPages?: number[]
  topics: string[]
  color: string
  note?: string
}

export interface PageSummary {
  fileId: string
  page: number
  title: string
  keyPoints: string[]
  visuals: string[]
  codes: string[]
  excludedFromExam?: boolean
}

export interface ConceptLesson {
  conceptId: string
  objectives: string[]
  prerequisites: Array<{ term: string; explanation: string }>
  sections: Array<{ title: string; paragraphs: string[] }>
  workedExample: {
    title: string
    scenario: string
    steps: Array<{ title: string; explanation: string }>
    conclusion: string
  }
  checks: Array<{ question: string; answer: string; explanation: string }>
  takeaways: string[]
  sourceRefs: Array<{ fileId: string; pages: number[] }>
  codeExample?: {
    language: 'python' | 'text'
    code: string
    expectedOutput: string
    explanation: string
    notes: string[]
  }
}

export interface Concept {
  id: string
  name: string
  unit: string
  fileId: string
  pages: number[]
  definition: string
  easyExplanation: string
  mechanism: string[]
  examples: string[]
  comparisons: Array<{ target: string; difference: string }>
  examPoints: string[]
  misconceptions: string[]
  relatedConceptIds: string[]
  relatedQuestionIds: string[]
  level: ConceptLevel
  difficulty: Difficulty
  importance: 1 | 2 | 3 | 4 | 5
  evidenceType: '강의자료' | '강의자료+공식검증' | '강의자료+보충설명'
  tags: string[]
  lesson?: ConceptLesson
}

export interface QuestionOption {
  id: string
  text: string
  correct: boolean
  explanation: string
  correctedStatement?: string
}

export interface QuestionVisual {
  kind: 'bar' | 'line' | 'histogram' | 'scatter' | 'box' | 'source-image'
  title: string
  xLabel?: string
  yLabel?: string
  labels: string[]
  series: Array<{ name: string; values: number[]; xValues?: number[]; outliers?: number[] }>
  sourceImage?: {
    path: string
    alt: string
    caption: string
    fileId: string
    page: number
  }
  note?: string
  /** A calendar-year axis and a year difference must not share a domain. */
  sharedYearAxes?: boolean
}

export interface Question {
  id: string
  prompt: string
  mode: QuestionMode
  options: QuestionOption[]
  conceptIds: string[]
  sourceRefs: Array<{ fileId: string; pages: number[] }>
  difficulty: Difficulty
  type: string
  review: string
  memoryTip: string
  additionalExample: string
  visual?: QuestionVisual
  professorFocus?: string
  supplemental?: boolean
  learningStage?: QuestionLearningStage
  learningConceptId?: string
  learningObjectiveIndices?: number[]
  mockExamId?: string
  finalExamId?: string
  finalReview?: {
    topicId: string
    evidence: 'pdf' | 'lecture' | 'supplement'
    focusIds: string[]
  }
  detailedExplanation?: {
    concept: string
    steps: string[]
    pitfall: string
  }
}

export interface MockExam {
  id: string
  title: string
  description: string
  minutes: number
  questionIds: string[]
  level?: 'foundation' | 'challenge'
}

export interface Flashcard {
  id: string
  front: string
  back: string
  conceptId: string
  fileId: string
  pages: number[]
}

export interface CourseData {
  files: SourceFile[]
  pageSummaries: PageSummary[]
  concepts: Concept[]
  questions: Question[]
  flashcards: Flashcard[]
  mockExams?: MockExam[]
  finalReview?: {
    fileId: string
    exams: MockExam[]
    focusItems: Array<{ id: string; label: string }>
    topics: Array<{ id: string; title: string; summary: string; keyPoints: string[]; traps: string[]; focusIds: string[]; pages: number[] }>
    cautions: string[]
  }
  generatedAt: string
}

export interface AttemptRecord {
  questionId: string
  count: number
  correctCount: number
  wrongCount: number
  lastCorrect: boolean
  lastSelected: string[]
  lastAttemptAt: string
  history: Array<{ selected: string[]; correct: boolean; at: string }>
}

export interface ExamRecord {
  id: string
  mockExamId?: string
  questionIds: string[]
  answers: Record<string, string[]>
  score: number
  correctCount: number
  total: number
  startedAt: string
  submittedAt: string
  durationSeconds: number
}

export interface Activity {
  id: string
  type: 'concept' | 'question' | 'exam' | 'review'
  label: string
  at: string
  targetId?: string
}

export interface StudyState {
  version: 1
  completedConceptIds: string[]
  bookmarkedQuestionIds: string[]
  reviewCompletedQuestionIds: string[]
  attempts: Record<string, AttemptRecord>
  exams: ExamRecord[]
  activities: Activity[]
  theme: 'light' | 'dark' | 'system'
  flashcardRatings: Record<string, 'again' | 'hard' | 'good'>
}

export type AppView =
  | 'dashboard'
  | 'learn'
  | 'bank'
  | 'practice'
  | 'exam'
  | 'final'
  | 'wrong'
  | 'stats'
  | 'cards'
  | 'sources'
  | 'settings'

export interface NavigationTarget {
  view: AppView
  id?: string
  params?: Record<string, string>
}
