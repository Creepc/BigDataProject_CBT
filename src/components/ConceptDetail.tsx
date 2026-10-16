import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, Clock3, ExternalLink, FileText, Lightbulb, ListChecks, PlayCircle, Scale, TriangleAlert } from 'lucide-react'
import type { Concept, CourseData, NavigationTarget, Question } from '@/types'
import { formatPages } from '@/lib/study'
import { conceptReadingMinutes } from '@/lib/lessons'
import { pdfPageUrl } from '@/lib/assets'
import { QuestionVisual } from '@/components/QuestionVisual'
import { EmptyState } from '@/components/ui'

const chapterLinks = [
  { key: 'start', label: '학습 목표·선수 용어' },
  { key: 'reading', label: '원리와 설명' },
  { key: 'example', label: '단계별 풀이 예제' },
  { key: 'compare', label: '비교·오개념' },
  { key: 'checks', label: '스스로 설명해 보기' },
  { key: 'summary', label: '시험 전 정리' },
]

function ChapterHeading({ number, title, copy }: { number: string; title: string; copy?: string }) {
  return <div className="mb-5 border-b border-black/[0.08] pb-4 dark:border-white/10"><span className="eyebrow">CHAPTER {number}</span><h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">{title}</h2>{copy && <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{copy}</p>}</div>
}

export function ConceptDetail({ concept, data, navigate, completed, onToggle }: { concept: Concept; data: CourseData; navigate: (target: NavigationTarget) => void; completed: boolean; onToggle: () => void }) {
  const [tab, setTab] = useState<'study' | 'source'>('study')
  const file = data.files.find((item) => item.id === concept.fileId)
  const lesson = concept.lesson
  const related = concept.relatedConceptIds.map((id) => data.concepts.find((item) => item.id === id)).filter((item): item is Concept => Boolean(item))
  const questions = concept.relatedQuestionIds.map((id) => data.questions.find((question) => question.id === id)).filter((question): question is Question => Boolean(question))
  const questionIds = questions.map((question) => question.id).join(',')
  const figureQuestion = questions.find((question) => question.conceptIds.includes(concept.id) && question.visual?.kind === 'source-image')
    ?? questions.find((question) => question.conceptIds.includes(concept.id) && question.visual)
  const studyFigure = figureQuestion?.visual
  const sameFile = data.concepts.filter((item) => item.fileId === concept.fileId)
  const index = sameFile.findIndex((item) => item.id === concept.id)
  const previous = sameFile[index - 1]
  const next = sameFile[index + 1]
  const sectionId = (key: string) => `lesson-${concept.id}-${key}`
  const scrollTo = (key: string) => document.getElementById(sectionId(key))?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  const startPractice = () => questions[0] && navigate({ view: 'practice', id: questions[0].id, params: { ids: questionIds } })

  return <div className="mx-auto max-w-6xl animate-enter">
    <button onClick={() => navigate({ view: 'learn' })} className="button-secondary mb-5"><ArrowLeft size={17} />개념 목록</button>
    <header className="surface">
      <div className="rounded-t-[1.3rem] bg-ink p-5 text-white sm:p-8">
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{concept.unit}</span><span className="inline-flex items-center gap-1.5 text-xs text-slate-300"><Clock3 size={14} />예제 포함 약 {conceptReadingMinutes(concept)}분</span><span className="text-xs font-bold text-amber-300">중요도 {'★'.repeat(concept.importance)}{'☆'.repeat(5 - concept.importance)}</span></div>
        <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{concept.name}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{concept.definition}</p>
        <div className="mt-5 flex flex-wrap gap-3"><button onClick={onToggle} className={`button-primary ${completed ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-white text-ink hover:bg-blue-100'}`}>{completed ? <CheckCircle2 size={17} /> : <Check size={17} />}{completed ? '학습 완료됨' : '학습 완료 표시'}</button>{questions.length > 0 && <button onClick={startPractice} className="button-secondary border-white/15 bg-white/5 text-white hover:bg-white/10"><PlayCircle size={17} />관련 문제 {questions.length}개</button>}</div>
      </div>
      <div role="tablist" aria-label="개념 상세 보기" className="flex gap-1 border-b border-black/[0.07] px-4 pt-2 dark:border-white/[0.07] sm:px-6">
        <button id="concept-study-tab" role="tab" aria-selected={tab === 'study'} aria-controls="concept-study-panel" onClick={() => setTab('study')} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === 'study' ? 'border-cobalt text-cobalt' : 'border-transparent text-slate-400'}`}>학습 본문</button>
        <button id="concept-source-tab" role="tab" aria-selected={tab === 'source'} aria-controls="concept-source-panel" onClick={() => setTab('source')} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === 'source' ? 'border-cobalt text-cobalt' : 'border-transparent text-slate-400'}`}>원문 자료</button>
      </div>
      {tab === 'source' ? <div id="concept-source-panel" role="tabpanel" aria-labelledby="concept-source-tab" className="p-4 sm:p-6">{file ? <><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">브라우저 PDF 뷰어 · {formatPages(concept.pages)}</p><a href={pdfPageUrl(file, concept.pages[0])} target="_blank" rel="noreferrer" className="button-secondary">새 창으로 열기<ExternalLink size={15} /></a></div><iframe title={`${file.shortTitle} 원문`} src={pdfPageUrl(file, concept.pages[0])} className="h-[70vh] w-full rounded-2xl border border-black/10 bg-slate-100 dark:border-white/10" /></> : <EmptyState title="자료를 찾을 수 없습니다" copy="파일 연결 정보를 확인해 주세요." />}</div> :
        <div id="concept-study-panel" role="tabpanel" aria-labelledby="concept-study-tab" className="grid items-start gap-8 p-4 sm:p-8 xl:grid-cols-[minmax(0,1fr)_14rem]">
          <article className="lesson-copy min-w-0">
            <nav aria-label="학습 본문 목차" className="mb-9 flex flex-wrap gap-2 xl:hidden">{chapterLinks.map((item, order) => <button key={item.key} onClick={() => scrollTo(item.key)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-cobalt dark:bg-white/5 dark:text-slate-300">{order + 1}. {item.label}</button>)}</nav>
            <section id={sectionId('start')} className="scroll-mt-24">
              <ChapterHeading number="01" title="이 개념을 공부하고 나면" />
              <ul className="space-y-3 rounded-2xl bg-blue-50 p-5 dark:bg-blue-500/[0.08]">{(lesson?.objectives ?? concept.examPoints).map((item, order) => <li key={order} className="flex items-start gap-3 text-sm leading-7"><Check size={16} className="mt-1.5 shrink-0 text-cobalt dark:text-blue-300" /><span>{item}</span></li>)}</ul>
              {lesson && <div className="mt-6"><h3>먼저 알아둘 용어</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2">{lesson.prerequisites.map((item, order) => <div key={order} className="rounded-xl border border-black/[0.07] p-4 dark:border-white/10"><dt className="text-sm font-black">{item.term}</dt><dd className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.explanation}</dd></div>)}</dl></div>}
              <div className="mt-6 border-l-4 border-amber bg-amber/5 px-5 py-1"><h3 className="!mt-3 flex items-center gap-2"><Lightbulb size={18} className="shrink-0 text-amber" />먼저 감을 잡아 봅시다</h3><p>{concept.easyExplanation}</p></div>
            </section>

            <section id={sectionId('reading')} className="mt-12 scroll-mt-24">
              <ChapterHeading number="02" title="원리를 차근차근" />
              {lesson ? lesson.sections.map((section, order) => <section key={order} className="mt-7"><h3 className="flex items-start gap-3"><span className="mt-0.5 text-xs font-black text-cobalt dark:text-blue-300">{String(order + 1).padStart(2, '0')}</span><span>{section.title}</span></h3>{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</section>) : concept.mechanism.map((paragraph, order) => <p key={order}>{paragraph}</p>)}
              {studyFigure && <div className="mt-7"><h3 className="flex items-center gap-2"><BookOpen size={18} className="text-cobalt" />{studyFigure.kind === 'source-image' ? '강의 그림과 연결하기' : '그래프로 해석 확인하기'}</h3><QuestionVisual visual={studyFigure.kind === 'source-image' ? { ...studyFigure, note: '강의 원본 도식입니다. 위 설명에서 읽은 구성요소와 흐름을 그림에서 직접 찾아보세요.' } : studyFigure} files={data.files} /><div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5"><div className="text-xs font-black text-cobalt dark:text-blue-300">이 그림을 읽는 기준</div><p className="!mt-1">{figureQuestion.review}</p></div></div>}
            </section>

            <section id={sectionId('example')} className="mt-12 scroll-mt-24">
              <ChapterHeading number="03" title="단계별로 따라 풀기" copy="먼저 상황만 읽고 접근 방법을 생각한 뒤, 각 단계와 자신의 생각을 비교하세요. 새로 가정한 숫자와 원문을 재현한 부분은 예제 안에서 구분합니다." />
              {lesson ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/[0.04] sm:p-5"><h3 className="!mt-0 text-emerald-800 dark:text-emerald-300">{lesson.workedExample.title}</h3><p>{lesson.workedExample.scenario}</p><ol className="mt-5 space-y-5">{lesson.workedExample.steps.map((step, order) => <li key={order} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white">{order + 1}</span><div><h4 className="text-sm font-black leading-7">{step.title}</h4><p className="!mt-1">{step.explanation}</p></div></li>)}</ol><div className="mt-5 border-t border-emerald-200 pt-4 dark:border-emerald-500/20"><div className="text-xs font-black text-emerald-800 dark:text-emerald-300">풀이의 결론</div><p>{lesson.workedExample.conclusion}</p></div></div> : <ul>{concept.examples.map((example, order) => <li key={order}>{example}</li>)}</ul>}
              {lesson?.codeExample && <section className="mt-7"><h3>작은 데이터로 직접 확인하기</h3><p>{lesson.codeExample.explanation}</p><div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-black/10 dark:border-white/10"><div className="bg-slate-800 px-4 py-2 text-[11px] font-bold text-slate-300">{lesson.codeExample.language.toUpperCase()} · 독립 실행 예제</div><pre aria-label="학습용 예제 코드" className="m-0 max-w-full overflow-x-auto bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{lesson.codeExample.code}</code></pre><div className="border-t border-white/10 bg-slate-100 px-4 py-2 text-[11px] font-black text-slate-500 dark:bg-white/5">예상 출력</div><pre aria-label="예상 실행 결과" className="m-0 max-w-full overflow-x-auto bg-slate-50 p-4 text-xs leading-6 text-slate-700 dark:bg-slate-900 dark:text-slate-200"><code>{lesson.codeExample.expectedOutput}</code></pre></div><ul className="mt-3 space-y-2">{lesson.codeExample.notes.map((note, order) => <li key={order} className="flex gap-2 text-sm leading-7 text-slate-500"><span className="shrink-0">•</span><span>{note}</span></li>)}</ul></section>}
            </section>

            <section id={sectionId('compare')} className="mt-12 scroll-mt-24">
              <ChapterHeading number="04" title="비슷한 개념과 구분하기" />
              {concept.comparisons.length > 0 && <><h3 className="flex items-center gap-2"><Scale size={18} className="text-cobalt" />어디서 갈라지는가</h3><div className="mt-4 overflow-x-auto rounded-xl border border-black/[0.08] dark:border-white/10"><table className="w-full min-w-[16rem] text-left text-sm"><thead className="bg-slate-50 dark:bg-white/5"><tr><th className="w-[30%] p-3">비교 대상</th><th className="p-3">판별 기준</th></tr></thead><tbody className="divide-y divide-black/[0.07] dark:divide-white/10">{concept.comparisons.map((item, order) => <tr key={order}><th scope="row" className="p-3 align-top font-bold leading-7">{item.target}</th><td className="p-3 leading-7 text-slate-600 dark:text-slate-300">{item.difference}</td></tr>)}</tbody></table></div></>}
              {concept.misconceptions.length > 0 && <div className="mt-6 rounded-2xl bg-rose-50 p-5 dark:bg-rose-500/[0.07]"><h3 className="!mt-0 flex items-center gap-2 text-rose-800 dark:text-rose-300"><TriangleAlert size={18} className="shrink-0" />오개념 주의</h3><ul className="mt-3 space-y-3">{concept.misconceptions.map((item, order) => <li key={order} className="flex gap-3 text-sm leading-7 text-slate-700 dark:text-slate-300"><span className="shrink-0 font-black text-rose-500">!</span><span>{item}</span></li>)}</ul></div>}
            </section>

            <section id={sectionId('checks')} className="mt-12 scroll-mt-24">
              <ChapterHeading number="05" title="스스로 설명할 수 있나요?" copy="답을 보기 전에 한두 문장으로 이유까지 말해 보세요. 정답을 맞히는 것과 다른 상황에 적용하는 것은 다릅니다." />
              <div className="space-y-5">{lesson?.checks.map((check, order) => <div key={order} className="rounded-2xl border border-black/[0.08] p-4 dark:border-white/10 sm:p-5"><div className="eyebrow">SELF CHECK {order + 1}</div><h3 className="!mt-2 !text-base leading-8">{check.question}</h3><details className="group mt-4"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-cobalt marker:content-none dark:bg-white/5 dark:text-blue-300">정답과 해설 보기<ChevronDown size={16} className="shrink-0 transition group-open:rotate-180" /></summary><div className="mt-4 border-l-2 border-cobalt pl-4"><h4 className="text-sm font-black leading-7">{check.answer}</h4><p>{check.explanation}</p></div></details></div>)}</div>
            </section>

            <section id={sectionId('summary')} className="mt-12 scroll-mt-24">
              <ChapterHeading number="06" title="시험 전에 남겨둘 것" />
              <ul className="space-y-3 rounded-2xl bg-blue-50 p-5 dark:bg-blue-500/[0.08]">{(lesson?.takeaways ?? concept.examPoints).map((item, order) => <li key={order} className="flex gap-3 text-sm leading-7"><ListChecks size={17} className="mt-1.5 shrink-0 text-cobalt dark:text-blue-300" /><span>{item}</span></li>)}</ul>
              <div className="mt-5"><h3>출제 포인트</h3><ul className="mt-3 space-y-2">{concept.examPoints.map((item, order) => <li key={order} className="flex gap-2 text-sm leading-7 text-slate-600 dark:text-slate-300"><span className="shrink-0 font-black text-cobalt">·</span><span>{item}</span></li>)}</ul></div>
              <div className="mt-7 flex flex-wrap gap-3"><button onClick={onToggle} className="button-secondary">{completed ? <CheckCircle2 size={17} /> : <Check size={17} />}{completed ? '학습 완료됨' : '이해했다면 학습 완료'}</button>{questions.length > 0 && <button onClick={startPractice} className="button-primary">연습 {questions.length}문항으로 확인<ArrowRight size={16} /></button>}</div>
              <nav aria-label="이전 다음 개념" className="mt-8 grid gap-3 border-t border-black/[0.08] pt-6 dark:border-white/10 sm:grid-cols-2">{previous ? <button onClick={() => navigate({ view: 'learn', id: previous.id })} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-left dark:bg-white/5"><ArrowLeft size={17} className="shrink-0" /><span className="min-w-0"><span className="block text-[10px] font-bold text-slate-400">이전 개념</span><span className="mt-1 block text-sm font-bold">{previous.name}</span></span></button> : <div />}{next && <button onClick={() => navigate({ view: 'learn', id: next.id })} className="flex items-center justify-between gap-3 rounded-xl bg-blue-50 p-4 text-left dark:bg-blue-500/10"><span className="min-w-0"><span className="block text-[10px] font-bold text-slate-400">다음 개념</span><span className="mt-1 block text-sm font-bold text-cobalt dark:text-blue-300">{next.name}</span></span><ArrowRight size={17} className="shrink-0 text-cobalt dark:text-blue-300" /></button>}</nav>
            </section>
          </article>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <nav aria-label="본문 바로가기" className="hidden rounded-2xl border border-black/[0.08] p-4 dark:border-white/10 xl:block"><div className="mb-3 text-xs font-black text-slate-400">이 개념의 학습 순서</div>{chapterLinks.map((item, order) => <button key={item.key} onClick={() => scrollTo(item.key)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs font-bold leading-5 text-slate-600 hover:bg-blue-50 hover:text-cobalt dark:text-slate-300 dark:hover:bg-white/5"><span className="text-[10px] text-slate-400">0{order + 1}</span>{item.label}</button>)}</nav>
            <div className="rounded-2xl border border-black/[0.08] p-4 dark:border-white/10"><div className="text-xs font-black text-slate-400">강의 근거</div><div className="mt-2 text-xs font-bold leading-6">{file?.shortTitle}</div><div className="mt-1 text-xs text-slate-500">{formatPages(concept.pages)}</div>{file && <a className="button-secondary mt-4 w-full !px-2 !text-xs" href={pdfPageUrl(file, concept.pages[0])} target="_blank" rel="noreferrer"><FileText size={15} />원본 PDF<ExternalLink size={12} /></a>}<p className="mt-3 text-[11px] leading-6 text-slate-500">강의 개념에 원리 설명과 학습용 예제를 보완했습니다. 예시 상황·숫자는 원문의 실제 관측값과 구분해 읽으세요.</p></div>
            {related.length > 0 && <div className="rounded-2xl border border-black/[0.08] p-4 dark:border-white/10"><div className="text-xs font-black text-slate-400">함께 읽을 개념</div><div className="mt-3 space-y-2">{related.map((item) => <button key={item.id} onClick={() => navigate({ view: 'learn', id: item.id })} className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-left text-xs font-bold leading-6 hover:text-cobalt dark:bg-white/5">{item.name}<ArrowRight size={12} className="shrink-0" /></button>)}</div></div>}
          </aside>
        </div>}
    </header>
  </div>
}
