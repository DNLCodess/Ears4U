import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { adminApiFetch, onAdminAuthExpired } from './client'
import { getAdminAccessToken, setAdminAccessToken, clearAdminAccessToken } from './token'

const originalFetch = global.fetch

describe('adminApiFetch', () => {
  beforeEach(() => {
    clearAdminAccessToken()
  })
  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('sends a bearer token when authenticated', async () => {
    setAdminAccessToken('tok-123')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await adminApiFetch('/api/v1/admins/me')

    const [, init] = fetchMock.mock.calls[0]!
    const headers = init.headers as Headers
    expect(headers.get('authorization')).toBe('Bearer tok-123')
  })

  it('refreshes once on 401 and retries, then succeeds', async () => {
    setAdminAccessToken('stale')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'fresh' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'content-type': 'application/json' },
      }))
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await adminApiFetch<{ ok: boolean }>('/api/v1/admins/me')

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1]![0]).toBe('/backend/api/v1/auth/admin-refresh')
    expect(getAdminAccessToken()).toBe('fresh')
  })

  it('clears the token and fires onAdminAuthExpired when refresh fails', async () => {
    setAdminAccessToken('stale')
    const expired = vi.fn()
    onAdminAuthExpired(expired)
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(adminApiFetch('/api/v1/admins/me')).rejects.toThrow()

    expect(expired).toHaveBeenCalledTimes(1)
    expect(getAdminAccessToken()).toBeNull()
  })
})
