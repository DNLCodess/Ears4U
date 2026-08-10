import { describe, it, expect } from 'vitest'
import { adminMockFetch } from './mock-fetch'

describe('adminMockFetch', () => {
  it('returns an access token for admin login', async () => {
    const r = await adminMockFetch<{ accessToken: string }>('/api/v1/auth/admin-login', {
      method: 'POST', body: { username: 'admin@earsforyou.test', password: 'whatever' },
    })
    expect(r.accessToken).toBe('mock-admin-access-token')
  })

  it('resolves logout with no body', async () => {
    const r = await adminMockFetch('/api/v1/auth/logout', { method: 'POST' })
    expect(r).toBeUndefined()
  })

  it('returns a message for admin registration', async () => {
    const r = await adminMockFetch<{ message: string }>('/api/v1/admins/register-admin', {
      method: 'POST',
      body: { adminName: 'Ada Admin', adminEmail: 'ada@earsforyou.test', adminPassword: 'Password1!' },
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
    '/api/v1/admins/resend-registration-otp?adminEmail=ada%40earsforyou.test',
    '/api/v1/admins/resend-recovery-otp?adminEmail=ada%40earsforyou.test',
    '/api/v1/auth/forgot-admin-password?adminEmail=ada%40earsforyou.test',
    '/api/v1/auth/resend-admin-forgotten-password-otp?adminEmail=ada%40earsforyou.test',
    '/api/v1/auth/reset-admin-password',
    '/api/v1/auth/recovery/admin/initiate?adminEmail=ada%40earsforyou.test',
  ])('returns an ok message for POST %s', async path => {
    const r = await adminMockFetch<{ message: string }>(path, { method: 'POST', body: {} })
    expect(r.message).toBe('ok')
  })

  it('returns an access token for recovery confirm', async () => {
    const r = await adminMockFetch<{ accessToken: string }>(
      '/api/v1/auth/recovery/admin/confirm?adminEmail=ada%40earsforyou.test&otp=123456',
      { method: 'POST' },
    )
    expect(r.accessToken).toBe('mock-admin-access-token')
  })

  it('returns the stored profile for GET me', async () => {
    const r = await adminMockFetch<{ adminName: string; adminEmail: string; role: string; createdAt: string | null }>(
      '/api/v1/admins/me',
    )
    expect(r.adminName).toBeTruthy()
    expect(r.adminEmail).toBeTruthy()
    expect(r.role).toBe('Admin')
    expect(r.createdAt).toBeNull()
  })

  it('updates and persists the profile on PUT me', async () => {
    const updated = await adminMockFetch<{ adminName: string }>('/api/v1/admins/me', {
      method: 'PUT', body: { adminName: 'Updated Name' },
    })
    expect(updated.adminName).toBe('Updated Name')

    const after = await adminMockFetch<{ adminName: string }>('/api/v1/admins/me')
    expect(after.adminName).toBe('Updated Name')
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
    const updated = await adminMockFetch<{ adminEmail: string }>('/api/v1/admins/change-admin-email/verify', {
      method: 'POST',
      body: { oldAdminEmail: 'admin@earsforyou.test', newAdminEmail: 'new@earsforyou.test', otp: '123456' },
    })
    expect(updated.adminEmail).toBe('new@earsforyou.test')

    const after = await adminMockFetch<{ adminEmail: string }>('/api/v1/admins/me')
    expect(after.adminEmail).toBe('new@earsforyou.test')
  })

  it('throws for an unmapped path so gaps are loud, not silent', async () => {
    await expect(adminMockFetch('/api/v1/does-not-exist')).rejects.toThrow(/no mock route/)
  })

  describe('emergency resources', () => {
    it('creates and returns a resource with a generated id on POST /api/v1/admins/resources', async () => {
      const r = await adminMockFetch<{ id: number; name: string }>('/api/v1/admins/resources', {
        method: 'POST',
        body: { name: 'Youth Support Line', country: 'Kenya', resourceType: 'HOTLINE', contactInfo: '0800-000-000', active: true },
      })
      expect(r.name).toBe('Youth Support Line')
      expect(typeof r.id).toBe('number')
    })

    it('updates and returns the resource on PUT /api/v1/admins/resources/{id} for a real id', async () => {
      const created = await adminMockFetch<{ id: number }>('/api/v1/admins/resources', {
        method: 'POST',
        body: { name: 'Old Name', country: 'Kenya', resourceType: 'HOTLINE', contactInfo: '0800-000-000', active: true },
      })
      const updated = await adminMockFetch<{ id: number; name: string }>(`/api/v1/admins/resources/${created.id}`, {
        method: 'PUT',
        body: { name: 'New Name', country: 'Kenya', resourceType: 'HOTLINE', contactInfo: '0800-000-000', active: false },
      })
      expect(updated.id).toBe(created.id)
      expect(updated.name).toBe('New Name')
    })

    it('throws when PUT /api/v1/admins/resources/{id} targets a nonexistent id', async () => {
      await expect(
        adminMockFetch('/api/v1/admins/resources/999999', {
          method: 'PUT',
          body: { name: 'Ghost', country: 'Kenya', resourceType: 'HOTLINE', contactInfo: '0800-000-000', active: true },
        }),
      ).rejects.toThrow()
    })

    it('removes the resource on DELETE /api/v1/admins/resources/{id}', async () => {
      const created = await adminMockFetch<{ id: number }>('/api/v1/admins/resources', {
        method: 'POST',
        body: { name: 'To Delete', country: 'Kenya', resourceType: 'HOTLINE', contactInfo: '0800-000-000', active: true },
      })
      const deleteResult = await adminMockFetch(`/api/v1/admins/resources/${created.id}`, { method: 'DELETE' })
      expect(deleteResult).toEqual({ message: 'Emergency resource deleted successfully.' })

      // Deleting again (or updating) the now-gone id should throw, confirming it's actually gone.
      await expect(
        adminMockFetch(`/api/v1/admins/resources/${created.id}`, {
          method: 'PUT',
          body: { name: 'Ghost', country: 'Kenya', resourceType: 'HOTLINE', contactInfo: '0800-000-000', active: true },
        }),
      ).rejects.toThrow()
    })

    it('does not match the id-route regex for the id-less collection path, falling through to the unmapped-path error for PUT/DELETE', async () => {
      await expect(adminMockFetch('/api/v1/admins/resources', { method: 'PUT', body: {} })).rejects.toThrow(/no mock route/)
      await expect(adminMockFetch('/api/v1/admins/resources', { method: 'DELETE' })).rejects.toThrow(/no mock route/)
    })

    it('does not match the id-route regex for a non-numeric id segment', async () => {
      await expect(adminMockFetch('/api/v1/admins/resources/abc', { method: 'PUT', body: {} })).rejects.toThrow(/no mock route/)
      await expect(adminMockFetch('/api/v1/admins/resources/abc', { method: 'DELETE' })).rejects.toThrow(/no mock route/)
    })

    it('does not match the id-route regex when there is an extra trailing path segment', async () => {
      await expect(adminMockFetch('/api/v1/admins/resources/1/extra-segment', { method: 'PUT', body: {} })).rejects.toThrow(/no mock route/)
      await expect(adminMockFetch('/api/v1/admins/resources/1/extra-segment', { method: 'DELETE' })).rejects.toThrow(/no mock route/)
    })
  })
})
