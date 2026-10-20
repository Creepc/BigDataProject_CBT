import { createHash } from 'node:crypto'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { courseData } from '@/data/courseData'
import { GRAPH_REVIEW_EXAM_ID, getFinalQuestions } from '@/lib/finalReview'
import { getMockExamProgress, getMockExamQuestions, validateMockExams } from '@/lib/mockExams'
import { createInitialStudyState, parseStudyStateJson, reconcileStudyState } from '@/lib/studyState'
import { FinalReviewPage } from '@/pages/FinalReviewPage'
import { QuestionExplanation, QuestionPlayer } from '@/components/QuestionExperience'
import { useStudy } from '@/contexts/StudyContext'

vi.mock('@/contexts/StudyContext', () => ({ useStudy: vi.fn() }))
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

describe('categorical/numeric and chart-choice focused paper', () => {
  beforeEach(() => vi.mocked(useStudy).mockReturnValue({ state: createInitialStudyState(), recordAttempt: vi.fn(() => false), toggleBookmark: vi.fn(), toggleConcept: vi.fn(), toggleReview: vi.fn(), saveExam: vi.fn(), setTheme: vi.fn(), rateCard: vi.fn(), exportData: vi.fn(() => ''), importData: vi.fn(), reset: vi.fn() }))

  it('preserves every field of all 1116 published questions and nine final papers', () => {
    const previous = courseData.questions.filter((question) => !question.id.startsWith('graph-'))
    expect(previous).toHaveLength(1116)
    expect(digest(previous)).toBe('092d91320a127dfc0bc21dc41ddbbb341d47e66968f2988c710fbd36f4067123')
    expect(digest(courseData.finalReview!.exams.filter((exam) => exam.id !== GRAPH_REVIEW_EXAM_ID))).toBe('db573b1913b4281035a7d32c43f29c8c67dfe5ed727417850bde384bcafadbd4')
  })

  it('adds one isolated core paper of forty with all six chart families and balanced answers', () => {
    const exam = courseData.finalReview!.exams.find((item) => item.id === GRAPH_REVIEW_EXAM_ID)!
    expect(exam).toMatchObject({ level: 'standard', minutes: 50 })
    const questions = getMockExamQuestions(courseData, exam.id)
    expect(questions).toHaveLength(40)
    expect(questions.map((question) => question.id)).toEqual(exam.questionIds)
    expect(new Set(questions.map((question) => question.id)).size).toBe(40)
    expect(questions.every((question) => question.id.startsWith('graph-') && question.difficulty === '보통' && !question.supplemental && question.finalReview!.evidence !== 'supplement')).toBe(true)
    expect(questions.filter((question) => question.mode === 'multiple')).toHaveLength(16)
    const visuals = questions.flatMap((question) => question.visual ? [question.visual] : [])
    expect(visuals).toHaveLength(8)
    for (const kind of ['bar', 'histogram', 'heatmap', 'box', 'scatter', 'line']) expect(visuals.some((visual) => visual.kind === kind)).toBe(true)
    const singles = questions.filter((question) => question.mode === 'single')
    expect([0, 1, 2, 3].map((index) => singles.filter((question) => question.options[index].correct).length)).toEqual([6, 6, 6, 6])
    for (const question of questions) expect(question.options.filter((option) => option.correct)).toHaveLength(question.mode === 'multiple' ? 2 : 1)
    expect(validateMockExams(courseData)).toEqual([])
  })

  it('keeps the focused subset separate from the rest of the medium tier', () => {
    const focused = getFinalQuestions(courseData, { level: 'standard', exam: GRAPH_REVIEW_EXAM_ID })
    expect(focused).toHaveLength(40)
    expect(getFinalQuestions(courseData, { level: 'foundation', exam: GRAPH_REVIEW_EXAM_ID })).toEqual([])
    expect(getFinalQuestions(courseData, { exam: 'not-an-exam' })).toEqual([])
    expect(getFinalQuestions(courseData, { level: 'standard' })).toHaveLength(160)
    expect(getFinalQuestions(courseData)).toHaveLength(400)
    const previousPrompts = new Set(courseData.questions.filter((question) => !question.id.startsWith('graph-')).map((question) => question.prompt.replace(/\s+/g, '')))
    expect(new Set(focused.map((question) => question.prompt.replace(/\s+/g, ''))).size).toBe(40)
    expect(focused.every((question) => question.prompt.length <= 250 && !previousPrompts.has(question.prompt.replace(/\s+/g, '')))).toBe(true)
    const learningText = focused.map((question) => `${question.prompt} ${question.detailedExplanation!.concept}`).join(' ')
    for (const term of ['범주', '수치', '막대', '히스토그램', '상자', '산점도', '히트맵']) expect(learningText).toContain(term)
    expect(learningText).toMatch(/선그래프|선 그래프/)
  })

  it('features focused study and exam entry points without exposing solutions', () => {
    const html = renderToStaticMarkup(<FinalReviewPage data={courseData} navigate={() => {}} />)
    expect(html).toContain('범주·수치·그래프 선택 40문항')
    expect(html).toContain('그래프 집중 해설 학습')
    expect(html).toContain('그래프 집중 40문항 시험')
    expect(html).toContain('기존 360문항 유지')
    const question = getMockExamQuestions(courseData, GRAPH_REVIEW_EXAM_ID)[0]
    const props = { concepts: courseData.concepts, files: courseData.files, navigate: () => {} }
    const hidden = renderToStaticMarkup(<QuestionPlayer questions={[question]} mockExam={courseData.finalReview!.exams.find((exam) => exam.id === GRAPH_REVIEW_EXAM_ID)} finalMode finalLevel="standard" {...props} />)
    const shown = renderToStaticMarkup(<QuestionExplanation question={question} selected={[]} {...props} />)
    const escapedConcept = renderToStaticMarkup(<>{question.detailedExplanation!.concept}</>)
    expect(hidden).not.toContain(escapedConcept)
    expect(shown).toContain(escapedConcept)
    expect(shown).toContain('단계별 풀이')
  })

  it('round-trips old and focused records without replacing old answers or mixing memberships', () => {
    const state = createInitialStudyState()
    state.bookmarkedQuestionIds = ['n12-q01', 'mid-nfx-001', 'graph-type-001']
    state.exams = courseData.finalReview!.exams.map((exam) => ({ id: `record-${exam.id}`, mockExamId: exam.id, questionIds: exam.questionIds, answers: {}, score: 2.5, correctCount: 1, total: 40, startedAt: '2026-10-21T00:00:00.000Z', submittedAt: '2026-10-21T00:10:00.000Z', durationSeconds: 600 }))
    expect(reconcileStudyState(parseStudyStateJson(JSON.stringify(state)), courseData)).toEqual(state)
    for (const exam of courseData.finalReview!.exams) expect(getMockExamProgress(exam, {}, state.exams)).toMatchObject({ examCount: 1, latestScore: 2.5 })
  })
})
