import { describe, it, expect, beforeEach } from 'vitest'
import { getAccessToken, setAccessToken, clearAccessToken } from './token'

describe('token store', () => {
  beforeEach(() => clearAccessToken())

  it('starts empty', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('stores and returns a token in memory', () => {
    setAccessToken('abc123')
    expect(getAccessToken()).toBe('abc123')
  })

  it('clears on demand', () => {
    setAccessToken('abc123')
    clearAccessToken()
    expect(getAccessToken()).toBeNull()
  })
})
