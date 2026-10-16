import { describe, expect, it } from 'vitest'
import type { Question } from '@/types'
import {
  elapsedSecondsSince, formatPages, isAnswerCorrect, isReviewPending,
  isReviewRecovered, selectExamQuestions,
} from '@/lib/study'
import type { AttemptRecord } from '@/types'

const makeQuestion = (id: string, difficulty: Question['difficulty'], correct = ['a']): Question => ({
  id,
  prompt: id,
  mode: correct.length > 1 ? 'multiple' : 'single',
  options: ['a', 'b', 'c', 'd'].map((option) => ({ id: option, text: option, correct: correct.includes(option), explanation: option, correctedStatement: option })),
  conceptIds: [],
  sourceRefs: [],
  difficulty,
  type: '개념 정의',
  review: '',
  memoryTip: '',
  additionalExample: '',
})

describe('answer scoring', () => {
  it('scores a single-answer item exactly', () => {
    expect(isAnswerCorrect(makeQuestion('q1', '쉬움'), ['a'])).toBe(true)
    expect(isAnswerCorrect(makeQuestion('q1', '쉬움'), ['b'])).toBe(false)
  })
  it('requires the exact set for a multiple-answer item', () => {
    const question = makeQuestion('q2', '보통', ['a', 'c'])
    expect(isAnswerCorrect(question, ['c', 'a'])).toBe(true)
    expect(isAnswerCorrect(question, ['a'])).toBe(false)
    expect(isAnswerCorrect(question, ['a', 'b', 'c'])).toBe(false)
  })
  it('rejects duplicate choices and treats an unanswered item as wrong', () => {
    expect(isAnswerCorrect(makeQuestion('q3', '쉬움'), ['a', 'a'])).toBe(false)
    expect(isAnswerCorrect(makeQuestion('q3', '쉬움'), [])).toBe(false)
  })
})

describe('attempt state helpers', () => {
  const attempt: AttemptRecord = {
    questionId: 'q1', count: 2, correctCount: 1, wrongCount: 1,
    lastCorrect: true, lastSelected: ['a'], lastAttemptAt: '2026-10-16T10:00:00.000Z',
    history: [
      { selected: [], correct: false, at: '2026-10-16T09:00:00.000Z' },
      { selected: ['a'], correct: true, at: '2026-10-16T10:00:00.000Z' },
    ],
  }

  it('uses wall-clock time so suspended tabs do not extend an exam', () => {
    expect(elapsedSecondsSince(1_000, 4_999)).toBe(3)
    expect(elapsedSecondsSince(5_000, 4_000)).toBe(0)
  })

  it('keeps recovered and pending review states mutually exclusive', () => {
    expect(isReviewRecovered(attempt, false)).toBe(true)
    expect(isReviewPending(attempt, false)).toBe(false)
    expect(isReviewPending({ ...attempt, lastCorrect: false }, false)).toBe(true)
    expect(isReviewRecovered({ ...attempt, lastCorrect: false }, true)).toBe(true)
  })
})

describe('exam selection', () => {
  it('selects the requested number without duplicates', () => {
    const pool = [
      ...Array.from({ length: 10 }, (_, index) => makeQuestion(`e${index}`, '쉬움')),
      ...Array.from({ length: 10 }, (_, index) => makeQuestion(`m${index}`, '보통')),
      ...Array.from({ length: 10 }, (_, index) => makeQuestion(`h${index}`, '어려움')),
    ]
    const selected = selectExamQuestions(pool, 20, { 쉬움: 30, 보통: 50, 어려움: 20 }, 42)
    expect(selected).toHaveLength(20)
    expect(new Set(selected.map((item) => item.id)).size).toBe(20)
    expect(selected.filter((item) => item.difficulty === '쉬움')).toHaveLength(6)
  })
})

describe('page labels', () => {
  it('compacts consecutive pages', () => {
    expect(formatPages([1, 2, 3, 5, 8, 9])).toBe('1-3, 5, 8-9쪽')
  })
})
