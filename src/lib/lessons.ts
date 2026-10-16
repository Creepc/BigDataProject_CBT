import type { Concept, ConceptLesson } from '@/types'

export const lessonReadingText = (lesson: ConceptLesson) => [
  ...lesson.objectives,
  ...lesson.prerequisites.flatMap((item) => [item.term, item.explanation]),
  ...lesson.sections.flatMap((section) => [section.title, ...section.paragraphs]),
  lesson.workedExample.title,
  lesson.workedExample.scenario,
  ...lesson.workedExample.steps.flatMap((step) => [step.title, step.explanation]),
  lesson.workedExample.conclusion,
  ...lesson.checks.flatMap((check) => [check.question, check.answer, check.explanation]),
  ...lesson.takeaways,
  ...(lesson.codeExample ? [lesson.codeExample.code, lesson.codeExample.explanation, ...lesson.codeExample.notes] : []),
].join(' ')

export const conceptReadingMinutes = (concept: Concept) => {
  const text = concept.lesson
    ? lessonReadingText(concept.lesson)
    : [concept.definition, concept.easyExplanation, ...concept.mechanism, ...concept.examples].join(' ')
  // 한글 설명을 읽고 예제를 따라가는 시간을 포함한 대략적인 안내입니다.
  return Math.max(3, Math.ceil(text.replace(/\s/g, '').length / 320))
}

export const conceptSearchText = (concept: Concept) => [
  concept.name, concept.unit, concept.definition, concept.easyExplanation, ...concept.tags,
  ...(concept.lesson ? [lessonReadingText(concept.lesson)] : []),
].join(' ').toLocaleLowerCase('ko-KR')
