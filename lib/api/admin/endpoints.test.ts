import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as client from './client'
import {
  adminLogin, adminLogout, registerAdmin, verifyAdmin, resendAdminRegistrationOtp,
  forgotAdminPassword, resendAdminForgottenPasswordOtp, resetAdminPassword,
  adminRecoveryInitiate, adminRecoveryConfirm,
} from './endpoints'
import { getAdminAccessToken, clearAdminAccessToken } from './token'

describe('admin auth endpoints', () => {
  beforeEach(() => {
    clearAdminAccessToken()
    vi.restoreAllMocks()
  })

  it('adminLogin posts credentials and stores the access token', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ accessToken: 'tok' })
    await adminLogin('a@b.com', 'pw')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/admin-login', {
      method: 'POST', body: { adminEmail: 'a@b.com', password: 'pw' }, auth: false,
    })
    expect(getAdminAccessToken()).toBe('tok')
  })

  it('adminLogout clears the token even if the request fails', async () => {
    vi.spyOn(client, 'adminApiFetch').mockRejectedValue(new Error('network'))
    await adminLogout()
    expect(getAdminAccessToken()).toBeNull()
  })

  it('registerAdmin posts name, email, password with no auth', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await registerAdmin({ name: 'Dami', email: 'a@b.com', password: 'Aa1!aaaa' })
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/register-admin', {
      method: 'POST', body: { name: 'Dami', email: 'a@b.com', password: 'Aa1!aaaa' }, auth: false,
    })
  })

  it('verifyAdmin posts the otp and stores the returned token', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ accessToken: 'tok2' })
    await verifyAdmin('a@b.com', '123456')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/verify-admin', {
      method: 'POST', body: { email: 'a@b.com', otp: '123456' }, auth: false,
    })
    expect(getAdminAccessToken()).toBe('tok2')
  })

  it('resendAdminRegistrationOtp posts adminEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resendAdminRegistrationOtp('a@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/resend-registration-otp', {
      method: 'POST', body: { adminEmail: 'a@b.com' }, auth: false,
    })
  })

  it('forgotAdminPassword posts a JSON body, never a query string', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await forgotAdminPassword('a@b.com')
    const [path, opts] = (client.adminApiFetch as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(path).not.toContain('?')
    expect(opts.body).toEqual({ adminEmail: 'a@b.com' })
  })

  it('resendAdminForgottenPasswordOtp posts adminEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resendAdminForgottenPasswordOtp('a@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/resend-admin-forgotten-password-otp', {
      method: 'POST', body: { adminEmail: 'a@b.com' }, auth: false,
    })
  })

  it('resetAdminPassword posts email, otp, and newPassword', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resetAdminPassword('a@b.com', '123456', 'NewPass1!')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/reset-admin-password', {
      method: 'POST', body: { adminEmail: 'a@b.com', otp: '123456', newPassword: 'NewPass1!' }, auth: false,
    })
  })

  it('adminRecoveryInitiate posts adminEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await adminRecoveryInitiate('a@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/recovery/admin/initiate', {
      method: 'POST', body: { adminEmail: 'a@b.com' }, auth: false,
    })
  })

  it('adminRecoveryConfirm posts adminEmail and otp, stores the returned token', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ accessToken: 'tok3' })
    await adminRecoveryConfirm('a@b.com', '654321')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/recovery/admin/confirm', {
      method: 'POST', body: { adminEmail: 'a@b.com', otp: '654321' }, auth: false,
    })
    expect(getAdminAccessToken()).toBe('tok3')
  })
})
