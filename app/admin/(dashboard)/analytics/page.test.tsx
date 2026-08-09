import { describe, it, expect } from 'vitest'
import { bounds } from './page'

describe('bounds', () => {
  it('returns the min and max of the values', () => {
    expect(bounds([{ value: 3 }, { value: 9 }, { value: 1 }])).toEqual([1, 9])
  })
  it('pads a flat series so min and max differ', () => {
    expect(bounds([{ value: 5 }, { value: 5 }])).toEqual([4, 6])
  })
  it('returns a default range for an empty series', () => {
    expect(bounds([])).toEqual([0, 1])
  })
})
