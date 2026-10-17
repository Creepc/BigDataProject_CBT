import type { Concept, CourseData, Flashcard, PageSummary, Question, StudyState } from '@/types'

export type CardReviewFilter = 'priority' | 'weak' | 'again' | 'hard' | 'good' | 'unrated' | 'all'
export type CardRating = StudyState['flashcardRatings'][string]

const ratingPriority: Record<CardRating | 'unrated', number> = {
  again: 0,
  hard: 1,
  unrated: 2,
  good: 3,
}

export const filterAndPrioritizeCards = (
  cards: Flashcard[],
  ratings: StudyState['flashcardRatings'],
  filter: CardReviewFilter,
) => {
  const filtered = cards.filter((card) => {
    const rating = ratings[card.id]
    if (filter === 'all' || filter === 'priority') return true
    if (filter === 'weak') return rating === 'again' || rating === 'hard'
    if (filter === 'unrated') return !rating
    return rating === filter
  })

  if (filter !== 'priority') return filtered

  return filtered
    .map((card, order) => ({ card, order }))
    .sort((left, right) => {
      const leftRating = ratings[left.card.id] ?? 'unrated'
      const rightRating = ratings[right.card.id] ?? 'unrated'
      return ratingPriority[leftRating] - ratingPriority[rightRating] || left.order - right.order
    })
    .map(({ card }) => card)
}

export interface UnitExamSummary {
  id: string
  unit: string
  fileId: string
  concepts: Concept[]
  highImportanceConcepts: Concept[]
  terms: string[]
  comparisons: Array<{ conceptName: string; target: string; difference: string }>
  misconceptions: Array<{ conceptName: string; text: string }>
  flashcards: Flashcard[]
}

const unique = <T,>(values: T[]) => [...new Set(values)]

export const buildUnitExamSummaries = (data: CourseData, fileId = 'all'): UnitExamSummary[] => {
  const concepts = data.concepts.filter((concept) => fileId === 'all' || concept.fileId === fileId)
  const groups = new Map<string, Concept[]>()

  concepts.forEach((concept) => {
    const key = `${concept.fileId}::${concept.unit}`
    groups.set(key, [...(groups.get(key) ?? []), concept])
  })

  return [...groups.entries()].map(([id, unitConcepts]) => {
    const conceptIds = new Set(unitConcepts.map((concept) => concept.id))
    const highImportanceConcepts = unitConcepts.filter((concept) => concept.importance >= 4)
    return {
      id,
      unit: unitConcepts[0]?.unit ?? '',
      fileId: unitConcepts[0]?.fileId ?? '',
      concepts: unitConcepts,
      highImportanceConcepts,
      terms: unique(unitConcepts.flatMap((concept) => [concept.name, ...concept.tags])),
      comparisons: unitConcepts.flatMap((concept) => concept.comparisons.map((comparison) => ({
        conceptName: concept.name,
        target: comparison.target,
        difference: comparison.difference,
      }))),
      misconceptions: unitConcepts.flatMap((concept) => concept.misconceptions.map((text) => ({ conceptName: concept.name, text }))),
      flashcards: data.flashcards.filter((card) => conceptIds.has(card.conceptId)),
    }
  })
}

export interface PageConnections {
  page: PageSummary
  concepts: Concept[]
  questions: Question[]
}

export const connectPageToStudyItems = (data: CourseData, page: PageSummary): PageConnections => ({
  page,
  concepts: data.concepts.filter((concept) => concept.fileId === page.fileId && concept.pages.includes(page.page)),
  questions: data.questions.filter((question) => question.sourceRefs.some((ref) => ref.fileId === page.fileId && ref.pages.includes(page.page))),
})

export const searchConnectedPages = (data: CourseData, query: string, limit = 60): PageConnections[] => {
  const normalized = query.trim().toLocaleLowerCase('ko-KR')
  if (normalized.length < 2) return []

  return data.pageSummaries
    .filter((page) => !page.excludedFromExam)
    .map((page) => connectPageToStudyItems(data, page))
    .filter(({ page, concepts, questions }) => [
      page.title,
      ...page.keyPoints,
      ...page.visuals,
      ...page.codes,
      ...concepts.map((concept) => concept.name),
      ...questions.map((question) => question.prompt),
    ].join(' ').toLocaleLowerCase('ko-KR').includes(normalized))
    .slice(0, limit)
}
