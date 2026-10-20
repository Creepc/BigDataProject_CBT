import { useId } from 'react'
import { ExternalLink } from 'lucide-react'
import type { QuestionVisual as Visual, SourceFile } from '@/types'
import { assetUrl, pdfPageUrl } from '@/lib/assets'

const palette = ['#3159d8', '#31b58b', '#ee9d35', '#e35d7a']
const tickRatios = [0, .25, .5, .75, 1]
const plot = { left: 58, right: 500, top: 38, bottom: 205 }
const numberFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 })
const smallNumberFormatter = new Intl.NumberFormat('ko-KR', { maximumSignificantDigits: 4 })
const formatValue = (value: number) => Math.abs(value) > 0 && Math.abs(value) < .1
  ? smallNumberFormatter.format(value)
  : numberFormatter.format(Number(value.toFixed(2)))

const labelWidth = (label: string) => Array.from(label).reduce((width, character) => width + (character.codePointAt(0)! > 255 ? 12 : 7), 0)
const heatChannels = (ratio: number) => {
  const light = [239, 246, 255]
  const dark = [49, 89, 216]
  return light.map((value, index) => Math.round(value + (dark[index] - value) * ratio))
}
const heatColor = (ratio: number) => `rgb(${heatChannels(ratio).join(', ')})`
const heatTextColor = (ratio: number) => {
  const linear = heatChannels(ratio).map((channel) => {
    const component = channel / 255
    return component <= .04045 ? component / 12.92 : ((component + .055) / 1.055) ** 2.4
  })
  const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722
  return luminance > .179 ? '#000000' : '#ffffff'
}

function HeatmapVisual({ visual, accessibleId }: { visual: Visual; accessibleId: string }) {
  const cells = visual.series.flatMap((series) => visual.labels.map((_, index) => series.values[index])).filter(Number.isFinite)
  const min = cells.length ? Math.min(...cells) : 0
  const max = cells.length ? Math.max(...cells) : 0
  const constant = min === max
  const intensity = (value: number) => constant ? value === 0 ? 0 : .5 : (value - min) / (max - min)
  const left = Math.max(104, ...visual.series.map((series) => labelWidth(series.name) + 44))
  const cellWidth = Math.max(88, ...visual.labels.map((label) => labelWidth(label) + 24))
  const cellHeight = 52
  const top = 62
  const gridWidth = visual.labels.length * cellWidth
  const gridHeight = visual.series.length * cellHeight
  const chartWidth = left + gridWidth + 24
  const chartHeight = top + gridHeight + 86
  const legendY = top + gridHeight + 28
  const legendWidth = Math.min(220, Math.max(88, gridWidth))
  const gradientId = `${accessibleId}-heatmap-gradient`
  const description = visual.series.map((series) => `${series.name}: ${visual.labels.map((label, index) => `${label} ${Number.isFinite(series.values[index]) ? formatValue(series.values[index]) : '값 없음'}`).join(', ')}`).join('. ')

  return <figure className="mt-5 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
    <figcaption className="mb-3 text-center text-xs font-black">{visual.title}</figcaption>
    <div className="overflow-x-auto overscroll-x-contain">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="mx-auto h-auto w-full" style={{ minWidth: chartWidth, maxWidth: Math.max(chartWidth, 540) }} role="img" aria-labelledby={`${accessibleId}-title ${accessibleId}-description`} data-chart-kind="heatmap" data-heatmap-min={formatValue(min)} data-heatmap-max={formatValue(max)}>
        <title id={`${accessibleId}-title`}>{visual.title}</title>
        <desc id={`${accessibleId}-description`}>히트맵. 가로 범주: {visual.xLabel ?? '열'}. 세로 범주: {visual.yLabel ?? '행'}. 셀 숫자가 실제 값이며, {constant ? `모든 유효 셀의 값은 ${formatValue(min)}이다.` : `색이 진할수록 값이 크다. 색 범위 ${formatValue(min)}부터 ${formatValue(max)}.`} {description}</desc>
        <defs><linearGradient id={gradientId}><stop offset="0%" stopColor={heatColor(0)} /><stop offset="100%" stopColor={heatColor(1)} /></linearGradient></defs>
        {visual.xLabel && <text x={left + gridWidth / 2} y="17" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">{visual.xLabel}</text>}
        {visual.yLabel && <text x="17" y={top + gridHeight / 2} transform={`rotate(-90 17 ${top + gridHeight / 2})`} textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">{visual.yLabel}</text>}
        {visual.labels.map((label, columnIndex) => <text key={`${label}-${columnIndex}`} x={left + (columnIndex + .5) * cellWidth} y={top - 14} textAnchor="middle" fontSize="12" fill="currentColor">{label}</text>)}
        {visual.series.map((series, rowIndex) => <g key={`${series.name}-${rowIndex}`}>
          <text x={left - 12} y={top + (rowIndex + .5) * cellHeight} textAnchor="end" dominantBaseline="middle" fontSize="12" fill="currentColor">{series.name}</text>
          {visual.labels.map((label, columnIndex) => {
            const value = series.values[columnIndex]
            const valid = Number.isFinite(value)
            const ratio = valid ? intensity(value) : 0
            return <g key={`${label}-${columnIndex}`}>
              <rect data-chart-mark="heatmap-cell" data-chart-row={series.name} data-chart-column={label} data-chart-value={valid ? value : undefined} x={left + columnIndex * cellWidth} y={top + rowIndex * cellHeight} width={cellWidth} height={cellHeight} fill={valid ? heatColor(ratio) : '#e2e8f0'} stroke="#ffffff" strokeWidth="2">
                <title>{`${series.name}, ${label}: ${valid ? formatValue(value) : '값 없음'}`}</title>
              </rect>
              <text x={left + (columnIndex + .5) * cellWidth} y={top + (rowIndex + .5) * cellHeight} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill={heatTextColor(ratio)}>{valid ? formatValue(value) : '—'}</text>
            </g>
          })}
        </g>)}
        <text x={left} y={legendY - 8} fontSize="11" fill="currentColor">셀 값</text>
        <rect x={left} y={legendY} width={legendWidth} height="12" rx="3" fill={constant ? heatColor(intensity(min)) : `url(#${gradientId})`} stroke="currentColor" strokeOpacity=".15" />
        {constant ? <text x={left + legendWidth / 2} y={legendY + 29} textAnchor="middle" fontSize="11" fill="currentColor">동일값 {formatValue(min)}</text> : <>
          <text x={left} y={legendY + 29} fontSize="11" fill="currentColor">{formatValue(min)}</text>
          <text x={left + legendWidth} y={legendY + 29} textAnchor="end" fontSize="11" fill="currentColor">{formatValue(max)}</text>
          <text x={left + legendWidth / 2} y={legendY + 29} textAnchor="middle" fontSize="10" fill="currentColor">작음 → 큼</text>
        </>}
      </svg>
    </div>
    <div className="sr-only"><table><caption>히트맵 데이터 · {visual.title}</caption><thead><tr><th scope="col">{visual.yLabel ?? '행'} / {visual.xLabel ?? '열'}</th>{visual.labels.map((label, index) => <th key={`${label}-${index}`} scope="col">{label}</th>)}</tr></thead><tbody>{visual.series.map((series, rowIndex) => <tr key={`${series.name}-${rowIndex}`}><th scope="row">{series.name}</th>{visual.labels.map((label, columnIndex) => <td key={`${label}-${columnIndex}`}>{Number.isFinite(series.values[columnIndex]) ? formatValue(series.values[columnIndex]) : '값 없음'}</td>)}</tr>)}</tbody></table></div>
    {visual.note && <p className="mt-2 text-center text-[10px] leading-5 text-slate-400">※ {visual.note}</p>}
  </figure>
}

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
  if (visual.kind === 'heatmap') return <HeatmapVisual visual={visual} accessibleId={accessibleId} />
  const allValues = visual.series.flatMap((series) => [...series.values, ...(series.outliers ?? [])]).filter(Number.isFinite)
  const scatterXValues = visual.series.flatMap((series) =>
    series.values.map((_, index) => series.xValues?.[index] ?? index),
  ).filter(Number.isFinite)
  const hasExplicitScatterX = visual.series.some((series) => series.xValues?.length)
  const hasComparableYearAxes = visual.kind === 'scatter'
    && hasExplicitScatterX
    && (visual.sharedYearAxes ?? (
      /(?:연도|year)/i.test(visual.xLabel ?? '')
      && /(?:연도|year)/i.test(visual.yLabel ?? '')
    ))
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
          })}<text x={plot.left + index * groupWidth + groupWidth / 2} y="224" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".65">{histogram ? label : label.slice(0, 8)}</text></g>
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
