import { describe, it, expect, beforeEach } from 'vitest'
import { getAdminAccessToken, setAdminAccessToken, clearAdminAccessToken } from './token'

describe('admin token', () => {
  beforeEach(() => clearAdminAccessToken())

  it('starts null', () => {
    expect(getAdminAccessToken()).toBeNull()
  })
  it('stores and returns a token', () => {
    setAdminAccessToken('abc')
    expect(getAdminAccessToken()).toBe('abc')
  })
  it('clears back to null', () => {
    setAdminAccessToken('abc')
    clearAdminAccessToken()
    expect(getAdminAccessToken()).toBeNull()
  })
})
