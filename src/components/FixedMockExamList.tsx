import { BookOpen, CheckCircle2, Clock3, FileCheck2, Play } from 'lucide-react'
import type { CourseData, ExamRecord, MockExam, NavigationTarget, StudyState } from '@/types'
import { getMockExamProgress, getMockExamQuestions } from '@/lib/mockExams'
import { ProgressBar } from './ui'

export function FixedMockExamList({ data, state, onStart, onReview, navigate }: {
  data: CourseData
  state: StudyState
  onStart: (exam: MockExam) => void
  onReview: (record: ExamRecord) => void
  navigate: (target: NavigationTarget) => void
}) {
  const exams = data.mockExams ?? []
  if (!exams.length) return null
  return <section className="surface mb-8 p-5 sm:p-7" aria-label="신규 고정형 모의고사">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="eyebrow">NEW EXAM SERIES</div><h2 className="mt-1 text-xl font-black">새 문제로 준비한 실전 {exams.length}회</h2></div>
      <span className="chip border-blue-200 bg-blue-50 text-cobalt dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">회차당 40문항 · 신규 {exams.reduce((sum, exam) => sum + exam.questionIds.length, 0)}문항</span>
    </div>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">기존 556문항을 재추출하지 않은 새 문제입니다. 다섯 회차 사이에도 같은 문항을 재사용하지 않습니다. 범위는 넷플릭스까지이며, 정답을 확인하면 관련 개념·단계별 풀이·주의점·다른 적용 예시를 함께 읽을 수 있습니다.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {exams.map((exam, index) => {
        const questions = getMockExamQuestions(data, exam.id)
        const progress = getMockExamProgress(exam, state.attempts, state.exams)
        return <article key={exam.id} className="flex flex-col rounded-2xl border border-black/[0.08] p-4 dark:border-white/10 sm:p-5">
          <div className="flex items-center justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cobalt text-sm font-black text-white">{String(index + 1).padStart(2, '0')}</span><span className="flex items-center gap-1 text-xs font-bold text-slate-400"><Clock3 size={13} />{exam.minutes}분</span></div>
          <h3 className="mt-4 text-base font-black">{exam.title}</h3>
          <p className="mt-2 min-h-12 text-xs leading-6 text-slate-500">{exam.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5"><span className="chip">{questions.length}문항</span><span className="chip">복수 정답 {questions.filter((question) => question.mode === 'multiple').length}개</span><span className="chip">시각자료 {questions.filter((question) => question.visual).length}개</span></div>
          <div className="mb-4 mt-4 border-t border-black/[0.06] pt-4 dark:border-white/[0.07]">
            <div className="mb-2 flex justify-between text-[11px] text-slate-500"><span>문항 응답 {progress.answered}/{questions.length}</span><span>최근 정답 {progress.correct}/{questions.length}</span></div>
            <ProgressBar value={questions.length ? progress.answered / questions.length * 100 : 0} />
            <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400"><CheckCircle2 size={12} />{progress.examCount ? `시험 ${progress.examCount}회 · 최근 ${progress.latestScore}점 · 최고 ${progress.bestScore}점` : '시험 응시 기록 없음 · 문항 응답과 점수는 별도'}</p>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2">
            <button type="button" disabled={questions.length !== 40} onClick={() => onStart(exam)} className="button-primary px-2" aria-label={`${exam.title} 시험 응시`}><Play size={14} />시험 응시</button>
            <button type="button" disabled={!questions.length} onClick={() => navigate({ view: 'practice', id: progress.nextId, params: { scope: 'mock', exam: exam.id } })} className="button-secondary px-2" aria-label={`${exam.title} 해설 학습`}><BookOpen size={14} />해설 학습</button>
          </div>
          {progress.latestExam && <button type="button" onClick={() => onReview(progress.latestExam!)} className="button-secondary mt-2 w-full text-xs" aria-label={`${exam.title} 최근 시험 해설`}>최근 시험 답안·해설 다시 보기</button>}
        </article>
      })}
      <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-5 dark:border-blue-500/20 dark:bg-blue-500/[0.04]">
        <FileCheck2 className="text-cobalt dark:text-blue-300" size={25} /><h3 className="mt-4 text-base font-black">시험처럼 풀거나, 해설로 공부하거나</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300"><strong>시험 응시</strong>는 정답을 숨기고 40문항을 한 번에 채점합니다. 문항당 2.5점이며 복수 정답은 정답 전체를 골라야 맞습니다.</p>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300"><strong>해설 학습</strong>은 시간 제한 없이 한 문제씩 제출해 설명을 읽습니다. 다시 들어오면 안 푼 문제, 그다음 최근에 틀린 문제부터 이어집니다.</p>
        <p className="mt-3 text-xs leading-6 text-slate-400">문항 응답에는 학습·시험에서 선택한 답안이 함께 반영됩니다. 응답 완료가 개념 이해를 뜻하지 않으며 실제 시험 점수는 보장하지 않습니다.</p>
      </div>
    </div>
  </section>
}
