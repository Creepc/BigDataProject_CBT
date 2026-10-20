import type { CourseData, Question, StudyState } from '@/types'

export interface FinalFilters {
  topic?: string
  evidence?: string
  difficulty?: string
  mode?: string
  status?: string
  search?: string
}

export const evidenceLabel = (evidence?: string) => evidence === 'pdf' ? '최종 PDF 중심'
  : evidence === 'lecture' ? '마지막 필기 강조' : '보충'

export const getFinalQuestions = (data: CourseData, filters: FinalFilters = {}, attempts: StudyState['attempts'] = {}) => {
  const search = (filters.search ?? '').trim().toLocaleLowerCase()
  return data.questions.filter((question) => {
    if (!question.finalExamId || !question.finalReview) return false
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
