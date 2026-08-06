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
})
