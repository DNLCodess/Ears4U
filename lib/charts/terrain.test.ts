import { describe, it, expect } from 'vitest'
import { terrainPath } from './terrain'

describe('terrainPath', () => {
  it('starts at the left edge and visits the right edge', () => {
    const d = terrainPath([5, 7, 3], 300, 100)
    expect(d.startsWith('M 0')).toBe(true)
    expect(d).toContain('300')
  })
  it('maps higher values to smaller y (up)', () => {
    const low = terrainPath([1], 100, 100)
    const high = terrainPath([10], 100, 100)
    const yOf = (d: string) => Number(d.split(' ')[2])
    expect(yOf(high)).toBeLessThan(yOf(low))
  })
  it('returns empty string for no points', () => {
    expect(terrainPath([], 300, 100)).toBe('')
  })
  it('handles a single point without NaN', () => {
    expect(terrainPath([5], 300, 100)).not.toMatch(/NaN/)
  })
})
