import { describe, it, expect } from 'vitest'
import { plantShape } from './garden'

describe('plantShape', () => {
  it('earns one leaf per two days, capped at 8', () => {
    expect(plantShape(0).leaves).toBe(0)
    expect(plantShape(1).leaves).toBe(0)
    expect(plantShape(12).leaves).toBe(6)
    expect(plantShape(40).leaves).toBe(8)
  })
  it('blooms on multiples of 7', () => {
    expect(plantShape(7).hasBloom).toBe(true)
    expect(plantShape(12).hasBloom).toBe(false)
    expect(plantShape(21).hasBloom).toBe(true)
    expect(plantShape(0).hasBloom).toBe(false)
  })
})
