import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { courseData } from '@/data/courseData'
import { validateCourseData } from '@/lib/study'
import { lessonReadingText } from '@/lib/lessons'

describe('course content integrity', () => {
  it('limits every study feature and source reference to the Netflix exam scope', () => {
    expect(JSON.stringify(courseData)).not.toMatch(/titanic|타이타닉|Survived|PassengerId|Pclass|생존율|생존자/i)
    expect(courseData.concepts.some((concept) => concept.id === 'web-c32')).toBe(false)
    expect(courseData.questions.some((question) => ['web-q26', 'web-q43'].includes(question.id))).toBe(false)
    expect(courseData.flashcards.some((card) => ['web-fc32', 'web-fc44'].includes(card.id))).toBe(false)
    const excludedPages = new Set([19, 20, 23])
    const refs = [
      ...courseData.concepts.map((concept) => ({ fileId: concept.fileId, pages: concept.pages })),
      ...courseData.concepts.flatMap((concept) => concept.lesson?.sourceRefs ?? []),
      ...courseData.questions.flatMap((question) => question.sourceRefs),
      ...courseData.flashcards.map((card) => ({ fileId: card.fileId, pages: card.pages })),
    ]
    refs.filter((ref) => ref.fileId === 'web3').forEach((ref) => expect(ref.pages.some((page) => excludedPages.has(page))).toBe(false))
    expect(courseData.pageSummaries.filter((page) => page.excludedFromExam).map((page) => page.page)).toEqual([19, 20, 23])
    expect(courseData.files.find((file) => file.id === 'web3')?.excludedPages).toEqual([19, 20, 23])
  })
  it('provides a complete source-grounded lesson and reasoned self-checks for every concept', () => {
    const files = new Map(courseData.files.map((file) => [file.id, file]))
    courseData.concepts.forEach((concept) => {
      const lesson = concept.lesson
      expect(lesson, concept.id).toBeDefined()
      if (!lesson) return
      expect(lesson.conceptId).toBe(concept.id)
      expect(lesson.objectives.length, concept.id).toBeGreaterThanOrEqual(3)
      expect(lesson.prerequisites.length, concept.id).toBeGreaterThanOrEqual(2)
      expect(lesson.sections.length, concept.id).toBeGreaterThanOrEqual(3)
      lesson.sections.forEach((section) => {
        expect(section.title.trim()).not.toBe('')
        expect(section.paragraphs.length, concept.id).toBeGreaterThanOrEqual(2)
        section.paragraphs.forEach((paragraph) => expect(paragraph.trim().length, `${concept.id}: ${section.title}`).toBeGreaterThanOrEqual(30))
      })
      expect(lesson.workedExample.steps.length, concept.id).toBeGreaterThanOrEqual(3)
      expect(lesson.workedExample.scenario.trim()).not.toBe('')
      expect(lesson.workedExample.conclusion.trim()).not.toBe('')
      expect(lesson.checks.length, concept.id).toBeGreaterThanOrEqual(2)
      lesson.checks.forEach((check) => {
        expect(check.question.trim()).not.toBe('')
        expect(check.answer.trim()).not.toBe('')
        expect(check.explanation.trim().length, concept.id).toBeGreaterThanOrEqual(30)
      })
      expect(lessonReadingText(lesson).length, concept.id).toBeGreaterThanOrEqual(1100)
      expect(lesson.sourceRefs.length, concept.id).toBeGreaterThan(0)
      lesson.sourceRefs.forEach((ref) => {
        expect(files.has(ref.fileId)).toBe(true)
        expect(ref.pages.length).toBeGreaterThan(0)
        ref.pages.forEach((page) => {
          expect(page).toBeGreaterThanOrEqual(1)
          expect(page).toBeLessThanOrEqual(files.get(ref.fileId)!.pageCount)
        })
      })
    })
    expect(courseData.concepts.filter((concept) => concept.lesson?.codeExample).length).toBeGreaterThanOrEqual(13)
  })

  it('preserves all seven original PDFs and indexes the 19-page final review exactly once', () => {
    expect(courseData.files.filter((file) => file.id !== 'prof-final')).toHaveLength(7)
    expect(courseData.files.filter((file) => file.id !== 'prof-final').reduce((sum, file) => sum + file.pageCount, 0)).toBe(317)
    expect(courseData.files).toHaveLength(8)
    expect(courseData.files.reduce((sum, file) => sum + file.pageCount, 0)).toBe(336)
    expect(courseData.pageSummaries).toHaveLength(336)

    courseData.files.forEach((file) => {
      const expected = Array.from({ length: file.pageCount }, (_, index) => index + 1)
      expect([...new Set(file.analyzedPages)].sort((a, b) => a - b)).toEqual(expected)
      expect(courseData.pageSummaries.filter((summary) => summary.fileId === file.id).map((summary) => summary.page).sort((a, b) => a - b)).toEqual(expected)
      expect(file.unreadablePages).toEqual([])
    })
  })

  it('keeps all generated study assets connected to valid sources', () => {
    expect(courseData.concepts).toHaveLength(110)
    expect(courseData.questions).toHaveLength(996)
    expect(courseData.flashcards).toHaveLength(131)
    expect(validateCourseData(courseData)).toEqual([])

    const files = new Map(courseData.files.map((file) => [file.id, file]))
    const concepts = new Set(courseData.concepts.map((concept) => concept.id))
    courseData.questions.forEach((question) => {
      expect(question.conceptIds.length).toBeGreaterThan(0)
      expect(question.sourceRefs.length).toBeGreaterThan(0)
      expect(new Set(question.options.map((option) => option.id)).size).toBe(4)
      question.options.forEach((option) => {
        expect(option.explanation.trim()).not.toBe('')
        if (option.correctedStatement !== undefined) expect(option.correctedStatement.trim()).not.toBe('')
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

  it('keeps all option explanations concise and free of generic filler', () => {
    courseData.questions.forEach((question) => question.options.forEach((option) => {
      const label = `${question.id}.${option.id}`
      expect(option.explanation.trim().length, label).toBeGreaterThan(4)
      expect(option.explanation.length, label).toBeLessThanOrEqual(180)
      expect(option.explanation, label).not.toMatch(/이 선택지는|혼동|핵심 (?:판별 )?기준|고치면 올바른 설명/)
    }))
  })

  it('contains balanced single answers, multiple-answer items, and usable graph data', () => {
    const multiple = courseData.questions.filter((question) => question.mode === 'multiple')
    expect(multiple.length).toBeGreaterThanOrEqual(152)
    multiple.forEach((question) => expect(question.options.filter((option) => option.correct).length).toBeGreaterThanOrEqual(2))

    const positions = [0, 1, 2, 3].map((index) => courseData.questions.filter((question) => question.mode === 'single' && question.options[index].correct).length)
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(Math.max(2, Math.ceil(positions.reduce((sum, count) => sum + count, 0) / 50)))

    const visuals = courseData.questions.flatMap((question) => question.visual ? [question.visual] : [])
    expect(visuals.length).toBeGreaterThanOrEqual(42)
    const charts = visuals.filter((visual) => visual.kind !== 'source-image')
    const sourceImages = visuals.filter((visual) => visual.kind === 'source-image')
    expect(charts.length).toBeGreaterThanOrEqual(32)
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
