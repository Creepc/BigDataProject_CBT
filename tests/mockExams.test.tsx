import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { courseData } from '@/data/courseData'
import { FixedMockExamList } from '@/components/FixedMockExamList'
import { QuestionExplanation, QuestionPlayer } from '@/components/QuestionExperience'
import { getFixedMockExamScore, getMockExamProgress, getMockExamQuestions, validateMockExams } from '@/lib/mockExams'
import { createInitialStudyState, parseStudyStateJson, reconcileStudyState } from '@/lib/studyState'
import type { AttemptRecord, ExamRecord } from '@/types'
import { useStudy } from '@/contexts/StudyContext'

vi.mock('@/contexts/StudyContext', () => ({
  useStudy: vi.fn(),
}))

const attempt = (id: string, correct = false, selected = ['o1']): AttemptRecord => ({
  questionId: id, count: 1, correctCount: correct ? 1 : 0, wrongCount: correct ? 0 : 1,
  lastCorrect: correct, lastSelected: selected, lastAttemptAt: '2026-10-19T00:00:00.000Z',
  history: [{ selected, correct, at: '2026-10-19T00:00:00.000Z' }],
})

const examRecord = (overrides: Partial<ExamRecord> = {}): ExamRecord => ({
  id: 'exam-1', mockExamId: 'mock-01', questionIds: courseData.mockExams![0].questionIds,
  answers: {}, score: 50, correctCount: 20, total: 40,
  startedAt: '2026-10-19T00:00:00.000Z', submittedAt: '2026-10-19T00:30:00.000Z', durationSeconds: 1800,
  ...overrides,
})

describe('five new fixed mock exams', () => {
  beforeEach(() => {
    vi.mocked(useStudy).mockReturnValue({
      state: createInitialStudyState(), recordAttempt: vi.fn(() => false), toggleBookmark: vi.fn(),
      toggleConcept: vi.fn(), toggleReview: vi.fn(), saveExam: vi.fn(), setTheme: vi.fn(),
      rateCard: vi.fn(), exportData: vi.fn(() => ''), importData: vi.fn(), reset: vi.fn(),
    })
  })
  it('contains 5 × 40 new, non-reused questions and directly covers all 110 concepts', () => {
    expect(courseData.mockExams).toHaveLength(5)
    const questions = courseData.mockExams!.flatMap((exam) => {
      const items = getMockExamQuestions(courseData, exam.id)
      expect(items).toHaveLength(40)
      expect(items.filter((question) => question.mode === 'multiple').length).toBeGreaterThanOrEqual(10)
      expect(items.filter((question) => question.visual).length).toBeGreaterThanOrEqual(4)
      expect(items.every((question) => question.mockExamId === exam.id && !question.learningStage)).toBe(true)
      expect(exam.minutes).toBe(50)
      return items
    })
    expect(new Set(questions.map((question) => question.id)).size).toBe(200)
    expect(questions.every((question) => question.id.startsWith('mock-'))).toBe(true)
    expect(courseData.questions.filter((question) => !question.mockExamId)).toHaveLength(556)
    expect(new Set(questions.flatMap((question) => question.conceptIds)).size).toBe(110)
    expect(validateMockExams(courseData)).toEqual([])
  })

  it('gives every new question concrete concept teaching, steps, a caution and a second example', () => {
    for (const question of courseData.questions.filter((item) => item.mockExamId)) {
      const detail = question.detailedExplanation!
      expect(detail.concept.trim().length, question.id).toBeGreaterThanOrEqual(100)
      expect(detail.steps.length, question.id).toBeGreaterThanOrEqual(3)
      detail.steps.forEach((step) => expect(step.trim().length, question.id).toBeGreaterThanOrEqual(20))
      expect(detail.pitfall.trim().length, question.id).toBeGreaterThanOrEqual(20)
      expect(question.review.trim().length, question.id).toBeGreaterThanOrEqual(80)
      expect(question.additionalExample.trim().length, question.id).toBeGreaterThanOrEqual(30)
      expect(question.options.every((option) => option.explanation.length <= 180)).toBe(true)
    }
  })

  it('preserves the exact published question order and never falls back to the whole bank', () => {
    const exam = courseData.mockExams![0]
    expect(getMockExamQuestions(courseData, exam.id).map((question) => question.id)).toEqual(exam.questionIds)
    expect(getMockExamQuestions(courseData, 'unknown')).toEqual([])
    const invalid = { ...courseData, mockExams: [{ ...exam, questionIds: [...exam.questionIds.slice(1), 'n12-q01'] }] }
    expect(getMockExamQuestions(invalid, exam.id)).toHaveLength(39)
    expect(validateMockExams(invalid).some((message) => message.includes('문항 연결 오류'))).toBe(true)
  })

  it('continues unanswered questions first, ignores blank exam submissions and then revisits wrong answers', () => {
    const exam = courseData.mockExams![0]
    const [first, second, third] = exam.questionIds
    const attempts = { [first]: attempt(first), [second]: attempt(second, true), [third]: attempt(third, false, []) }
    expect(getMockExamProgress(exam, attempts, [])).toMatchObject({ answered: 2, correct: 1, nextId: third, examCount: 0 })
    exam.questionIds.slice(2).forEach((id) => { attempts[id] = attempt(id, true) })
    expect(getMockExamProgress(exam, attempts, [])).toMatchObject({ answered: 40, correct: 39, nextId: first })
    attempts[first] = attempt(first, true)
    expect(getMockExamProgress(exam, attempts, []).nextId).toBe(first)
  })

  it('separates fixed-exam scores from practice and unrelated custom exams', () => {
    const exam = courseData.mockExams![0]
    const older = examRecord({ score: 90, correctCount: 36 })
    const latest = examRecord({ id: 'latest', score: 70, correctCount: 28, submittedAt: '2026-10-19T02:00:00.000Z' })
    const custom = examRecord({ id: 'custom', mockExamId: undefined, score: 100, correctCount: 40 })
    const other = examRecord({ id: 'other', mockExamId: 'mock-02' })
    const duplicate = examRecord({ id: 'duplicate', questionIds: Array(40).fill(exam.questionIds[0]) })
    const progress = getMockExamProgress(exam, {}, [older, custom, duplicate, other, latest])
    expect(progress).toMatchObject({ examCount: 2, latestScore: 70, bestScore: 90, latestExam: latest, answered: 0 })
  })

  it('uses exact 2.5-point grading for 40 questions without rounding away half points', () => {
    expect(getFixedMockExamScore(0)).toBe(0)
    expect(getFixedMockExamScore(1)).toBe(2.5)
    expect(getFixedMockExamScore(39)).toBe(97.5)
    expect(getFixedMockExamScore(40)).toBe(100)
  })

  it('round-trips the fixed-exam identity without invalidating older study records', () => {
    const fixed = examRecord()
    const legacy = examRecord({ id: 'legacy', mockExamId: undefined })
    const state = { ...createInitialStudyState(), exams: [fixed, legacy] }
    const parsed = parseStudyStateJson(JSON.stringify(state))
    expect(parsed.exams[0].mockExamId).toBe('mock-01')
    expect(parsed.exams[1].mockExamId).toBeUndefined()
    expect(reconcileStudyState(parsed, courseData)).toEqual(parsed)
    expect(() => parseStudyStateJson(JSON.stringify({ ...state, exams: [{ ...fixed, mockExamId: 3 }] }))).toThrow(/mockExamId/)
  })

  it('offers five exam and five study entry points without exposing the answers on the list', () => {
    const html = renderToStaticMarkup(<FixedMockExamList data={courseData} state={createInitialStudyState()} onStart={() => {}} onReview={() => {}} navigate={() => {}} />)
    expect(html).toContain('신규 200문항')
    expect((html.match(/시험 응시"/g) ?? [])).toHaveLength(5)
    expect((html.match(/해설 학습"/g) ?? [])).toHaveLength(5)
    expect(html).not.toContain(getMockExamQuestions(courseData, 'mock-01')[0].detailedExplanation!.concept)
  })

  it('shows detailed teaching only when the explanation is rendered, not on an unanswered question', () => {
    const mockExam = courseData.mockExams![0]
    const question = getMockExamQuestions(courseData, mockExam.id)[0]
    const props = { concepts: courseData.concepts, files: courseData.files, navigate: () => {} }
    const before = renderToStaticMarkup(<QuestionPlayer questions={[question]} mockExam={mockExam} {...props} />)
    const after = renderToStaticMarkup(<QuestionExplanation question={question} selected={[]} {...props} />)
    expect(before).toContain('해설 학습')
    expect(before).toContain('모의고사 목록')
    expect(before).not.toContain('단계별 풀이</h4>')
    expect(before).not.toContain(question.detailedExplanation!.concept)
    expect(after).toContain('이 문제에 필요한 개념')
    expect(after).toContain('단계별 풀이')
    expect(after).toContain('꼭 구분할 점')
    expect(after).toContain(renderToStaticMarkup(<p>{question.detailedExplanation!.concept}</p>).slice(3, -4))
  })

  it('keeps blank submitted exam answers marked unanswered in the learning navigator', () => {
    const mockExam = courseData.mockExams![0]
    const questions = getMockExamQuestions(courseData, mockExam.id)
    const state = createInitialStudyState()
    state.attempts[questions[0].id] = attempt(questions[0].id, false, [])
    vi.mocked(useStudy).mockReturnValue({ ...useStudy(), state })
    const html = renderToStaticMarkup(<QuestionPlayer questions={questions} mockExam={mockExam} concepts={[]} files={[]} navigate={() => {}} />)
    expect(html).toContain('aria-label="학습 문제 1, 미응답"')
    expect(html).not.toContain('aria-label="학습 문제 1, 응답 기록 있음"')
    expect(html).toContain('지난 응답과 해설 보기')
    expect(getMockExamProgress(mockExam, state.attempts, []).answered).toBe(0)
  })
})
