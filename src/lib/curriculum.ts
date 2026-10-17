import type { CourseData, Question, QuestionLearningStage, StudyState } from '@/types'

export const learningStages: QuestionLearningStage[] = ['기초', '원리', '적용', '종합']

export const getLearningQuestions = (data: CourseData, conceptId?: string): Question[] => {
  const conceptOrder = new Map(data.concepts.map((concept, index) => [concept.id, index]))
  return data.questions
    .filter((question) => question.learningStage && question.learningConceptId && (!conceptId || question.learningConceptId === conceptId))
    .sort((left, right) => (conceptOrder.get(left.learningConceptId!) ?? 0) - (conceptOrder.get(right.learningConceptId!) ?? 0)
      || learningStages.indexOf(left.learningStage!) - learningStages.indexOf(right.learningStage!))
}

export const getLearningPaths = (data: CourseData, attempts: StudyState['attempts']) => {
  const questions = getLearningQuestions(data)
  return data.concepts.map((concept) => {
    const course = questions.filter((question) => question.learningConceptId === concept.id)
    const answered = course.filter((question) => attempts[question.id]).length
    const correct = course.filter((question) => attempts[question.id]?.lastCorrect).length
    const next = course.find((question) => !attempts[question.id])
      ?? course.find((question) => !attempts[question.id]?.lastCorrect)
      ?? course[0]
    return { concept, questions: course, answered, correct, next }
  })
}
