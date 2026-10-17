import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { courseData } from '@/data/courseData'
import { QuestionCurriculum } from '@/components/QuestionCurriculum'
import { getLearningPaths, getLearningQuestions, learningStages } from '@/lib/curriculum'
import { createInitialStudyState } from '@/lib/studyState'

describe('question-only learning curriculum', () => {
  it('directly covers all 110 concepts and every lesson objective in four distinct stages', () => {
    const paths = getLearningPaths(courseData, {})
    expect(paths).toHaveLength(110)
    expect(getLearningQuestions(courseData)).toHaveLength(440)
    for (const { concept, questions } of paths) {
      expect(questions, concept.id).toHaveLength(4)
      expect(questions.map((question) => question.learningStage), concept.id).toEqual(learningStages)
      const covered = new Set(questions.flatMap((question) => question.learningObjectiveIndices ?? []))
      expect([...covered].sort(), concept.id).toEqual(concept.lesson!.objectives.map((_, index) => index))
      questions.forEach((question) => {
        expect(question.conceptIds).toContain(concept.id)
        expect(question.review.trim().length, question.id).toBeGreaterThanOrEqual(20)
        expect(question.memoryTip.trim(), question.id).not.toBe('')
        question.sourceRefs.forEach((ref) => expect(courseData.files.some((file) => file.id === ref.fileId)).toBe(true))
      })
    }
    expect(new Set(courseData.questions.map((question) => question.prompt.replace(/\s+/g, '').toLowerCase())).size).toBe(courseData.questions.length)
  })

  it('orders the whole course by concept and stage, without unrelated questions', () => {
    const first = courseData.concepts[0]
    const firstCourse = getLearningQuestions(courseData, first.id)
    expect(getLearningQuestions(courseData).slice(0, 4)).toEqual(firstCourse)
    expect(firstCourse.map((question) => question.learningStage)).toEqual(learningStages)
    expect(getLearningQuestions(courseData, 'not-a-concept')).toEqual([])
    expect(courseData.questions.filter((question) => !question.learningStage)).toHaveLength(116)
  })

  it('continues unseen questions before revisiting wrong answers, and never equates submission with mastery', () => {
    const state = createInitialStudyState()
    const questions = getLearningQuestions(courseData, courseData.concepts[0].id)
    const makeAttempt = (id: string, correct: boolean) => ({
      questionId: id, count: 1, correctCount: correct ? 1 : 0, wrongCount: correct ? 0 : 1,
      lastCorrect: correct, lastSelected: [], lastAttemptAt: '2026-10-17T10:00:00Z',
      history: [{ selected: [], correct, at: '2026-10-17T10:00:00Z' }],
    })
    state.attempts[questions[0].id] = makeAttempt(questions[0].id, false)
    let path = getLearningPaths(courseData, state.attempts)[0]
    expect(path.next?.id).toBe(questions[1].id)
    expect(path.answered).toBe(1)
    expect(path.correct).toBe(0)
    questions.slice(1).forEach((question) => { state.attempts[question.id] = makeAttempt(question.id, true) })
    path = getLearningPaths(courseData, state.attempts)[0]
    expect(path.answered).toBe(4)
    expect(path.correct).toBe(3)
    expect(path.next?.id).toBe(questions[0].id)
  })

  it('shows course controls and honest progress without exposing option answers', () => {
    const html = renderToStaticMarkup(<QuestionCurriculum data={courseData} state={createInitialStudyState()} navigate={() => {}} />)
    expect(html).toContain('문제로 110개 개념 완주')
    expect(html).toContain('학습형 440문항')
    expect(html).toContain('학습 목표 330개 연결')
    expect(html).toContain('실제 시험 점수를 보장하지 않습니다')
    expect(html).toContain('전체 코스 시작')
    expect(html).toContain('최근 정답 0/4')
    expect(html).not.toContain(getLearningQuestions(courseData)[0].options[0].explanation)
  })
})
