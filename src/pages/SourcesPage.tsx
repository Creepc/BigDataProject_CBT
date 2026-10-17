import { useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, ExternalLink, Eye, FileCheck2, FileSearch, HelpCircle, Search, ShieldCheck } from 'lucide-react'
import type { CourseData, NavigationTarget, PageSummary } from '@/types'
import { pdfPageUrl } from '@/lib/assets'
import { formatPages } from '@/lib/study'
import { searchConnectedPages } from '@/lib/studySummary'
import { PageHeader, ProgressBar, SearchInput, Stat } from '@/components/ui'

export function SourcesPage({ data, navigate }: { data: CourseData; navigate: (target: NavigationTarget) => void }) {
  const [selectedId, setSelectedId] = useState(data.files[0]?.id ?? '')
  const [selectedPage, setSelectedPage] = useState<number>()
  const [query, setQuery] = useState('')
  const selected = data.files.find((file) => file.id === selectedId)
  const totalPages = data.files.reduce((sum, file) => sum + file.pageCount, 0)
  const analyzedPages = data.files.reduce((sum, file) => sum + file.analyzedPages.length, 0)
  const unreadablePages = data.files.reduce((sum, file) => sum + file.unreadablePages.length, 0)
  const pageResults = useMemo(() => searchConnectedPages(data, query), [data, query])

  const chooseFile = (fileId: string) => {
    setSelectedId(fileId)
    setSelectedPage(undefined)
  }
  const previewPage = (page: PageSummary) => {
    setSelectedId(page.fileId)
    setSelectedPage(page.page)
    requestAnimationFrame(() => document.getElementById('source-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="animate-enter">
      <PageHeader eyebrow="SOURCE AUDIT" title="강의자료 분석 현황" copy="중간고사 범위는 Netflix까지입니다. 원본 PDF 전체의 확인 기록은 보존하되, 범위 밖의 추가 실습은 개념·문항·카드와 페이지 검색에서 제외했습니다." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<FileCheck2 size={18} />} label="분석한 PDF" value={`${data.files.length}개`} detail="제공 파일 전체" />
        <Stat icon={<CheckCircle2 size={18} />} label="확인한 페이지" value={`${analyzedPages}쪽`} detail={`전체 ${totalPages}쪽`} tone="green" />
        <Stat icon={<ShieldCheck size={18} />} label="판독 불가 페이지" value={`${unreadablePages}쪽`} detail={unreadablePages ? '아래 파일별 표시' : '없음'} tone="amber" />
        <Stat icon={<FileSearch size={18} />} label="페이지별 색인" value={`${data.pageSummaries.length}건`} detail="본문·표·그래프·코드" tone="blue" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[22rem_1fr]">
        <aside className="surface h-fit overflow-hidden xl:sticky xl:top-24">
          <div className="border-b border-black/[0.07] p-4 dark:border-white/[0.07]"><h2 className="section-title">자료 목록</h2></div>
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">{data.files.map((file) => {
            const progress = file.pageCount ? Math.round((file.analyzedPages.length / file.pageCount) * 100) : 0
            const conceptCount = data.concepts.filter((concept) => concept.fileId === file.id).length
            const questionCount = data.questions.filter((question) => question.sourceRefs.some((ref) => ref.fileId === file.id)).length
            return <button type="button" key={file.id} aria-pressed={selectedId === file.id} aria-label={`${file.shortTitle} 선택, ${file.pageCount}쪽, 개념 ${conceptCount}개, 문항 ${questionCount}개`} onClick={() => chooseFile(file.id)} className={`w-full p-4 text-left transition ${selectedId === file.id ? 'bg-blue-50 dark:bg-blue-500/[0.08]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.025]'}`}>
              <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white" style={{ background: file.color }}>W{file.week}</span><span className="min-w-0 flex-1"><strong className="block text-xs leading-5">{file.shortTitle}</strong><span className="mt-1 block text-[10px] text-slate-400">{file.kind} · {file.pageCount}쪽 · 개념 {conceptCount} · 문항 {questionCount}</span><span className="mt-2 block"><ProgressBar value={progress} tone={progress === 100 ? 'green' : 'amber'} /></span></span></div>
            </button>
          })}</div>
        </aside>
        <section className="space-y-5">
          {selected && <div id="source-preview" className="surface scroll-mt-24 overflow-hidden">
            <div className="border-b border-black/[0.07] p-5 dark:border-white/[0.07] sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div><div className="eyebrow">{selected.kind} · WEEK {selected.week}{selectedPage ? ` · PAGE ${selectedPage}` : ''}</div><h2 className="mt-1 text-xl font-black tracking-tight">{selected.title}</h2><p className="mt-2 text-xs leading-6 text-slate-500">원본 {selected.pageCount}쪽 · 확인 {selected.analyzedPages.length}쪽 · 판독 불가 {selected.unreadablePages.length}쪽{selectedPage ? ` · 현재 ${selectedPage}쪽 미리보기` : ''}</p></div>
                <a aria-label={`${selected.shortTitle}${selectedPage ? ` ${selectedPage}쪽` : ''} 원본 PDF 새 창에서 열기`} className="button-secondary" href={pdfPageUrl(selected, selectedPage)} target="_blank" rel="noreferrer">원본 열기<ExternalLink size={15} /></a>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{selected.topics.map((topic) => <span key={topic} className="chip">#{topic}</span>)}</div>
              {selected.note && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{selected.note}</p>}
              {Boolean(selected.excludedPages?.length) && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-xs leading-6 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200">시험 범위 제외: {formatPages(selected.excludedPages!)}. {selected.partialPages?.length ? `${formatPages(selected.partialPages)}은 Netflix 부분만 학습에 반영했습니다. ` : ''}원본 PDF에는 범위 밖의 추가 실습도 포함되어 있습니다.</p>}
            </div>
            <iframe title={`${selected.shortTitle}${selectedPage ? ` ${selectedPage}쪽` : ''} PDF 미리보기`} src={pdfPageUrl(selected, selectedPage)} className="h-[68vh] w-full bg-slate-100 dark:bg-slate-950" />
          </div>}

          <div className="surface p-5 sm:p-6">
            <div className="flex items-center gap-2"><Search size={18} className="text-cobalt" /><h2 className="section-title">페이지 내용 검색</h2></div>
            <p className="mt-1 text-xs text-slate-500">2글자 이상 입력하면 페이지 핵심 포인트·시각 요소·코드뿐 아니라 연결된 개념명과 문항에서도 찾습니다.</p>
            <div className="mt-4"><SearchInput value={query} onChange={setQuery} placeholder="예: 5V, Hadoop, 결측치, 히스토그램" /></div>
            {query.trim().length >= 2 && <>
              <p className="mt-3 text-[11px] font-bold text-slate-400" role="status" aria-live="polite">검색 결과 {pageResults.length}개{pageResults.length === 60 ? ' · 최대 60개 표시' : ''}</p>
              <div className="mt-3 max-h-[42rem] divide-y divide-black/[0.06] overflow-y-auto rounded-xl border border-black/[0.07] dark:divide-white/[0.06] dark:border-white/[0.07]">
                {pageResults.length ? pageResults.map(({ page, concepts, questions }) => {
                  const file = data.files.find((item) => item.id === page.fileId)
                  const headingId = `page-result-${page.fileId}-${page.page}`
                  const questionIds = questions.map((question) => question.id).join(',')
                  return <article key={`${page.fileId}-${page.page}`} className="p-4" aria-labelledby={headingId}>
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0"><strong id={headingId} className="block text-xs">{page.title || `${file?.shortTitle} ${page.page}쪽`}</strong><p className="mt-1 line-clamp-3 text-[11px] leading-5 text-slate-500">{page.keyPoints.join(' · ') || page.visuals.join(' · ') || '표지·구분 페이지'}</p></div>
                      <span className="shrink-0 text-[10px] font-bold text-cobalt">{file?.shortTitle} · p.{page.page}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-cobalt dark:bg-blue-500/10 dark:text-blue-300"><BookOpen size={12} className="mr-1 inline" />연결 개념 {concepts.length}</span>
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"><HelpCircle size={12} className="mr-1 inline" />연결 문항 {questions.length}</span>
                      <button type="button" aria-label={`${file?.shortTitle} ${page.page}쪽을 위 PDF에서 미리보기`} onClick={() => previewPage(page)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black text-slate-500 hover:bg-slate-100 hover:text-cobalt dark:hover:bg-white/[0.05]"><Eye size={13} />미리보기</button>
                      {file && <a aria-label={`${file.shortTitle} ${page.page}쪽 원본 PDF 새 창에서 열기`} href={pdfPageUrl(file, page.page)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black text-slate-500 hover:bg-slate-100 hover:text-cobalt dark:hover:bg-white/[0.05]">원본 p.{page.page}<ExternalLink size={12} /></a>}
                    </div>
                    {(concepts.length > 0 || questions.length > 0) && <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {concepts.length > 0 && <details className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]"><summary className="cursor-pointer text-[11px] font-black">연결 개념 {concepts.length}개 보기</summary><div className="mt-2 space-y-1.5">{concepts.map((concept) => <button type="button" key={concept.id} aria-label={`${concept.name} 개념 학습으로 이동`} onClick={() => navigate({ view: 'learn', id: concept.id })} className="block w-full rounded-lg bg-white px-2.5 py-2 text-left text-[11px] font-bold hover:text-cobalt dark:bg-white/[0.04]">{concept.name}</button>)}</div></details>}
                      {questions.length > 0 && <details className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]"><summary className="cursor-pointer text-[11px] font-black">연결 문항 {questions.length}개 보기</summary><div className="mt-2 space-y-1.5">{questions.map((question) => <button type="button" key={question.id} aria-label={`${question.prompt} 문제 풀기로 이동`} onClick={() => navigate({ view: 'practice', id: question.id, params: { ids: questionIds } })} className="block w-full rounded-lg bg-white px-2.5 py-2 text-left text-[11px] hover:text-cobalt dark:bg-white/[0.04]"><strong className="line-clamp-2 leading-5">{question.prompt}</strong><span className="mt-1 block text-[10px] text-slate-400">{question.mode === 'multiple' ? '복수 정답' : '단일 정답'} · {question.difficulty}</span></button>)}</div></details>}
                    </div>}
                  </article>
                }) : <p className="p-5 text-center text-xs text-slate-400">검색 결과 없음</p>}
              </div>
            </>}
          </div>
        </section>
      </div>
    </div>
  )
}
