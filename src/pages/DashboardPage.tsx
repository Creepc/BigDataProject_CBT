import {
  ArrowRight, BookCheck, BookOpen, BrainCircuit, CheckCircle2, CircleAlert,
  Clock3, Flame, RotateCcw, Sparkles, Target,
} from 'lucide-react'
import type { CourseData, NavigationTarget } from '@/types'
import { useStudy } from '@/contexts/StudyContext'
import { calculateAccuracy, conceptStats, isReviewPending } from '@/lib/study'
import { InlineLink, ProgressBar, ProgressRing, Stat } from '@/components/ui'

export function DashboardPage({ data, navigate }: { data: CourseData; navigate: (target: NavigationTarget) => void }) {
  const { state } = useStudy()
  const records = Object.values(state.attempts)
  const solved = records.reduce((sum, item) => sum + item.count, 0)
  const accuracy = calculateAccuracy(records)
  const progress = data.concepts.length ? Math.round((state.completedConceptIds.length / data.concepts.length) * 100) : 0
  const completedReviews = new Set(state.reviewCompletedQuestionIds)
  const wrong = records.filter((item) => isReviewPending(item, completedReviews.has(item.questionId))).sort((a, b) => b.lastAttemptAt.localeCompare(a.lastAttemptAt))
  const recentWrong = wrong[0]
  const recentWrongQuestion = recentWrong
    ? data.questions.find((question) => question.id === recentWrong.questionId)
    : undefined
  const difficultyStats = (['쉬움', '보통', '어려움'] as const).map((difficulty) => {
    const questionIds = new Set(data.questions.filter((question) => question.difficulty === difficulty).map((question) => question.id))
    const difficultyRecords = records.filter((record) => questionIds.has(record.questionId))
    return {
      difficulty,
      attempts: difficultyRecords.reduce((sum, record) => sum + record.count, 0),
      accuracy: calculateAccuracy(difficultyRecords),
    }
  })
  const unitQuestions = new Map<string, Set<string>>()
  data.concepts.forEach((concept) => {
    const ids = unitQuestions.get(concept.unit) ?? new Set<string>()
    data.questions.forEach((question) => {
      if (question.conceptIds.includes(concept.id)) ids.add(question.id)
    })
    unitQuestions.set(concept.unit, ids)
  })
  const unitStats = [...unitQuestions].map(([unit, questionIds]) => {
    const unitRecords = records.filter((record) => questionIds.has(record.questionId))
    return {
      unit,
      attempts: unitRecords.reduce((sum, record) => sum + record.count, 0),
      accuracy: calculateAccuracy(unitRecords),
    }
  }).filter((item) => item.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
  const weakUnit = unitStats[0]
  const weakness = conceptStats(data, state.attempts)
    .filter((item) => item.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
  const nextConcept = data.concepts
    .filter((concept) => !state.completedConceptIds.includes(concept.id))
    .sort((a, b) => b.importance - a.importance)[0]
  const oldestCompleted = data.concepts
    .filter((concept) => state.completedConceptIds.includes(concept.id))
    .map((concept) => ({ concept, at: state.activities.find((item) => item.type === 'concept' && item.targetId === concept.id)?.at ?? '' }))
    .sort((a, b) => a.at.localeCompare(b.at))[0]?.concept
  const recommendedConcept = nextConcept ?? oldestCompleted
  const nowHour = new Date().getHours()
  const greeting = nowHour < 12 ? '좋은 아침이에요' : nowHour < 18 ? '집중하기 좋은 오후예요' : '오늘 학습을 마무리해 볼까요'

  return (
    <div className="animate-enter">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-ink p-6 text-white shadow-soft sm:p-8 lg:p-10">
        <div className="noise absolute inset-0 opacity-60" />
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[40px] border-cobalt/20" />
        <div className="absolute bottom-0 right-1/4 h-28 w-28 translate-y-1/2 rounded-full bg-mint/20 blur-2xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-blue-300"><Sparkles size={15} />AI 기반 빅데이터 프로젝트 · 중간고사</div>
            <h1 className="max-w-2xl text-[clamp(1.8rem,5vw,3.35rem)] font-black leading-[1.15] tracking-[-0.055em]">{greeting}.<br />근거를 찾는 공부를 시작해요.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">{data.files.length}개 강의자료, {data.files.reduce((sum, file) => sum + file.pageCount, 0)}쪽의 범위를 개념-문제-오답으로 연결했습니다. 통계는 실제 학습 기록만 반영합니다.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="button-primary bg-white text-ink hover:bg-blue-100" onClick={() => nextConcept ? navigate({ view: 'learn', id: nextConcept.id }) : navigate({ view: 'learn' })}><BookOpen size={17} />이어 학습하기</button>
              <button className="button-secondary border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => navigate({ view: 'exam' })}><Target size={17} />모의고사 시작</button>
              <button className="button-secondary border-blue-300/40 bg-cobalt/30 text-white hover:bg-cobalt/50" onClick={() => navigate({ view: 'final' })}>최종 대비 · 중간 난도 120문항 추가<ArrowRight size={17} /></button>
            </div>
          </div>
          <div className="flex items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm">
            <ProgressRing value={progress} size={110} label="학습률" />
            <div className="min-w-28">
              <div className="text-3xl font-black tracking-tight">{state.completedConceptIds.length}<span className="text-base text-slate-400"> / {data.concepts.length}</span></div>
              <div className="mt-1 text-xs font-bold text-slate-400">완료한 핵심 개념</div>
              <div className="mt-4 flex items-center gap-2 text-xs text-amber-300"><Flame size={15} />오늘도 한 걸음</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<BookCheck size={18} />} label="학습한 개념" value={`${state.completedConceptIds.length}개`} detail={`전체 ${data.concepts.length}개`} />
        <Stat icon={<CheckCircle2 size={18} />} label="누적 풀이" value={`${solved}회`} detail={`${records.length}개 고유 문항`} tone="green" />
        <Stat icon={<Target size={18} />} label="전체 정답률" value={`${accuracy}%`} detail={solved ? '누적 응답 기준' : '아직 풀이 기록 없음'} tone="amber" />
        <Stat icon={<RotateCcw size={18} />} label="복습 대기" value={`${wrong.length}개`} detail="최근 오답·미완료 문항" tone="rose" />
      </section>

      <section className="mt-5 grid gap-3 lg:grid-cols-[1fr_.55fr]">
        <div className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="section-title">난이도별 정답률</h2><button onClick={() => navigate({ view: 'stats' })} className="text-xs font-bold text-cobalt">상세 통계</button></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {difficultyStats.map((item) => (
              <div key={item.difficulty}>
                <div className="mb-2 flex items-end justify-between gap-2"><span className="text-xs font-bold text-slate-500">{item.difficulty}</span><span className="text-sm font-black">{item.accuracy}%</span></div>
                <ProgressBar value={item.accuracy} tone={item.attempts && item.accuracy < 60 ? 'amber' : item.accuracy >= 80 ? 'green' : 'blue'} />
                <p className="mt-1.5 text-[10px] text-slate-400">누적 응답 {item.attempts}회</p>
              </div>
            ))}
          </div>
        </div>
        <div className="surface p-5 sm:p-6">
          <h2 className="section-title">취약 단원</h2>
          {weakUnit ? <div className="mt-4"><div className="flex items-end justify-between gap-3"><span className="text-sm font-extrabold leading-6">{weakUnit.unit}</span><span className={`text-2xl font-black ${weakUnit.accuracy < 60 ? 'text-rose-600' : 'text-amber-600'}`}>{weakUnit.accuracy}%</span></div><p className="mt-2 text-xs text-slate-500">누적 응답 {weakUnit.attempts}회를 기준으로 가장 낮은 단원입니다.</p></div> : <p className="mt-4 text-xs leading-6 text-slate-500">문제를 풀면 실제 기록을 기준으로 취약 단원을 찾아드립니다.</p>}
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div><div className="eyebrow">SOURCE PROGRESS</div><h2 className="section-title mt-1">강의자료별 진도</h2></div>
            <InlineLink onClick={() => navigate({ view: 'sources' })}>분석 범위 보기</InlineLink>
          </div>
          <div className="mt-5 space-y-4">
            {data.files.map((file) => {
              const ids = data.concepts.filter((concept) => concept.fileId === file.id).map((concept) => concept.id)
              const isFinal = file.id === data.finalReview?.fileId
              const finalQuestions = isFinal ? data.questions.filter((question) => question.finalExamId) : []
              const done = isFinal ? finalQuestions.filter((question) => state.attempts[question.id]?.lastSelected.length).length : ids.filter((id) => state.completedConceptIds.includes(id)).length
              const total = isFinal ? finalQuestions.length : ids.length
              const value = total ? Math.round((done / total) * 100) : 0
              return (
                <button key={file.id} onClick={() => navigate(file.id === data.finalReview?.fileId ? { view: 'final' } : { view: 'learn', params: { file: file.id } })} className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 text-left">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black text-white" style={{ background: file.color }}>W{file.week}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-bold group-hover:text-cobalt">{file.shortTitle}</span><span className="mt-1 block"><ProgressBar value={value} /></span></span>
                  <span className="text-xs font-bold text-slate-400">{done}/{total}{isFinal ? '문항' : ''}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-black/[0.07] p-5 dark:border-white/[0.08] sm:p-6">
            <div className="flex items-center gap-2"><BrainCircuit size={18} className="text-cobalt" /><h2 className="section-title">오늘의 추천</h2></div>
          </div>
          <div className="p-5 sm:p-6">
            {recentWrong && recentWrongQuestion ? (
              <button className="w-full rounded-2xl bg-rose-50 p-4 text-left dark:bg-rose-500/[0.08]" onClick={() => navigate({ view: 'practice', id: recentWrong.questionId, params: { scope: 'wrong' } })}>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">먼저 복습</span>
                <span className="mt-2 block text-sm font-bold leading-6">{recentWrongQuestion.prompt}</span>
                <time dateTime={recentWrong.lastAttemptAt} className="mt-1 block text-[11px] text-slate-500">최근 오답 · {new Date(recentWrong.lastAttemptAt).toLocaleString('ko-KR')}</time>
                <span className="mt-3 flex items-center gap-1 text-xs font-bold text-rose-600">바로 풀기<ArrowRight size={13} /></span>
              </button>
            ) : recommendedConcept ? (
              <button className="w-full rounded-2xl bg-blue-50 p-4 text-left dark:bg-blue-500/[0.08]" onClick={() => navigate({ view: 'learn', id: recommendedConcept.id })}>
                <span className="text-[11px] font-black uppercase tracking-wider text-cobalt">{nextConcept ? '다음 개념' : '오래된 개념 복습'}</span>
                <span className="mt-2 block text-sm font-bold leading-6">{recommendedConcept.name}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">중요도 {recommendedConcept.importance}/5 · {recommendedConcept.unit}</span>
              </button>
            ) : <p className="text-sm text-slate-500">모든 개념을 학습했습니다. 모의고사로 점검해 보세요.</p>}

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between text-sm font-black"><span>취약 개념</span><button onClick={() => navigate({ view: 'stats' })} className="text-xs text-cobalt">전체 분석</button></div>
              {weakness.length ? weakness.slice(0, 3).map((item) => (
                <button key={item.concept.id} onClick={() => navigate({ view: 'learn', id: item.concept.id })} className="mb-3 flex w-full items-center gap-3 text-left">
                  <span className={`flex h-9 w-12 items-center justify-center rounded-xl text-xs font-black ${item.accuracy < 50 ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10'}`}>{item.accuracy}%</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{item.concept.name}</span><span className="text-[10px] text-slate-400">응답 {item.attempts}회</span></span>
                </button>
              )) : <div className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-400 dark:border-white/10">문제를 풀면 취약 개념이 표시됩니다.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 surface p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><div className="eyebrow">RECENT ACTIVITY</div><h2 className="section-title mt-1">최근 학습 기록</h2></div><Clock3 size={19} className="text-slate-400" /></div>
        {state.activities.length ? (
          <div className="mt-4 divide-y divide-black/[0.06] dark:divide-white/[0.07]">
            {state.activities.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 text-sm"><span className="h-2 w-2 rounded-full bg-cobalt" /><span className="min-w-0 flex-1 truncate font-semibold">{item.label}</span><time className="text-xs text-slate-400">{new Date(item.at).toLocaleDateString('ko-KR')}</time></div>
            ))}
          </div>
        ) : <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/[0.03]"><CircleAlert size={17} />아직 기록이 없습니다. 개념 하나를 완료해 보세요.</div>}
      </section>
    </div>
  )
}
