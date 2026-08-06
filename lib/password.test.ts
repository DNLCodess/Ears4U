import { describe, it, expect } from 'vitest'
import { passwordIssue } from './password'

describe('passwordIssue', () => {
  it('accepts a password with length, upper, lower, digit, and symbol', () => {
    expect(passwordIssue('Abcdef1!')).toBeNull()
  })

  it('flags a password that is too short', () => {
    expect(passwordIssue('Ab1!')).not.toBeNull()
  })

  it('flags a password missing a digit', () => {
    expect(passwordIssue('Abcdefgh!')).not.toBeNull()
  })

  it('flags a password missing a special character', () => {
    expect(passwordIssue('Abcdefg1')).not.toBeNull()
  })
})
