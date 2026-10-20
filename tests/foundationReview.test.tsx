import { createHash } from 'node:crypto'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { courseData } from '@/data/courseData'
import { getFinalExamLevel, getFinalExams, getFinalQuestions, getFinalQueueLevel, nextFinalQuestion } from '@/lib/finalReview'
import { getMockExamProgress, getMockExamQuestions } from '@/lib/mockExams'
import { createInitialStudyState, parseStudyStateJson, reconcileStudyState } from '@/lib/studyState'
import { FinalReviewPage } from '@/pages/FinalReviewPage'
import { QuestionPlayer } from '@/components/QuestionExperience'
import { useStudy } from '@/contexts/StudyContext'

vi.mock('@/contexts/StudyContext', () => ({ useStudy: vi.fn() }))
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

describe('easier foundation review additions', () => {
  beforeEach(() => vi.mocked(useStudy).mockReturnValue({ state: createInitialStudyState(), recordAttempt: vi.fn(() => false), toggleBookmark: vi.fn(), toggleConcept: vi.fn(), toggleReview: vi.fn(), saveExam: vi.fn(), setTheme: vi.fn(), rateCard: vi.fn(), exportData: vi.fn(() => ''), importData: vi.fn(), reset: vi.fn() }))

  it('preserves every field of the 876 previous questions and all three published final papers', () => {
    const previous = courseData.questions.filter((question) => !question.id.startsWith('basic-') && !question.id.startsWith('mid-'))
    expect(previous).toHaveLength(876)
    expect(digest(previous)).toBe('cf4a92075be49fb4b7249cb709f0334da9f79773a05914f3412f499401db5e78')
    expect(digest(getFinalExams(courseData, 'challenge'))).toBe('d067b14f81df31aa92df436b8be0103f461b04e76c92c5c3f6aa583ebcff6414')
  })

  it('adds three easy/medium papers with 40 unique core questions each', () => {
    const exams = getFinalExams(courseData, 'foundation')
    expect(exams.map((exam) => exam.id)).toEqual(['final-04', 'final-05', 'final-06'])
    const questions = exams.flatMap((exam) => {
      expect(getFinalExamLevel(exam)).toBe('foundation')
      const items = getMockExamQuestions(courseData, exam.id)
      expect(items.map((question) => question.id)).toEqual(exam.questionIds)
      expect(items).toHaveLength(40)
      expect(items.filter((question) => question.difficulty === '쉬움')).toHaveLength(20)
      expect(items.filter((question) => question.difficulty === '보통')).toHaveLength(20)
      expect(items.filter((question) => question.difficulty === '어려움')).toHaveLength(0)
      expect(items.filter((question) => question.mode === 'multiple')).toHaveLength(12)
      expect(items.filter((question) => question.visual).length).toBeGreaterThanOrEqual(5)
      expect(items.every((question) => question.id.startsWith('basic-') && question.finalReview?.evidence !== 'supplement' && question.supplemental === false)).toBe(true)
      return items
    })
    expect(questions).toHaveLength(120)
    expect(new Set(questions.map((question) => question.id)).size).toBe(120)
    expect(new Set(questions.map((question) => question.prompt.replace(/\s+/g, ''))).size).toBe(120)
    expect(questions.every((question) => question.prompt.length <= 220)).toBe(true)
    const singles = questions.filter((question) => question.mode === 'single')
    expect([0, 1, 2, 3].map((index) => singles.filter((question) => question.options[index].correct).length)).toEqual([21, 21, 21, 21])
  })

  it('filters the new series independently and covers all oral emphasis items and topics', () => {
    const questions = getFinalQuestions(courseData, { level: 'foundation' })
    expect(questions).toHaveLength(120)
    expect(getFinalQuestions(courseData, { level: 'foundation', difficulty: '쉬움' })).toHaveLength(60)
    expect(getFinalQuestions(courseData, { level: 'foundation', difficulty: '보통' })).toHaveLength(60)
    expect(getFinalQuestions(courseData, { level: 'foundation', difficulty: '어려움' })).toEqual([])
    expect(getFinalQuestions(courseData, { level: 'foundation', evidence: 'supplement' })).toEqual([])
    expect(getFinalQuestions(courseData, { level: 'all' })).toHaveLength(360)
    expect(getFinalQuestions(courseData, { level: 'unknown' })).toEqual([])
    for (const focus of courseData.finalReview!.focusItems) expect(questions.some((question) => question.finalReview!.focusIds.includes(focus.id)), focus.label).toBe(true)
    for (const topic of courseData.finalReview!.topics) expect(getFinalQuestions(courseData, { level: 'foundation', topic: topic.id }).length, topic.title).toBeGreaterThan(0)
    expect(nextFinalQuestion(questions, {})).toBe(questions[0].id)
    expect(getFinalQueueLevel(courseData, questions)).toBe('foundation')
    expect(getFinalQueueLevel(courseData, getFinalQuestions(courseData, { level: 'challenge' }))).toBe('challenge')
    expect(getFinalQueueLevel(courseData, getFinalQuestions(courseData))).toBe('all')
    expect(getFinalQueueLevel(courseData, [])).toBe('all')
  })

  it('keeps foundation and original challenge papers reachable separately', () => {
    const props = { data: courseData, navigate: () => {} }
    const basic = renderToStaticMarkup(<FinalReviewPage {...props} initialLevel="foundation" />)
    const challenge = renderToStaticMarkup(<FinalReviewPage {...props} initialLevel="challenge" />)
    const all = renderToStaticMarkup(<FinalReviewPage {...props} initialLevel="all" />)
    expect(basic).toContain('기본 다지기 · 40문항씩 연습')
    expect(basic).toContain('기본 다지기 1회 · 용어와 역할')
    expect(basic).not.toContain('최종 대비 1회 · 조건과 경계')
    expect(challenge).toContain('최종 대비 1회 · 조건과 경계')
    expect(challenge).not.toContain('기본 다지기 1회 · 용어와 역할')
    expect(all).toContain('기본 다지기 1회 · 용어와 역할')
    expect(all).toContain('최종 대비 1회 · 조건과 경계')
    expect(basic).toContain('선택한 120문항 이어 풀기')
    expect(all).toContain('선택한 360문항 이어 풀기')
    expect(basic).toContain('<option>쉬움</option>')
    expect(getFinalQuestions(courseData, { level: 'foundation' }).some((question) => basic.includes(question.detailedExplanation!.concept))).toBe(false)
  })

  it('keeps old answers and new exam scores together without crossing paper membership', () => {
    const [oldExam] = getFinalExams(courseData, 'challenge')
    const [basicExam] = getFinalExams(courseData, 'foundation')
    const state = createInitialStudyState()
    const record = (id: string, exam: typeof basicExam) => ({ id, mockExamId: exam.id, questionIds: exam.questionIds, answers: {}, score: 2.5, correctCount: 1, total: 40, startedAt: '2026-10-20T00:00:00.000Z', submittedAt: '2026-10-20T00:10:00.000Z', durationSeconds: 600 })
    state.exams = [record('old', oldExam), record('new', basicExam)]
    expect(reconcileStudyState(parseStudyStateJson(JSON.stringify(state)), courseData)).toEqual(state)
    expect(getMockExamProgress(oldExam, {}, state.exams).examCount).toBe(1)
    expect(getMockExamProgress(basicExam, {}, state.exams).examCount).toBe(1)
    const question = getMockExamQuestions(courseData, basicExam.id)[0]
    const html = renderToStaticMarkup(<QuestionPlayer questions={[question]} finalMode finalLevel="foundation" concepts={courseData.concepts} files={courseData.files} navigate={() => {}} />)
    expect(html).toContain('기본 다지기 · 해설 학습')
    expect(html).not.toContain(question.detailedExplanation!.concept)
  })
})
