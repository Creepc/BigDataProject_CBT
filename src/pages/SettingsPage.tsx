import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, Moon, RotateCcw, ShieldCheck, Sun, Upload } from 'lucide-react'
import type { CourseData } from '@/types'
import { useStudy } from '@/contexts/StudyContext'
import { validateCourseData } from '@/lib/study'
import { PageHeader } from '@/components/ui'

export function SettingsPage({ data }: { data: CourseData }) {
  const { state, setTheme, exportData, importData, reset } = useStudy()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const errors = validateCourseData(data)

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `bigdata-study-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage({ text: '학습 기록을 내보냈습니다.', error: false })
  }

  const upload = async (file?: File) => {
    if (!file) return
    try {
      importData(await file.text())
      setMessage({ text: '학습 기록을 가져왔습니다.', error: false })
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '가져오기에 실패했습니다.', error: true })
    }
  }

  return (
    <div className="mx-auto max-w-5xl animate-enter">
      <PageHeader eyebrow="PREFERENCES" title="설정과 학습 기록" copy="모든 기록은 이 브라우저의 로컬 저장소에만 보관됩니다. 다른 기기로 옮길 때 JSON 파일로 내보내고 가져올 수 있습니다." />
      {message && <div role={message.error ? 'alert' : 'status'} className={`mb-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${message.error ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-blue-50 text-cobalt dark:bg-blue-500/10 dark:text-blue-300'}`}>{message.error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}{message.text}</div>}
      <div className="space-y-5">
        <section className="surface p-5 sm:p-6"><h2 className="section-title">화면 모드</h2><p className="mt-1 text-xs text-slate-500">선택한 설정은 다음 방문에도 유지됩니다.</p><div className="mt-4 grid gap-2 sm:grid-cols-3">{[{ id: 'light', label: '라이트', icon: Sun }, { id: 'dark', label: '다크', icon: Moon }, { id: 'system', label: '시스템 설정', icon: ShieldCheck }].map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={state.theme === id} onClick={() => setTheme(id as typeof state.theme)} className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-bold ${state.theme === id ? 'border-cobalt bg-blue-50 text-cobalt dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300' : 'border-black/[0.08] dark:border-white/10'}`}><Icon size={18} />{label}</button>)}</div></section>
        <section className="surface p-5 sm:p-6"><h2 className="section-title">기록 백업</h2><p className="mt-1 text-xs leading-6 text-slate-500">완료 개념, 풀이 이력, 오답, 북마크, 모의고사 결과, 암기카드 평가가 모두 포함됩니다.</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={download} className="button-primary"><Download size={16} />JSON 내보내기</button><button onClick={() => inputRef.current?.click()} className="button-secondary"><Upload size={16} />JSON 가져오기</button><input ref={inputRef} className="hidden" type="file" accept="application/json,.json" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = '' }} /></div></section>
        <section className="surface p-5 sm:p-6"><div className="flex items-center gap-2"><ShieldCheck size={18} className={errors.length ? 'text-rose-500' : 'text-emerald-500'} /><h2 className="section-title">콘텐츠 무결성 검사</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]"><div className="text-xl font-black">{data.concepts.length}</div><div className="text-[10px] text-slate-400">핵심 개념</div></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]"><div className="text-xl font-black">{data.questions.length}</div><div className="text-[10px] text-slate-400">검증 문항</div></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]"><div className="text-xl font-black">{data.questions.filter((question) => question.mode === 'multiple').length}</div><div className="text-[10px] text-slate-400">복수정답 문항</div></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]"><div className={`text-xl font-black ${errors.length ? 'text-rose-500' : 'text-emerald-600'}`}>{errors.length}</div><div className="text-[10px] text-slate-400">스키마 오류</div></div></div>{errors.length > 0 && <div className="mt-4 max-h-40 overflow-y-auto rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{errors.map((error) => <div key={error}>· {error}</div>)}</div>}</section>
        <section className="rounded-[1.35rem] border border-rose-200 bg-rose-50/40 p-5 dark:border-rose-500/20 dark:bg-rose-500/[0.05] sm:p-6"><h2 className="section-title text-rose-700 dark:text-rose-300">학습 기록 초기화</h2><p className="mt-1 text-xs leading-6 text-slate-500">개념 완료, 풀이, 오답, 시험 기록을 모두 삭제합니다. 먼저 내보내기를 권장합니다.</p>{confirmReset ? <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-2 text-xs font-bold text-rose-600">정말 초기화할까요?</span><button onClick={() => { reset(); setConfirmReset(false); setMessage({ text: '학습 기록을 초기화했습니다.', error: false }) }} className="button-primary bg-rose-600 hover:bg-rose-500">예, 초기화</button><button onClick={() => setConfirmReset(false)} className="button-secondary">취소</button></div> : <button onClick={() => setConfirmReset(true)} className="button-secondary mt-4 border-rose-200 text-rose-600"><RotateCcw size={16} />초기화</button>}</section>
      </div>
    </div>
  )
}
