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
})
