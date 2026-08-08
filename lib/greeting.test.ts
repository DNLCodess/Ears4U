import { describe, it, expect } from 'vitest'
import { greetingInitial, splitGreeting } from './greeting'

describe('splitGreeting', () => {
  it('splits the head from the name after the last comma', () => {
    expect(splitGreeting('Good evening, Dami.')).toEqual({ head: 'Good evening,', glow: 'Dami.' })
  })
  it('adds a period to a name with no trailing punctuation', () => {
    expect(splitGreeting('Morning, ada')).toEqual({ head: 'Morning,', glow: 'ada.' })
  })
  it('returns an empty glow when there is no comma', () => {
    expect(splitGreeting('Good evening')).toEqual({ head: 'Good evening', glow: '' })
  })
})

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
