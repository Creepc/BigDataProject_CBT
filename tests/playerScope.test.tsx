import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { QuestionPlayer } from '@/components/QuestionExperience'
import { courseData } from '@/data/courseData'

vi.mock('@/contexts/StudyContext', () => ({
  useStudy: () => ({ state: { bookmarkedQuestionIds: [], attempts: {} }, recordAttempt: vi.fn(), toggleBookmark: vi.fn() }),
}))

describe('practice queue scope', () => {
  it('does not turn a filtered learning question into a curriculum session', () => {
    const question = courseData.questions.find((item) => item.learningStage)!
    const props = { questions: [question], concepts: courseData.concepts, files: courseData.files, navigate: () => {} }
    const bank = renderToStaticMarkup(<QuestionPlayer {...props} />)
    const course = renderToStaticMarkup(<QuestionPlayer {...props} curriculumMode />)
    expect(bank).toContain('문제은행')
    expect(bank).not.toContain('학습 코스</button>')
    expect(course).toContain('학습 코스</button>')
    expect(bank).not.toContain('선택지 해설')
    expect(course).not.toContain('선택지 해설')
  })
})
