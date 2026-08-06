import { describe, it, expect } from 'vitest'
import { greetingInitial, isDarkSky } from './sky-scene'

describe('greetingInitial', () => {
  it('takes the name that follows the comma', () => {
    expect(greetingInitial('Good evening, Dami.')).toBe('D')
    expect(greetingInitial('Morning, ada')).toBe('A')
  })

  it('ignores the greeting words before the comma', () => {
    expect(greetingInitial('Good afternoon, Zainab')).toBe('Z')
  })

  it('falls back to a question mark when there is no name', () => {
    expect(greetingInitial('Good evening')).toBe('?')
    expect(greetingInitial('Good evening,')).toBe('?')
    expect(greetingInitial('')).toBe('?')
  })
})

describe('isDarkSky', () => {
  it('is true for evening and night only', () => {
    expect(isDarkSky('evening')).toBe(true)
    expect(isDarkSky('night')).toBe(true)
    expect(isDarkSky('morning')).toBe(false)
    expect(isDarkSky('day')).toBe(false)
  })
})
