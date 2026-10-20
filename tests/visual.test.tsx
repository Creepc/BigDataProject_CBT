import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { QuestionVisual } from '@/components/QuestionVisual'
import type { QuestionVisual as Visual, SourceFile } from '@/types'
import { courseData } from '@/data/courseData'

describe('question visuals', () => {
  it('renders every published question graphic without invalid numeric SVG coordinates', () => {
    courseData.questions.filter((question) => question.visual).forEach((question) => {
      const visual = question.visual!
      const html = renderToStaticMarkup(<QuestionVisual visual={visual} files={courseData.files} />)
      expect(html, question.id).not.toMatch(/\b(?:NaN|Infinity)\b/)
      if (visual.kind === 'box') visual.series.forEach((series) => {
        expect(series.values, question.id).toHaveLength(5)
        expect(series.values, question.id).toEqual([...series.values].sort((left, right) => left - right))
      })
    })
  })
  it('preserves real scatter x coordinates in the accessible description', () => {
    const visual: Visual = {
      kind: 'scatter', title: '제작·추가 연도', labels: [],
      series: [{ name: '콘텐츠', xValues: [1985, 2020], values: [2018, 2020] }],
    }
    const html = renderToStaticMarkup(<QuestionVisual visual={visual} />)
    expect(html).toContain('x 1985, y 2018')
    expect(html).toContain('x 2020, y 2020')
  })

  it('uses a shared year scale and renders the y=x reference line', () => {
    const visual: Visual = {
      kind: 'scatter', title: '제작·추가 연도', xLabel: '제작연도', yLabel: '추가연도', labels: [],
      series: [{ name: '콘텐츠', xValues: [1985, 2020], values: [2018, 2020] }],
    }
    const html = renderToStaticMarkup(<QuestionVisual visual={visual} />)
    expect(html).toContain('data-chart-mark="identity-line"')
    expect(html).toContain('두 연도 축은 동일한 축척')
    expect(html).toContain('data-chart-y-min="1,983.25"')
    expect(html).not.toContain('data-chart-y-min="0"')
  })

  it('renders box-plot outlier candidates separately from the whisker summary', () => {
    const visual: Visual = {
      kind: 'box', title: '상영시간', labels: ['하단 경계', 'Q1', '중앙값', 'Q3', '상단 경계'],
      series: [{ name: 'Movie', values: [44, 86, 98, 114, 156], outliers: [3, 312] }],
    }
    const html = renderToStaticMarkup(<QuestionVisual visual={visual} />)
    expect(html.match(/data-chart-mark="outlier"/g)).toHaveLength(2)
    expect(html).toContain('이상치 후보 3, 312')
    expect(html).toContain('Movie, 이상치 후보 312')
  })

  it('does not treat a year difference as another calendar-year axis', () => {
    const visual: Visual = {
      kind: 'scatter', title: '공개 연도와 등록 시차', xLabel: '공개 연도', yLabel: '등록 연도−공개 연도(년)',
      labels: ['P', 'Q', 'R'], sharedYearAxes: false,
      series: [{ name: '작품', xValues: [2010, 2018, 2015], values: [8, 0, 3] }],
    }
    const html = renderToStaticMarkup(<QuestionVisual visual={visual} />)
    expect(html).not.toContain('data-chart-mark="identity-line"')
    expect(html).not.toContain('두 연도 축은 동일한 축척')
    expect(html).toContain('data-chart-y-min="0"')
    expect(html).toContain('data-chart-y-max="8.4"')
    expect(courseData.questions.find((question) => question.id === 'mock-web-049')?.visual?.sharedYearAxes).toBe(false)
  })

  it('keeps small histogram densities distinct instead of rounding both to 0.01', () => {
    const visual: Visual = {
      kind: 'histogram', title: '확률밀도', labels: ['[70,90)', '[90,110)', '[110,130)'],
      yLabel: '확률밀도(1/분)', series: [{ name: '밀도', values: [.005, .015, .01] }],
    }
    const html = renderToStaticMarkup(<QuestionVisual visual={visual} />)
    expect(html).toContain('data-chart-y-max="0.015"')
    expect(html).toContain('>0.00375</text>')
    expect(html).toContain('>0.015</text>')
    expect(html).not.toContain('data-chart-y-max="0.01"')
    expect(html).toContain('>[110,130)</text>')
  })

  it('renders source images with alt text, caption, and a page-specific original link', () => {
    const visual: Visual = {
      kind: 'source-image', title: '원본 구조도', labels: [], series: [],
      sourceImage: {
        path: 'figures/notion-w1/p4.png', alt: '소프트웨어 계층 구조도',
        caption: '노션 1주차 원본 구조도', fileId: 'notion-w1', page: 4,
      },
    }
    const file: SourceFile = {
      id: 'notion-w1', title: '노션 1주차', shortTitle: '노션 1주차', path: 'source.pdf',
      pdfUrl: 'pdfs/source.pdf', week: 1, kind: '노션', pageCount: 10,
      analyzedPages: [4], unreadablePages: [], topics: [], color: '#000',
    }
    const html = renderToStaticMarkup(<QuestionVisual visual={visual} files={[file]} />)
    expect(html).toContain('alt="소프트웨어 계층 구조도"')
    expect(html).toContain('노션 1주차 원본 구조도')
    expect(html).toContain('#page=4')
    expect(html).toContain('원본 강의자료')
  })

  it('renders a 2-by-2 heatmap with categorical axes, cell values, and accessible table headers', () => {
    const visual: Visual = {
      kind: 'heatmap', title: '장르별 시청 등급', xLabel: '시청 등급', yLabel: '장르',
      labels: ['PG', 'TV-MA'], series: [{ name: '가족', values: [8, 0] }, { name: '드라마', values: [4, 12] }],
    }
    const html = renderToStaticMarkup(<QuestionVisual visual={visual} />)
    expect(html).toContain('data-chart-kind="heatmap"')
    expect(html.match(/data-chart-mark="heatmap-cell"/g)).toHaveLength(4)
    expect(html).toContain('data-chart-row="가족" data-chart-column="TV-MA" data-chart-value="0"')
    expect(html).toContain('data-heatmap-min="0" data-heatmap-max="12"')
    expect(html).toContain('가로 범주: 시청 등급. 세로 범주: 장르.')
    expect(html).toContain('가족: PG 8, TV-MA 0')
    expect(html).toContain('<th scope="col">TV-MA</th>')
    expect(html).toContain('<th scope="row">드라마</th><td>4</td><td>12</td>')
    expect(html).toContain('작음 → 큼')
    expect(html).toContain('fill="rgb(239, 246, 255)"')
    expect(html).toContain('fill="rgb(49, 89, 216)"')
    expect(html).toContain('font-weight="700" fill="#000000">0</text>')
    expect(html).toContain('font-weight="700" fill="#ffffff">12</text>')
    expect(html).not.toMatch(/\b(?:NaN|Infinity)\b/)
  })

  it('maps a 2-by-3 heatmap to three columns and preserves complete category labels', () => {
    const visual: Visual = {
      kind: 'heatmap', title: '유형과 등록 기간', xLabel: '등록 기간', yLabel: '작품 유형',
      labels: ['2019년 이전', '2020년', '2021년 이후'],
      series: [{ name: 'Movie', values: [2, 6, 10] }, { name: 'TV Show', values: [1, 5, 9] }],
    }
    const html = renderToStaticMarkup(<QuestionVisual visual={visual} />)
    expect(html.match(/data-chart-mark="heatmap-cell"/g)).toHaveLength(6)
    expect(html).toContain('data-chart-row="TV Show" data-chart-column="2021년 이후" data-chart-value="9"')
    expect(html).toContain('<th scope="row">Movie</th><td>2</td><td>6</td><td>10</td>')
    expect(html).toContain('2019년 이전')
    expect(html).toContain('overflow-x-auto')
    expect(html).toContain('min-width:')
    expect(html).toContain('max-width:540px')
    expect(html).not.toContain('data-chart-y-min=')
    expect(html).not.toMatch(/\b(?:NaN|Infinity)\b/)
  })

  it.each([0, 7])('keeps a constant heatmap value of %s finite and visible', (value) => {
    const visual: Visual = {
      kind: 'heatmap', title: '동일값 점검', labels: ['A', 'B'],
      series: [{ name: '행 1', values: [value, value] }, { name: '행 2', values: [value, value] }],
    }
    const html = renderToStaticMarkup(<QuestionVisual visual={visual} />)
    expect(html.match(/data-chart-mark="heatmap-cell"/g)).toHaveLength(4)
    expect(html).toContain(`data-heatmap-min="${value}" data-heatmap-max="${value}"`)
    expect(html).toContain(`동일값 ${value}`)
    expect(html).toContain(`모든 유효 셀의 값은 ${value}이다.`)
    expect(html).not.toMatch(/\b(?:NaN|Infinity)\b/)
  })

  it('does not display a missing heatmap value as an observed zero', () => {
    const visual: Visual = {
      kind: 'heatmap', title: '부분 기록', labels: ['A', 'B'], series: [{ name: '관측', values: [0] }],
    }
    const html = renderToStaticMarkup(<QuestionVisual visual={visual} />)
    expect(html).toContain('data-chart-column="A" data-chart-value="0"')
    expect(html).not.toContain('data-chart-column="B" data-chart-value="0"')
    expect(html).toContain('<td>0</td><td>값 없음</td>')
    expect(html).not.toMatch(/\b(?:NaN|Infinity)\b/)
  })
})
