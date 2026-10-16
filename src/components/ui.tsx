import type { ReactNode } from 'react'
import { ArrowRight, Check, Search } from 'lucide-react'

export const ProgressBar = ({ value, tone = 'blue' }: { value: number; tone?: 'blue' | 'green' | 'amber' }) => {
  const colors = { blue: 'bg-cobalt', green: 'bg-mint', amber: 'bg-amber' }
  const normalized = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar" aria-label="진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={normalized}>
      <div className={`h-full rounded-full transition-all duration-500 ${colors[tone]}`} style={{ width: `${normalized}%` }} />
    </div>
  )
}

export const ProgressRing = ({ value, size = 92, label }: { value: number; size?: number; label?: string }) => {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const dash = circumference * (Math.min(100, Math.max(0, value)) / 100)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-white/10" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`} className="text-cobalt dark:text-blue-400" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <strong className="text-xl font-black tracking-tight">{value}%</strong>
        {label && <span className="text-[10px] font-bold text-slate-400">{label}</span>}
      </div>
    </div>
  )
}

export const Stat = ({ icon, label, value, detail, tone = 'blue' }: { icon: ReactNode; label: string; value: string | number; detail?: string; tone?: 'blue' | 'green' | 'amber' | 'rose' }) => {
  const tones = {
    blue: 'bg-blue-50 text-cobalt dark:bg-blue-500/10 dark:text-blue-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  }
  return (
    <div className="surface-flat p-4 sm:p-5">
      <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div className="text-2xl font-black tracking-[-0.04em]">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{label}</div>
      {detail && <div className="mt-2 text-[11px] text-slate-400">{detail}</div>}
    </div>
  )
}

export const PageHeader = ({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: ReactNode }) => (
  <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div>
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h1 className="page-title">{title}</h1>
      <p className="page-copy mt-3">{copy}</p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
)

export const EmptyState = ({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) => (
  <div className="surface-flat flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-cobalt dark:bg-blue-500/10"><Check size={22} /></div>
    <h3 className="font-extrabold">{title}</h3>
    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">{copy}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
)

export const SearchInput = ({ value, onChange, placeholder = '검색어를 입력하세요', ariaLabel }: { value: string; onChange: (value: string) => void; placeholder?: string; ariaLabel?: string }) => (
  <label className="relative block">
    <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
    <input className="input pl-10" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={ariaLabel ?? placeholder} />
  </label>
)

export const InlineLink = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="inline-flex items-center gap-1 text-sm font-bold text-cobalt hover:underline dark:text-blue-300">
    {children}<ArrowRight size={14} />
  </button>
)

export const DifficultyBadge = ({ difficulty }: { difficulty: string }) => {
  const className = difficulty === '쉬움'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
    : difficulty === '어려움'
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
      : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${className}`}>{difficulty}</span>
}
