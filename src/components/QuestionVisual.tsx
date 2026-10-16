import { useId } from 'react'
import { ExternalLink } from 'lucide-react'
import type { QuestionVisual as Visual, SourceFile } from '@/types'
import { assetUrl, pdfPageUrl } from '@/lib/assets'

const palette = ['#3159d8', '#31b58b', '#ee9d35', '#e35d7a']
const tickRatios = [0, .25, .5, .75, 1]
const plot = { left: 58, right: 500, top: 38, bottom: 205 }
const numberFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 })
const formatValue = (value: number) => numberFormatter.format(Number(value.toFixed(2)))

export function QuestionVisual({ visual, files = [] }: { visual: Visual; files?: SourceFile[] }) {
  const accessibleId = useId()
  if (visual.kind === 'source-image') {
    const source = visual.sourceImage
    if (!source) return null
    const file = files.find((item) => item.id === source.fileId)
    const origin = `원본 강의자료 · ${file?.shortTitle ?? source.fileId} · ${source.page}쪽`
    return (
      <figure className="mt-5 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
        <figcaption className="mb-3 text-center text-xs font-black">{visual.title}</figcaption>
        <img
          src={assetUrl(source.path)}
          alt={source.alt}
          className="mx-auto h-auto max-h-[34rem] w-full rounded-xl border border-black/[0.06] object-contain dark:border-white/10"
          loading="lazy"
          decoding="async"
        />
        <p className="mt-3 text-xs leading-6 text-slate-600 dark:text-slate-300">{source.caption}</p>
        {file ? (
          <a className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-cobalt hover:underline" href={pdfPageUrl(file, source.page)} target="_blank" rel="noreferrer">
            {origin}<ExternalLink size={12} aria-hidden="true" />
          </a>
        ) : <p className="mt-2 text-[11px] font-bold text-slate-500">{origin}</p>}
        {visual.note && <p className="mt-2 text-[10px] leading-5 text-slate-400">※ {visual.note}</p>}
      </figure>
    )
  }
  const allValues = visual.series.flatMap((series) => [...series.values, ...(series.outliers ?? [])]).filter(Number.isFinite)
  const scatterXValues = visual.series.flatMap((series) =>
    series.values.map((_, index) => series.xValues?.[index] ?? index),
  ).filter(Number.isFinite)
  const hasExplicitScatterX = visual.series.some((series) => series.xValues?.length)
  const hasComparableYearAxes = visual.kind === 'scatter'
    && hasExplicitScatterX
    && /(?:연도|year)/i.test(visual.xLabel ?? '')
    && /(?:연도|year)/i.test(visual.yLabel ?? '')
  const domainValues = hasComparableYearAxes ? [...allValues, ...scatterXValues] : allValues
  const rawMax = Math.max(...domainValues)
  const rawMin = Math.min(...domainValues)
  const zeroBaseline = visual.kind === 'bar' || visual.kind === 'histogram'
  const domainPadding = zeroBaseline
    ? 0
    : rawMax === rawMin
      ? Math.max(Math.abs(rawMax) * .05, 1)
      : (rawMax - rawMin) * .05
  const max = zeroBaseline ? Math.max(rawMax, 0) : rawMax + domainPadding
  const paddedMin = rawMin - domainPadding
  const min = zeroBaseline ? Math.min(rawMin, 0) : rawMin >= 0 && paddedMin < 0 ? 0 : paddedMin
  const span = max - min || 1
  const width = plot.right - plot.left
  const height = plot.bottom - plot.top
  const xAt = (index: number, count: number) => plot.left + (index * width) / Math.max(1, count - 1)
  const yAt = (value: number) => plot.bottom - ((value - min) / span) * height
  const zeroY = yAt(0)

  const rawXMin = hasComparableYearAxes ? rawMin : scatterXValues.length ? Math.min(...scatterXValues) : 0
  const rawXMax = hasComparableYearAxes ? rawMax : scatterXValues.length ? Math.max(...scatterXValues) : 1
  const xPadding = hasComparableYearAxes
    ? domainPadding
    : rawXMin === rawXMax
      ? .5
      : (rawXMax - rawXMin) * .05
  const xMin = rawXMin - xPadding
  const xMax = rawXMax + xPadding
  const xSpan = xMax - xMin || 1
  const scatterXAt = (value: number) => plot.left + ((value - xMin) / xSpan) * width

  const describePoint = (series: Visual['series'][number], index: number) => {
    const x = visual.kind === 'scatter'
      ? series.xValues?.[index] ?? visual.labels[index] ?? index + 1
      : visual.labels[index] ?? index + 1
    return `x ${x}, y ${series.values[index]}`
  }
  const description = visual.series
    .map((series) => `${series.name}: ${series.values.map((_, index) => describePoint(series, index)).join(', ')}${series.outliers?.length ? `. 이상치 후보 ${series.outliers.join(', ')}` : ''}`)
    .join('. ')

  return (
    <figure className="mt-5 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
      <figcaption className="mb-3 text-center text-xs font-black">{visual.title}</figcaption>
      <svg viewBox="0 0 540 250" className="h-auto w-full" role="img" aria-labelledby={`${accessibleId}-title ${accessibleId}-description`} data-chart-y-min={formatValue(min)} data-chart-y-max={formatValue(max)}>
        <title id={`${accessibleId}-title`}>{visual.title}</title>
        <desc id={`${accessibleId}-description`}>{visual.kind} 그래프. {hasComparableYearAxes ? '두 연도 축은 동일한 축척이며 y=x 기준선을 포함한다. ' : ''}{description}</desc>
        <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} stroke="currentColor" strokeOpacity=".25" />
        <line x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.bottom} stroke="currentColor" strokeOpacity=".25" />
        {tickRatios.map((ratio) => {
          const y = plot.bottom - ratio * height
          const value = min + ratio * span
          return <g key={ratio}><line x1={plot.left} x2={plot.right} y1={y} y2={y} stroke="currentColor" strokeOpacity=".07" /><text x={plot.left - 7} y={y + 3} textAnchor="end" fontSize="8" fill="currentColor" opacity=".6">{formatValue(value)}</text></g>
        })}

        {(visual.kind === 'bar' || visual.kind === 'histogram') && visual.labels.map((label, index) => {
          const groupWidth = width / Math.max(1, visual.labels.length)
          const histogram = visual.kind === 'histogram'
          const barWidth = histogram
            ? groupWidth / Math.max(1, visual.series.length)
            : Math.min(32, (groupWidth - 8) / Math.max(1, visual.series.length))
          const barsWidth = barWidth * visual.series.length
          const groupStart = plot.left + index * groupWidth + (histogram ? 0 : (groupWidth - barsWidth) / 2)
          return <g key={`${label}-${index}`}>{visual.series.map((series, seriesIndex) => {
            const value = series.values[index] ?? 0
            const valueY = yAt(value)
            return <rect key={`${series.name}-${seriesIndex}`} data-chart-mark={visual.kind} x={groupStart + seriesIndex * barWidth} y={Math.min(zeroY, valueY)} width={Math.max(0, histogram ? barWidth : barWidth - 2)} height={Math.abs(zeroY - valueY)} rx={histogram ? 0 : 4} fill={palette[seriesIndex % palette.length]} opacity=".9" />
          })}<text x={plot.left + index * groupWidth + groupWidth / 2} y="224" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".65">{label.slice(0, 8)}</text></g>
        })}

        {visual.kind === 'line' && visual.series.map((series, seriesIndex) => {
          const points = series.values.map((value, index) => `${xAt(index, series.values.length)},${yAt(value)}`).join(' ')
          return <g key={series.name}><polyline points={points} fill="none" stroke={palette[seriesIndex % palette.length]} strokeWidth="3" strokeLinejoin="round" />{series.values.map((value, index) => <circle key={index} cx={xAt(index, series.values.length)} cy={yAt(value)} r="4" fill={palette[seriesIndex % palette.length]} />)}</g>
        })}

        {hasComparableYearAxes && (
          <g>
            <line data-chart-mark="identity-line" x1={scatterXAt(xMin)} x2={scatterXAt(xMax)} y1={yAt(xMin)} y2={yAt(xMax)} stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="6 5" />
            <text x={plot.left + 8} y={plot.bottom - 8} fontSize="8" fill="currentColor" opacity=".55">y = x</text>
          </g>
        )}

        {visual.kind === 'scatter' && visual.series.map((series, seriesIndex) => series.values.map((value, index) => {
          const xValue = series.xValues?.[index] ?? index
          return <circle key={`${series.name}-${index}`} cx={scatterXAt(xValue)} cy={yAt(value)} r="5" fill={palette[seriesIndex % palette.length]} opacity=".75" />
        }))}

        {visual.kind === 'box' && visual.series.map((series, seriesIndex) => {
          const sorted = [...series.values].sort((a, b) => a - b)
          const valueAt = (ratio: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))] ?? 0
          const low = yAt(valueAt(0)); const q1 = yAt(valueAt(.25)); const med = yAt(valueAt(.5)); const q3 = yAt(valueAt(.75)); const high = yAt(valueAt(1))
          const x = visual.series.length === 1
            ? plot.left + width / 2
            : plot.left + seriesIndex * (width / (visual.series.length - 1))
          return <g key={series.name} stroke={palette[seriesIndex % palette.length]} fill="none" strokeWidth="2"><line x1={x} x2={x} y1={high} y2={low} /><line x1={x - 12} x2={x + 12} y1={high} y2={high} /><line x1={x - 12} x2={x + 12} y1={low} y2={low} /><rect x={x - 24} y={q3} width="48" height={q1 - q3} fill={palette[seriesIndex % palette.length]} fillOpacity=".12" /><line x1={x - 24} x2={x + 24} y1={med} y2={med} />{series.outliers?.map((value, index) => <circle key={`${value}-${index}`} data-chart-mark="outlier" cx={x + (index % 2 ? 4 : -4)} cy={yAt(value)} r="4" fill={palette[seriesIndex % palette.length]}><title>{`${series.name} 이상치 후보 ${formatValue(value)}`}</title></circle>)}<text x={x} y="224" textAnchor="middle" stroke="none" fill="currentColor" fontSize="9">{series.name}</text></g>
        })}

        {visual.kind === 'line' && visual.labels.map((label, index) => <text key={`${label}-${index}`} x={xAt(index, visual.labels.length)} y="224" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".65">{label.slice(0, 8)}</text>)}
        {visual.kind === 'scatter' && (hasExplicitScatterX
          ? tickRatios.map((ratio) => <text key={ratio} x={plot.left + ratio * width} y="224" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".65">{formatValue(xMin + ratio * xSpan)}</text>)
          : visual.labels.map((label, index) => <text key={`${label}-${index}`} x={xAt(index, visual.labels.length)} y="224" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".65">{label.slice(0, 8)}</text>))}
        {visual.yLabel && <text x="12" y="122" transform="rotate(-90 12 122)" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".55">{visual.yLabel}</text>}
        {visual.xLabel && <text x="279" y="245" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".55">{visual.xLabel}</text>}
        <g transform="translate(300,10)">{visual.series.map((series, index) => <g key={series.name} transform={`translate(${(index % 2) * 112},${Math.floor(index / 2) * 14})`}><circle cx="4" cy="4" r="4" fill={palette[index % palette.length]} /><text x="12" y="8" fontSize="8" fill="currentColor" opacity=".7">{series.name.slice(0, 13)}</text></g>)}</g>
      </svg>
      <div className="sr-only"><p>그래프 데이터</p><ul>{visual.series.flatMap((series) => [
        ...series.values.map((_, index) => <li key={`${series.name}-${index}`}>{series.name}, {describePoint(series, index)}</li>),
        ...(series.outliers ?? []).map((value, index) => <li key={`${series.name}-outlier-${index}`}>{series.name}, 이상치 후보 {formatValue(value)}</li>),
      ])}</ul></div>
      {visual.note && <p className="mt-2 text-center text-[10px] leading-5 text-slate-400">※ {visual.note}</p>}
    </figure>
  )
}
