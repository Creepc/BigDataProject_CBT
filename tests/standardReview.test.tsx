import { createHash } from 'node:crypto'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { courseData } from '@/data/courseData'
import { getFinalExams, getFinalLevelLabel, getFinalQuestions, getFinalQueueLevel, nextFinalQuestion } from '@/lib/finalReview'
import { getMockExamProgress, getMockExamQuestions } from '@/lib/mockExams'
import { createInitialStudyState, parseStudyStateJson, reconcileStudyState } from '@/lib/studyState'
import { FinalReviewPage } from '@/pages/FinalReviewPage'
import { QuestionExplanation, QuestionPlayer } from '@/components/QuestionExperience'
import { useStudy } from '@/contexts/StudyContext'

vi.mock('@/contexts/StudyContext', () => ({ useStudy: vi.fn() }))
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

describe('separate standard-difficulty final review additions', () => {
  beforeEach(() => vi.mocked(useStudy).mockReturnValue({ state: createInitialStudyState(), recordAttempt: vi.fn(() => false), toggleBookmark: vi.fn(), toggleConcept: vi.fn(), toggleReview: vi.fn(), saveExam: vi.fn(), setTheme: vi.fn(), rateCard: vi.fn(), exportData: vi.fn(() => ''), importData: vi.fn(), reset: vi.fn() }))

  it('preserves all 996 published questions and six final papers, including foundation', () => {
    const previous = courseData.questions.filter((question) => !question.id.startsWith('mid-') && !question.id.startsWith('graph-'))
    expect(previous).toHaveLength(996)
    expect(digest(previous)).toBe('9963cc74cb19827400bfc20efb874dbf6d52011694a23f67a28f88225a6deb7a')
    expect(digest(courseData.finalReview!.exams.filter((exam) => exam.level !== 'standard'))).toBe('69b9086843528ca85547bafd578a38a5a130680df8c09054b059bac778559ef6')
  })

  it('adds only medium questions in three disjoint papers, without supplement or bilingual answer cues', () => {
    const exams = getFinalExams(courseData, 'standard').filter((exam) => exam.id !== 'final-10')
    expect(exams.map((exam) => exam.id)).toEqual(['final-07', 'final-08', 'final-09'])
    const questions = exams.flatMap((exam) => {
      const items = getMockExamQuestions(courseData, exam.id)
      expect(items.map((question) => question.id)).toEqual(exam.questionIds)
      expect(items).toHaveLength(40)
      expect(items.filter((question) => question.mode === 'multiple')).toHaveLength(12)
      expect(items.filter((question) => question.visual)).toHaveLength(5)
      expect(items.every((question) => question.difficulty === '보통' && question.finalReview?.evidence !== 'supplement' && question.supplemental === false)).toBe(true)
      return items
    })
    expect(questions).toHaveLength(120)
    expect(new Set(questions.map((question) => question.id)).size).toBe(120)
    const previousPrompts = new Set(courseData.questions.filter((question) => !question.id.startsWith('mid-')).map((question) => question.prompt.replace(/\s+/g, '')))
    expect(questions.every((question) => question.id.startsWith('mid-') && question.prompt.length <= 250 && !previousPrompts.has(question.prompt.replace(/\s+/g, '')))).toBe(true)
    for (const question of questions) {
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options.map((option) => option.text)).size).toBe(4)
      expect(question.options.filter((option) => option.correct)).toHaveLength(question.mode === 'multiple' ? 2 : 1)
      for (const option of question.options) expect(option.text).not.toMatch(/(?:Volume|Velocity|Variety|Veracity|Value)\s*[·:(-]\s*(?:규모|양|속도|다양성|신뢰성|가치)/i)
    }
    const singles = questions.filter((question) => question.mode === 'single')
    expect([0, 1, 2, 3].map((index) => singles.filter((question) => question.options[index].correct).length)).toEqual([21, 21, 21, 21])
  })

  it('isolates the new difficulty series and covers every oral focus and topic', () => {
    const questions = getFinalQuestions(courseData, { level: 'standard' })
    expect(questions).toHaveLength(160)
    expect(getFinalQuestions(courseData, { level: 'standard', difficulty: '보통' })).toEqual(questions)
    expect(getFinalQuestions(courseData, { level: 'standard', difficulty: '쉬움' })).toEqual([])
    expect(getFinalQuestions(courseData, { level: 'standard', difficulty: '어려움' })).toEqual([])
    expect(getFinalQuestions(courseData, { level: 'all' })).toHaveLength(400)
    for (const focus of courseData.finalReview!.focusItems) expect(questions.some((question) => question.finalReview!.focusIds.includes(focus.id)), focus.label).toBe(true)
    for (const topic of courseData.finalReview!.topics) expect(getFinalQuestions(courseData, { level: 'standard', topic: topic.id }).length, topic.title).toBeGreaterThan(0)
    expect(getFinalQueueLevel(courseData, questions)).toBe('standard')
    expect(getFinalQueueLevel(courseData, getFinalQuestions(courseData))).toBe('all')
    expect(nextFinalQuestion(questions, {})).toBe(questions[0].id)
    expect(getFinalLevelLabel('standard')).toBe('중간 난도')
  })

  it('starts on standard and keeps the two previous series separately accessible', () => {
    const props = { data: courseData, navigate: () => {} }
    const html = renderToStaticMarkup(<FinalReviewPage {...props} />)
    const basic = renderToStaticMarkup(<FinalReviewPage {...props} initialLevel="foundation" />)
    const challenge = renderToStaticMarkup(<FinalReviewPage {...props} initialLevel="challenge" />)
    const all = renderToStaticMarkup(<FinalReviewPage {...props} initialLevel="all" />)
    expect(html).toContain('중간 난도 · 40문항씩 적용')
    expect(html).toContain('중간 난도 1회 · 개념 구분')
    expect(html).toContain('보통 40')
    expect(html).toContain('선택한 160문항 이어 풀기')
    expect(html).not.toContain('기본 다지기 1회 · 용어와 역할')
    expect(html).not.toContain('최종 대비 1회 · 조건과 경계')
    expect(basic).toContain('기본 다지기 1회 · 용어와 역할')
    expect(challenge).toContain('최종 대비 1회 · 조건과 경계')
    expect(all).toContain('선택한 400문항 이어 풀기')
    expect(all).toContain('세 단계 · 전체 10회')
  })

  it('keeps solutions hidden until answering, then supplies detailed learning material', () => {
    const question = getFinalQuestions(courseData, { level: 'standard' })[0]
    const props = { concepts: courseData.concepts, files: courseData.files, navigate: () => {} }
    const renderedConcept = renderToStaticMarkup(<>{question.detailedExplanation!.concept}</>)
    const renderedTip = renderToStaticMarkup(<>{question.memoryTip}</>)
    const hidden = renderToStaticMarkup(<QuestionPlayer questions={[question]} finalMode finalLevel="standard" {...props} />)
    const shown = renderToStaticMarkup(<QuestionExplanation question={question} selected={[]} {...props} />)
    expect(hidden).toContain('중간 난도 · 해설 학습')
    expect(hidden).not.toContain(renderedConcept)
    expect(hidden).not.toContain(renderedTip)
    expect(shown).toContain(renderedConcept)
    expect(shown).toContain('단계별 풀이')
    expect(shown).toContain('다른 상황에 적용하면')
  })

  it('round-trips records from all final exams without dropping old progress or mixing paper membership', () => {
    const state = createInitialStudyState()
    state.bookmarkedQuestionIds = ['n12-q01', 'basic-inf-001', 'mid-inf-001']
    state.completedConceptIds = ['n12-c-os']
    state.exams = courseData.finalReview!.exams.map((exam) => ({ id: `record-${exam.id}`, mockExamId: exam.id, questionIds: exam.questionIds, answers: {}, score: 2.5, correctCount: 1, total: 40, startedAt: '2026-10-20T00:00:00.000Z', submittedAt: '2026-10-20T00:10:00.000Z', durationSeconds: 600 }))
    expect(reconcileStudyState(parseStudyStateJson(JSON.stringify(state)), courseData)).toEqual(state)
    for (const exam of courseData.finalReview!.exams) expect(getMockExamProgress(exam, {}, state.exams)).toMatchObject({ examCount: 1, latestScore: 2.5 })
  })
})
