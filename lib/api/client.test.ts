import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiFetch, onAuthExpired } from './client'
import { setAccessToken, getAccessToken, clearAccessToken } from './token'
import { ApiError } from './errors'

function jsonRes(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
  })
}

describe('apiFetch', () => {
  beforeEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  it('attaches bearer token and parses json', async () => {
    setAccessToken('tok')
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonRes(200, { greeting: 'hi' }))
    const out = await apiFetch<{ greeting: string }>('/api/v1/dashboard/home')
    expect(out.greeting).toBe('hi')
    const [url, init] = spy.mock.calls[0]!
    expect(url).toBe('/backend/api/v1/dashboard/home')
    expect(new Headers(init!.headers).get('authorization')).toBe('Bearer tok')
  })

  it('refreshes once on 401 and retries with the new token', async () => {
    setAccessToken('stale')
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonRes(401))
      .mockResolvedValueOnce(jsonRes(200, { accessToken: 'fresh' }))
      .mockResolvedValueOnce(jsonRes(200, { ok: true }))
    const out = await apiFetch<{ ok: boolean }>('/api/v1/journal/history')
    expect(out.ok).toBe(true)
    expect(getAccessToken()).toBe('fresh')
    expect(spy.mock.calls[1]![0]).toBe('/backend/api/v1/auth/user-refresh')
  })

  it('fires onAuthExpired and throws when refresh fails', async () => {
    setAccessToken('stale')
    const expired = vi.fn()
    onAuthExpired(expired)
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonRes(401))
      .mockResolvedValueOnce(jsonRes(403))
    await expect(apiFetch('/api/v1/journal/history')).rejects.toBeInstanceOf(ApiError)
    expect(expired).toHaveBeenCalled()
  })

  it('maps empty error bodies to friendly messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonRes(500))
    const err = (await apiFetch('/api/v1/mood/analytics', { auth: false }).catch(e => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.friendly).toMatch(/server had a problem/i)
  })

  it('marks slow requests as cold start', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(jsonRes(503)), 30))
    )
    const err = (await apiFetch('/api/v1/users/ping', { auth: false, coldStartMs: 10 }).catch(e => e)) as ApiError
    expect(err.coldStart).toBe(true)
  })

  it('does not attempt refresh for auth:false requests', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonRes(403))
    await expect(apiFetch('/api/v1/auth/user-login', { auth: false, method: 'POST', body: {} }))
      .rejects.toBeInstanceOf(ApiError)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
