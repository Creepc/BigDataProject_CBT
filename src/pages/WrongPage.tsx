import { useMemo, useState } from 'react'
import { BookOpen, Check, CheckCircle2, ExternalLink, History, Play, RotateCcw, XCircle } from 'lucide-react'
import type { CourseData, NavigationTarget } from '@/types'
import { useStudy } from '@/contexts/StudyContext'
import { formatPages, isReviewPending, isReviewRecovered } from '@/lib/study'
import { pdfPageUrl } from '@/lib/assets'
import { EmptyState, PageHeader } from '@/components/ui'
import { QuestionPrompt } from '@/components/QuestionPrompt'

const optionLabel = (index: number) => ['①', '②', '③', '④'][index]

export function WrongPage({ data, navigate }: { data: CourseData; navigate: (target: NavigationTarget) => void }) {
  const { state, toggleReview } = useStudy()
  const [filter, setFilter] = useState<'all' | 'pending' | 'recovered'>('all')
  const allWrongItems = useMemo(() => Object.values(state.attempts)
    .filter((attempt) => attempt.wrongCount > 0)
    .map((attempt) => ({ attempt, question: data.questions.find((question) => question.id === attempt.questionId) }))
    .filter((item) => item.question)
    .sort((a, b) => b.attempt.wrongCount - a.attempt.wrongCount || b.attempt.lastAttemptAt.localeCompare(a.attempt.lastAttemptAt)), [state.attempts, data.questions])
  const completedReviews = new Set(state.reviewCompletedQuestionIds)
  const wrongItems = useMemo(() => allWrongItems.filter(({ attempt }) => {
    const complete = completedReviews.has(attempt.questionId)
    return filter === 'all'
      || (filter === 'pending' && isReviewPending(attempt, complete))
      || (filter === 'recovered' && isReviewRecovered(attempt, complete))
  }), [allWrongItems, filter, state.reviewCompletedQuestionIds])
  const pendingIds = allWrongItems
    .filter(({ attempt }) => isReviewPending(attempt, completedReviews.has(attempt.questionId)))
    .map(({ attempt }) => attempt.questionId)

  return (
    <div className="animate-enter">
      <PageHeader eyebrow="ERROR NOTE" title="틀린 이유까지 남는 오답노트" copy="한 번이라도 틀린 문제의 누적 횟수와 최근 상태를 보존합니다. 다시 맞혀도 과거 오답 기록은 사라지지 않습니다." action={<button disabled={!pendingIds.length} onClick={() => navigate({ view: 'practice', id: pendingIds[0], params: { ids: pendingIds.join(','), scope: 'wrong' } })} className="button-primary"><Play size={17} />대기 문제 복습</button>} />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-200/60 p-1 dark:bg-white/5 sm:w-fit">
        {[{ id: 'all', label: '전체 오답' }, { id: 'pending', label: '복습 대기' }, { id: 'recovered', label: '최근 정답·완료' }].map((item) => <button key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id as typeof filter)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold ${filter === item.id ? 'bg-white text-cobalt shadow-sm dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500'}`}>{item.label}</button>)}
      </div>
      {wrongItems.length ? <div className="space-y-3">{wrongItems.map(({ attempt, question }) => {
        if (!question) return null
        const complete = state.reviewCompletedQuestionIds.includes(question.id)
        const lastWrong = [...attempt.history].reverse().find((historyItem) => !historyItem.correct)
        const wrongSelection = lastWrong?.selected ?? (attempt.lastCorrect ? [] : attempt.lastSelected)
        const lastWrongAt = lastWrong?.at ?? attempt.lastAttemptAt
        const selectedText = question.options.filter((option) => wrongSelection.includes(option.id)).map((option) => option.text).join(', ')
        const answerText = question.options.filter((option) => option.correct).map((option) => option.text).join(', ')
        return (
          <article key={question.id} className="surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2"><span className={`chip ${attempt.lastCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'}`}>{attempt.lastCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}{attempt.lastCorrect ? '최근 정답' : '최근 오답'}</span><span className="chip"><RotateCcw size={12} />누적 오답 {attempt.wrongCount}회</span><span className="chip"><History size={12} />총 {attempt.count}회</span>{complete && <span className="chip border-blue-200 bg-blue-50 text-cobalt dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"><Check size={12} />복습 완료</span>}</div>
            <QuestionPrompt prompt={question.prompt} headingClassName="mt-4 whitespace-pre-line text-sm font-extrabold leading-7 sm:text-base" />
            <time dateTime={lastWrongAt} className="mt-1 block text-[11px] text-slate-400">최근 오답 {new Date(lastWrongAt).toLocaleString('ko-KR')}</time>
            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-500/[0.07]"><span className="font-bold text-rose-600">최근 오답 선택</span><p className="mt-1 leading-5 text-slate-600 dark:text-slate-300">{selectedText || '미응답'}</p></div><div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/[0.07]"><span className="font-bold text-emerald-700">정답</span><p className="mt-1 leading-5 text-slate-600 dark:text-slate-300">{answerText}</p></div></div>
            <details className="mt-4 rounded-2xl border border-black/[0.07] bg-slate-50/70 p-4 dark:border-white/[0.08] dark:bg-white/[0.025]">
              <summary className="cursor-pointer text-sm font-black text-cobalt">네 선택지 전체 해설·출처 펼쳐보기</summary>
              <div className="mt-4 space-y-3">
                {question.options.map((option, index) => {
                  const picked = wrongSelection.includes(option.id)
                  return (
                    <section key={option.id} className={`rounded-xl border p-3 ${option.correct ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/[0.07]' : picked ? 'border-rose-200 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-500/[0.07]' : 'border-black/[0.06] bg-white dark:border-white/[0.07] dark:bg-black/10'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2"><p className="min-w-0 flex-1 text-xs font-bold leading-6"><span className={option.correct ? 'text-emerald-700' : 'text-slate-500'}>{optionLabel(index)} </span>{option.text}</p><div className="flex gap-1">{option.correct && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">정답</span>}{picked && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-ink">당시 선택</span>}</div></div>
                      <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">{option.explanation}</p>
                    </section>
                  )
                })}
              </div>
              <div className="mt-4 border-t border-black/[0.06] pt-3 dark:border-white/[0.07]"><p className="mb-2 text-xs font-black">강의자료 근거</p><div className="flex flex-wrap gap-2">{question.sourceRefs.map((ref) => { const file = data.files.find((item) => item.id === ref.fileId); return file ? <a key={`${ref.fileId}-${ref.pages.join('-')}`} href={pdfPageUrl(file, ref.pages[0])} target="_blank" rel="noreferrer" className="chip hover:border-cobalt hover:text-cobalt">{file.shortTitle} {formatPages(ref.pages)}<ExternalLink size={12} aria-hidden="true" /></a> : null })}</div></div>
            </details>
            <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => navigate({ view: 'practice', id: question.id, params: { scope: 'wrong' } })} className="button-primary"><Play size={15} />다시 풀기</button><button onClick={() => { const id = question.conceptIds[0]; if (id) navigate({ view: 'learn', id }) }} className="button-secondary"><BookOpen size={15} />개념 복습</button><button onClick={() => toggleReview(question.id)} className="button-secondary">{complete ? '복습 완료 취소' : '복습 완료 표시'}</button></div>
          </article>
        )
      })}</div> : <EmptyState title="표시할 오답이 없습니다" copy={filter === 'all' ? '문제를 풀다가 틀리면 자동으로 이곳에 기록됩니다.' : '이 상태에 해당하는 문제가 없습니다.'} action={<button onClick={() => navigate({ view: 'bank' })} className="button-primary">문제 풀러 가기</button>} />}
    </div>
  )
}
