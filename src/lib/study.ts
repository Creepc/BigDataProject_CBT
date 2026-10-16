import type { AttemptRecord, CourseData, Difficulty, Question } from '@/types'

export const arraysEqualAsSets = (left: string[], right: string[]) => {
  const actual = new Set(left)
  const expected = new Set(right)
  if (actual.size !== left.length || expected.size !== right.length || actual.size !== expected.size) return false
  return [...actual].every((item) => expected.has(item))
}

export const correctOptionIds = (question: Question) =>
  question.options.filter((option) => option.correct).map((option) => option.id)

export const isAnswerCorrect = (question: Question, selected: string[]) =>
  arraysEqualAsSets(selected, correctOptionIds(question))

export const formatPages = (pages: number[]) => {
  if (!pages.length) return '페이지 미상'
  const sorted = [...new Set(pages)].sort((a, b) => a - b)
  const chunks: string[] = []
  let start = sorted[0]
  let previous = sorted[0]
  for (let index = 1; index <= sorted.length; index += 1) {
    const current = sorted[index]
    if (current === previous + 1) {
      previous = current
      continue
    }
    chunks.push(start === previous ? `${start}` : `${start}-${previous}`)
    start = current
    previous = current
  }
  return `${chunks.join(', ')}쪽`
}

export const seededShuffle = <T,>(items: T[], seed = Date.now()) => {
  const result = [...items]
  let value = seed % 2147483647
  for (let index = result.length - 1; index > 0; index -= 1) {
    value = (value * 16807) % 2147483647
    const target = value % (index + 1)
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export interface ExamMix {
  쉬움: number
  보통: number
  어려움: number
}

export const selectExamQuestions = (
  pool: Question[],
  count: number,
  mix: ExamMix,
  seed = Date.now(),
) => {
  const totalWeight = mix.쉬움 + mix.보통 + mix.어려움 || 100
  const targets: Record<Difficulty, number> = {
    쉬움: Math.round((count * mix.쉬움) / totalWeight),
    보통: Math.round((count * mix.보통) / totalWeight),
    어려움: Math.round((count * mix.어려움) / totalWeight),
  }
  let targetSum = targets.쉬움 + targets.보통 + targets.어려움
  while (targetSum > count) {
    const key = (['보통', '쉬움', '어려움'] as Difficulty[]).find((item) => targets[item] > 0)
    if (!key) break
    targets[key] -= 1
    targetSum -= 1
  }
  while (targetSum < count) {
    targets.보통 += 1
    targetSum += 1
  }
  const selected: Question[] = []
  ;(['쉬움', '보통', '어려움'] as Difficulty[]).forEach((difficulty, index) => {
    selected.push(
      ...seededShuffle(
        pool.filter((question) => question.difficulty === difficulty),
        seed + index,
      ).slice(0, targets[difficulty]),
    )
  })
  if (selected.length < count) {
    const selectedIds = new Set(selected.map((item) => item.id))
    selected.push(
      ...seededShuffle(
        pool.filter((question) => !selectedIds.has(question.id)),
        seed + 9,
      ).slice(0, count - selected.length),
    )
  }
  return seededShuffle(selected, seed + 17).slice(0, count)
}

export const calculateAccuracy = (records: AttemptRecord[]) => {
  const attempts = records.reduce((sum, record) => sum + record.count, 0)
  const correct = records.reduce((sum, record) => sum + record.correctCount, 0)
  return attempts ? Math.round((correct / attempts) * 100) : 0
}

export const elapsedSecondsSince = (startedAt: number, now = Date.now()) =>
  Math.max(0, Math.floor((now - startedAt) / 1000))

export const isReviewRecovered = (record: AttemptRecord, manuallyCompleted: boolean) =>
  record.wrongCount > 0 && (record.lastCorrect || manuallyCompleted)

export const isReviewPending = (record: AttemptRecord, manuallyCompleted: boolean) =>
  record.wrongCount > 0 && !isReviewRecovered(record, manuallyCompleted)

export const conceptStats = (data: CourseData, attempts: Record<string, AttemptRecord>) =>
  data.concepts.map((concept) => {
    const related = data.questions.filter((question) => question.conceptIds.includes(concept.id))
    const records = related.flatMap((question) => (attempts[question.id] ? [attempts[question.id]] : []))
    return {
      concept,
      attempts: records.reduce((sum, item) => sum + item.count, 0),
      accuracy: calculateAccuracy(records),
      questionCount: related.length,
    }
  })

export const validateCourseData = (data: CourseData) => {
  const errors: string[] = []
  const fileIds = new Set<string>()
  const filesById = new Map(data.files.map((file) => [file.id, file]))
  data.files.forEach((file) => {
    if (fileIds.has(file.id)) errors.push(`중복 파일 ID: ${file.id}`)
    fileIds.add(file.id)
  })
  const conceptIds = new Set<string>()
  data.concepts.forEach((concept) => {
    if (conceptIds.has(concept.id)) errors.push(`중복 개념 ID: ${concept.id}`)
    conceptIds.add(concept.id)
    if (!fileIds.has(concept.fileId)) errors.push(`${concept.id}: 없는 파일 ${concept.fileId}`)
    const lesson = concept.lesson
    if (!lesson || lesson.conceptId !== concept.id) {
      errors.push(`${concept.id}: 상세 학습 본문 연결 오류`)
    } else {
      if (lesson.objectives.length < 3 || lesson.sections.length < 3 || lesson.workedExample.steps.length < 3 || lesson.checks.length < 2) errors.push(`${concept.id}: 학습 본문 구성 누락`)
      lesson.sourceRefs.forEach((ref) => {
        const file = filesById.get(ref.fileId)
        if (!file || !ref.pages.length || ref.pages.some((page) => !Number.isInteger(page) || page < 1 || page > file.pageCount)) errors.push(`${concept.id}: 학습 본문 출처 오류`)
      })
    }
  })
  const questionIds = new Set<string>()
  data.questions.forEach((question) => {
    if (questionIds.has(question.id)) errors.push(`중복 문항 ID: ${question.id}`)
    questionIds.add(question.id)
    if (question.options.length !== 4) errors.push(`${question.id}: 선택지가 4개가 아님`)
    const optionIds = new Set<string>()
    question.options.forEach((option) => {
      if (optionIds.has(option.id)) errors.push(`${question.id}: 중복 선택지 ID ${option.id}`)
      optionIds.add(option.id)
      if (!option.explanation.trim()) errors.push(`${question.id}.${option.id}: 선택지 해설 없음`)
    })
    const correctCount = question.options.filter((option) => option.correct).length
    if (question.mode === 'single' && correctCount !== 1) errors.push(`${question.id}: 단일선택 정답 수 오류`)
    if (question.mode === 'multiple' && correctCount < 2) errors.push(`${question.id}: 복수선택 정답 수 오류`)
    question.conceptIds.forEach((id) => {
      if (!conceptIds.has(id)) errors.push(`${question.id}: 없는 개념 ${id}`)
    })
    question.sourceRefs.forEach((ref) => {
      if (!fileIds.has(ref.fileId)) errors.push(`${question.id}: 없는 파일 ${ref.fileId}`)
    })
    if (!question.sourceRefs.length) errors.push(`${question.id}: 출처 없음`)
    const visual = question.visual
    if (visual) {
      if (visual.kind === 'source-image') {
        const sourceImage = visual.sourceImage
        const sourceFile = sourceImage ? filesById.get(sourceImage.fileId) : undefined
        if (!sourceImage
          || !sourceImage.path.trim()
          || !sourceImage.alt.trim()
          || !sourceImage.caption.trim()
          || !sourceFile
          || !Number.isInteger(sourceImage.page)
          || sourceImage.page < 1
          || sourceImage.page > (sourceFile?.pageCount ?? 0)
          || !question.sourceRefs.some((ref) => ref.fileId === sourceImage.fileId && ref.pages.includes(sourceImage.page))) {
          errors.push(`${question.id}: 원본 도식 정보 오류`)
        }
      } else if (!visual.series.length) {
        errors.push(`${question.id}: 그래프 계열 없음`)
      }
      visual.series.forEach((series) => {
        if (!series.values.length || series.values.some((value) => !Number.isFinite(value))) {
          errors.push(`${question.id}.${series.name}: 그래프 값 오류`)
        }
        if (series.xValues && (series.xValues.length !== series.values.length || series.xValues.some((value) => !Number.isFinite(value)))) {
          errors.push(`${question.id}.${series.name}: 산점도 x값 오류`)
        }
        if (series.outliers && (visual.kind !== 'box' || !series.outliers.length || series.outliers.some((value) => !Number.isFinite(value)))) {
          errors.push(`${question.id}.${series.name}: 박스플롯 이상치 값 오류`)
        }
        if (visual.kind !== 'box' && visual.kind !== 'scatter' && visual.kind !== 'source-image' && series.values.length !== visual.labels.length) {
          errors.push(`${question.id}.${series.name}: 그래프 레이블 수 불일치`)
        }
        if (visual.kind === 'scatter' && !series.xValues && series.values.length !== visual.labels.length) {
          errors.push(`${question.id}.${series.name}: 산점도 레이블 수 불일치`)
        }
      })
    }
  })
  const flashcardIds = new Set<string>()
  data.flashcards.forEach((card) => {
    if (flashcardIds.has(card.id)) errors.push(`중복 암기카드 ID: ${card.id}`)
    flashcardIds.add(card.id)
    if (!fileIds.has(card.fileId)) errors.push(`${card.id}: 없는 파일 ${card.fileId}`)
    if (!conceptIds.has(card.conceptId)) errors.push(`${card.id}: 없는 개념 ${card.conceptId}`)
  })
  return errors
}
