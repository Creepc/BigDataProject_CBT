import { describe, expect, it } from 'vitest'
import type { Concept, CourseData, Flashcard, Question } from '@/types'
import { buildUnitExamSummaries, filterAndPrioritizeCards, searchConnectedPages } from '@/lib/studySummary'

const cards: Flashcard[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, front: id, back: id, conceptId: 'concept', fileId: 'file', pages: [1] }))

const concept: Concept = {
  id: 'concept',
  name: '연결된 핵심 개념',
  unit: '테스트 단원',
  fileId: 'file',
  pages: [1],
  definition: '정의',
  easyExplanation: '쉬운 설명',
  mechanism: [],
  examples: [],
  comparisons: [{ target: '비교 대상', difference: '차이' }],
  examPoints: [],
  misconceptions: ['대표 오개념'],
  relatedConceptIds: [],
  relatedQuestionIds: ['question'],
  level: '시험 대비',
  difficulty: '보통',
  importance: 5,
  evidenceType: '강의자료',
  tags: ['핵심어'],
}

const question: Question = {
  id: 'question',
  prompt: '연결 문항의 고유 표현',
  mode: 'single',
  options: [],
  conceptIds: ['concept'],
  sourceRefs: [{ fileId: 'file', pages: [1] }],
  difficulty: '보통',
  type: '개념 정의',
  review: '',
  memoryTip: '',
  additionalExample: '',
}

const data: CourseData = {
  files: [],
  pageSummaries: [{ fileId: 'file', page: 1, title: '색인 제목', keyPoints: [], visuals: [], codes: [] }],
  concepts: [concept],
  questions: [question],
  flashcards: cards,
  generatedAt: '2026-10-16',
}

describe('flashcard review queues', () => {
  it('places again and hard cards before unrated and good cards', () => {
    const result = filterAndPrioritizeCards(cards, { a: 'good', b: 'hard', c: 'again' }, 'priority')
    expect(result.map((card) => card.id)).toEqual(['c', 'b', 'd', 'a'])
  })

  it('can isolate weak cards', () => {
    const result = filterAndPrioritizeCards(cards, { a: 'good', b: 'hard', c: 'again' }, 'weak')
    expect(result.map((card) => card.id)).toEqual(['b', 'c'])
  })
})

describe('exam summary and source connections', () => {
  it('does not offer excluded source pages in study search', () => {
    const scopedData = { ...data, pageSummaries: [...data.pageSummaries, { fileId: 'file', page: 2, title: '제외된 추가 실습', keyPoints: ['검색용 금지 문구'], visuals: [], codes: [], excludedFromExam: true }] }
    expect(searchConnectedPages(scopedData, '금지 문구')).toEqual([])
    expect(searchConnectedPages(scopedData, '핵심 개념')).toHaveLength(1)
  })

  it('groups terms, important concepts, misconceptions, comparisons, and cards by unit', () => {
    const [summary] = buildUnitExamSummaries(data)
    expect(summary.highImportanceConcepts).toEqual([concept])
    expect(summary.terms).toEqual(expect.arrayContaining(['연결된 핵심 개념', '핵심어']))
    expect(summary.comparisons).toHaveLength(1)
    expect(summary.misconceptions).toHaveLength(1)
    expect(summary.flashcards).toHaveLength(4)
  })

  it('searches linked concept names and question prompts and returns page-level links', () => {
    const byConcept = searchConnectedPages(data, '핵심 개념')
    const byQuestion = searchConnectedPages(data, '고유 표현')
    expect(byConcept[0]?.concepts.map((item) => item.id)).toEqual(['concept'])
    expect(byQuestion[0]?.questions.map((item) => item.id)).toEqual(['question'])
  })
})
