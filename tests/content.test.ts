import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { courseData } from '@/data/courseData'
import { validateCourseData } from '@/lib/study'

describe('course content integrity', () => {
  it('covers every page in all seven source PDFs exactly once', () => {
    expect(courseData.files).toHaveLength(7)
    expect(courseData.files.reduce((sum, file) => sum + file.pageCount, 0)).toBe(317)
    expect(courseData.pageSummaries).toHaveLength(317)

    courseData.files.forEach((file) => {
      const expected = Array.from({ length: file.pageCount }, (_, index) => index + 1)
      expect([...new Set(file.analyzedPages)].sort((a, b) => a - b)).toEqual(expected)
      expect(courseData.pageSummaries.filter((summary) => summary.fileId === file.id).map((summary) => summary.page).sort((a, b) => a - b)).toEqual(expected)
      expect(file.unreadablePages).toEqual([])
    })
  })

  it('keeps all generated study assets connected to valid sources', () => {
    expect(courseData.concepts).toHaveLength(111)
    expect(courseData.questions).toHaveLength(118)
    expect(courseData.flashcards).toHaveLength(133)
    expect(validateCourseData(courseData)).toEqual([])

    const files = new Map(courseData.files.map((file) => [file.id, file]))
    const concepts = new Set(courseData.concepts.map((concept) => concept.id))
    courseData.questions.forEach((question) => {
      expect(question.conceptIds.length).toBeGreaterThan(0)
      expect(question.sourceRefs.length).toBeGreaterThan(0)
      expect(new Set(question.options.map((option) => option.id)).size).toBe(4)
      question.options.forEach((option) => {
        expect(option.explanation.trim()).not.toBe('')
        expect(option.explanation.length).toBeGreaterThanOrEqual(80)
        expect(option.correctedStatement.trim()).not.toBe('')
      })
      question.sourceRefs.forEach((source) => {
        const file = files.get(source.fileId)
        expect(file).toBeDefined()
        expect(source.pages.length).toBeGreaterThan(0)
        source.pages.forEach((page) => expect(page).toBeGreaterThanOrEqual(1))
        source.pages.forEach((page) => expect(page).toBeLessThanOrEqual(file!.pageCount))
      })
    })
    courseData.flashcards.forEach((card) => {
      expect(concepts.has(card.conceptId)).toBe(true)
      expect(files.has(card.fileId)).toBe(true)
      expect(card.pages.length).toBeGreaterThan(0)
    })
    const questionIds = new Set(courseData.questions.map((question) => question.id))
    courseData.concepts.forEach((concept) => {
      expect(concept.relatedQuestionIds.length).toBeGreaterThan(0)
      concept.relatedQuestionIds.forEach((id) => expect(questionIds.has(id)).toBe(true))
    })
  })

  it('contains balanced single answers, multiple-answer items, and usable graph data', () => {
    const multiple = courseData.questions.filter((question) => question.mode === 'multiple')
    expect(multiple).toHaveLength(43)
    multiple.forEach((question) => expect(question.options.filter((option) => option.correct).length).toBeGreaterThanOrEqual(2))

    const positions = [0, 1, 2, 3].map((index) => courseData.questions.filter((question) => question.mode === 'single' && question.options[index].correct).length)
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1)

    const visuals = courseData.questions.flatMap((question) => question.visual ? [question.visual] : [])
    expect(visuals).toHaveLength(21)
    const charts = visuals.filter((visual) => visual.kind !== 'source-image')
    const sourceImages = visuals.filter((visual) => visual.kind === 'source-image')
    expect(charts).toHaveLength(11)
    expect(sourceImages).toHaveLength(10)
    charts.forEach((visual) => {
      expect(['bar', 'line', 'histogram', 'scatter', 'box']).toContain(visual.kind)
      expect(visual.series.length).toBeGreaterThan(0)
      visual.series.forEach((series) => expect(series.values.length).toBeGreaterThan(0))
    })
    sourceImages.forEach((visual) => {
      expect(visual.sourceImage?.path).toMatch(/^figures\//)
      expect(visual.sourceImage?.page).toBeGreaterThan(0)
      expect(visual.sourceImage?.alt.trim()).not.toBe('')
      expect(existsSync(resolve('public', visual.sourceImage?.path ?? ''))).toBe(true)
    })
  })
})
