import { describe, expect, it } from 'vitest'
import { createInitialStudyState, parseStudyState, parseStudyStateJson } from '@/lib/studyState'

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
