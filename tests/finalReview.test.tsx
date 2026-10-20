import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { courseData } from '@/data/courseData'
import { getFinalQuestions, nextFinalQuestion } from '@/lib/finalReview'
import { getAllFixedExams, getMockExamQuestions, getMockExamProgress, validateMockExams } from '@/lib/mockExams'
import { FinalReviewPage } from '@/pages/FinalReviewPage'
import { QuestionExplanation, QuestionPlayer } from '@/components/QuestionExperience'
import { useStudy } from '@/contexts/StudyContext'
import { createInitialStudyState, parseStudyStateJson, reconcileStudyState } from '@/lib/studyState'
import type { AttemptRecord } from '@/types'

vi.mock('@/contexts/StudyContext', () => ({ useStudy: vi.fn() }))
const attempt = (id: string, selected: string[], correct = false): AttemptRecord => ({ questionId: id, count: 1, correctCount: correct ? 1 : 0, wrongCount: correct ? 0 : 1, lastCorrect: correct, lastSelected: selected, lastAttemptAt: '2026-10-20T00:00:00.000Z', history: [{ selected, correct, at: '2026-10-20T00:00:00.000Z' }] })

describe('professor final review', () => {
  beforeEach(() => vi.mocked(useStudy).mockReturnValue({ state: createInitialStudyState(), recordAttempt: vi.fn(() => false), toggleBookmark: vi.fn(), toggleConcept: vi.fn(), toggleReview: vi.fn(), saveExam: vi.fn(), setTheme: vi.fn(), rateCard: vi.fn(), exportData: vi.fn(() => ''), importData: vi.fn(), reset: vi.fn() }))

  it('adds three disjoint papers of forty without altering the previous five', () => {
    expect(courseData.mockExams).toHaveLength(5)
    expect(courseData.finalReview?.exams).toHaveLength(3)
    expect(getAllFixedExams(courseData)).toHaveLength(8)
    const all = courseData.finalReview!.exams.flatMap((exam) => {
      const items = getMockExamQuestions(courseData, exam.id)
      expect(items.map((question) => question.id)).toEqual(exam.questionIds)
      expect(items).toHaveLength(40)
      expect(items.filter((question) => question.difficulty === '어려움')).toHaveLength(28)
      expect(items.filter((question) => question.difficulty === '보통')).toHaveLength(12)
      expect(items.filter((question) => question.finalReview?.evidence === 'supplement')).toHaveLength(4)
      expect(items.filter((question) => question.mode === 'multiple').length).toBeGreaterThanOrEqual(12)
      expect(items.filter((question) => question.visual).length).toBeGreaterThanOrEqual(5)
      expect(items.every((question) => question.finalExamId === exam.id && !question.mockExamId && !question.learningStage)).toBe(true)
      return items
    })
    expect(new Set(all.map((question) => question.id)).size).toBe(120)
    expect(getFinalQuestions(courseData, { evidence: 'core' })).toHaveLength(108)
    expect(getFinalQuestions(courseData, { evidence: 'supplement' })).toHaveLength(12)
    expect(validateMockExams(courseData)).toEqual([])
  })

  it('covers every oral emphasis and each topic with core questions and valid evidence', () => {
    const review = courseData.finalReview!
    expect(review.focusItems).toHaveLength(19)
    const questions = getFinalQuestions(courseData)
    for (const focus of review.focusItems) expect(questions.some((question) => question.finalReview?.evidence !== 'supplement' && question.finalReview?.focusIds.includes(focus.id)), focus.label).toBe(true)
    for (const topic of review.topics) expect(getFinalQuestions(courseData, { topic: topic.id, evidence: 'core' }).length, topic.title).toBeGreaterThan(0)
    for (const question of questions) {
      expect(question.supplemental).toBe(question.finalReview?.evidence === 'supplement')
      if (question.finalReview?.evidence === 'pdf') expect(question.sourceRefs.some((ref) => ref.fileId === 'prof-final')).toBe(true)
      expect(question.detailedExplanation!.concept.length).toBeGreaterThanOrEqual(100)
      expect(question.review.length).toBeGreaterThanOrEqual(80)
      expect(question.additionalExample.length).toBeGreaterThanOrEqual(30)
    }
    expect(existsSync('public/pdfs/professor-final-review.pdf')).toBe(true)
    expect(courseData.pageSummaries.filter((page) => page.fileId === 'prof-final')).toHaveLength(19)
  })

  it('filters only the new bank, handles blank answers as unanswered and continues safely', () => {
    const [first, second] = getFinalQuestions(courseData)
    const attempts = { [first.id]: attempt(first.id, ['o1']), [second.id]: attempt(second.id, []) }
    expect(getFinalQuestions(courseData, { status: 'wrong' }, attempts).map((question) => question.id)).toEqual([first.id])
    expect(getFinalQuestions(courseData, { status: 'new' }, attempts)).toHaveLength(119)
    expect(nextFinalQuestion([first, second], attempts)).toBe(second.id)
    expect(getFinalQuestions(courseData, { search: '존재하지않는검색문자' })).toEqual([])
    expect(getFinalQuestions(courseData, { mode: 'visual' }).every((question) => question.visual)).toBe(true)
    expect(getFinalQuestions(courseData, { topic: first.finalReview!.topicId, difficulty: first.difficulty, evidence: first.finalReview!.evidence }).some((question) => question.id === first.id)).toBe(true)
    expect(nextFinalQuestion([], attempts)).toBeUndefined()
  })

  it('keeps final exam records and old study progress through import and reconciliation', () => {
    const exam = courseData.finalReview!.exams[0]
    const state = createInitialStudyState()
    state.attempts['n12-q01'] = attempt('n12-q01', ['o1'])
    state.completedConceptIds = ['n12-c-os']
    state.exams = [{ id: 'final-record', mockExamId: exam.id, questionIds: exam.questionIds, answers: {}, score: 2.5, correctCount: 1, total: 40, startedAt: '2026-10-20T00:00:00.000Z', submittedAt: '2026-10-20T00:10:00.000Z', durationSeconds: 600 }]
    const parsed = reconcileStudyState(parseStudyStateJson(JSON.stringify(state)), courseData)
    expect(parsed).toEqual(state)
    expect(getMockExamProgress(exam, parsed.attempts, parsed.exams)).toMatchObject({ examCount: 1, latestScore: 2.5 })
  })

  it('renders source, papers, topic teaching and filters without leaking per-question solutions', () => {
    const html = renderToStaticMarkup(<FinalReviewPage data={courseData} navigate={() => {}} />)
    expect(html).toContain('새 문제 120개')
    expect(html).toContain('어려움 84개')
    expect(html).toContain('핵심 108 + 보충 12')
    expect(html).toContain('professor-final-review.pdf#page=1')
    expect(html).toContain('최종 대비 주제')
    expect(html).toContain('최종 대비 풀이 상태')
    expect(html).not.toContain(getFinalQuestions(courseData)[0].detailedExplanation!.concept)
    const question = getFinalQuestions(courseData)[0]
    const props = { concepts: courseData.concepts, files: courseData.files, navigate: () => {} }
    const player = renderToStaticMarkup(<QuestionPlayer questions={[question]} finalMode {...props} />)
    const explanation = renderToStaticMarkup(<QuestionExplanation question={question} selected={[]} {...props} />)
    expect(player).toContain('최종 대비 목록')
    expect(player).toContain('1문항 바로가기')
    expect(player).not.toContain('단계별 풀이</h4>')
    expect(explanation).toContain('이 문제에 필요한 개념')
    expect(explanation).toContain('단계별 풀이')
  })
})
