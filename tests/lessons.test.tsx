import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ConceptDetail } from '@/components/ConceptDetail'
import { courseData } from '@/data/courseData'
import { conceptReadingMinutes, conceptSearchText } from '@/lib/lessons'

describe('continuous concept lessons', () => {
  it('shows all explanatory sections and the worked solution without switching learning tabs', () => {
    const concept = courseData.concepts.find((item) => item.lesson)
    expect(concept).toBeDefined()
    if (!concept?.lesson) return
    const html = renderToStaticMarkup(<ConceptDetail concept={concept} data={courseData} navigate={() => {}} completed={false} onToggle={() => {}} />)
    concept.lesson.sections.forEach((section) => expect(html).toContain(section.title))
    expect(html).toContain(concept.lesson.workedExample.title)
    expect(html).toContain('스스로 설명할 수 있나요?')
    expect(html.match(/<details\b/g)).toHaveLength(concept.lesson.checks.length)
    expect(html).not.toContain('<details open')
    expect(html).toContain('원본 PDF')
  })

  it('searches the detailed explanation and gives longer lessons more reading time', () => {
    const concept = courseData.concepts.find((item) => item.lesson)
    expect(concept).toBeDefined()
    if (!concept?.lesson) return
    const phrase = concept.lesson.workedExample.scenario.toLocaleLowerCase('ko-KR')
    expect(conceptSearchText(concept)).toContain(phrase)
    const expanded = { ...concept, lesson: { ...concept.lesson, sections: [...concept.lesson.sections, { title: '심화', paragraphs: ['추가 설명 '.repeat(1000)] }] } }
    expect(conceptReadingMinutes(expanded)).toBeGreaterThan(conceptReadingMinutes(concept))
  })
})
