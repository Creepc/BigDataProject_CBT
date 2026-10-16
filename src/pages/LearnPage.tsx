import { useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, ExternalLink,
  FileText, GitBranch, Lightbulb, ListChecks, PlayCircle, Scale, TriangleAlert,
} from 'lucide-react'
import type { Concept, CourseData, NavigationTarget, Question } from '@/types'
import { useStudy } from '@/contexts/StudyContext'
import { formatPages } from '@/lib/study'
import { pdfPageUrl } from '@/lib/assets'
import { DifficultyBadge, EmptyState, PageHeader, SearchInput } from '@/components/ui'

export function LearnPage({ data, selectedId, initialFile, navigate }: { data: CourseData; selectedId?: string; initialFile?: string; navigate: (target: NavigationTarget) => void }) {
  const { state, toggleConcept } = useStudy()
  const [query, setQuery] = useState('')
  const [fileFilter, setFileFilter] = useState(initialFile ?? 'all')
  const [level, setLevel] = useState<'전체' | '기초' | '심화' | '시험 대비'>('전체')

  const filtered = useMemo(() => data.concepts.filter((concept) => {
    const haystack = `${concept.name} ${concept.unit} ${concept.definition} ${concept.tags.join(' ')}`.toLowerCase()
    return (!query || haystack.includes(query.toLowerCase())) && (fileFilter === 'all' || concept.fileId === fileFilter) && (level === '전체' || concept.level === level)
  }), [data.concepts, query, fileFilter, level])

  const selected = selectedId ? data.concepts.find((concept) => concept.id === selectedId) : undefined
  if (selected) return <ConceptDetail key={selected.id} concept={selected} data={data} navigate={navigate} completed={state.completedConceptIds.includes(selected.id)} onToggle={() => toggleConcept(selected.id, selected.name)} />

  const grouped = filtered.reduce<Record<string, Concept[]>>((acc, concept) => {
    const key = `${data.files.find((file) => file.id === concept.fileId)?.shortTitle ?? concept.fileId} · ${concept.unit}`
    acc[key] = [...(acc[key] ?? []), concept]
    return acc
  }, {})

  return (
    <div className="animate-enter">
      <PageHeader eyebrow="CONCEPT LIBRARY" title="개념을 연결해 이해하기" copy="정의만 외우지 않고 작동 원리, 비교, 오개념, 출처를 한 흐름으로 공부합니다. 중요도는 자료 내 반복과 강조를 바탕으로 한 추정입니다." />
      <div className="surface mb-5 grid gap-3 p-4 lg:grid-cols-[1fr_15rem_auto]">
        <SearchInput value={query} onChange={setQuery} placeholder="개념, 단원, 키워드 검색" ariaLabel="개념 검색" />
        <select aria-label="강의자료 필터" value={fileFilter} onChange={(event) => setFileFilter(event.target.value)} className="input">
          <option value="all">모든 강의자료</option>{data.files.map((file) => <option key={file.id} value={file.id}>{file.shortTitle}</option>)}
        </select>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-white/5">
          {(['전체', '기초', '심화', '시험 대비'] as const).map((item) => <button key={item} aria-pressed={level === item} onClick={() => setLevel(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${level === item ? 'bg-white text-cobalt shadow-sm dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500'}`}>{item}</button>)}
        </div>
      </div>
      {filtered.length ? (
        <div className="space-y-5">
          {Object.entries(grouped).map(([unit, concepts]) => (
            <section key={unit} className="surface overflow-hidden">
              <div className="border-b border-black/[0.07] bg-slate-50/60 px-5 py-4 dark:border-white/[0.07] dark:bg-white/[0.025]"><h2 className="text-sm font-black">{unit}</h2><p className="mt-1 text-[11px] text-slate-400">핵심 개념 {concepts.length}개</p></div>
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                {concepts.map((concept) => {
                  const done = state.completedConceptIds.includes(concept.id)
                  const file = data.files.find((item) => item.id === concept.fileId)
                  const questionCount = concept.relatedQuestionIds.length
                  return (
                    <button key={concept.id} onClick={() => navigate({ view: 'learn', id: concept.id })} className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 text-left hover:bg-blue-50/50 dark:hover:bg-white/[0.025]">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-white/[0.06]'}`}>{done ? <Check size={19} /> : <span className="text-xs font-black">{concept.importance}</span>}</span>
                      <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm group-hover:text-cobalt">{concept.name}</strong><DifficultyBadge difficulty={concept.difficulty} /><span className="chip">{concept.level}</span></span><span className="mt-1.5 block truncate text-xs text-slate-500">{concept.definition}</span><span className="mt-1 block text-[10px] text-slate-400">{file?.shortTitle} · {formatPages(concept.pages)} · 연습 {questionCount}문항</span></span>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-cobalt" />
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : <EmptyState title="검색 결과가 없습니다" copy="필터를 줄이거나 다른 키워드로 검색해 보세요." />}
    </div>
  )
}

function ConceptDetail({ concept, data, navigate, completed, onToggle }: { concept: Concept; data: CourseData; navigate: (target: NavigationTarget) => void; completed: boolean; onToggle: () => void }) {
  const [tab, setTab] = useState<'study' | 'source'>('study')
  const [studyStep, setStudyStep] = useState<Concept['level']>('기초')
  const file = data.files.find((item) => item.id === concept.fileId)
  const related = concept.relatedConceptIds.map((id) => data.concepts.find((item) => item.id === id)).filter(Boolean) as Concept[]
  const questions = concept.relatedQuestionIds
    .map((id) => data.questions.find((question) => question.id === id))
    .filter((question): question is Question => Boolean(question))
  const questionIds = questions.map((question) => question.id).join(',')
  const studySteps = ['기초', '심화', '시험 대비'] as const
  return (
    <div className="mx-auto max-w-6xl animate-enter">
      <button onClick={() => navigate({ view: 'learn' })} className="button-secondary mb-5"><ArrowLeft size={17} />개념 목록</button>
      <header className="surface overflow-hidden">
        <div className="border-b border-black/[0.07] bg-ink p-6 text-white dark:border-white/[0.07] sm:p-8">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{concept.unit}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{concept.level}</span><span className="text-xs font-bold text-amber-300">중요도 {'★'.repeat(concept.importance)}{'☆'.repeat(5 - concept.importance)}</span></div>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{concept.name}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{concept.definition}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={onToggle} className={`button-primary ${completed ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-white text-ink hover:bg-blue-100'}`}>{completed ? <CheckCircle2 size={17} /> : <Check size={17} />}{completed ? '학습 완료됨' : '학습 완료 표시'}</button>
            {questions[0] && <button onClick={() => navigate({ view: 'practice', id: questions[0].id, params: { ids: questionIds } })} className="button-secondary border-white/15 bg-white/5 text-white hover:bg-white/10"><PlayCircle size={17} />관련 문제 {questions.length}개</button>}
          </div>
        </div>
        <div role="tablist" aria-label="개념 상세 보기" className="flex gap-1 border-b border-black/[0.07] px-5 pt-3 dark:border-white/[0.07]">
          <button id="concept-study-tab" role="tab" aria-selected={tab === 'study'} aria-controls="concept-study-panel" onClick={() => setTab('study')} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === 'study' ? 'border-cobalt text-cobalt' : 'border-transparent text-slate-400'}`}>개념 학습</button>
          <button id="concept-source-tab" role="tab" aria-selected={tab === 'source'} aria-controls="concept-source-panel" onClick={() => setTab('source')} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === 'source' ? 'border-cobalt text-cobalt' : 'border-transparent text-slate-400'}`}>원문 자료</button>
        </div>
        {tab === 'study' ? (
          <div id="concept-study-panel" role="tabpanel" aria-labelledby="concept-study-tab" className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_18rem]">
            <div className="min-w-0">
              <div role="tablist" aria-label="개념 학습 단계" className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-white/[0.04]">
                {studySteps.map((step, index) => (
                  <button
                    key={step}
                    id={`concept-step-${index}-tab`}
                    role="tab"
                    aria-selected={studyStep === step}
                    aria-controls={`concept-step-${index}-panel`}
                    onClick={() => setStudyStep(step)}
                    className={`rounded-xl px-2 py-3 text-xs font-black transition sm:text-sm ${studyStep === step ? 'bg-white text-cobalt shadow-sm dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    <span className="mr-1 text-[10px] opacity-60">0{index + 1}</span>{step}
                  </button>
                ))}
              </div>

              <div className="prose-study mt-7 min-w-0">
                {studyStep === '기초' && (
                  <div id="concept-step-0-panel" role="tabpanel" aria-labelledby="concept-step-0-tab">
                    <section className="rounded-2xl border border-black/[0.07] p-5 dark:border-white/[0.08]"><div className="eyebrow">CORE DEFINITION</div><h2 className="mt-2 text-xl font-black">핵심 정의</h2><p>{concept.definition}</p></section>
                    <section><div className="eyebrow">EASY START</div><h3 className="mt-2 text-lg font-black">쉽게 이해하기</h3><p>{concept.easyExplanation}</p></section>
                    {concept.examples.length > 0 && <section><h3 className="flex items-center gap-2"><Lightbulb size={18} className="text-amber" />구체적인 예시</h3><ul>{concept.examples.map((item, index) => <li key={index}><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />{item}</li>)}</ul></section>}
                  </div>
                )}

                {studyStep === '심화' && (
                  <div id="concept-step-1-panel" role="tabpanel" aria-labelledby="concept-step-1-tab">
                    <section><div className="eyebrow">HOW IT WORKS</div><h2 className="mt-2 flex items-center gap-2 text-xl font-black"><GitBranch size={19} className="text-cobalt" />작동 원리와 구조</h2><div className="mt-4 space-y-3">{concept.mechanism.map((step, index) => <div key={index} className="grid grid-cols-[2rem_1fr] gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cobalt text-xs font-black text-white">{index + 1}</span><p className="mt-0!">{step}</p></div>)}</div></section>
                    {concept.comparisons.length > 0 ? <section><h3 className="flex items-center gap-2"><Scale size={18} className="text-mint" />유사 개념과 차이</h3><div className="mt-3 overflow-hidden rounded-xl border border-black/[0.07] dark:border-white/[0.08]"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs dark:bg-white/[0.04]"><tr><th className="p-3">비교 대상</th><th className="p-3">핵심 구분</th></tr></thead><tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">{concept.comparisons.map((item, index) => <tr key={index}><td className="p-3 align-top font-bold">{item.target}</td><td className="p-3 leading-6 text-slate-600 dark:text-slate-300">{item.difference}</td></tr>)}</tbody></table></div></section> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/[0.03]">이 개념은 자료에서 직접 대조하는 비교 항목이 제시되지 않았습니다.</p>}
                  </div>
                )}

                {studyStep === '시험 대비' && (
                  <div id="concept-step-2-panel" role="tabpanel" aria-labelledby="concept-step-2-tab">
                    <section className="rounded-2xl bg-blue-50 p-5 dark:bg-blue-500/[0.08]"><div className="eyebrow">EXAM CHECK</div><h2 className="mt-2 flex items-center gap-2 text-xl font-black text-cobalt dark:text-blue-300"><ListChecks size={19} />시험 핵심 포인트</h2><ul>{concept.examPoints.map((item, index) => <li key={index}><Check size={15} className="mt-1 shrink-0 text-cobalt" />{item}</li>)}</ul></section>
                    {concept.misconceptions.length > 0 ? <section className="rounded-2xl bg-rose-50 p-5 dark:bg-rose-500/[0.08]"><h3 className="mt-0 flex items-center gap-2 text-rose-700 dark:text-rose-300"><TriangleAlert size={18} />자주 발생하는 오개념</h3><ul>{concept.misconceptions.map((item, index) => <li key={index}><span className="mt-1 font-black text-rose-500">×</span>{item}</li>)}</ul></section> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/[0.03]">자료에서 별도로 지적한 오개념은 없습니다.</p>}
                  </div>
                )}
              </div>

              <div className="mt-7 flex items-center justify-between border-t border-black/[0.07] pt-5 dark:border-white/[0.07]">
                <button type="button" disabled={studyStep === studySteps[0]} onClick={() => setStudyStep(studySteps[Math.max(0, studySteps.indexOf(studyStep) - 1)])} className="button-secondary disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={16} />이전 단계</button>
                <span className="text-xs font-bold text-slate-400">{studySteps.indexOf(studyStep) + 1} / {studySteps.length}</span>
                {studyStep === studySteps[studySteps.length - 1]
                  ? questions[0] && <button type="button" onClick={() => navigate({ view: 'practice', id: questions[0].id, params: { ids: questionIds } })} className="button-primary">문제로 확인<PlayCircle size={16} /></button>
                  : <button type="button" onClick={() => setStudyStep(studySteps[studySteps.indexOf(studyStep) + 1])} className="button-primary">다음 단계<ArrowRight size={16} /></button>}
              </div>
            </div>
            <aside className="space-y-4">
              <div className="rounded-2xl border border-black/[0.07] p-4 dark:border-white/[0.08]"><div className="text-xs font-black text-slate-400">출처</div><div className="mt-2 text-sm font-bold">{file?.title}</div><div className="mt-1 text-xs text-slate-500">{formatPages(concept.pages)}</div>{file && <a className="button-secondary mt-4 w-full" href={pdfPageUrl(file, concept.pages[0])} target="_blank" rel="noreferrer"><FileText size={16} />PDF 열기<ExternalLink size={13} /></a>}<p className="mt-3 text-[10px] leading-5 text-slate-400">설명 근거: {concept.evidenceType}. 보충 설명은 이해를 돕기 위한 표현이며 원문 인용이 아닙니다.</p></div>
              <div className="rounded-2xl border border-black/[0.07] p-4 dark:border-white/[0.08]"><div className="text-xs font-black text-slate-400">관련 연습 · {questions.length}문항</div><div className="mt-3 space-y-2">{questions.length ? questions.slice(0, 3).map((question, index) => <button key={question.id} onClick={() => navigate({ view: 'practice', id: question.id, params: { ids: questionIds } })} className="flex w-full items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-left text-xs font-bold leading-5 text-cobalt hover:bg-blue-100 dark:bg-blue-500/[0.08] dark:text-blue-300 dark:hover:bg-blue-500/[0.14]"><span className="shrink-0 text-[10px] opacity-60">Q{index + 1}</span><span className="line-clamp-2">{question.prompt}</span></button>) : <span className="text-xs text-slate-400">연결된 연습 문제가 없습니다.</span>}</div></div>
              <div className="rounded-2xl border border-black/[0.07] p-4 dark:border-white/[0.08]"><div className="text-xs font-black text-slate-400">연결 개념</div><div className="mt-3 space-y-2">{related.length ? related.map((item) => <button key={item.id} onClick={() => navigate({ view: 'learn', id: item.id })} className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-left text-xs font-bold hover:text-cobalt dark:bg-white/[0.04]">{item.name}<ArrowRight size={13} /></button>) : <span className="text-xs text-slate-400">직접 연결된 개념 없음</span>}</div></div>
              <div className="rounded-2xl border border-black/[0.07] p-4 dark:border-white/[0.08]"><div className="text-xs font-black text-slate-400">키워드</div><div className="mt-3 flex flex-wrap gap-1.5">{concept.tags.map((tag) => <span key={tag} className="chip">#{tag}</span>)}</div></div>
            </aside>
          </div>
        ) : (
          <div id="concept-source-panel" role="tabpanel" aria-labelledby="concept-source-tab" className="p-4 sm:p-6">
            {file ? <><div className="mb-3 flex items-center justify-between"><p className="text-xs text-slate-500">브라우저 PDF 뷰어 · {formatPages(concept.pages)}</p><a href={pdfPageUrl(file, concept.pages[0])} target="_blank" rel="noreferrer" className="button-secondary">새 창으로 열기<ExternalLink size={15} /></a></div><iframe title={`${file.shortTitle} 원문`} src={pdfPageUrl(file, concept.pages[0])} className="h-[70vh] w-full rounded-2xl border border-black/10 bg-slate-100 dark:border-white/10" /></> : <EmptyState title="자료를 찾을 수 없습니다" copy="파일 연결 정보를 확인해 주세요." />}
          </div>
        )}
      </header>
    </div>
  )
}
