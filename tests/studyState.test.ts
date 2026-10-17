import { describe, expect, it } from 'vitest'
import { createInitialStudyState, parseStudyState, parseStudyStateJson, reconcileStudyState } from '@/lib/studyState'
import type { ExamRecord, StudyState } from '@/types'

const validState = () => ({
  ...createInitialStudyState(),
  attempts: {
    q1: {
      questionId: 'q1',
      count: 1,
      correctCount: 0,
      wrongCount: 1,
      lastCorrect: false,
      lastSelected: [],
      lastAttemptAt: '2026-10-16T10:00:00.000Z',
      history: [{ selected: [], correct: false, at: '2026-10-16T10:00:00.000Z' }],
    },
  },
})

describe('study-state import validation', () => {
  it('round-trips valid data including an unanswered wrong attempt', () => {
    expect(parseStudyStateJson(JSON.stringify(validState()))).toEqual(validState())
  })

  it('rejects malformed collections before they can poison localStorage state', () => {
    expect(() => parseStudyState({ ...validState(), completedConceptIds: null })).toThrow(/completedConceptIds/)
    expect(() => parseStudyState({ ...validState(), attempts: { q1: { ...validState().attempts.q1, count: 2 } } })).toThrow(/count/)
  })

  it('reports malformed JSON with a user-facing error', () => {
    expect(() => parseStudyStateJson('{broken')).toThrow('올바른 JSON 학습 기록 파일이 아닙니다.')
  })
})

const contentScope = {
  concepts: [{ id: 'c1' }],
  questions: [
    {
      id: 'q1',
      options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id, correct: id === 'a', explanation: '근거', correctedStatement: '설명' })),
    },
    {
      id: 'q2',
      options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id, correct: id === 'a' || id === 'c', explanation: '근거', correctedStatement: '설명' })),
    },
  ],
  flashcards: [{ id: 'f1' }],
}

const examFixture = (overrides: Partial<ExamRecord> = {}): ExamRecord => ({
  id: 'exam-valid',
  questionIds: ['q1'],
  answers: { q1: ['b'] },
  score: 0,
  correctCount: 0,
  total: 1,
  startedAt: '2026-10-16T10:00:00.000Z',
  submittedAt: '2026-10-16T10:01:00.000Z',
  durationSeconds: 60,
  ...overrides,
})

describe('study-state scope reconciliation', () => {
  it('keeps valid progress and preferences intact without mutating the input', () => {
    const state: StudyState = {
      ...validState(),
      completedConceptIds: ['c1'],
      bookmarkedQuestionIds: ['q1'],
      reviewCompletedQuestionIds: ['q1'],
      exams: [examFixture()],
      activities: [
        { id: 'a1', type: 'concept', targetId: 'c1', label: '개념 완료', at: '2026-10-16' },
        { id: 'a2', type: 'question', targetId: 'q1', label: '문제 풀이', at: '2026-10-16' },
        { id: 'a3', type: 'exam', targetId: 'exam-valid', label: '모의고사 0점', at: '2026-10-16' },
        { id: 'legacy', type: 'review', label: '복습 기록', at: '2026-10-16' },
      ],
      theme: 'dark',
      flashcardRatings: { f1: 'hard' },
    }
    const snapshot = structuredClone(state)
    expect(reconcileStudyState(state, contentScope)).toEqual(snapshot)
    expect(state).toEqual(snapshot)
  })

  it('removes retired IDs and regrades mixed exams using only retained questions', () => {
    const removedAttempt = { ...validState().attempts.q1, questionId: 'q-removed' }
    const state: StudyState = {
      ...validState(),
      completedConceptIds: ['c1', 'c-removed'],
      bookmarkedQuestionIds: ['q-removed', 'q1'],
      reviewCompletedQuestionIds: ['q1', 'q-removed'],
      attempts: { ...validState().attempts, 'q-removed': removedAttempt },
      exams: [
        examFixture({
          id: 'exam-mixed',
          questionIds: ['q1', 'q-removed', 'q2'],
          answers: { q1: ['a'], 'q-removed': ['a'], q2: ['a'], 'q-extra': ['d'] },
          total: 3,
          correctCount: 2,
          score: 67,
        }),
        examFixture({ id: 'exam-removed', questionIds: ['q-removed'], answers: { 'q-removed': ['a'] } }),
      ],
      activities: [
        { id: 'kept-concept', type: 'concept', targetId: 'c1', label: '학습 완료', at: '2026-10-16' },
        { id: 'retired-concept', type: 'concept', targetId: 'c-removed', label: '학습 완료', at: '2026-10-16' },
        { id: 'retired-question', type: 'question', targetId: 'q-removed', label: '문제 풀이', at: '2026-10-16' },
        { id: 'retired-review', type: 'review', targetId: 'q-removed', label: '복습 완료', at: '2026-10-16' },
        { id: 'mixed-exam', type: 'exam', targetId: 'exam-mixed', label: '모의고사 67점', at: '2026-10-16' },
        { id: 'retired-exam', type: 'exam', targetId: 'exam-removed', label: '모의고사 0점', at: '2026-10-16' },
      ],
      flashcardRatings: { f1: 'good', 'f-removed': 'again' },
    }

    // Imported backups still pass the strict structural parser before reconciliation.
    const reconciled = reconcileStudyState(parseStudyStateJson(JSON.stringify(state)), contentScope)
    expect(reconciled.completedConceptIds).toEqual(['c1'])
    expect(reconciled.bookmarkedQuestionIds).toEqual(['q1'])
    expect(reconciled.reviewCompletedQuestionIds).toEqual(['q1'])
    expect(reconciled.attempts).toEqual(validState().attempts)
    expect(reconciled.flashcardRatings).toEqual({ f1: 'good' })
    expect(reconciled.exams).toEqual([examFixture({
      id: 'exam-mixed',
      questionIds: ['q1', 'q2'],
      answers: { q1: ['a'], q2: ['a'] },
      total: 2,
      correctCount: 1,
      score: 50,
    })])
    expect(reconciled.activities.map(({ id }) => id)).toEqual(['kept-concept', 'mixed-exam'])
    expect(reconciled.activities[1].label).toBe('모의고사 50점')
    expect(reconcileStudyState(reconciled, contentScope)).toEqual(reconciled)
  })

  it('keeps unanswered retained questions in the denominator of a mixed exam', () => {
    const state = {
      ...createInitialStudyState(),
      exams: [examFixture({
        questionIds: ['q1', 'q2', 'q-removed'],
        answers: { q1: ['a'], 'q-removed': ['a'] },
        total: 3,
        correctCount: 2,
        score: 67,
      })],
    }
    expect(reconcileStudyState(state, contentScope).exams[0]).toMatchObject({ total: 2, correctCount: 1, score: 50 })
  })
})
