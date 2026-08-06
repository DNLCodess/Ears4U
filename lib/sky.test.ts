import { describe, it, expect } from 'vitest'
import { skyStateFor } from './sky'

describe('skyStateFor', () => {
  it.each([
    [5, 'morning'], [9, 'morning'],
    [11, 'day'], [16, 'day'],
    [17, 'evening'], [20, 'evening'],
    [22, 'night'], [2, 'night'],
  ] as const)('hour %i is %s', (hour, state) => {
    expect(skyStateFor(hour)).toBe(state)
  })
})
