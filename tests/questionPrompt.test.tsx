import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { QuestionPrompt } from '@/components/QuestionPrompt'
import { courseData } from '@/data/courseData'

describe('readable code questions', () => {
  it('renders code as inert, monospaced text with a separate question heading', () => {
    const prompt = '출력 결과는?\n```python\nprint("<script>alert(1)</script>")\n```\n단위를 함께 고르시오.'
    const html = renderToStaticMarkup(<QuestionPrompt prompt={prompt} />)
    expect(html).toContain('<h2')
    expect(html).toContain('<pre')
    expect(html).toContain('font-mono')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('```')
    expect(html).toContain('단위를 함께 고르시오.')
  })

  it('renders every authored fenced code question without showing raw fences', () => {
    const questions = courseData.questions.filter((question) => question.prompt.includes('```'))
    expect(questions.length).toBeGreaterThanOrEqual(5)
    questions.forEach((question) => {
      const html = renderToStaticMarkup(<QuestionPrompt prompt={question.prompt} />)
      expect(html, question.id).toContain('<pre')
      expect(html, question.id).not.toContain('```')
    })
  })
})
