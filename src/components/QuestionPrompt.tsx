export function QuestionPrompt({ prompt, headingLevel = 2, headingClassName = 'mt-6 whitespace-pre-line text-lg font-extrabold leading-8 tracking-[-0.02em] sm:text-xl' }: { prompt: string; headingLevel?: 1 | 2; headingClassName?: string }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  const parts = prompt.split(/(```[a-zA-Z0-9_-]*\r?\n[\s\S]*?```)/g).filter((part) => part.trim())
  const headingIndex = parts.findIndex((part) => !part.startsWith('```'))
  return <div>{parts.map((part, index) => {
    const code = part.match(/^```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```$/)
    if (code) return <figure key={index} className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
      <figcaption className="border-b border-slate-200 bg-slate-100 px-4 py-2 text-[11px] font-extrabold uppercase text-slate-500 dark:border-white/10 dark:bg-white/5">{code[1] || 'CODE'} · 문제 코드</figcaption>
      <pre aria-label="문제 코드" className="max-w-full overflow-x-auto bg-slate-950 p-4 font-mono text-xs leading-7 text-slate-100 sm:text-sm"><code>{code[2].trimEnd()}</code></pre>
    </figure>
    return index === headingIndex
      ? <Heading key={index} className={headingClassName}>{part.trim()}</Heading>
      : <p key={index} className="mt-4 whitespace-pre-line text-sm font-semibold leading-7">{part.trim()}</p>
  })}</div>
}
