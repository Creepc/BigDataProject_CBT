import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { QuestionExplanation } from '@/components/QuestionExperience'
import { WrongPage } from '@/pages/WrongPage'
import { useStudy } from '@/contexts/StudyContext'
import { courseData } from '@/data/courseData'
import { createInitialStudyState } from '@/lib/studyState'

vi.mock('@/contexts/StudyContext', () => ({ useStudy: vi.fn() }))

describe('concise answer explanations', () => {
  it('shows the meaning of every option without repeated correction boxes', () => {
    const question = courseData.questions.find((item) => item.id === 'n12-q05')!
    const html = renderToStaticMarkup(<QuestionExplanation question={question} selected={['o2']} concepts={[]} files={[]} navigate={() => {}} />)

    question.options.forEach((option) => expect(html).toContain(option.explanation))
    expect(html).toContain('파일 형식')
    expect(html).toContain('선택지 해설')
    expect(html).not.toContain('바르게 고치면')
    expect(html).not.toContain('어떤 개념과 섞였는지')
    expect(html).not.toContain('이 선택지는')
  })

  it('uses the same short explanations in the error notebook', () => {
    const question = courseData.questions.find((item) => item.id === 'n12-q05')!
    const state = createInitialStudyState()
    state.attempts[question.id] = {
      questionId: question.id,
      count: 1, correctCount: 0, wrongCount: 1, lastCorrect: false,
      lastSelected: ['o4'], lastAttemptAt: '2026-10-17T10:00:00.000Z',
      history: [{ selected: ['o4'], correct: false, at: '2026-10-17T10:00:00.000Z' }],
    }
    vi.mocked(useStudy).mockReturnValue({
      state, toggleConcept: vi.fn(), toggleBookmark: vi.fn(), toggleReview: vi.fn(),
      recordAttempt: vi.fn(() => false), saveExam: vi.fn(), setTheme: vi.fn(),
      rateCard: vi.fn(), exportData: vi.fn(() => ''), importData: vi.fn(), reset: vi.fn(),
    })

    const html = renderToStaticMarkup(<WrongPage data={courseData} navigate={() => {}} />)
    question.options.forEach((option) => expect(html).toContain(option.explanation))
    expect(html).not.toContain('바르게 고치면')
    expect(html).not.toContain('이 선택지는')
  })
})
