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

import {
  changeAdminPasswordInitiate, changeAdminPasswordVerify, resendAdminPasswordChangeOtp,
  changeAdminEmailInitiate, changeAdminEmailVerify, resendAdminEmailChangeOtp,
} from './endpoints'

describe('admin account credential changes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('changeAdminPasswordInitiate posts email and oldPassword', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminPasswordInitiate('a@b.com', 'oldpw')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/change-admin-password/initiate', {
      method: 'POST', body: { email: 'a@b.com', oldPassword: 'oldpw' },
    })
  })

  it('changeAdminPasswordVerify posts email, oldPassword, newPassword, and otp', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminPasswordVerify('a@b.com', 'oldpw', 'newpw', '123456')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/change-admin-password/verify', {
      method: 'POST', body: { email: 'a@b.com', oldPassword: 'oldpw', newPassword: 'newpw', otp: '123456' },
    })
  })

  it('resendAdminPasswordChangeOtp posts with no body', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resendAdminPasswordChangeOtp()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/resend-password-change-otp', { method: 'POST' })
  })

  it('changeAdminEmailInitiate posts oldEmail and newEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminEmailInitiate('old@b.com', 'new@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/change-admin-email/initiate', {
      method: 'POST', body: { oldEmail: 'old@b.com', newEmail: 'new@b.com' },
    })
  })

  it('changeAdminEmailVerify posts oldEmail, newEmail, and otp', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminEmailVerify('old@b.com', 'new@b.com', '654321')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/change-admin-email/verify', {
      method: 'POST', body: { oldEmail: 'old@b.com', newEmail: 'new@b.com', otp: '654321' },
    })
  })

  it('resendAdminEmailChangeOtp posts with no body', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resendAdminEmailChangeOtp()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/resend-email-change-otp', { method: 'POST' })
  })
})

import {
  getAdminDashboard, getAdminBroadcastHistory, getAdminAnalytics, downloadAdminDashboardExport,
} from './endpoints'

describe('admin dashboard and analytics endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getAdminDashboard fetches the dashboard metrics path', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ totalUsers: 1 })
    await getAdminDashboard()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/dashboard')
  })

  it('getAdminBroadcastHistory fetches the notifications path', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue([])
    await getAdminBroadcastHistory()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/dashboard/notifications')
  })

  it('getAdminAnalytics fetches the anaytics path exactly as documented, missing the l', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ userGrowth: [], moods: [], aiUsage: [] })
    await getAdminAnalytics()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/anaytics')
  })

  it('downloadAdminDashboardExport fetches the exports path via the blob client', async () => {
    const fakeBlob = new Blob(['a,b'], { type: 'text/csv' })
    vi.spyOn(client, 'adminApiFetchBlob').mockResolvedValue(fakeBlob)
    const result = await downloadAdminDashboardExport()
    expect(client.adminApiFetchBlob).toHaveBeenCalledWith('/api/v1/admins/dashboard/exports')
    expect(result).toBe(fakeBlob)
  })
})

import { getAdminUsers, getAdminAuditLogs } from './endpoints'

describe('admin users read endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getAdminUsers builds a query string from the provided filters', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ users: [], page: 1, totalPages: 1 })
    await getAdminUsers({ search: 'ada', status: 'active', page: 2 })
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users?search=ada&status=active&page=2')
  })

  it('getAdminUsers omits unset filters from the query string', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ users: [], page: 1, totalPages: 1 })
    await getAdminUsers()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users')
  })

  it('getAdminAuditLogs fetches the audit-logs path with no body', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue([])
    await getAdminAuditLogs()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/audit-logs')
  })
})
