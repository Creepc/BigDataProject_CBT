import { useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, ChevronDown, ExternalLink, FileText, GraduationCap, Play, SlidersHorizontal } from 'lucide-react'
import type { CourseData, NavigationTarget } from '@/types'
import { useStudy } from '@/contexts/StudyContext'
import { pdfPageUrl } from '@/lib/assets'
import { evidenceLabel, getFinalExamLevel, getFinalExams, getFinalLevelLabel, getFinalQuestions, nextFinalQuestion, type FinalFilters } from '@/lib/finalReview'
import { getMockExamProgress, getMockExamQuestions } from '@/lib/mockExams'
import { DifficultyBadge, EmptyState, ProgressBar, SearchInput } from '@/components/ui'

export function FinalReviewPage({ data, navigate, initialLevel = 'standard' }: { data: CourseData; navigate: (target: NavigationTarget) => void; initialLevel?: string }) {
  const { state } = useStudy()
  const [filters, setFilters] = useState<FinalFilters>({})
  const [limit, setLimit] = useState(12)
  const review = data.finalReview
  if (!review) return null
  const all = getFinalQuestions(data)
  const level = ['foundation', 'standard', 'challenge', 'all'].includes(initialLevel) ? initialLevel : 'standard'
  const exams = getFinalExams(data, level)
  const foundation = getFinalQuestions(data, { level: 'foundation' })
  const standard = getFinalQuestions(data, { level: 'standard' })
  const challenge = getFinalQuestions(data, { level: 'challenge' })
  const levelLabel = getFinalLevelLabel(level)
  const seriesCopy = level === 'standard'
    ? { eyebrow: 'APPLY AND DISTINGUISH', heading: '중간 난도 · 40문항씩 적용', intro: '120문항 모두 보통 난도입니다. 용어의 뜻을 보기에 함께 주지 않고, 비슷한 개념과 짧은 사례를 구분합니다. 기존 고난도처럼 긴 복합 조건은 쌓지 않았어요.' }
    : level === 'foundation'
      ? { eyebrow: 'START WITH THE BASICS', heading: '기본 다지기 · 40문항씩 연습', intro: '기존 기본 다지기 120문항을 그대로 유지합니다. 용어와 역할부터 익히고 싶을 때 풀어 보세요.' }
      : level === 'challenge'
        ? { eyebrow: 'ORIGINAL CHALLENGE PAPERS', heading: '기존 고난도 · 40문항씩 점검', intro: '기존 최종 대비 1~3회입니다. 이전 문제와 풀이 기록을 그대로 확인할 수 있어요. 조건을 복합적으로 판단하는 연습입니다.' }
        : { eyebrow: 'ALL FINAL PAPERS', heading: '세 단계 · 전체 9회', intro: '기본 다지기·중간 난도·기존 고난도를 모두 표시합니다. 비슷한 수준만 이어 풀려면 위에서 문제 묶음을 선택하세요.' }
  const items = getFinalQuestions(data, { ...filters, level }, state.attempts)
  const source = data.files.find((file) => file.id === review.fileId)
  const answered = all.filter((question) => state.attempts[question.id]?.lastSelected.length).length
  const correct = all.filter((question) => state.attempts[question.id]?.lastSelected.length && state.attempts[question.id]?.lastCorrect).length
  const setFilter = (key: keyof FinalFilters, value: string) => { setFilters((before) => ({ ...before, [key]: value })); setLimit(12) }
  const study = (params: Record<string, string> = {}) => {
    const selected = getFinalQuestions(data, { level, ...params }, state.attempts)
    if (selected.length) navigate({ view: 'practice', id: nextFinalQuestion(selected, state.attempts), params: { scope: 'final', level, ...params, ids: selected.map((question) => question.id).join(',') } })
  }

  return <div className="animate-enter">
    <header className="relative overflow-hidden rounded-[1.75rem] bg-ink p-6 text-white sm:p-8">
      <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full border-[36px] border-cobalt/25" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-blue-300"><GraduationCap size={17} />FINAL REVIEW · 교수님 마지막 안내 반영</div>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">외우는 답에서,<br className="sm:hidden" /> 판단하는 답으로.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">기본보다 한 단계 높은 중간 난도 {standard.length}문항을 추가했어요. 새 묶음은 모두 보통 난도입니다.<br />용어 번역 대신 사례로 판단하고, 비슷한 보기 사이의 차이를 찾아보세요. 기존 기본·고난도 문제와 기록은 그대로입니다.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => study({ level: 'standard' })} className="button-primary bg-white text-ink hover:bg-blue-100"><BookOpen size={16} />중간 난도 {standard.length}문항 해설 학습</button>
          <button onClick={() => navigate({ view: 'final', params: { level: 'foundation' } })} className="button-secondary border-white/20 bg-white/5 text-white hover:bg-white/10">기본 다지기 보기</button>
          {source && <a className="button-secondary border-white/20 bg-white/5 text-white hover:bg-white/10" href={pdfPageUrl(source, 1)} target="_blank" rel="noreferrer"><FileText size={16} />최종 PDF<ExternalLink size={13} /></a>}
        </div>
        <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
          {[[`중간 ${standard.length}문항 추가`, '40문항 × 3회 · 전부 보통'], [`기존 ${foundation.length + challenge.length}문항 유지`, '기본·고난도·풀이 기록 보존'], [`총 ${all.length}문항`, '기본 3회 + 중간 3회 + 고난도 3회'], [`${answered} / ${all.length} 응답`, `최근 응답 중 ${correct}개 정답`]].map(([title, description]) => <div key={title}><strong className="text-base sm:text-lg">{title}</strong><p className="mt-1 text-[11px] text-slate-400">{description}</p></div>)}
        </div>
      </div>
    </header>

    <div className="surface mt-6 p-4 sm:p-5">
      <div role="group" aria-label="최종 대비 문제 묶음" className="flex flex-wrap gap-2">{[
        ['foundation', `기본 다지기 ${foundation.length}문항`],
        ['standard', `중간 난도 · 추천 ${standard.length}문항`],
        ['challenge', `기존 고난도 ${challenge.length}문항`],
        ['all', `전체 ${all.length}문항`],
      ].map(([value, label]) => <button key={value} aria-pressed={level === value} className={level === value ? 'button-primary' : 'button-secondary'} onClick={() => navigate({ view: 'final', params: { level: value } })}>{label}</button>)}</div>
      <p className="mt-3 text-xs leading-6 text-slate-500">{seriesCopy.intro}</p>
    </div>
    <section className="mt-7" aria-labelledby="final-exams-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><div className="eyebrow">{seriesCopy.eyebrow}</div><h2 id="final-exams-heading" className="mt-1 text-xl font-black">{seriesCopy.heading}</h2></div><p className="text-xs text-slate-500">시험 50분 · 해설 학습 무제한 · 문항당 2.5점</p></div>
      <div className="grid gap-4 xl:grid-cols-3">{exams.map((exam, index) => {
        const questions = getMockExamQuestions(data, exam.id)
        const progress = getMockExamProgress(exam, state.attempts, state.exams)
        return <article key={exam.id} className="surface flex flex-col p-5">
          <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cobalt text-sm font-black text-white">0{index + 1}</span><span className="text-xs font-semibold text-slate-400">40문항 · 50분</span></div>
          <h3 className="mt-4 text-base font-black">{exam.title}</h3><p className="mt-2 text-xs leading-6 text-slate-500">{exam.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{(['쉬움', '보통', '어려움'] as const).map((difficulty) => {
            const count = questions.filter((question) => question.difficulty === difficulty).length
            return count ? <span key={difficulty} className="chip">{difficulty} {count}</span> : null
          })}<span className="chip">복수 {questions.filter((question) => question.mode === 'multiple').length}</span><span className="chip">시각자료 {questions.filter((question) => question.visual).length}</span>{getFinalExamLevel(exam) === 'challenge' && <span className="chip">보충 {questions.filter((question) => question.finalReview?.evidence === 'supplement').length}</span>}</div>
          <div className="mb-4 mt-5"><p className="mb-2 flex justify-between text-[11px] text-slate-500"><span>문항 응답 {progress.answered}/40</span><span>최근 정답 {progress.correct}/40</span></p><ProgressBar value={progress.answered / 40 * 100} /><p className="mt-2 text-[11px] text-slate-400">{progress.examCount ? `시험 ${progress.examCount}회 · 최근 ${progress.latestScore}점 · 최고 ${progress.bestScore}점` : '아직 시험 기록 없음 · 학습 응답과 시험 점수는 별도'}</p></div>
          <div className="mt-auto grid grid-cols-2 gap-2"><button className="button-primary px-2" onClick={() => navigate({ view: 'exam', params: { paper: exam.id, level } })}><Play size={15} />시험 응시</button><button className="button-secondary px-2" onClick={() => navigate({ view: 'practice', id: progress.nextId, params: { scope: 'final', exam: exam.id, level } })}><BookOpen size={15} />해설 학습</button></div>
          {progress.latestExam && <button className="button-secondary mt-2 text-xs" onClick={() => navigate({ view: 'exam', params: { paper: exam.id, review: 'latest', level } })}>최근 시험 답안·해설 다시 보기</button>}
        </article>
      })}</div>
      <p className="mt-3 text-xs leading-6 text-slate-500">시험은 제출 후 해설 공개, 해설 학습은 한 문항씩 제출 후 개념·풀이 과정·주의점·다른 예시를 확인합니다. 기존 문제와 학습 기록은 유지됩니다.</p>
    </section>

    <section className="surface mt-8 p-5 sm:p-6" aria-labelledby="final-focus-heading">
      <div className="eyebrow">WHAT TO DISTINGUISH</div><h2 id="final-focus-heading" className="mt-1 text-xl font-black">필기 강조를 개념별로 다시 보기</h2>
      <p className="mt-2 text-xs leading-6 text-slate-500">항목을 열면 핵심 개념과 주의점을 읽을 수 있습니다. PDF 직접 요약에 없는 구술 내용도 기존 강의자료와 연결했습니다.</p>
      <div className="mt-5 grid items-start gap-3 lg:grid-cols-2">{review.topics.map((topic) => {
        const questions = getFinalQuestions(data, { level, topic: topic.id, evidence: 'core' })
        const done = questions.filter((question) => state.attempts[question.id]?.lastSelected.length).length
        return <details key={topic.id} className="group rounded-xl border border-black/[0.08] p-4 dark:border-white/10">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3"><span><span className="block text-sm font-black">{topic.title}</span><span className="mt-1 block text-[11px] text-slate-500">핵심 {questions.length}문항 · 응답 {done}개</span></span><ChevronDown size={17} className="mt-1 shrink-0 text-slate-400 transition group-open:rotate-180" /></summary>
          <p className="mt-4 text-sm font-bold leading-6 text-cobalt dark:text-blue-300">{topic.summary}</p>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-6 text-slate-600 dark:text-slate-300">{topic.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"><strong>구분해서 기억</strong>{topic.traps.map((trap) => <p key={trap} className="mt-1">{trap}</p>)}</div>
          <div className="mt-4 flex flex-wrap gap-2"><button className="button-secondary text-xs" onClick={() => study({ topic: topic.id, evidence: 'core' })}>이 개념 문제 풀기<ArrowRight size={13} /></button>{source && topic.pages.length > 0 && <a href={pdfPageUrl(source, topic.pages[0])} target="_blank" rel="noreferrer" className="button-secondary text-xs">PDF {topic.pages.join('·')}쪽<ExternalLink size={12} /></a>}</div>
        </details>
      })}</div>
    </section>

    <section className="mt-8" aria-labelledby="final-filter-heading">
      <div className="mb-4 flex items-center gap-2"><SlidersHorizontal size={18} className="text-cobalt" /><h2 id="final-filter-heading" className="text-xl font-black">{levelLabel} 골라 풀기</h2><span className="ml-auto text-xs font-bold text-slate-500">{items.length}문항</span></div>
      <div className="surface p-4 sm:p-5"><SearchInput value={filters.search ?? ''} onChange={(value) => setFilter('search', value)} placeholder="발문·핵심 용어 검색" /><div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
        <select className="input text-xs" aria-label="최종 대비 주제" value={filters.topic ?? ''} onChange={(event) => setFilter('topic', event.target.value)}><option value="">모든 주제</option>{review.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select>
        <select className="input text-xs" aria-label="출제 근거" value={filters.evidence ?? ''} onChange={(event) => setFilter('evidence', event.target.value)}><option value="">전체 근거</option><option value="core">핵심 범위만</option><option value="pdf">최종 PDF 중심</option><option value="lecture">마지막 필기 강조</option><option value="supplement">보충만</option></select>
        <select className="input text-xs" aria-label="최종 대비 난이도" value={filters.difficulty ?? ''} onChange={(event) => setFilter('difficulty', event.target.value)}><option value="">모든 난이도</option><option>쉬움</option><option>보통</option><option>어려움</option></select>
        <select className="input text-xs" aria-label="최종 대비 유형" value={filters.mode ?? ''} onChange={(event) => setFilter('mode', event.target.value)}><option value="">모든 유형</option><option value="multiple">복수 정답</option><option value="single">단일 정답</option><option value="visual">시각자료 포함</option></select>
        <select className="input text-xs" aria-label="최종 대비 풀이 상태" value={filters.status ?? ''} onChange={(event) => setFilter('status', event.target.value)}><option value="">모든 풀이 상태</option><option value="new">미응답</option><option value="wrong">최근 오답</option></select>
      </div><div className="mt-3 flex flex-wrap gap-2"><button className="button-primary text-xs" disabled={!items.length} onClick={() => study(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)))}>선택한 {items.length}문항 이어 풀기<ArrowRight size={14} /></button><button className="button-secondary text-xs" onClick={() => { setFilters({}); setLimit(12) }}>필터 초기화</button></div></div>
      <div className="mt-3 space-y-2">{items.slice(0, limit).map((question) => {
        const attempt = state.attempts[question.id]
        return <button key={question.id} className="surface-flat w-full p-4 text-left hover:border-cobalt/40" onClick={() => navigate({ view: 'practice', id: question.id, params: { scope: 'final', level, ids: items.map((item) => item.id).join(',') } })}><span className="flex flex-wrap items-center gap-2"><DifficultyBadge difficulty={question.difficulty} /><span className="chip">{evidenceLabel(question.finalReview?.evidence)}</span><span className="text-[11px] text-slate-400">{question.mode === 'multiple' ? '복수 정답' : '단일 정답'}{question.visual ? ' · 시각자료' : ''}</span>{attempt?.lastSelected.length ? <span className={`ml-auto text-[11px] font-bold ${attempt.lastCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{attempt.lastCorrect ? '최근 정답' : '최근 오답'}</span> : null}</span><span className="mt-3 block whitespace-pre-line text-sm font-bold leading-7">{question.prompt}</span></button>
      })}</div>
      {!items.length && <div className="mt-3"><EmptyState title="조건에 맞는 문항이 없어요" copy="다른 주제나 풀이 상태를 선택하거나 필터를 초기화하세요." /></div>}
      {limit < items.length && <button className="button-secondary mt-4 w-full" onClick={() => setLimit((value) => value + 12)}>12문항 더 보기 ({Math.min(limit, items.length)}/{items.length})<ChevronDown size={15} /></button>}
    </section>
    <footer className="mt-8 rounded-2xl border border-black/[0.07] p-5 text-xs leading-6 text-slate-500 dark:border-white/10"><h2 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300"><CheckCircle2 size={16} />자료를 읽을 때의 경계</h2>{review.cautions.map((caution) => <p key={caution} className="mt-2">{caution}</p>)}</footer>
  </div>
}
