import { describe, it, expect } from 'vitest'
import { parseInsightDate } from './insight-dates'

const parts = (d: Date | null) => (d ? [d.getFullYear(), d.getMonth(), d.getDate()] : null)

describe('parseInsightDate', () => {
  it('passes ISO dates through', () => {
    expect(parts(parseInsightDate('2026-08-06'))).toEqual([2026, 7, 6])
  })

  it('passes ISO date-times through, keeping the local calendar day', () => {
    expect(parts(parseInsightDate('2026-08-06T09:12:00'))).toEqual([2026, 7, 6])
  })

  it('parses the API "MMM d" format using the current year', () => {
    expect(parts(parseInsightDate('Aug 6', new Date(2026, 7, 6)))).toEqual([2026, 7, 6])
    expect(parts(parseInsightDate('Jul 2', new Date(2026, 7, 6)))).toEqual([2026, 6, 2])
  })

  it('reads a December point as last year when today is in January', () => {
    expect(parts(parseInsightDate('Dec 30', new Date(2027, 0, 2)))).toEqual([2026, 11, 30])
  })

  it('keeps a recent point in the current year', () => {
    expect(parts(parseInsightDate('Jan 1', new Date(2027, 0, 2)))).toEqual([2027, 0, 1])
  })

  it('returns null for unparseable input', () => {
    expect(parseInsightDate('not a date')).toBeNull()
    expect(parseInsightDate('')).toBeNull()
    expect(parseInsightDate('Foo 6')).toBeNull()
    expect(parseInsightDate('Feb 31', new Date(2026, 7, 6))).toBeNull()
  })
})
