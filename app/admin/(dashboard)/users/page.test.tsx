import { describe, it, expect } from 'vitest'
import { formatJoinedAt, formatLogTime } from './page'

describe('formatJoinedAt', () => {
  it('formats a valid ISO date with the year', () => {
    expect(formatJoinedAt('2026-02-14T00:00:00Z')).toMatch(/Feb\s+14,\s+2026/)
  })
  it('returns an empty string for an invalid date', () => {
    expect(formatJoinedAt('not-a-date')).toBe('')
  })
})

describe('formatLogTime', () => {
  it('formats a valid ISO date as a short month/day string', () => {
    expect(formatLogTime('2026-08-06T10:00:00Z')).toMatch(/Aug\s+6/)
  })
  it('returns an empty string for an invalid date', () => {
    expect(formatLogTime('not-a-date')).toBe('')
  })
})
