import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from './endpoints'
import { setAccessToken } from './token'

describe('endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setAccessToken('tok')
  })

  it('login posts username and password without auth header, stores token', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'newtok' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    )
    await api.login('a@b.c', 'pw')
    const [url, init] = spy.mock.calls[0]!
    expect(url).toBe('/backend/api/v1/auth/user-login')
    expect(JSON.parse(init!.body as string)).toEqual({ username: 'a@b.c', password: 'pw' })
  })

  it('logMood posts the exact backend payload shape', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
    await api.logMood({ primaryMood: 'Restless', moodIntensity: 7, stressLevel: 6, energyLevel: 4 })
    const [url, init] = spy.mock.calls[0]!
    expect(url).toBe('/backend/api/v1/mood/log')
    expect(JSON.parse(init!.body as string)).toEqual({
      primaryMood: 'Restless', moodIntensity: 7, stressLevel: 6, energyLevel: 4,
    })
  })

  it('getStreak unwraps the {"streak": n} shape the backend actually returns', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ streak: 5 }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    )
    await expect(api.getStreak()).resolves.toBe(5)
  })

  it('getStreak also accepts a bare number, in case that ever changes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('7', { status: 200, headers: { 'content-type': 'application/json' } })
    )
    await expect(api.getStreak()).resolves.toBe(7)
  })

  // These five send an OTP-adjacent email/otp to the backend. The live server
  // now requires them as a JSON body: sending them as a query string instead
  // silently 500s (confirmed against the deployed backend), so this guards
  // against ever regressing to the old ?email=...&otp=... shape.
  it('sends recovery and OTP-resend endpoints as a JSON body, not a query string', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))

    await api.resendRegistrationOtp('a@b.c')
    await api.forgotPassword('a@b.c')
    await api.resendForgottenPasswordOtp('a@b.c')
    await api.recoveryInitiate('a@b.c')

    for (const [url, init] of spy.mock.calls) {
      expect(url).not.toContain('?')
      expect(JSON.parse(init!.body as string)).toEqual({ email: 'a@b.c' })
    }
  })

  it('sends recoveryConfirm email and otp as a JSON body, not a query string', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'tok2' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    )
    await api.recoveryConfirm('a@b.c', '123456')
    const [url, init] = spy.mock.calls[0]!
    expect(url).toBe('/backend/api/v1/auth/recovery/confirm')
    expect(JSON.parse(init!.body as string)).toEqual({ email: 'a@b.c', otp: '123456' })
  })
})
