import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlarmClock, AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, FileStack, Flag, ListChecks, Play, RotateCcw, Shuffle, Target, X,
} from 'lucide-react'
import type { CourseData, ExamRecord, MockExam, NavigationTarget, Question } from '@/types'
import { useStudy } from '@/contexts/StudyContext'
import { elapsedSecondsSince, isAnswerCorrect, selectExamQuestions, type ExamMix } from '@/lib/study'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import { DifficultyBadge, PageHeader, ProgressBar, Stat } from '@/components/ui'
import { QuestionExplanation } from '@/components/QuestionExperience'
import { QuestionVisual } from '@/components/QuestionVisual'
import { QuestionPrompt } from '@/components/QuestionPrompt'
import { FixedMockExamList } from '@/components/FixedMockExamList'
import { getAllFixedExams, getFixedMockExamScore, getMockExamQuestions } from '@/lib/mockExams'

type Stage = 'setup' | 'taking' | 'result'
const optionLabel = (index: number) => ['①', '②', '③', '④'][index]

export function ExamPage({ data, navigate, initialExamId, reviewLatest = false, returnFinalLevel }: { data: CourseData; navigate: (target: NavigationTarget) => void; initialExamId?: string; reviewLatest?: boolean; returnFinalLevel?: string }) {
  const { state, recordAttempt, saveExam } = useStudy()
  const [stage, setStage] = useState<Stage>('setup')
  const [selectedFiles, setSelectedFiles] = useState<string[]>(data.files.map((file) => file.id))
  const [count, setCount] = useState(Math.min(20, data.questions.length))
  const [minutes, setMinutes] = useState(20)
  const [mix, setMix] = useState<ExamMix>({ 쉬움: 30, 보통: 50, 어려움: 20 })
  const [randomOrder, setRandomOrder] = useState(true)
  const [examQuestions, setExamQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [current, setCurrent] = useState(0)
  const [flagged, setFlagged] = useState<string[]>([])
  const [startedAt, setStartedAt] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [showSubmit, setShowSubmit] = useState(false)
  const [result, setResult] = useState<ExamRecord | null>(null)
  const [resultIndex, setResultIndex] = useState(0)
  const [activeMockExamId, setActiveMockExamId] = useState<string>()
  const activeMockExam = getAllFixedExams(data).find((exam) => exam.id === activeMockExamId)
  const openedInitial = useRef(false)
  const submittingRef = useRef(false)
  const examContentRef = useRef<HTMLDivElement>(null)
  const submitDialogRef = useRef<HTMLDialogElement>(null)
  const continueButtonRef = useRef<HTMLButtonElement>(null)

  const closeSubmitDialog = useCallback(() => setShowSubmit(false), [])
  useDialogFocus(showSubmit && stage === 'taking', submitDialogRef, continueButtonRef, examContentRef, closeSubmitDialog)

  const pool = useMemo(() => data.questions.filter((question) => question.sourceRefs.some((ref) => selectedFiles.includes(ref.fileId))), [data.questions, selectedFiles])
  const maxCount = Math.max(1, pool.length)
  const actualCount = Math.min(Math.max(1, count), maxCount)

  useEffect(() => {
    if (stage !== 'taking' || !startedAt) return
    const startedAtMs = Date.parse(startedAt)
    const syncElapsed = () => setElapsed(elapsedSecondsSince(startedAtMs))
    syncElapsed()
    const timer = window.setInterval(syncElapsed, 1000)
    document.addEventListener('visibilitychange', syncElapsed)
    window.addEventListener('focus', syncElapsed)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', syncElapsed)
      window.removeEventListener('focus', syncElapsed)
    }
  }, [stage, startedAt])

  const remaining = minutes ? Math.max(0, minutes * 60 - elapsed) : null
  const timeUp = stage === 'taking' && remaining === 0 && minutes > 0

  const submitExam = useCallback(() => {
    if (submittingRef.current || !examQuestions.length || !startedAt) return
    submittingRef.current = true
    let correctCount = 0
    examQuestions.forEach((question) => {
      const selected = answers[question.id] ?? []
      const correct = isAnswerCorrect(question, selected)
      if (correct) correctCount += 1
      recordAttempt(question, selected)
    })
    const submittedAt = new Date().toISOString()
    const wallElapsed = elapsedSecondsSince(Date.parse(startedAt))
    const durationSeconds = minutes ? Math.min(minutes * 60, wallElapsed) : wallElapsed
    const record: ExamRecord = {
      id: `exam-${Date.now()}`,
      ...(activeMockExamId ? { mockExamId: activeMockExamId } : {}),
      questionIds: examQuestions.map((question) => question.id),
      answers,
      score: activeMockExamId ? getFixedMockExamScore(correctCount) : Math.round((correctCount / examQuestions.length) * 100),
      correctCount,
      total: examQuestions.length,
      startedAt,
      submittedAt,
      durationSeconds,
    }
    saveExam(record)
    setResult(record)
    setStage('result')
    setShowSubmit(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeMockExamId, answers, examQuestions, minutes, recordAttempt, saveExam, startedAt])

  useEffect(() => {
    if (timeUp) submitExam()
  }, [submitExam, timeUp])

  const beginExam = (selected: Question[], mockExamId?: string) => {
    if (!selected.length) return
    setExamQuestions(selected)
    setActiveMockExamId(mockExamId)
    setAnswers({})
    setCurrent(0)
    setFlagged([])
    setElapsed(0)
    setStartedAt(new Date().toISOString())
    submittingRef.current = false
    setResult(null)
    setResultIndex(0)
    setStage('taking')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const start = () => {
    let selected = selectExamQuestions(pool, actualCount, mix, randomOrder ? Date.now() : 1)
    if (!randomOrder) {
      const order = new Map(pool.map((question, index) => [question.id, index]))
      selected = [...selected].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    }
    beginExam(selected)
  }

  const startFixed = (exam: MockExam) => {
    const selected = getMockExamQuestions(data, exam.id)
    if (selected.length !== 40) return
    setMinutes(exam.minutes)
    beginExam(selected, exam.id)
  }

  const reviewFixed = (record: ExamRecord) => {
    const selected = getMockExamQuestions(data, record.mockExamId ?? '')
    if (selected.length !== 40) return
    setExamQuestions(selected)
    setActiveMockExamId(record.mockExamId)
    setAnswers(record.answers)
    setResult(record)
    setResultIndex(0)
    setStage('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (openedInitial.current || !initialExamId) return
    openedInitial.current = true
    const exam = getAllFixedExams(data).find((item) => item.id === initialExamId)
    if (!exam) return
    const record = reviewLatest ? [...state.exams]
      .filter((item) => item.mockExamId === exam.id && item.questionIds.length === 40 && new Set(item.questionIds).size === 40 && item.questionIds.every((id) => exam.questionIds.includes(id)))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] : undefined
    if (record) reviewFixed(record)
    else if (reviewLatest) navigate({ view: 'final', params: { level: returnFinalLevel ?? exam.level ?? 'challenge' } })
    else startFixed(exam)
  }, [data, initialExamId, reviewLatest, returnFinalLevel, state.exams])

  const backToExams = () => activeMockExamId?.startsWith('final-')
    ? navigate({ view: 'final', params: { level: returnFinalLevel ?? activeMockExam?.level ?? 'challenge' } }) : setStage('setup')

  const toggleFile = (id: string) => setSelectedFiles((before) => before.includes(id) ? before.filter((item) => item !== id) : [...before, id])

  if (stage === 'setup') return (
    <div className="animate-enter">
      <PageHeader eyebrow="MOCK EXAM" title="실전 모의고사" copy="신규 40문항씩 5회분을 시험 또는 해설 학습으로 풀어 보세요. 시험 중에는 정답이 숨겨지고 제출 뒤 모든 문항의 상세 해설이 열립니다. 아래에서 기존 맞춤형 랜덤 시험도 만들 수 있습니다." />
      <button onClick={() => navigate({ view: 'final' })} className="button-primary mb-5">최종 대비 · 기본 120문항 추가 + 기존 고난도 120문항</button>
      <FixedMockExamList data={data} state={state} onStart={startFixed} onReview={reviewFixed} navigate={navigate} />
      <h2 className="mb-2 text-xl font-black">맞춤형 랜덤 모의고사</h2>
      <p className="mb-5 text-sm leading-7 text-slate-500">전체 문제은행에서 범위·문항 수·시간·난이도 비율을 직접 정합니다. 위의 고정형 5회분과는 별개의 랜덤 시험입니다.</p>
      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="surface p-5 sm:p-7">
          <section>
            <div className="flex items-center gap-2"><FileStack size={18} className="text-cobalt" /><h2 className="section-title">1. 출제 범위</h2></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {data.files.map((file) => {
                const active = selectedFiles.includes(file.id)
                const total = data.questions.filter((question) => question.sourceRefs.some((ref) => ref.fileId === file.id)).length
                return <button type="button" key={file.id} aria-pressed={active} onClick={() => toggleFile(file.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left ${active ? 'border-cobalt bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10' : 'border-black/[0.08] dark:border-white/10'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-cobalt text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/5'}`}>{active && <Check size={15} />}</span><span className="min-w-0"><span className="block truncate text-xs font-bold">{file.shortTitle}</span><span className="text-[10px] text-slate-400">{total}문항</span></span></button>
              })}
            </div>
          </section>
          <section className="mt-8 border-t border-black/[0.07] pt-7 dark:border-white/[0.08]">
            <div className="flex items-center gap-2"><ListChecks size={18} className="text-cobalt" /><h2 className="section-title">2. 시험 설정</h2></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label><span className="mb-2 block text-xs font-bold text-slate-500">문항 수 · 최대 {pool.length}</span><input className="input" type="number" min={1} max={maxCount} value={actualCount} onChange={(event) => setCount(Number(event.target.value))} /></label>
              <label><span className="mb-2 block text-xs font-bold text-slate-500">제한 시간</span><select className="input" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}><option value={0}>시간 제한 없음</option><option value={10}>10분</option><option value={20}>20분</option><option value={30}>30분</option><option value={50}>50분</option></select></label>
            </div>
            <button type="button" aria-pressed={randomOrder} onClick={() => setRandomOrder((value) => !value)} className={`mt-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left text-xs font-bold ${randomOrder ? 'border-cobalt bg-blue-50 text-cobalt dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300' : 'border-black/[0.08] text-slate-500 dark:border-white/10'}`}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${randomOrder ? 'bg-cobalt text-white' : 'bg-slate-100 dark:bg-white/5'}`}>{randomOrder && <Check size={15} />}</span>
              문제 순서 무작위
            </button>
          </section>
          <section className="mt-8 border-t border-black/[0.07] pt-7 dark:border-white/[0.08]">
            <div className="flex items-center gap-2"><Shuffle size={18} className="text-cobalt" /><h2 className="section-title">3. 난이도 비율</h2></div>
            <p className="mt-1 text-xs text-slate-500">기본 권장 비율은 쉬움 30% · 보통 50% · 어려움 20%입니다. 선택 범위의 문항 수가 부족하면 남는 난이도에서 보충합니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: '권장 30·50·20', value: { 쉬움: 30, 보통: 50, 어려움: 20 } },
                { label: '균형 30·40·30', value: { 쉬움: 30, 보통: 40, 어려움: 30 } },
                { label: '고난도 10·40·50', value: { 쉬움: 10, 보통: 40, 어려움: 50 } },
              ].map((preset) => { const active = JSON.stringify(mix) === JSON.stringify(preset.value); return <button key={preset.label} aria-pressed={active} onClick={() => setMix(preset.value)} className={`button-secondary ${active ? 'border-cobalt bg-blue-50 text-cobalt dark:bg-blue-500/10' : ''}`}>{preset.label}</button> })}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(['쉬움', '보통', '어려움'] as const).map((difficulty) => (
                <label key={difficulty} className="rounded-xl border border-black/[0.07] p-3 dark:border-white/[0.08]">
                  <span className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-500"><span>{difficulty}</span><span>{mix[difficulty]}%</span></span>
                  <input aria-label={`${difficulty} 비율`} type="range" min="0" max="100" step="5" value={mix[difficulty]} onChange={(event) => setMix((before) => ({ ...before, [difficulty]: Number(event.target.value) }))} className="w-full accent-blue-600" />
                </label>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-400">입력값은 상대 비율로 자동 정규화됩니다. 현재 합계 {mix.쉬움 + mix.보통 + mix.어려움}.</p>
          </section>
        </div>
        <aside className="surface h-fit p-5 sm:p-6 xl:sticky xl:top-24">
          <div className="eyebrow">EXAM BRIEF</div><h2 className="section-title mt-1">시험 요약</h2>
          <dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">출제 가능</dt><dd className="font-black">{pool.length}문항</dd></div><div className="flex justify-between"><dt className="text-slate-500">실제 출제</dt><dd className="font-black">{actualCount}문항</dd></div><div className="flex justify-between"><dt className="text-slate-500">제한 시간</dt><dd className="font-black">{minutes ? `${minutes}분` : '무제한'}</dd></div><div className="flex justify-between"><dt className="text-slate-500">복수 정답 가능</dt><dd className="font-black">포함</dd></div></dl>
          <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"><AlertTriangle size={15} className="mr-1 inline" />제출 전 미응답 문항을 반드시 확인하세요. 시간 종료 시 자동 제출됩니다.</div>
          <button onClick={start} disabled={!pool.length || !selectedFiles.length} className="button-primary mt-5 w-full"><Play size={17} />모의고사 시작</button>
        </aside>
      </div>
    </div>
  )

  if (stage === 'result' && result) {
    const question = examQuestions[resultIndex]
    const selected = answers[question.id] ?? []
    return (
      <div className="animate-enter">
        <PageHeader eyebrow="EXAM RESULT" title={`${activeMockExam?.title ?? '맞춤형 모의고사'} · ${result.score}점`} copy={`${result.correctCount}/${result.total} 정답. 문항별 결과에서 번호를 누르면 맞힌 문제까지 모든 선택지 해설과 관련 개념을 복습할 수 있습니다.`} action={<button onClick={backToExams} className="button-secondary"><RotateCcw size={16} />모의고사 목록</button>} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat icon={<Target size={18} />} label="점수" value={`${result.score}점`} /><Stat icon={<CheckCircle2 size={18} />} label="정답" value={`${result.correctCount}개`} tone="green" /><Stat icon={<X size={18} />} label="오답·미응답" value={`${result.total - result.correctCount}개`} tone="rose" /><Stat icon={<Clock3 size={18} />} label="풀이 시간" value={`${Math.floor(result.durationSeconds / 60)}분 ${result.durationSeconds % 60}초`} tone="amber" /></div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[16rem_1fr]">
          <aside className="surface h-fit p-4 xl:sticky xl:top-24"><div className="mb-3 text-xs font-black text-slate-500">문항별 결과</div><div className="grid grid-cols-5 gap-2">{examQuestions.map((item, index) => { const correct = isAnswerCorrect(item, answers[item.id] ?? []); return <button key={item.id} aria-label={`문제 ${index + 1}, ${correct ? '정답' : '오답 또는 미응답'}`} aria-current={resultIndex === index ? 'step' : undefined} onClick={() => setResultIndex(index)} className={`flex h-9 items-center justify-center rounded-lg text-xs font-black ${resultIndex === index ? 'ring-2 ring-cobalt' : ''} ${correct ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'}`}>{index + 1}</button> })}</div></aside>
          <article className="surface p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2"><DifficultyBadge difficulty={question.difficulty} /><span className="chip">{question.type}</span>{question.mode === 'multiple' && <span className="chip">복수 정답</span>}<span className="ml-auto text-xs font-bold text-slate-400">{resultIndex + 1} / {examQuestions.length}</span></div>
            <QuestionPrompt prompt={question.prompt} headingClassName="mt-5 whitespace-pre-line text-lg font-extrabold leading-8" />
            {question.visual && <QuestionVisual visual={question.visual} files={data.files} />}
            <QuestionExplanation question={question} selected={selected} concepts={data.concepts} files={data.files} navigate={navigate} />
            <div className="mt-6 flex justify-between"><button disabled={resultIndex === 0} className="button-secondary" onClick={() => setResultIndex((value) => value - 1)}><ChevronLeft size={17} />이전</button><button disabled={resultIndex === examQuestions.length - 1} className="button-primary" onClick={() => setResultIndex((value) => value + 1)}>다음<ChevronRight size={17} /></button></div>
          </article>
        </div>
      </div>
    )
  }

  const question = examQuestions[current]
  const selected = answers[question.id] ?? []
  const answeredCount = Object.values(answers).filter((value) => value.length).length
  const choose = (id: string) => setAnswers((before) => ({ ...before, [question.id]: question.mode === 'single' ? [id] : selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id] }))
  const timeText = remaining === null ? '무제한' : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`

  return (
    <div className="mx-auto max-w-6xl animate-enter">
      <div ref={examContentRef}>
      <p className="mb-3 text-sm font-black text-cobalt dark:text-blue-300">{activeMockExam?.title ?? '맞춤형 랜덤 모의고사'} · {examQuestions.length}문항 · 제출 후 해설 공개</p>
      <header className="surface mb-5 flex flex-wrap items-center gap-4 p-4 sm:px-6"><div className="flex items-center gap-2"><AlarmClock size={18} className={remaining !== null && remaining < 300 ? 'text-rose-500' : 'text-cobalt'} /><span className={`font-mono text-lg font-black ${remaining !== null && remaining < 300 ? 'text-rose-500' : ''}`}>{timeText}</span></div><div className="min-w-40 flex-1"><div className="mb-1 flex justify-between text-[10px] font-bold text-slate-400"><span>{answeredCount}개 응답</span><span>{examQuestions.length}문항</span></div><ProgressBar value={(answeredCount / examQuestions.length) * 100} /></div><button aria-haspopup="dialog" aria-expanded={showSubmit} onClick={() => setShowSubmit(true)} className="button-primary">시험 제출</button></header>
      <div className="grid gap-5 xl:grid-cols-[1fr_18rem]">
        <article className="surface p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-black text-cobalt">문제 {current + 1}</span><DifficultyBadge difficulty={question.difficulty} /><span className="chip">{question.mode === 'multiple' ? '복수 정답' : '단일 정답'}</span><button aria-pressed={flagged.includes(question.id)} onClick={() => setFlagged((before) => before.includes(question.id) ? before.filter((id) => id !== question.id) : [...before, question.id])} className={`ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${flagged.includes(question.id) ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15' : 'text-slate-400'}`}><Flag size={14} fill={flagged.includes(question.id) ? 'currentColor' : 'none'} />검토</button></div>
          <QuestionPrompt prompt={question.prompt} headingLevel={1} />
          {question.visual && <QuestionVisual visual={question.visual} files={data.files} />}
          <p className="mt-2 text-xs text-slate-500">{question.mode === 'multiple' ? '옳은 것을 모두 선택하세요. 정답은 2개 이상입니다.' : '가장 적절한 답 하나를 선택하세요.'}</p>
          <div className="mt-6 space-y-3" role={question.mode === 'multiple' ? 'group' : 'radiogroup'} aria-label="선택지">{question.options.map((option, index) => { const picked = selected.includes(option.id); return <button key={option.id} role={question.mode === 'multiple' ? 'checkbox' : 'radio'} aria-checked={picked} onClick={() => choose(option.id)} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${picked ? 'border-cobalt bg-blue-50 ring-1 ring-cobalt dark:border-blue-400 dark:bg-blue-500/10' : 'border-black/[0.09] hover:border-cobalt/40 dark:border-white/10'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${picked ? 'border-cobalt bg-cobalt text-white' : 'border-slate-200 text-slate-500 dark:border-white/10'}`}>{picked ? <Check size={15} /> : optionLabel(index)}</span><span className="pt-0.5 text-sm font-semibold leading-6">{option.text}</span></button> })}</div>
          <div className="mt-7 flex justify-between"><button disabled={current === 0} onClick={() => setCurrent((value) => value - 1)} className="button-secondary"><ChevronLeft size={17} />이전</button><button disabled={current === examQuestions.length - 1} onClick={() => setCurrent((value) => value + 1)} className="button-primary">다음<ChevronRight size={17} /></button></div>
        </article>
        <aside className="surface h-fit p-4 xl:sticky xl:top-24"><div className="flex items-center justify-between"><h2 className="text-sm font-black">답안 현황</h2><span className="text-[10px] text-slate-400">클릭해서 이동</span></div><div className="mt-4 grid grid-cols-5 gap-2">{examQuestions.map((item, index) => { const answered = (answers[item.id]?.length ?? 0) > 0; const flag = flagged.includes(item.id); return <button key={item.id} aria-label={`문제 ${index + 1}${answered ? ', 응답 완료' : ', 미응답'}${flag ? ', 검토 표시' : ''}`} aria-current={current === index ? 'step' : undefined} onClick={() => setCurrent(index)} className={`relative flex h-9 items-center justify-center rounded-lg text-xs font-black ${current === index ? 'bg-ink text-white ring-2 ring-cobalt ring-offset-2 dark:bg-white dark:text-ink dark:ring-offset-slate-900' : answered ? 'bg-blue-100 text-cobalt dark:bg-blue-500/15 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-white/5'}`}>{index + 1}{flag && <span aria-hidden="true" className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber ring-2 ring-white dark:ring-slate-900" />}</button> })}</div><div className="mt-4 space-y-2 border-t border-black/[0.06] pt-4 text-[11px] text-slate-500 dark:border-white/[0.07]"><div className="flex justify-between"><span>응답</span><strong>{answeredCount}</strong></div><div className="flex justify-between"><span>미응답</span><strong>{examQuestions.length - answeredCount}</strong></div><div className="flex justify-between"><span>검토 표시</span><strong>{flagged.length}</strong></div></div></aside>
      </div>
      </div>
      {showSubmit && <dialog ref={submitDialogRef} aria-labelledby="exam-submit-title" className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-3xl border-0 bg-white p-6 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm dark:bg-slate-900 dark:text-white"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15"><AlertTriangle /></div><h2 id="exam-submit-title" className="mt-4 text-xl font-black">시험을 제출할까요?</h2><p className="mt-2 text-sm leading-6 text-slate-500">응답 {answeredCount}개, 미응답 {examQuestions.length - answeredCount}개입니다. 제출하면 답안을 수정할 수 없습니다.</p><div className="mt-6 flex gap-2"><button ref={continueButtonRef} onClick={closeSubmitDialog} className="button-secondary flex-1">계속 풀기</button><button onClick={submitExam} className="button-primary flex-1">제출하고 채점</button></div></dialog>}
    </div>
  )
}
