import { AlertCircle, BarChart3, BookOpen, BrainCircuit, CheckCircle2, Target } from 'lucide-react'
import type { CourseData, NavigationTarget } from '@/types'
import { useStudy } from '@/contexts/StudyContext'
import { calculateAccuracy, conceptStats } from '@/lib/study'
import { EmptyState, PageHeader, ProgressBar, Stat } from '@/components/ui'

export function StatsPage({ data, navigate }: { data: CourseData; navigate: (target: NavigationTarget) => void }) {
  const { state } = useStudy()
  const records = Object.values(state.attempts)
  const total = records.reduce((sum, item) => sum + item.count, 0)
  const stats = conceptStats(data, state.attempts).filter((item) => item.attempts > 0).sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
  const difficultyStats = (['쉬움', '보통', '어려움'] as const).map((difficulty) => {
    const ids = new Set(data.questions.filter((question) => question.difficulty === difficulty).map((question) => question.id))
    const items = records.filter((record) => ids.has(record.questionId))
    return { difficulty, accuracy: calculateAccuracy(items), attempts: items.reduce((sum, item) => sum + item.count, 0) }
  })
  const sourceStats = data.files.map((file) => {
    const ids = new Set(data.questions.filter((question) => question.sourceRefs.some((ref) => ref.fileId === file.id)).map((question) => question.id))
    const items = records.filter((record) => ids.has(record.questionId))
    return { file, accuracy: calculateAccuracy(items), attempts: items.reduce((sum, item) => sum + item.count, 0) }
  })
  const weak = stats.filter((item) => item.accuracy < 70)

  return (
    <div className="animate-enter">
      <PageHeader eyebrow="LEARNING ANALYTICS" title="응답 횟수와 함께 보는 취약도" copy="정답률이 낮아도 응답 수가 적으면 이해도를 확정하지 않습니다. 최소 3회 이상 응답한 개념부터 분석 신뢰도가 높아집니다." />
      {total ? <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat icon={<Target size={18} />} label="전체 정답률" value={`${calculateAccuracy(records)}%`} detail={`${total}회 응답 기준`} /><Stat icon={<BrainCircuit size={18} />} label="평가된 개념" value={`${stats.length}개`} detail={`전체 ${data.concepts.length}개`} tone="green" /><Stat icon={<AlertCircle size={18} />} label="70% 미만 개념" value={`${weak.length}개`} detail="우선 복습 후보" tone="rose" /><Stat icon={<CheckCircle2 size={18} />} label="모의고사" value={`${state.exams.length}회`} detail={state.exams[0] ? `최근 ${state.exams[0].score}점` : '기록 없음'} tone="amber" /></div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="surface p-5 sm:p-6"><div className="flex items-center gap-2"><BarChart3 size={18} className="text-cobalt" /><h2 className="section-title">난이도별 정답률</h2></div><div className="mt-5 space-y-5">{difficultyStats.map((item) => <div key={item.difficulty}><div className="mb-2 flex items-end justify-between"><span className="text-sm font-bold">{item.difficulty}</span><span className="text-xs text-slate-500"><strong className="text-lg text-ink dark:text-white">{item.accuracy}%</strong> · {item.attempts}회</span></div><ProgressBar value={item.accuracy} tone={item.accuracy < 60 ? 'amber' : item.accuracy >= 80 ? 'green' : 'blue'} /></div>)}</div></section>
          <section className="surface p-5 sm:p-6"><div className="flex items-center gap-2"><BookOpen size={18} className="text-cobalt" /><h2 className="section-title">강의자료별 정답률</h2></div><div className="mt-5 space-y-4">{sourceStats.map((item) => <div key={item.file.id} className="grid grid-cols-[2.2rem_1fr_auto] items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-black text-white" style={{ background: item.file.color }}>W{item.file.week}</span><div><div className="mb-1 truncate text-xs font-bold">{item.file.shortTitle}</div><ProgressBar value={item.accuracy} /></div><span className="text-xs font-black">{item.attempts ? `${item.accuracy}%` : '-'}</span></div>)}</div></section>
        </div>
        <section className="surface mt-5 overflow-hidden"><div className="border-b border-black/[0.07] p-5 dark:border-white/[0.07] sm:p-6"><h2 className="section-title">개념별 취약도</h2><p className="mt-1 text-xs text-slate-500">낮은 정답률 순 · 응답 1-2회는 표본 부족으로 표시</p></div><div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">{stats.map((item) => <button key={item.concept.id} onClick={() => navigate({ view: 'learn', id: item.concept.id })} className="grid w-full grid-cols-[3.4rem_1fr_auto] items-center gap-4 p-4 text-left hover:bg-blue-50/50 dark:hover:bg-white/[0.025] sm:px-6"><span className={`flex h-11 items-center justify-center rounded-xl text-sm font-black ${item.accuracy < 50 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : item.accuracy < 70 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'}`}>{item.accuracy}%</span><span className="min-w-0"><strong className="block truncate text-sm">{item.concept.name}</strong><span className="mt-1 block text-[11px] text-slate-400">{item.concept.unit} · 관련 문항 {item.questionCount}개</span></span><span className="text-right text-[11px] text-slate-400"><strong className="block text-xs text-slate-600 dark:text-slate-300">응답 {item.attempts}회</strong>{item.attempts < 3 ? '표본 부족' : '분석 가능'}</span></button>)}</div></section>
      </> : <EmptyState title="아직 분석할 응답이 없습니다" copy="문제은행 또는 모의고사에서 문제를 풀면 난이도·자료·개념별 정답률이 실제 기록으로 계산됩니다." action={<button onClick={() => navigate({ view: 'bank' })} className="button-primary">첫 문제 풀기</button>} />}
    </div>
  )
}
