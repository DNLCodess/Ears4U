import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './[...path]/route'

describe('auth passthrough', () => {
  beforeEach(() => {
    process.env.API_URL = 'https://upstream.example'
    vi.restoreAllMocks()
  })

  it('forwards POST body and returns upstream set-cookie', async () => {
    const upstream = new Response(JSON.stringify({ accessToken: 't1' }), {
      status: 200,
      headers: { 'set-cookie': 'user_refresh_token=r1; HttpOnly; Path=/', 'content-type': 'application/json' },
    })
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(upstream)

    const req = new Request('http://localhost:3000/backend/api/v1/auth/user-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'x=1' },
      body: JSON.stringify({ username: 'a@b.c', password: 'pw' }),
    })
    const res = await POST(req, { params: Promise.resolve({ path: ['user-login'] }) })

    expect(spy).toHaveBeenCalledWith(
      'https://upstream.example/api/v1/auth/user-login',
      expect.objectContaining({ method: 'POST' })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('user_refresh_token=r1')
    expect(await res.json()).toEqual({ accessToken: 't1' })
  })

  it('preserves multiple upstream Set-Cookie headers instead of comma-folding them', async () => {
    const upstreamHeaders = new Headers()
    upstreamHeaders.append('set-cookie', 'user_refresh_token=; Max-Age=0; Path=/')
    upstreamHeaders.append('set-cookie', 'user_session=; Max-Age=0; Path=/')
    upstreamHeaders.set('content-type', 'application/json')
    const upstream = new Response(JSON.stringify({}), { status: 200, headers: upstreamHeaders })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(upstream)

    const req = new Request('http://localhost:3000/backend/api/v1/auth/logout', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ path: ['logout'] }) })

    expect(res.headers.getSetCookie()).toHaveLength(2)
    expect(res.headers.getSetCookie()).toEqual(
      expect.arrayContaining([
        expect.stringContaining('user_refresh_token='),
        expect.stringContaining('user_session='),
      ])
    )
  })
})
