import { describe, it, expect } from 'vitest'
import { timeSeriesPath } from './time-series'

describe('timeSeriesPath', () => {
  it('returns an empty string for no values', () => {
    expect(timeSeriesPath([], 100, 50, 0, 10)).toBe('')
  })

  it('returns a flat line for a single value', () => {
    const d = timeSeriesPath([5], 100, 50, 0, 10)
    expect(d.startsWith('M 0')).toBe(true)
    expect(d).toContain('L 100')
  })

  it('starts at the correct x=0 point and produces a non-empty path for multiple values', () => {
    const d = timeSeriesPath([1, 5, 9], 100, 60, 0, 10)
    expect(d.startsWith('M 0.0')).toBe(true)
    expect(d.length).toBeGreaterThan(10)
  })

  it('does not divide by zero when min equals max', () => {
    const d = timeSeriesPath([5, 5, 5], 100, 60, 5, 5)
    expect(d.length).toBeGreaterThan(0)
    expect(d).not.toContain('NaN')
  })
})
