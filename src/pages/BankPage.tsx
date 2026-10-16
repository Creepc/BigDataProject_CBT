import { useMemo, useState } from 'react'
import { Bookmark, CheckCircle2, Circle, Filter, Play, RotateCcw } from 'lucide-react'
import type { CourseData, NavigationTarget } from '@/types'
import { useStudy } from '@/contexts/StudyContext'
import { DifficultyBadge, EmptyState, PageHeader, SearchInput } from '@/components/ui'

export function BankPage({ data, navigate }: { data: CourseData; navigate: (target: NavigationTarget) => void }) {
  const { state } = useStudy()
  const [query, setQuery] = useState('')
  const [file, setFile] = useState('all')
  const [unit, setUnit] = useState('all')
  const [concept, setConcept] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const types = [...new Set(data.questions.map((question) => question.type))]
  const conceptsById = useMemo(() => new Map(data.concepts.map((item) => [item.id, item])), [data.concepts])
  const availableConcepts = useMemo(() => data.concepts
    .filter((item) => (file === 'all' || item.fileId === file) && (unit === 'all' || item.unit === unit))
    .sort((left, right) => left.name.localeCompare(right.name, 'ko')), [data.concepts, file, unit])
  const availableUnits = useMemo(() => [...new Set(data.concepts
    .filter((item) => file === 'all' || item.fileId === file)
    .map((item) => item.unit))].sort((left, right) => left.localeCompare(right, 'ko')), [data.concepts, file])

  const filtered = useMemo(() => data.questions.filter((question) => {
    const attempt = state.attempts[question.id]
    const matchesStatus = status === 'all'
      || (status === 'wrong' && attempt && (!attempt.lastCorrect || attempt.wrongCount > 0))
      || (status === 'unseen' && !attempt)
      || (status === 'bookmarked' && state.bookmarkedQuestionIds.includes(question.id))
    return (!query || question.prompt.toLowerCase().includes(query.toLowerCase()))
      && (file === 'all' || question.sourceRefs.some((ref) => ref.fileId === file))
      && (unit === 'all' || question.conceptIds.some((id) => conceptsById.get(id)?.unit === unit))
      && (concept === 'all' || question.conceptIds.includes(concept))
      && (difficulty === 'all' || question.difficulty === difficulty)
      && (type === 'all' || question.type === type)
      && matchesStatus
  }), [data.questions, query, file, unit, concept, difficulty, type, status, state.attempts, state.bookmarkedQuestionIds, conceptsById])

  const changeFile = (nextFile: string) => {
    setFile(nextFile)
    setUnit('all')
    setConcept('all')
  }

  const changeUnit = (nextUnit: string) => {
    setUnit(nextUnit)
    setConcept('all')
  }

  const resetFilters = () => {
    setQuery('')
    setFile('all')
    setUnit('all')
    setConcept('all')
    setDifficulty('all')
    setType('all')
    setStatus('all')
  }

  return (
    <div className="animate-enter">
      <PageHeader eyebrow="QUESTION BANK" title="근거가 있는 문제은행" copy={`${data.questions.length}개 문항을 자료·개념·난이도·유형으로 골라 풀 수 있습니다. 복수 정답 문항은 명확히 표시되며, 제출 전에는 정답과 해설이 노출되지 않습니다.`} action={<button onClick={() => filtered[0] && navigate({ view: 'practice', id: filtered[0].id, params: { ids: filtered.map((item) => item.id).join(',') } })} disabled={!filtered.length} className="button-primary"><Play size={17} />필터 결과 풀기</button>} />
      <div className="surface mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2"><SearchInput value={query} onChange={setQuery} placeholder="문제 내용 검색" ariaLabel="문제은행 검색" /></div>
          <select aria-label="강의자료 필터" className="input" value={file} onChange={(event) => changeFile(event.target.value)}><option value="all">모든 자료</option>{data.files.map((item) => <option key={item.id} value={item.id}>{item.shortTitle}</option>)}</select>
          <select aria-label="단원 필터" className="input" value={unit} onChange={(event) => changeUnit(event.target.value)}><option value="all">모든 단원</option>{availableUnits.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select aria-label="개념 필터" className="input" value={concept} onChange={(event) => setConcept(event.target.value)}><option value="all">모든 개념</option>{availableConcepts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select aria-label="난이도 필터" className="input" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="all">모든 난이도</option><option>쉬움</option><option>보통</option><option>어려움</option></select>
          <select aria-label="문제 유형 필터" className="input" value={type} onChange={(event) => setType(event.target.value)}><option value="all">모든 유형</option>{types.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="학습 상태 필터" className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">모든 학습 상태</option><option value="wrong">틀린 문제</option><option value="unseen">아직 안 푼 문제</option><option value="bookmarked">북마크</option></select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span className="flex items-center gap-2"><Filter size={14} />{filtered.length}개 문항 표시 · 복수 정답 {filtered.filter((item) => item.mode === 'multiple').length}개</span><button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-bold text-slate-500 hover:bg-slate-100 hover:text-cobalt dark:hover:bg-white/[0.05]"><RotateCcw size={13} />필터 초기화</button></div>
      </div>
      {filtered.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((question, index) => {
            const attempt = state.attempts[question.id]
            const bookmarked = state.bookmarkedQuestionIds.includes(question.id)
            const source = data.files.find((item) => item.id === question.sourceRefs[0]?.fileId)
            return (
              <button key={question.id} onClick={() => navigate({ view: 'practice', id: question.id, params: { ids: filtered.map((item) => item.id).join(',') } })} className="surface-flat group p-5 text-left transition hover:-translate-y-0.5 hover:border-cobalt/30 hover:shadow-soft">
                <div className="flex items-center gap-2"><span className="text-xs font-black text-slate-400">Q{String(index + 1).padStart(2, '0')}</span><DifficultyBadge difficulty={question.difficulty} /><span className="chip">{question.type}</span>{question.mode === 'multiple' && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">복수 정답</span>}{bookmarked && <Bookmark size={14} className="ml-auto fill-cobalt text-cobalt" />}</div>
                <h2 className="mt-4 line-clamp-2 text-sm font-extrabold leading-6 group-hover:text-cobalt">{question.prompt}</h2>
                <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-slate-400"><span className="truncate">{source?.shortTitle ?? '출처 미상'}</span><span className="flex shrink-0 items-center gap-1">{attempt ? attempt.lastCorrect ? <CheckCircle2 size={14} className="text-emerald-500" /> : <RotateCcw size={14} className="text-rose-500" /> : <Circle size={13} />} {attempt ? `${attempt.count}회 풀이` : '미풀이'}</span></div>
              </button>
            )
          })}
        </div>
      ) : <EmptyState title="조건에 맞는 문제가 없습니다" copy="검색어나 필터를 조정해 보세요." />}
    </div>
  )
}
