import { describe, it, expect } from 'vitest'
import { adminMockFetch } from './mock-fetch'

describe('adminMockFetch', () => {
  it('returns an access token for admin login', async () => {
    const r = await adminMockFetch<{ accessToken: string }>('/api/v1/auth/admin-login', {
      method: 'POST', body: { adminEmail: 'admin@earsforyou.test', password: 'whatever' },
    })
    expect(r.accessToken).toBe('mock-admin-access-token')
  })

  it('resolves logout with no body', async () => {
    const r = await adminMockFetch('/api/v1/auth/logout', { method: 'POST' })
    expect(r).toBeUndefined()
  })

  it('returns a message for admin registration', async () => {
    const r = await adminMockFetch<{ message: string }>('/api/v1/admins/register-admin', {
      method: 'POST', body: { name: 'Ada Admin', email: 'ada@earsforyou.test', password: 'Password1!' },
    })
    expect(r.message).toBe('Registration started')
  })

  it('returns an access token for admin verification', async () => {
    const r = await adminMockFetch<{ accessToken: string }>('/api/v1/admins/verify-admin', {
      method: 'POST', body: { email: 'ada@earsforyou.test', otp: '123456' },
    })
    expect(r.accessToken).toBe('mock-admin-access-token')
  })

  it.each([
    '/api/v1/admins/resend-registration-otp',
    '/api/v1/admins/resend-recovery-otp',
    '/api/v1/auth/forgot-admin-password',
    '/api/v1/auth/resend-admin-forgotten-password-otp',
    '/api/v1/auth/reset-admin-password',
    '/api/v1/auth/recovery/admin/initiate',
  ])('returns an ok message for POST %s', async path => {
    const r = await adminMockFetch<{ message: string }>(path, { method: 'POST', body: {} })
    expect(r.message).toBe('ok')
  })

  it('returns an access token for recovery confirm', async () => {
    const r = await adminMockFetch<{ accessToken: string }>('/api/v1/auth/recovery/admin/confirm', {
      method: 'POST', body: { adminEmail: 'ada@earsforyou.test', otp: '123456' },
    })
    expect(r.accessToken).toBe('mock-admin-access-token')
  })

  it('returns the stored profile for GET me', async () => {
    const r = await adminMockFetch<{ name: string; email: string }>('/api/v1/admins/me')
    expect(r.name).toBeTruthy()
    expect(r.email).toBeTruthy()
  })

  it('updates and persists the profile on PUT me', async () => {
    const updated = await adminMockFetch<{ name: string }>('/api/v1/admins/me', {
      method: 'PUT', body: { name: 'Updated Name' },
    })
    expect(updated.name).toBe('Updated Name')

    const after = await adminMockFetch<{ name: string }>('/api/v1/admins/me')
    expect(after.name).toBe('Updated Name')
  })

  it('resolves DELETE me with no body', async () => {
    const r = await adminMockFetch('/api/v1/admins/me', { method: 'DELETE' })
    expect(r).toBeUndefined()
  })

  it.each([
    '/api/v1/admins/change-admin-password/initiate',
    '/api/v1/admins/change-admin-password/verify',
    '/api/v1/admins/resend-password-change-otp',
    '/api/v1/admins/change-admin-email/initiate',
    '/api/v1/admins/resend-email-change-otp',
  ])('returns an ok message for POST %s', async path => {
    const r = await adminMockFetch<{ message: string }>(path, { method: 'POST', body: {} })
    expect(r.message).toBe('ok')
  })

  it('confirms an email change and persists the new email', async () => {
    const updated = await adminMockFetch<{ email: string }>('/api/v1/admins/change-admin-email/verify', {
      method: 'POST', body: { oldEmail: 'admin@earsforyou.test', newEmail: 'new@earsforyou.test', otp: '123456' },
    })
    expect(updated.email).toBe('new@earsforyou.test')

    const after = await adminMockFetch<{ email: string }>('/api/v1/admins/me')
    expect(after.email).toBe('new@earsforyou.test')
  })

  it('throws for an unmapped path so gaps are loud, not silent', async () => {
    await expect(adminMockFetch('/api/v1/does-not-exist')).rejects.toThrow(/no mock route/)
  })
})
