import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { isDeepStrictEqual } from 'node:util'

const readData = (source) => JSON.parse(source.slice(source.indexOf(' = ') + 3))
const current = readData(fs.readFileSync('src/data/courseData.ts', 'utf8'))
const baselineRef = process.argv[2]
let baselineData
if (baselineRef) {
  const baseline = readData(execFileSync('git', ['show', `${baselineRef}:src/data/courseData.ts`], { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 }))
  baselineData = baseline
  const byId = new Map(current.questions.map((question) => [question.id, question]))
  const changed = baseline.questions.filter((question) => !isDeepStrictEqual(question, byId.get(question.id)))
  if (changed.length) throw new Error(`Existing questions changed: ${changed.map((question) => question.id).join(', ')}`)
  for (const concept of baseline.concepts) {
    const next = current.concepts.find((item) => item.id === concept.id)
    if (!next || !isDeepStrictEqual({ ...concept, relatedQuestionIds: [] }, { ...next, relatedQuestionIds: [] })) throw new Error(`Existing concept changed: ${concept.id}`)
  }
  if (!isDeepStrictEqual(baseline.mockExams, current.mockExams) || !isDeepStrictEqual(baseline.flashcards, current.flashcards)) throw new Error('Existing mock papers or flashcards changed')
  for (const exam of baseline.finalReview?.exams ?? []) {
    if (!isDeepStrictEqual(exam, current.finalReview?.exams.find((item) => item.id === exam.id))) throw new Error(`Existing final paper changed: ${exam.id}`)
  }
  console.log(JSON.stringify({ preservedQuestions: baseline.questions.length, preservedConcepts: baseline.concepts.length, preservedMockExams: baseline.mockExams.length, preservedFinalExams: baseline.finalReview?.exams.length ?? 0, preservedFlashcards: baseline.flashcards.length }))
}

const grams = (text) => {
  const normalized = text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  return new Set(Array.from({ length: Math.max(0, normalized.length - 2) }, (_, index) => normalized.slice(index, index + 3)))
}
const baselineQuestions = baselineData?.questions ?? current.questions.filter((question) => !question.id.startsWith('mid-'))
const baselineIds = new Set(baselineQuestions.map((question) => question.id))
const base = baselineQuestions.map((question) => ({ id: question.id, grams: grams(question.prompt), prompt: question.prompt }))
const similarities = current.questions.filter((question) => !baselineIds.has(question.id)).map((question) => {
  const left = grams(question.prompt)
  const closest = base.map((item) => {
    const intersection = [...left].filter((gram) => item.grams.has(gram)).length
    return { ...item, similarity: intersection / (left.size + item.grams.size - intersection) }
  }).sort((a, b) => b.similarity - a.similarity)[0]
  return { id: question.id, similarity: Number(closest.similarity.toFixed(3)), previousId: closest.id, prompt: question.prompt, previousPrompt: closest.prompt }
}).sort((a, b) => b.similarity - a.similarity)
console.log(JSON.stringify({ nearestPreviousPromptsForHumanReview: similarities.slice(0, 8) }, null, 2))
