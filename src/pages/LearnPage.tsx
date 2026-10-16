import { useMemo, useState } from 'react'
import { Check, ChevronRight, Clock3 } from 'lucide-react'
import type { Concept, CourseData, Difficulty, NavigationTarget } from '@/types'
import { useStudy } from '@/contexts/StudyContext'
import { formatPages } from '@/lib/study'
import { conceptReadingMinutes, conceptSearchText } from '@/lib/lessons'
import { ConceptDetail } from '@/components/ConceptDetail'
import { DifficultyBadge, EmptyState, PageHeader, SearchInput } from '@/components/ui'

export function LearnPage({ data, selectedId, initialFile, navigate }: { data: CourseData; selectedId?: string; initialFile?: string; navigate: (target: NavigationTarget) => void }) {
  const { state, toggleConcept } = useStudy()
  const [query, setQuery] = useState('')
  const [fileFilter, setFileFilter] = useState(initialFile ?? 'all')
  const [level, setLevel] = useState<Difficulty | '전체'>('전체')
  const searchIndex = useMemo(() => new Map(data.concepts.map((concept) => [concept.id, conceptSearchText(concept)])), [data.concepts])
  const filtered = useMemo(() => data.concepts.filter((concept) =>
    (!query.trim() || searchIndex.get(concept.id)?.includes(query.trim().toLocaleLowerCase('ko-KR')))
    && (fileFilter === 'all' || concept.fileId === fileFilter)
    && (level === '전체' || concept.difficulty === level),
  ), [data.concepts, searchIndex, query, fileFilter, level])

  const selected = selectedId ? data.concepts.find((concept) => concept.id === selectedId) : undefined
  if (selected) return <ConceptDetail key={selected.id} concept={selected} data={data} navigate={navigate} completed={state.completedConceptIds.includes(selected.id)} onToggle={() => toggleConcept(selected.id, selected.name)} />

  const grouped = filtered.reduce<Record<string, Concept[]>>((acc, concept) => {
    const key = `${data.files.find((file) => file.id === concept.fileId)?.shortTitle ?? concept.fileId} · ${concept.unit}`
    acc[key] = [...(acc[key] ?? []), concept]
    return acc
  }, {})

  return (
    <div className="animate-enter">
      <PageHeader eyebrow="CONCEPT LIBRARY" title="읽고, 따라 풀고, 설명해 보기" copy={`선수 용어부터 원리, 단계별 풀이, 비교와 오개념, 자가 점검까지 이어지는 ${data.concepts.length}개의 학습 본문입니다. 키워드를 검색하면 본문과 예제 속 설명도 찾을 수 있습니다.`} />
      <div className="surface mb-5 grid gap-3 p-4 lg:grid-cols-[1fr_15rem_auto]">
        <SearchInput value={query} onChange={setQuery} placeholder="개념·본문·예제 검색" ariaLabel="개념 검색" />
        <select aria-label="강의자료 필터" value={fileFilter} onChange={(event) => setFileFilter(event.target.value)} className="input">
          <option value="all">모든 강의자료</option>{data.files.map((file) => <option key={file.id} value={file.id}>{file.shortTitle}</option>)}
        </select>
        <div role="group" aria-label="개념 난이도 필터" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-white/5">
          {(['전체', '쉬움', '보통', '어려움'] as const).map((item) => <button key={item} aria-pressed={level === item} onClick={() => setLevel(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${level === item ? 'bg-white text-cobalt shadow-sm dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500'}`}>{item}</button>)}
        </div>
      </div>
      <p className="mb-4 text-xs text-slate-500">{filtered.length}개 개념 · 읽기 시간은 예제를 따라가는 시간을 포함한 예상치입니다. 중요도는 강의 강조를 바탕으로 한 추정입니다.</p>
      {filtered.length ? <div className="space-y-5">{Object.entries(grouped).map(([unit, concepts]) => (
        <section key={unit} className="surface overflow-hidden">
          <div className="border-b border-black/[0.07] bg-slate-50/60 px-5 py-4 dark:border-white/[0.07] dark:bg-white/[0.025]"><h2 className="text-sm font-black">{unit}</h2><p className="mt-1 text-[11px] text-slate-400">핵심 개념 {concepts.length}개</p></div>
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">{concepts.map((concept) => {
            const done = state.completedConceptIds.includes(concept.id)
            const file = data.files.find((item) => item.id === concept.fileId)
            return <button key={concept.id} onClick={() => navigate({ view: 'learn', id: concept.id })} className="group grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-5 text-left hover:bg-blue-50/50 dark:hover:bg-white/[0.025] sm:gap-4 sm:px-5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-white/[0.06]'}`}>{done ? <Check size={19} /> : <span className="text-xs font-black">{concept.importance}</span>}</span>
              <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm group-hover:text-cobalt">{concept.name}</strong><DifficultyBadge difficulty={concept.difficulty} /></span><span className="mt-2 block text-xs leading-6 text-slate-600 dark:text-slate-300">{concept.lesson?.objectives[0] ?? concept.definition}</span><span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400"><span className="inline-flex items-center gap-1"><Clock3 size={12} />약 {conceptReadingMinutes(concept)}분</span><span>풀이 예제 · 자가 점검 {concept.lesson?.checks.length ?? 0}개</span><span>연습 {concept.relatedQuestionIds.length}문항</span></span><span className="mt-1.5 block text-[10px] text-slate-400">{file?.shortTitle} · {formatPages(concept.pages)}</span></span>
              <ChevronRight size={18} className="mt-2 text-slate-300 group-hover:text-cobalt" />
            </button>
          })}</div>
        </section>
      ))}</div> : <EmptyState title="검색 결과가 없습니다" copy="필터를 줄이거나 다른 키워드로 검색해 보세요." />}
    </div>
  )
}
