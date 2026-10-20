import type { CourseData, MockExam, Question, StudyState } from '@/types'

export interface FinalFilters {
  level?: string
  topic?: string
  evidence?: string
  difficulty?: string
  mode?: string
  status?: string
  search?: string
}

/** Legacy final papers remain the challenge series without rewriting their metadata. */
export const getFinalExamLevel = (exam: MockExam) => exam.level ?? 'challenge'

export const getFinalLevelLabel = (level?: string) => level === 'foundation' ? '기본 다지기'
  : level === 'standard' ? '중간 난도'
  : level === 'challenge' ? '기존 고난도' : '전체 최종 대비'

export const getFinalExams = (data: CourseData, level?: string) => (data.finalReview?.exams ?? [])
  .filter((exam) => !level || level === 'all' || getFinalExamLevel(exam) === level)

export const getFinalQueueLevel = (data: CourseData, questions: Question[]) => {
  const exams = new Map((data.finalReview?.exams ?? []).map((exam) => [exam.id, getFinalExamLevel(exam)]))
  const levels = new Set(questions.flatMap((question) => question.finalExamId && exams.has(question.finalExamId) ? [exams.get(question.finalExamId)!] : []))
  return levels.size === 1 ? [...levels][0] : 'all'
}

export const evidenceLabel = (evidence?: string) => evidence === 'pdf' ? '최종 PDF 중심'
  : evidence === 'lecture' ? '마지막 필기 강조' : '보충'

export const getFinalQuestions = (data: CourseData, filters: FinalFilters = {}, attempts: StudyState['attempts'] = {}) => {
  const search = (filters.search ?? '').trim().toLocaleLowerCase()
  const examIds = new Set(getFinalExams(data, filters.level).map((exam) => exam.id))
  return data.questions.filter((question) => {
    if (!question.finalExamId || !question.finalReview) return false
    if (!examIds.has(question.finalExamId)) return false
    const { topicId, evidence } = question.finalReview
    const attempt = attempts[question.id]
    return (!filters.topic || topicId === filters.topic)
      && (!filters.evidence || (filters.evidence === 'core' ? evidence !== 'supplement' : evidence === filters.evidence))
      && (!filters.difficulty || question.difficulty === filters.difficulty)
      && (!filters.mode || (filters.mode === 'visual' ? Boolean(question.visual) : question.mode === filters.mode))
      && (!filters.status || (filters.status === 'new' ? !attempt?.lastSelected.length : Boolean(attempt?.lastSelected.length && !attempt.lastCorrect)))
      && (!search || `${question.prompt} ${question.type} ${question.memoryTip}`.toLocaleLowerCase().includes(search))
  })
}

export const nextFinalQuestion = (questions: Question[], attempts: StudyState['attempts']) =>
  questions.find((question) => !attempts[question.id]?.lastSelected.length)?.id
  ?? questions.find((question) => !attempts[question.id]?.lastCorrect)?.id
  ?? questions[0]?.id
