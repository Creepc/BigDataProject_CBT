import type { Activity, AttemptRecord, ExamRecord, StudyState } from '@/types'

export const createInitialStudyState = (): StudyState => ({
  version: 1,
  completedConceptIds: [],
  bookmarkedQuestionIds: [],
  reviewCompletedQuestionIds: [],
  attempts: {},
  exams: [],
  activities: [],
  theme: 'system',
  flashcardRatings: {},
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const fail = (field: string): never => {
  throw new Error(`학습 기록의 ${field} 형식이 올바르지 않습니다.`)
}

const stringValue = (value: unknown, field: string) =>
  typeof value === 'string' ? value : fail(field)

const booleanValue = (value: unknown, field: string) =>
  typeof value === 'boolean' ? value : fail(field)

const integerValue = (value: unknown, field: string, minimum = 0) =>
  Number.isInteger(value) && (value as number) >= minimum ? value as number : fail(field)

const finiteValue = (value: unknown, field: string, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum ? value : fail(field)

const stringArray = (value: unknown, field: string) => {
  if (!Array.isArray(value)) return fail(field)
  if (!value.every((item): item is string => typeof item === 'string')) return fail(field)
  if (new Set(value).size !== value.length) return fail(field)
  return [...value]
}

const optionalStringArray = (value: unknown, field: string) =>
  value === undefined ? [] : stringArray(value, field)

const attemptRecord = (value: unknown, key: string): AttemptRecord => {
  if (!isRecord(value)) return fail(`attempts.${key}`)
  const record = value
  const questionId = stringValue(record.questionId, `attempts.${key}.questionId`)
  if (questionId !== key) fail(`attempts.${key}.questionId`)
  const count = integerValue(record.count, `attempts.${key}.count`, 1)
  const correctCount = integerValue(record.correctCount, `attempts.${key}.correctCount`)
  const wrongCount = integerValue(record.wrongCount, `attempts.${key}.wrongCount`)
  if (correctCount + wrongCount !== count) fail(`attempts.${key}.count`)
  if (!Array.isArray(record.history)) return fail(`attempts.${key}.history`)
  const history = record.history.map((item, index) => {
    if (!isRecord(item)) return fail(`attempts.${key}.history.${index}`)
    return {
      selected: stringArray(item.selected, `attempts.${key}.history.${index}.selected`),
      correct: booleanValue(item.correct, `attempts.${key}.history.${index}.correct`),
      at: stringValue(item.at, `attempts.${key}.history.${index}.at`),
    }
  })
  if (!history.length || history.length > Math.min(30, count)) fail(`attempts.${key}.history`)
  return {
    questionId,
    count,
    correctCount,
    wrongCount,
    lastCorrect: booleanValue(record.lastCorrect, `attempts.${key}.lastCorrect`),
    lastSelected: stringArray(record.lastSelected, `attempts.${key}.lastSelected`),
    lastAttemptAt: stringValue(record.lastAttemptAt, `attempts.${key}.lastAttemptAt`),
    history,
  }
}

const examRecord = (value: unknown, index: number): ExamRecord => {
  if (!isRecord(value)) return fail(`exams.${index}`)
  const record = value
  if (!isRecord(record.answers)) return fail(`exams.${index}.answers`)
  const questionIds = stringArray(record.questionIds, `exams.${index}.questionIds`)
  const answers = Object.fromEntries(Object.entries(record.answers).map(([questionId, selected]) => [
    questionId,
    stringArray(selected, `exams.${index}.answers.${questionId}`),
  ]))
  const total = integerValue(record.total, `exams.${index}.total`)
  const correctCount = integerValue(record.correctCount, `exams.${index}.correctCount`)
  if (total !== questionIds.length || correctCount > total) fail(`exams.${index}.total`)
  return {
    id: stringValue(record.id, `exams.${index}.id`),
    questionIds,
    answers,
    score: finiteValue(record.score, `exams.${index}.score`, 0, 100),
    correctCount,
    total,
    startedAt: stringValue(record.startedAt, `exams.${index}.startedAt`),
    submittedAt: stringValue(record.submittedAt, `exams.${index}.submittedAt`),
    durationSeconds: integerValue(record.durationSeconds, `exams.${index}.durationSeconds`),
  }
}

const activityRecord = (value: unknown, index: number): Activity => {
  if (!isRecord(value)) return fail(`activities.${index}`)
  const record = value
  const typeValue = record.type
  if (typeValue !== 'concept' && typeValue !== 'question' && typeValue !== 'exam' && typeValue !== 'review') return fail(`activities.${index}.type`)
  const type: Activity['type'] = typeValue
  const targetValue = record.targetId
  if (targetValue !== undefined && typeof targetValue !== 'string') return fail(`activities.${index}.targetId`)
  const targetId: string | undefined = targetValue
  return {
    id: stringValue(record.id, `activities.${index}.id`),
    type,
    label: stringValue(record.label, `activities.${index}.label`),
    at: stringValue(record.at, `activities.${index}.at`),
    ...(targetId === undefined ? {} : { targetId }),
  }
}

export const parseStudyState = (value: unknown): StudyState => {
  if (!isRecord(value) || value.version !== 1) throw new Error('지원하지 않는 학습 기록 형식입니다.')
  const record = value
  if (!isRecord(record.attempts)) return fail('attempts')

  const attempts = Object.fromEntries(
    Object.entries(record.attempts).map(([questionId, attempt]) => [questionId, attemptRecord(attempt, questionId)]),
  )

  if (record.exams !== undefined && !Array.isArray(record.exams)) return fail('exams')
  if (record.activities !== undefined && !Array.isArray(record.activities)) return fail('activities')
  if (record.flashcardRatings !== undefined && !isRecord(record.flashcardRatings)) return fail('flashcardRatings')

  const themeValue = record.theme ?? 'system'
  if (themeValue !== 'light' && themeValue !== 'dark' && themeValue !== 'system') return fail('theme')
  const theme: StudyState['theme'] = themeValue

  const ratingsValue = record.flashcardRatings ?? {}
  if (!isRecord(ratingsValue)) return fail('flashcardRatings')
  const flashcardRatings = Object.fromEntries(Object.entries(ratingsValue).map(([id, rating]) => {
    if (rating !== 'again' && rating !== 'hard' && rating !== 'good') return fail(`flashcardRatings.${id}`)
    return [id, rating] as const
  })) as StudyState['flashcardRatings']

  const examsValue = record.exams ?? []
  const activitiesValue = record.activities ?? []
  if (!Array.isArray(examsValue)) return fail('exams')
  if (!Array.isArray(activitiesValue)) return fail('activities')

  return {
    version: 1,
    completedConceptIds: optionalStringArray(record.completedConceptIds, 'completedConceptIds'),
    bookmarkedQuestionIds: optionalStringArray(record.bookmarkedQuestionIds, 'bookmarkedQuestionIds'),
    reviewCompletedQuestionIds: optionalStringArray(record.reviewCompletedQuestionIds, 'reviewCompletedQuestionIds'),
    attempts,
    exams: examsValue.map(examRecord),
    activities: activitiesValue.map(activityRecord),
    theme,
    flashcardRatings,
  }
}

export const parseStudyStateJson = (raw: string) => {
  try {
    return parseStudyState(JSON.parse(raw) as unknown)
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('올바른 JSON 학습 기록 파일이 아닙니다.')
    throw error
  }
}
