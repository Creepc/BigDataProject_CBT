import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Play } from 'lucide-react'
import type { CourseData, NavigationTarget, StudyState } from '@/types'
import { getLearningPaths, getLearningQuestions, learningStages } from '@/lib/curriculum'
import { EmptyState, ProgressBar, SearchInput } from './ui'

export function QuestionCurriculum({ data, state, navigate }: { data: CourseData; state: StudyState; navigate: (target: NavigationTarget) => void }) {
  const [query, setQuery] = useState('')
  const [file, setFile] = useState('all')
  const [onlyPending, setOnlyPending] = useState(false)
  const paths = useMemo(() => getLearningPaths(data, state.attempts), [data, state.attempts])
  const learningQuestions = useMemo(() => getLearningQuestions(data), [data])
  const complete = paths.filter((path) => path.questions.length > 0 && path.answered === path.questions.length).length
  const next = learningQuestions.find((question) => !state.attempts[question.id])
    ?? learningQuestions.find((question) => !state.attempts[question.id]?.lastCorrect)
    ?? learningQuestions[0]
  const filtered = paths.filter(({ concept, answered, questions }) => (file === 'all' || concept.fileId === file)
    && (!onlyPending || answered < questions.length)
    && (!query || `${concept.name} ${concept.unit} ${concept.tags.join(' ')}`.toLocaleLowerCase('ko-KR').includes(query.toLocaleLowerCase('ko-KR'))))

  return <section aria-label="문제로 개념 완주">
    <div className="surface mb-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="eyebrow">QUESTION LEARNING PATH</div><h2 className="mt-2 text-xl font-black">문제로 {data.concepts.length}개 개념 완주</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">개념마다 기초 → 원리 → 적용 → 종합 4문항을 풉니다. 각 개념의 학습 목표를 문제와 짧은 해설로 익힌 뒤, 전체 문제은행에서 다른 유형을 연습하세요.</p></div>
        <button className="button-primary" disabled={!next} onClick={() => next && navigate({ view: 'practice', id: next.id, params: { scope: 'curriculum' } })}><Play size={16} />{learningQuestions.some((question) => state.attempts[question.id]) ? '전체 코스 이어 풀기' : '전체 코스 시작'}</button>
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs font-bold text-slate-500"><span>{complete}/{data.concepts.length}개 개념 풀이 완료</span><span>학습형 {learningQuestions.length}문항 · 개념별 학습 목표 {data.concepts.reduce((sum, concept) => sum + (concept.lesson?.objectives.length ?? 0), 0)}개 연결</span></div>
      <div className="mt-2"><ProgressBar value={complete / Math.max(1, data.concepts.length) * 100} /></div>
      <p className="mt-3 text-[11px] leading-5 text-slate-400">‘풀이 완료’는 4문항 모두 답안을 제출한 상태입니다. 정답 수는 최근 답안 기준이며, 실제 시험 점수를 보장하지 않습니다.</p>
    </div>
    <div className="mb-5 grid gap-3 md:grid-cols-[1fr_17rem_auto]">
      <SearchInput value={query} onChange={setQuery} ariaLabel="학습 코스 개념 검색" placeholder="공부할 개념·단원 검색" />
      <select className="input" aria-label="학습 코스 강의자료 필터" value={file} onChange={(event) => setFile(event.target.value)}><option value="all">모든 강의자료</option>{data.files.map((source) => <option key={source.id} value={source.id}>{source.shortTitle}</option>)}</select>
      <button className="button-secondary" aria-pressed={onlyPending} onClick={() => setOnlyPending((value) => !value)}>{onlyPending && <CheckCircle2 size={15} />}미완료 개념만</button>
    </div>
    {filtered.length ? <div className="grid gap-3 lg:grid-cols-2">{filtered.map(({ concept, questions, answered, correct, next: nextQuestion }) => <article key={concept.id} className="surface-flat p-5">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[11px] text-slate-400">{data.files.find((source) => source.id === concept.fileId)?.shortTitle} · {concept.unit}</p><h3 className="mt-2 font-extrabold leading-7">{concept.name}</h3></div>{answered === questions.length && questions.length > 0 && <CheckCircle2 size={19} className="shrink-0 text-emerald-600" aria-label="풀이 완료" />}</div>
      <div className="mt-4 grid grid-cols-4 gap-1.5">{learningStages.map((stage) => { const question = questions.find((item) => item.learningStage === stage); const attempt = question ? state.attempts[question.id] : undefined; return <button key={stage} disabled={!question} aria-label={`${concept.name} ${stage} 문제`} onClick={() => question && navigate({ view: 'practice', id: question.id, params: { scope: 'curriculum', concept: concept.id } })} className={`rounded-lg border px-2 py-2 text-xs font-bold ${attempt?.lastCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : attempt ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300' : 'border-black/[0.07] text-slate-500 hover:border-cobalt hover:text-cobalt dark:border-white/10'}`}>{stage}{attempt ? attempt.lastCorrect ? ' ✓' : ' · 복습' : ''}</button> })}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-400">{answered}/{questions.length}문항 풀이 · 최근 정답 {correct}/{questions.length}</span><button className="inline-flex items-center gap-1.5 text-xs font-extrabold text-cobalt dark:text-blue-300" disabled={!nextQuestion} onClick={() => nextQuestion && navigate({ view: 'practice', id: nextQuestion.id, params: { scope: 'curriculum', concept: concept.id } })}>{answered ? '이 개념 이어 풀기' : '이 개념 공부하기'}<ArrowRight size={14} /></button></div>
    </article>)}</div> : <EmptyState title="조건에 맞는 학습 코스가 없습니다" copy="검색어나 강의자료 필터를 바꿔 보세요." />}
  </section>
}
