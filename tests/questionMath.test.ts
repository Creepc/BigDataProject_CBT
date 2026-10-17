import { describe, expect, it } from 'vitest'
import { courseData } from '@/data/courseData'

const answer = (id: string) => courseData.questions.find((question) => question.id === id)!.options.filter((option) => option.correct).map((option) => option.text).join(' / ')

describe('worked question arithmetic', () => {
  it('keeps storage, timing, IQR, slope and MAE answers consistent with the stated data', () => {
    expect(answer('n12-new-078')).toBe('3개, 3KiB') // ceil(9/4), 3*4-9
    expect(answer('n12-new-090')).toBe('1') // 3,8,6,1 minus the first three
    expect(answer('n34-new-011')).toBe(`${50 + 30 / 2 + 20}초`)
    expect(answer('n34-new-042')).toBe('3개·514MB') // ceil(257/128), content*2
    expect(answer('n34-new-093')).toBe(`${125 - 90}분`)
    expect(answer('n34-new-103')).toBe('2018→2019만') // 25% then 20%, boundary included
    expect(answer('web-new-152')).toContain(`MAE는 ${(0 + 2 + 4 + 2) / 4}년`)
    expect(answer('web-new-157')).toBe(`${(280 - 100) / (2019 - 2016)}건/년`)
    expect(answer('web-new-160')).toBe('2017→2018만') // 80/year then 60/year
    const irregularSeries = courseData.questions.find((question) => question.id === 'n12-new-136')!.visual!
    expect(irregularSeries.kind).toBe('scatter')
    expect(irregularSeries.series[0].xValues).toEqual([2021, 2022, 2024])
  })

  it('does not call absolute counts unknowable when row denominators are given', () => {
    const question = courseData.questions.find((item) => item.id === 'web-new-116')!
    expect(question.visual!.series[0].values).toEqual([10, 60])
    expect(100 * .1).toBe(10)
    expect(20 * .6).toBe(12)
    expect(question.options.find((option) => option.id === 'o1')?.text).toContain('전체 관계 건수')
    expect(answer(question.id)).toContain('시청자 선호')
    expect(answer(question.id)).not.toContain('전체 작품 수나')
  })
})
