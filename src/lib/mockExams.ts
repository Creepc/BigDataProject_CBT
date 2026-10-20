import type { AttemptRecord, CourseData, ExamRecord, MockExam } from '@/types'

/** Fixed exams have 40 equally weighted items, including all-or-nothing multi-select. */
export const getFixedMockExamScore = (correctCount: number) => correctCount * 2.5

export const getAllFixedExams = (data: CourseData) => [...(data.mockExams ?? []), ...(data.finalReview?.exams ?? [])]

/** Use the published order, never random sampling or another exam's questions. */
export const getMockExamQuestions = (data: CourseData, examId: string) => {
  const exam = getAllFixedExams(data).find((item) => item.id === examId)
  if (!exam) return []
  const byId = new Map(data.questions.map((question) => [question.id, question]))
  return exam.questionIds.flatMap((id) => {
    const question = byId.get(id)
    return question && (question.mockExamId ?? question.finalExamId) === exam.id ? [question] : []
  })
}

export const getMockExamProgress = (
  exam: MockExam,
  attempts: Record<string, AttemptRecord>,
  records: ExamRecord[],
) => {
  const attempted = exam.questionIds.filter((id) => attempts[id]?.lastSelected.length > 0)
  const expected = new Set(exam.questionIds)
  const exams = records.filter((record) => record.mockExamId === exam.id
    && record.questionIds.length === expected.size
    && new Set(record.questionIds).size === expected.size
    && record.questionIds.every((id) => expected.has(id)))
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
  return {
    answered: attempted.length,
    correct: attempted.filter((id) => attempts[id].lastCorrect).length,
    nextId: exam.questionIds.find((id) => !attempts[id]?.lastSelected.length)
      ?? exam.questionIds.find((id) => !attempts[id]?.lastCorrect)
      ?? exam.questionIds[0],
    examCount: exams.length,
    latestScore: exams[0]?.score,
    bestScore: exams.length ? Math.max(...exams.map((record) => record.score)) : undefined,
    latestExam: exams[0],
  }
}

export const validateMockExams = (data: CourseData) => {
  const errors: string[] = []
  const byId = new Map(data.questions.map((question) => [question.id, question]))
  const examIds = new Set<string>()
  const used = new Set<string>()
  for (const exam of getAllFixedExams(data)) {
    if (examIds.has(exam.id)) errors.push(`중복 모의고사 ID: ${exam.id}`)
    examIds.add(exam.id)
    if (exam.questionIds.length !== 40 || new Set(exam.questionIds).size !== 40) errors.push(`${exam.id}: 고유 문항 40개가 필요함`)
    for (const id of exam.questionIds) {
      const question = byId.get(id)
      if (!question || (question.mockExamId ?? question.finalExamId) !== exam.id) errors.push(`${exam.id}: 문항 연결 오류 ${id}`)
      if (used.has(id)) errors.push(`${exam.id}: 회차 간 중복 문항 ${id}`)
      used.add(id)
    }
  }
  for (const question of data.questions.filter((item) => item.mockExamId || item.finalExamId)) {
    if (!examIds.has((question.mockExamId ?? question.finalExamId)!) || !used.has(question.id)) errors.push(`${question.id}: 모의고사 배정 누락`)
    const detail = question.detailedExplanation
    if (!detail || detail.concept.trim().length < 100 || detail.steps.length < 3 || detail.steps.some((step) => step.trim().length < 20) || detail.pitfall.trim().length < 20) errors.push(`${question.id}: 상세 해설 누락`)
  }
  return errors
}
