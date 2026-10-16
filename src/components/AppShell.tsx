import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  BarChart3, BookOpen, BrainCircuit, CheckCircle2, ClipboardList, Database,
  FileSearch, GraduationCap, LayoutDashboard, Menu, Moon, NotebookTabs,
  Settings, Sparkles, Sun, X,
} from 'lucide-react'
import type { AppView, NavigationTarget } from '@/types'
import { useStudy } from '@/contexts/StudyContext'
import { useDialogFocus } from '@/hooks/useDialogFocus'

const navItems: Array<{ view: AppView; label: string; icon: typeof LayoutDashboard }> = [
  { view: 'dashboard', label: '학습 대시보드', icon: LayoutDashboard },
  { view: 'learn', label: '개념 학습', icon: BookOpen },
  { view: 'bank', label: '문제은행', icon: Database },
  { view: 'exam', label: '실전 모의고사', icon: ClipboardList },
  { view: 'wrong', label: '오답노트', icon: NotebookTabs },
  { view: 'stats', label: '취약 개념 분석', icon: BarChart3 },
  { view: 'cards', label: '암기 카드', icon: BrainCircuit },
  { view: 'sources', label: '자료 분석 현황', icon: FileSearch },
]

export function AppShell({ children, activeView, totalConcepts, navigate }: { children: ReactNode; activeView: AppView; totalConcepts: number; navigate: (target: NavigationTarget) => void }) {
  const [open, setOpen] = useState(false)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const { state, setTheme } = useStudy()
  const completed = state.completedConceptIds.length
  const dark = state.theme === 'dark' || (state.theme === 'system' && systemDark)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useDialogFocus(open, dialogRef, closeButtonRef, contentRef, () => setOpen(false))

  const go = (view: AppView) => {
    navigate({ view })
    setOpen(false)
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <button onClick={() => go('dashboard')} className="flex items-center gap-3 px-1 text-left">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cobalt text-white shadow-lg shadow-blue-900/20"><GraduationCap size={23} /></span>
        <span>
          <span className="block text-sm font-black tracking-[-0.03em] text-white">MIDTERM LAB</span>
          <span className="block text-[10px] font-semibold tracking-wide text-slate-400">BIG DATA PROJECT</span>
        </span>
      </button>

      <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
          <span>전체 학습</span><span>{completed}개 완료</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${totalConcepts ? Math.round((completed / totalConcepts) * 100) : 0}%` }} />
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto scrollbar-thin" aria-label="주 메뉴">
        {navItems.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            onClick={() => go(view)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${activeView === view || (activeView === 'practice' && view === 'bank') ? 'bg-white text-ink shadow-sm' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}
          >
            <Icon size={18} strokeWidth={2} />{label}
          </button>
        ))}
      </nav>

      <div className="mt-4 border-t border-white/[0.08] pt-4">
        <button onClick={() => setTheme(dark ? 'light' : 'dark')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-400 hover:bg-white/[0.06] hover:text-white">
          {dark ? <Sun size={18} /> : <Moon size={18} />}{dark ? '라이트 모드' : '다크 모드'}
        </button>
        <button onClick={() => go('settings')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${activeView === 'settings' ? 'bg-white text-ink' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>
          <Settings size={18} />설정 · 기록 관리
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="noise fixed inset-y-0 left-0 z-30 hidden w-[260px] bg-ink p-5 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside id="mobile-navigation-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-label="주 메뉴" tabIndex={-1} className="noise relative h-full w-[285px] bg-ink p-5 shadow-2xl">
            <button ref={closeButtonRef} aria-label="메뉴 닫기" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/10"><X /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <div ref={contentRef} className="min-w-0 lg:col-start-2">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/[0.06] bg-[#f3f1ec]/90 px-4 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0c1117]/90 sm:px-7 lg:px-9">
          <button onClick={() => setOpen(true)} className="rounded-xl border border-black/10 bg-white p-2.5 dark:border-white/10 dark:bg-white/5 lg:hidden" aria-label="메뉴 열기" aria-expanded={open} aria-controls="mobile-navigation-dialog"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 text-xs font-semibold text-slate-500 sm:flex">
            <Sparkles size={15} className="text-amber" /> 교수님 강조 포인트와 7개 강의자료를 연결한 개인 학습실
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => go('wrong')} className="hidden items-center gap-2 rounded-xl border border-black/[0.07] bg-white px-3 py-2 text-xs font-bold dark:border-white/10 dark:bg-white/5 sm:flex"><CheckCircle2 size={15} className="text-mint" />오늘 복습</button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cobalt text-xs font-black text-white">AI</div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
