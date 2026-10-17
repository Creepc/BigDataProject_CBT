import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { ExamRecord, Question, StudyState } from '@/types'
import { isAnswerCorrect } from '@/lib/study'
import { createInitialStudyState, parseStudyStateJson, reconcileStudyState } from '@/lib/studyState'
import { courseData } from '@/data/courseData'

const STORAGE_KEY = 'bigdata-midterm-study-v1'

type Action =
  | { type: 'TOGGLE_CONCEPT'; id: string; label: string }
  | { type: 'TOGGLE_BOOKMARK'; id: string }
  | { type: 'TOGGLE_REVIEW'; id: string }
  | { type: 'RECORD_ATTEMPT'; question: Question; selected: string[] }
  | { type: 'SAVE_EXAM'; exam: ExamRecord }
  | { type: 'SET_THEME'; theme: StudyState['theme'] }
  | { type: 'RATE_CARD'; id: string; rating: 'again' | 'hard' | 'good' }
  | { type: 'IMPORT'; state: StudyState }
  | { type: 'RESET' }

const activity = (type: 'concept' | 'question' | 'exam' | 'review', label: string, targetId?: string) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type,
  label,
  at: new Date().toISOString(),
  targetId,
})

const reducer = (state: StudyState, action: Action): StudyState => {
  switch (action.type) {
    case 'TOGGLE_CONCEPT': {
      const completed = state.completedConceptIds.includes(action.id)
      return {
        ...state,
        completedConceptIds: completed
          ? state.completedConceptIds.filter((id) => id !== action.id)
          : [...state.completedConceptIds, action.id],
        activities: completed
          ? state.activities
          : [activity('concept', `${action.label} 학습 완료`, action.id), ...state.activities].slice(0, 60),
      }
    }
    case 'TOGGLE_BOOKMARK':
      return {
        ...state,
        bookmarkedQuestionIds: state.bookmarkedQuestionIds.includes(action.id)
          ? state.bookmarkedQuestionIds.filter((id) => id !== action.id)
          : [...state.bookmarkedQuestionIds, action.id],
      }
    case 'TOGGLE_REVIEW':
      return {
        ...state,
        reviewCompletedQuestionIds: state.reviewCompletedQuestionIds.includes(action.id)
          ? state.reviewCompletedQuestionIds.filter((id) => id !== action.id)
          : [...state.reviewCompletedQuestionIds, action.id],
      }
    case 'RECORD_ATTEMPT': {
      const correct = isAnswerCorrect(action.question, action.selected)
      const before = state.attempts[action.question.id]
      const now = new Date().toISOString()
      return {
        ...state,
        attempts: {
          ...state.attempts,
          [action.question.id]: {
            questionId: action.question.id,
            count: (before?.count ?? 0) + 1,
            correctCount: (before?.correctCount ?? 0) + (correct ? 1 : 0),
            wrongCount: (before?.wrongCount ?? 0) + (correct ? 0 : 1),
            lastCorrect: correct,
            lastSelected: action.selected,
            lastAttemptAt: now,
            history: [...(before?.history ?? []), { selected: action.selected, correct, at: now }].slice(-30),
          },
        },
        reviewCompletedQuestionIds: correct
          ? state.reviewCompletedQuestionIds
          : state.reviewCompletedQuestionIds.filter((id) => id !== action.question.id),
        activities: [
          activity('question', `${correct ? '정답' : '오답'} · ${action.question.prompt.slice(0, 28)}…`, action.question.id),
          ...state.activities,
        ].slice(0, 60),
      }
    }
    case 'SAVE_EXAM':
      return {
        ...state,
        exams: [action.exam, ...state.exams].slice(0, 50),
        activities: [activity('exam', `모의고사 ${action.exam.score}점`, action.exam.id), ...state.activities].slice(0, 60),
      }
    case 'SET_THEME':
      return { ...state, theme: action.theme }
    case 'RATE_CARD':
      return { ...state, flashcardRatings: { ...state.flashcardRatings, [action.id]: action.rating } }
    case 'IMPORT':
      return action.state
    case 'RESET':
      return createInitialStudyState()
    default:
      return state
  }
}

const loadState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return createInitialStudyState()
    return reconcileStudyState(parseStudyStateJson(saved), courseData)
  } catch {
    return createInitialStudyState()
  }
}

interface StudyContextValue {
  state: StudyState
  toggleConcept: (id: string, label: string) => void
  toggleBookmark: (id: string) => void
  toggleReview: (id: string) => void
  recordAttempt: (question: Question, selected: string[]) => boolean
  saveExam: (exam: ExamRecord) => void
  setTheme: (theme: StudyState['theme']) => void
  rateCard: (id: string, rating: 'again' | 'hard' | 'good') => void
  exportData: () => string
  importData: (raw: string) => void
  reset: () => void
}

const StudyContext = createContext<StudyContextValue | null>(null)

export function StudyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('학습 기록을 로컬 저장소에 저장하지 못했습니다.', error)
    }
  }, [state])

  useLayoutEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => root.classList.toggle('dark', state.theme === 'dark' || (state.theme === 'system' && media.matches))
    applyTheme()
    if (state.theme !== 'system') return
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [state.theme])

  const value = useMemo<StudyContextValue>(() => ({
    state,
    toggleConcept: (id, label) => dispatch({ type: 'TOGGLE_CONCEPT', id, label }),
    toggleBookmark: (id) => dispatch({ type: 'TOGGLE_BOOKMARK', id }),
    toggleReview: (id) => dispatch({ type: 'TOGGLE_REVIEW', id }),
    recordAttempt: (question, selected) => {
      const correct = isAnswerCorrect(question, selected)
      dispatch({ type: 'RECORD_ATTEMPT', question, selected })
      return correct
    },
    saveExam: (exam) => dispatch({ type: 'SAVE_EXAM', exam }),
    setTheme: (theme) => dispatch({ type: 'SET_THEME', theme }),
    rateCard: (id, rating) => dispatch({ type: 'RATE_CARD', id, rating }),
    exportData: () => JSON.stringify(state, null, 2),
    importData: (raw) => {
      dispatch({ type: 'IMPORT', state: reconcileStudyState(parseStudyStateJson(raw), courseData) })
    },
    reset: () => dispatch({ type: 'RESET' }),
  }), [state])

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>
}

export const useStudy = () => {
  const context = useContext(StudyContext)
  if (!context) throw new Error('useStudy must be used inside StudyProvider')
  return context
}
