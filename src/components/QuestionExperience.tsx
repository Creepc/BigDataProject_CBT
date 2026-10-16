import { useEffect, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Check, CheckCircle2,
  ExternalLink, Lightbulb, Link2, RotateCcw, X, XCircle,
} from 'lucide-react'
import type { Concept, NavigationTarget, Question, SourceFile } from '@/types'
import { correctOptionIds, formatPages, isAnswerCorrect } from '@/lib/study'
import { pdfPageUrl } from '@/lib/assets'
import { useStudy } from '@/contexts/StudyContext'
import { DifficultyBadge, ProgressBar } from './ui'
import { QuestionVisual } from './QuestionVisual'

const optionLabel = (index: number) => ['①', '②', '③', '④'][index]

export function QuestionExplanation({
  question,
  selected,
  concepts,
  files,
  navigate,
}: {
  question: Question
  selected: string[]
  concepts: Concept[]
  files: SourceFile[]
  navigate: (target: NavigationTarget) => void
}) {
  const correct = isAnswerCorrect(question, selected)
  const answerLabels = question.options
    .map((option, index) => option.correct ? optionLabel(index) : null)
    .filter(Boolean).join(', ')
  const selectedLabels = question.options
    .map((option, index) => selected.includes(option.id) ? optionLabel(index) : null)
    .filter(Boolean).join(', ')

  return (
    <div className="mt-6 animate-enter space-y-5 border-t border-black/[0.07] pt-6 dark:border-white/10">
      <div className={`rounded-2xl border p-4 ${correct ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10'}`}>
        <div className="flex items-start gap-3">
          {correct ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 shrink-0 text-rose-600" />}
          <div>
            <div className="font-black">{correct ? '정답입니다' : '다시 구분해 볼 포인트가 있어요'}</div>
            <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">내 답: {selectedLabels || '미응답'} · 정답: {answerLabels}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="section-title">선택지 전체 해설</h3>
        <p className="mt-1 text-xs text-slate-500">정답뿐 아니라 각 오답이 어떤 개념과 섞였는지까지 확인하세요.</p>
        <div className="mt-4 space-y-3">
          {question.options.map((option, index) => {
            const picked = selected.includes(option.id)
            return (
              <article key={option.id} className={`rounded-2xl border p-4 ${option.correct ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/[0.07]' : picked ? 'border-rose-200 bg-rose-50/60 dark:border-rose-500/20 dark:bg-rose-500/[0.07]' : 'border-black/[0.07] bg-slate-50 dark:border-white/[0.07] dark:bg-white/[0.025]'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 gap-2.5">
                    <span className={`font-black ${option.correct ? 'text-emerald-600' : 'text-slate-500'}`}>{optionLabel(index)}</span>
                    <p className="text-sm font-bold leading-6">{option.text}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${option.correct ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>{option.correct ? '정답' : '오답'}</span>
                    {picked && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-ink">내 선택</span>}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{option.explanation}</p>
                {!option.correct && option.correctedStatement && (
                  <div className="mt-3 flex gap-2 rounded-xl bg-white/80 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:bg-black/20 dark:text-slate-300">
                    <RotateCcw size={14} className="mt-0.5 shrink-0 text-cobalt" /><span><strong>바르게 고치면:</strong> {option.correctedStatement}</span>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-500/[0.08]">
          <div className="flex items-center gap-2 text-sm font-black text-cobalt dark:text-blue-300"><Lightbulb size={17} />핵심 개념 복습</div>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{question.review}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/[0.08]">
          <div className="text-sm font-black text-amber-700 dark:text-amber-300">시험 직전 암기 포인트</div>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{question.memoryTip}</p>
          {question.additionalExample && <p className="mt-2 border-t border-amber-200/60 pt-2 text-xs leading-6 text-slate-500 dark:border-amber-500/20 dark:text-slate-400">예시 · {question.additionalExample}</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-black/[0.07] p-4 dark:border-white/10">
        <div className="mb-3 flex items-center gap-2 text-sm font-black"><Link2 size={16} className="text-cobalt" />근거와 연결</div>
        <div className="flex flex-wrap gap-2">
          {question.conceptIds.map((id) => {
            const concept = concepts.find((item) => item.id === id)
            return concept ? <button key={id} className="chip hover:border-cobalt hover:text-cobalt" onClick={() => navigate({ view: 'learn', id })}>개념 · {concept.name}</button> : null
          })}
          {question.sourceRefs.map((ref) => {
            const file = files.find((item) => item.id === ref.fileId)
            return file ? (
              <a key={`${ref.fileId}-${ref.pages.join('-')}`} className="chip hover:border-cobalt hover:text-cobalt" href={pdfPageUrl(file, ref.pages[0])} target="_blank" rel="noreferrer">
                {file.shortTitle} {formatPages(ref.pages)}<ExternalLink size={12} />
              </a>
            ) : null
          })}
        </div>
        {question.supplemental && <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-300">※ 이 문항은 강의자료를 바탕으로 이해를 돕기 위한 보충학습 요소를 포함합니다.</p>}
      </div>
    </div>
  )
}

export function QuestionPlayer({
  questions,
  initialId,
  concepts,
  files,
  navigate,
}: {
  questions: Question[]
  initialId?: string
  concepts: Concept[]
  files: SourceFile[]
  navigate: (target: NavigationTarget) => void
}) {
  const start = Math.max(0, questions.findIndex((question) => question.id === initialId))
  const queueKey = questions.map((question) => question.id).join(',')
  const [index, setIndex] = useState(start)
  const [selected, setSelected] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const { state, recordAttempt, toggleBookmark } = useStudy()
  const question = questions[index]

  useEffect(() => {
    setIndex(Math.max(0, questions.findIndex((item) => item.id === initialId)))
  }, [initialId, queueKey])

  useEffect(() => {
    setSelected([])
    setSubmitted(false)
  }, [index, question?.id])

  if (!question) return null
  const bookmarked = state.bookmarkedQuestionIds.includes(question.id)
  const similarIndex = questions.findIndex((item, itemIndex) => itemIndex !== index && item.conceptIds.some((id) => question.conceptIds.includes(id)))

  const select = (id: string) => {
    if (submitted) return
    setSelected((before) => question.mode === 'single'
      ? [id]
      : before.includes(id) ? before.filter((item) => item !== id) : [...before, id])
  }

  const submit = () => {
    if (!selected.length) return
    recordAttempt(question, selected)
    setSubmitted(true)
  }

  const go = (next: number) => {
    setIndex(Math.max(0, Math.min(questions.length - 1, next)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <button onClick={() => navigate({ view: 'bank' })} className="button-secondary"><ArrowLeft size={17} />문제은행</button>
        <div className="min-w-0 flex-1 text-center">
          <div className="text-xs font-bold text-slate-500">{index + 1} / {questions.length}</div>
          <ProgressBar value={((index + 1) / questions.length) * 100} />
        </div>
        <button onClick={() => toggleBookmark(question.id)} className="button-secondary px-3" aria-label={bookmarked ? '북마크 해제' : '북마크 추가'} aria-pressed={bookmarked}>
          {bookmarked ? <BookmarkCheck size={18} className="text-cobalt" /> : <Bookmark size={18} />}
        </button>
      </div>

      <article className="surface p-5 sm:p-7 lg:p-9">
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={question.difficulty} />
          <span className="chip">{question.type}</span>
          <span className={`chip ${question.mode === 'multiple' ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300' : ''}`}>{question.mode === 'multiple' ? '복수 정답' : '단일 정답'}</span>
          <span className="ml-auto text-xs font-bold text-slate-400">{question.id}</span>
        </div>
        {question.professorFocus && <div className="mt-5 rounded-xl border-l-4 border-amber bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"><strong>교수님 필기 반영 · </strong>{question.professorFocus}</div>}
        <h2 className="mt-6 text-lg font-extrabold leading-8 tracking-[-0.02em] sm:text-xl">{question.prompt}</h2>
        {question.visual && <QuestionVisual visual={question.visual} files={files} />}
        <p className="mt-2 text-xs text-slate-500">{question.mode === 'multiple' ? '옳은 것을 모두 선택하세요. 정답은 2개 이상입니다.' : '가장 적절한 답 하나를 선택하세요.'}</p>

        <div className="mt-6 space-y-3" role={question.mode === 'multiple' ? 'group' : 'radiogroup'} aria-label="선택지">
          {question.options.map((option, optionIndex) => {
            const picked = selected.includes(option.id)
            const revealClass = submitted
              ? option.correct ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10' : picked ? 'border-rose-400 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10' : 'opacity-70'
              : picked ? 'border-cobalt bg-blue-50 ring-1 ring-cobalt dark:border-blue-400 dark:bg-blue-500/10' : 'hover:border-cobalt/40 hover:bg-blue-50/50 dark:hover:bg-white/[0.04]'
            return (
              <button
                key={option.id}
                onClick={() => select(option.id)}
                disabled={submitted}
                role={question.mode === 'multiple' ? 'checkbox' : 'radio'}
                aria-checked={picked}
                className={`flex w-full items-start gap-3 rounded-2xl border border-black/[0.09] p-4 text-left transition dark:border-white/10 ${revealClass}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${picked ? 'border-cobalt bg-cobalt text-white' : 'border-slate-200 text-slate-500 dark:border-white/10'}`}>
                  {submitted && option.correct ? <Check size={15} /> : submitted && picked ? <X size={15} /> : optionLabel(optionIndex)}
                </span>
                <span className="pt-0.5 text-sm font-semibold leading-6">{option.text}</span>
              </button>
            )
          })}
        </div>

        {!submitted ? (
          <button onClick={submit} disabled={!selected.length} className="button-primary mt-6 w-full sm:w-auto sm:min-w-36">답안 제출</button>
        ) : (
          <QuestionExplanation question={question} selected={selected} concepts={concepts} files={files} navigate={navigate} />
        )}
      </article>

      <div className="mt-5 flex items-center justify-between">
        <button disabled={index === 0} onClick={() => go(index - 1)} className="button-secondary"><ArrowLeft size={17} />이전</button>
        <div className="flex gap-2">
          {submitted && similarIndex >= 0 && similarIndex !== index + 1 && <button onClick={() => go(similarIndex)} className="button-secondary">유사 문제</button>}
          <button disabled={!submitted || index === questions.length - 1} onClick={() => go(index + 1)} className="button-primary">다음 문제<ArrowRight size={17} /></button>
        </div>
      </div>
    </div>
  )
}
