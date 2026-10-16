import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, BrainCircuit, ListChecks, RotateCcw, Shuffle, Sparkles, Tags } from 'lucide-react'
import type { CourseData } from '@/types'
import { useStudy } from '@/contexts/StudyContext'
import { formatPages, seededShuffle } from '@/lib/study'
import { buildUnitExamSummaries, filterAndPrioritizeCards, type CardReviewFilter } from '@/lib/studySummary'
import { EmptyState, PageHeader, ProgressBar } from '@/components/ui'

type CardsMode = 'cards' | 'summary'

const ratingLabels = { again: '다시', hard: '어려움', good: '알겠음' } as const
const ratingClasses = {
  again: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  hard: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
} as const

export function CardsPage({ data }: { data: CourseData }) {
  const { state, rateCard } = useStudy()
  const [mode, setMode] = useState<CardsMode>('cards')
  const [file, setFile] = useState('all')
  const [reviewFilter, setReviewFilter] = useState<CardReviewFilter>('priority')
  const [seed, setSeed] = useState(1)
  const [currentCardId, setCurrentCardId] = useState<string>()
  const [flipped, setFlipped] = useState(false)

  const sourceCards = useMemo(() => data.flashcards.filter((item) => file === 'all' || item.fileId === file), [data.flashcards, file])
  const shuffledCards = useMemo(() => seededShuffle(sourceCards, seed), [sourceCards, seed])
  const cards = useMemo(() => filterAndPrioritizeCards(shuffledCards, state.flashcardRatings, reviewFilter), [reviewFilter, shuffledCards, state.flashcardRatings])
  const foundIndex = currentCardId ? cards.findIndex((item) => item.id === currentCardId) : -1
  const index = foundIndex >= 0 ? foundIndex : 0
  const card = cards[index]
  const summaries = useMemo(() => buildUnitExamSummaries(data, file), [data, file])
  const highImportanceCount = summaries.reduce((sum, unit) => sum + unit.highImportanceConcepts.length, 0)

  const ratingCounts = useMemo(() => sourceCards.reduce((counts, item) => {
    const rating = state.flashcardRatings[item.id]
    if (rating) counts[rating] += 1
    else counts.unrated += 1
    return counts
  }, { again: 0, hard: 0, good: 0, unrated: 0 }), [sourceCards, state.flashcardRatings])
  const rated = ratingCounts.again + ratingCounts.hard + ratingCounts.good
  const weak = ratingCounts.again + ratingCounts.hard

  const go = (next: number) => {
    const nextCard = cards[Math.max(0, Math.min(cards.length - 1, next))]
    setCurrentCardId(nextCard?.id)
    setFlipped(false)
  }
  const changeFile = (value: string) => {
    setFile(value)
    setCurrentCardId(undefined)
    setFlipped(false)
  }
  const changeReviewFilter = (value: CardReviewFilter) => {
    setReviewFilter(value)
    setCurrentCardId(undefined)
    setFlipped(false)
  }
  const rateAndAdvance = (rating: 'again' | 'hard' | 'good') => {
    if (!card) return
    const nextCard = cards[index + 1]
    rateCard(card.id, rating)
    setCurrentCardId(nextCard?.id)
    setFlipped(false)
  }

  return (
    <div className="mx-auto max-w-6xl animate-enter">
      <PageHeader
        eyebrow="MEMORY CARDS"
        title={mode === 'cards' ? '짧게 묻고, 스스로 떠올리기' : '시험 직전, 단원별로 압축하기'}
        copy={mode === 'cards'
          ? "카드를 뒤집기 전 답을 먼저 말해 보세요. '다시'와 '어려움'으로 평가한 카드는 취약 우선 순서와 필터에 즉시 반영됩니다."
          : '핵심 용어, 중요 개념, 비교·오개념, 플래시카드를 한 단원씩 빠르게 훑습니다.'}
        action={<div className="inline-flex rounded-xl border border-black/[0.08] bg-white p-1 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04]" role="group" aria-label="암기 학습 모드">
          <button type="button" aria-pressed={mode === 'cards'} onClick={() => setMode('cards')} className={`rounded-lg px-3 py-2 text-xs font-black transition ${mode === 'cards' ? 'bg-cobalt text-white' : 'text-slate-500 hover:text-cobalt'}`}><BrainCircuit size={15} className="mr-1.5 inline" />플래시카드</button>
          <button type="button" aria-pressed={mode === 'summary'} onClick={() => setMode('summary')} className={`rounded-lg px-3 py-2 text-xs font-black transition ${mode === 'summary' ? 'bg-cobalt text-white' : 'text-slate-500 hover:text-cobalt'}`}><ListChecks size={15} className="mr-1.5 inline" />시험 직전 요약</button>
        </div>}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="cards-file-filter">강의자료 필터</label>
        <select id="cards-file-filter" className="input sm:max-w-xs" value={file} onChange={(event) => changeFile(event.target.value)}>
          <option value="all">전체 강의자료</option>
          {data.files.map((item) => <option key={item.id} value={item.id}>{item.shortTitle}</option>)}
        </select>
        {mode === 'cards' && <>
          <label className="sr-only" htmlFor="cards-review-filter">카드 복습 상태 필터</label>
          <select id="cards-review-filter" className="input sm:max-w-[15rem]" value={reviewFilter} onChange={(event) => changeReviewFilter(event.target.value as CardReviewFilter)}>
            <option value="priority">취약 우선 · 전체 {sourceCards.length}</option>
            <option value="weak">취약 카드만 {weak}</option>
            <option value="again">다시 {ratingCounts.again}</option>
            <option value="hard">어려움 {ratingCounts.hard}</option>
            <option value="unrated">미평가 {ratingCounts.unrated}</option>
            <option value="good">알겠음 {ratingCounts.good}</option>
            <option value="all">기본 순서 · 전체 {sourceCards.length}</option>
          </select>
          <button type="button" aria-label="플래시카드 순서 다시 섞기" onClick={() => { setSeed(Date.now()); setCurrentCardId(undefined); setFlipped(false) }} className="button-secondary"><Shuffle size={16} />순서 섞기</button>
          <span className="text-xs text-slate-400 sm:ml-auto">평가 {rated} / {sourceCards.length} · 취약 {weak}</span>
        </>}
      </div>

      {mode === 'cards' ? <>
        {card ? <>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">{index + 1} / {cards.length}</span>
            <div className="flex-1"><ProgressBar value={((index + 1) / cards.length) * 100} /></div>
            {state.flashcardRatings[card.id] && <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${ratingClasses[state.flashcardRatings[card.id]]}`}>{ratingLabels[state.flashcardRatings[card.id]]}</span>}
          </div>
          <button type="button" onClick={() => setFlipped((value) => !value)} aria-pressed={flipped} aria-label={flipped ? '카드 앞면 보기' : '카드 정답 보기'} className={`relative flex min-h-[390px] w-full flex-col items-center justify-center overflow-hidden rounded-[2rem] border p-8 text-center shadow-soft transition sm:min-h-[460px] ${flipped ? 'border-cobalt/30 bg-ink text-white' : 'border-black/[0.07] bg-white dark:border-white/[0.08] dark:bg-[#141c25]'}`}>
            <div className="noise absolute inset-0" />
            <div className="relative z-10 max-w-2xl">
              <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${flipped ? 'bg-white/10 text-blue-300' : 'bg-blue-50 text-cobalt dark:bg-blue-500/10 dark:text-blue-300'}`}><BrainCircuit /></div>
              <div className={`mt-6 text-[11px] font-black uppercase tracking-[0.2em] ${flipped ? 'text-blue-300' : 'text-cobalt'}`}>{flipped ? 'ANSWER' : 'QUESTION'}</div>
              <p className={`mt-4 font-black leading-relaxed tracking-[-0.03em] ${flipped ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>{flipped ? card.back : card.front}</p>
              <div className="mt-8 text-xs text-slate-400">{flipped ? `${data.files.find((item) => item.id === card.fileId)?.shortTitle} · ${formatPages(card.pages)}` : '카드를 눌러 정답 확인'}</div>
            </div>
          </button>
          {flipped && <div className="mt-4 grid grid-cols-3 gap-2" aria-label="카드 이해도 평가">
            <button type="button" aria-label="이 카드를 다시 학습으로 평가하고 다음 카드로 이동" onClick={() => rateAndAdvance('again')} className="rounded-xl bg-rose-50 px-3 py-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">다시</button>
            <button type="button" aria-label="이 카드를 어려움으로 평가하고 다음 카드로 이동" onClick={() => rateAndAdvance('hard')} className="rounded-xl bg-amber-50 px-3 py-3 text-sm font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">어려움</button>
            <button type="button" aria-label="이 카드를 알겠음으로 평가하고 다음 카드로 이동" onClick={() => rateAndAdvance('good')} className="rounded-xl bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">알겠음</button>
          </div>}
          <div className="mt-5 flex justify-between">
            <button type="button" disabled={index === 0} onClick={() => go(index - 1)} className="button-secondary"><ArrowLeft size={17} />이전</button>
            <button type="button" onClick={() => setFlipped(false)} className="button-secondary"><RotateCcw size={16} />앞면</button>
            <button type="button" disabled={index === cards.length - 1} onClick={() => go(index + 1)} className="button-primary">다음<ArrowRight size={17} /></button>
          </div>
        </> : <EmptyState title="조건에 맞는 카드가 없습니다" copy={reviewFilter === 'weak' ? "'다시' 또는 '어려움'으로 평가한 카드가 생기면 이곳에서 집중 복습할 수 있습니다." : '자료 또는 복습 상태 필터를 바꿔 보세요.'} />}
      </> : <>
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-950 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
          <div className="flex items-start gap-3"><Sparkles size={18} className="mt-0.5 shrink-0 text-cobalt dark:text-blue-300" /><p><strong>중요도 안내:</strong> 아래 ‘중요 개념’은 강의자료의 강조·반복과 교수 메모를 바탕으로 계산한 <strong>학습 우선순위 추정</strong>입니다. 실제 기출 빈도나 출제 확률을 뜻하지 않습니다.</p></div>
        </div>
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="surface-flat p-4"><strong className="block text-xl font-black">{summaries.length}</strong><span className="text-[11px] text-slate-500">요약 단원</span></div>
          <div className="surface-flat p-4"><strong className="block text-xl font-black">{highImportanceCount}</strong><span className="text-[11px] text-slate-500">중요도 4–5 개념</span></div>
          <div className="surface-flat p-4"><strong className="block text-xl font-black">{summaries.reduce((sum, unit) => sum + unit.flashcards.length, 0)}</strong><span className="text-[11px] text-slate-500">연결 플래시카드</span></div>
        </div>
        <div className="space-y-4">
          {summaries.map((unit) => {
            const source = data.files.find((item) => item.id === unit.fileId)
            const headingId = `summary-${unit.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
            return <section key={unit.id} className="surface overflow-hidden" aria-labelledby={headingId}>
              <div className="border-b border-black/[0.07] p-5 dark:border-white/[0.07] sm:p-6">
                <div className="flex items-start gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: source?.color }} /><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{source?.shortTitle} · 개념 {unit.concepts.length} · 카드 {unit.flashcards.length}</div><h2 id={headingId} className="mt-1 text-lg font-black tracking-tight">{unit.unit}</h2></div></div>
              </div>
              <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
                <div><div className="flex items-center gap-2 text-xs font-black text-cobalt dark:text-blue-300"><Tags size={15} />핵심 용어</div><div className="mt-3 flex flex-wrap gap-2">{unit.terms.slice(0, 12).map((term) => <span key={term} className="chip">{term}</span>)}{unit.terms.length > 12 && <span className="chip">+{unit.terms.length - 12}</span>}</div></div>
                <div><div className="flex items-center gap-2 text-xs font-black text-amber-700 dark:text-amber-300"><Sparkles size={15} />중요 개념 <span className="font-medium text-slate-400">· 강의자료 기반 추정</span></div><div className="mt-3 space-y-2">{unit.highImportanceConcepts.length ? unit.highImportanceConcepts.map((concept) => <div key={concept.id} className="rounded-xl bg-amber-50/70 p-3 dark:bg-amber-500/[0.07]"><div className="flex items-center justify-between gap-3"><strong className="text-xs">{concept.name}</strong><span className="shrink-0 text-[10px] font-black text-amber-700 dark:text-amber-300">중요도 {concept.importance}/5</span></div><p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{concept.definition}</p></div>) : <p className="text-xs text-slate-400">중요도 4 이상으로 분류된 개념이 없습니다.</p>}</div></div>
                <div><div className="text-xs font-black text-slate-700 dark:text-slate-200">비교 포인트</div><ul className="mt-3 space-y-2 text-[11px] leading-5 text-slate-600 dark:text-slate-300">{unit.comparisons.length ? unit.comparisons.slice(0, 5).map((comparison, comparisonIndex) => <li key={`${comparison.conceptName}-${comparison.target}-${comparisonIndex}`} className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]"><strong>{comparison.conceptName} ↔ {comparison.target}</strong><span className="mt-1 block text-slate-500 dark:text-slate-400">{comparison.difference}</span></li>) : <li className="text-slate-400">별도로 정리된 비교 포인트가 없습니다.</li>}</ul></div>
                <div><div className="flex items-center gap-2 text-xs font-black text-rose-700 dark:text-rose-300"><AlertTriangle size={15} />헷갈리기 쉬운 오개념</div><ul className="mt-3 space-y-2 text-[11px] leading-5 text-slate-600 dark:text-slate-300">{unit.misconceptions.length ? unit.misconceptions.slice(0, 5).map((misconception, misconceptionIndex) => <li key={`${misconception.conceptName}-${misconceptionIndex}`} className="rounded-xl bg-rose-50/60 p-3 dark:bg-rose-500/[0.06]"><strong>{misconception.conceptName}</strong><span className="mt-1 block text-slate-500 dark:text-slate-400">{misconception.text}</span></li>) : <li className="text-slate-400">별도로 정리된 오개념이 없습니다.</li>}</ul></div>
              </div>
              <details className="group border-t border-black/[0.07] dark:border-white/[0.07]">
                <summary className="cursor-pointer list-none p-5 text-xs font-black hover:bg-blue-50/40 dark:hover:bg-white/[0.025] sm:px-6"><span className="flex items-center justify-between">연결 플래시카드 {unit.flashcards.length}개 <span className="text-cobalt group-open:rotate-90"><ArrowRight size={15} /></span></span></summary>
                <div className="grid gap-3 border-t border-black/[0.06] p-5 dark:border-white/[0.06] sm:p-6 md:grid-cols-2">{unit.flashcards.length ? unit.flashcards.map((summaryCard) => <div key={summaryCard.id} className="rounded-xl border border-black/[0.07] p-4 dark:border-white/[0.08]"><strong className="text-xs leading-5">Q. {summaryCard.front}</strong><p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">A. {summaryCard.back}</p></div>) : <p className="text-xs text-slate-400">이 단원에 연결된 카드가 없습니다.</p>}</div>
              </details>
            </section>
          })}
        </div>
      </>}
    </div>
  )
}
