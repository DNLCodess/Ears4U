import { describe, it, expect } from 'vitest'
import { formatSentAt } from './page'

describe('formatSentAt', () => {
  it('formats a valid ISO date as a short month/day string', () => {
    expect(formatSentAt('2026-08-05T14:00:00Z')).toMatch(/Aug\s+5/)
  })
  it('returns an empty string for an invalid date', () => {
    expect(formatSentAt('not-a-date')).toBe('')
  })
})
