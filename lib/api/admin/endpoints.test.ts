import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as client from './client'
import {
  adminLogin, adminLogout, registerAdmin, verifyAdmin, resendAdminRegistrationOtp,
  forgotAdminPassword, resendAdminForgottenPasswordOtp, resetAdminPassword,
  adminRecoveryInitiate, adminRecoveryConfirm, resendAdminRecoveryOtp,
} from './endpoints'
import { getAdminAccessToken, clearAdminAccessToken } from './token'

describe('admin auth endpoints', () => {
  beforeEach(() => {
    clearAdminAccessToken()
    vi.restoreAllMocks()
  })

  it('adminLogin posts username (not adminEmail) and stores the access token', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ accessToken: 'tok' })
    await adminLogin('a@b.com', 'pw')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/admin-login', {
      method: 'POST', body: { username: 'a@b.com', password: 'pw' }, auth: false,
    })
    expect(getAdminAccessToken()).toBe('tok')
  })

  it('adminLogout clears the token even if the request fails', async () => {
    vi.spyOn(client, 'adminApiFetch').mockRejectedValue(new Error('network'))
    await adminLogout()
    expect(getAdminAccessToken()).toBeNull()
  })

  it('registerAdmin posts adminName, adminEmail, adminPassword with no auth', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await registerAdmin({ adminName: 'Dami', adminEmail: 'a@b.com', adminPassword: 'Aa1!aaaa' })
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/register-admin', {
      method: 'POST', body: { adminName: 'Dami', adminEmail: 'a@b.com', adminPassword: 'Aa1!aaaa' }, auth: false,
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

  it('resendAdminRegistrationOtp sends adminEmail as a query param, no body', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resendAdminRegistrationOtp('a@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/resend-registration-otp?adminEmail=a%40b.com', {
      method: 'POST', auth: false,
    })
  })

  it('forgotAdminPassword sends adminEmail as a query param, no body', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await forgotAdminPassword('a@b.com')
    const [path, opts] = (client.adminApiFetch as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(path).toBe('/api/v1/auth/forgot-admin-password?adminEmail=a%40b.com')
    expect(opts).toEqual({ method: 'POST', auth: false })
  })

  it('resendAdminForgottenPasswordOtp sends adminEmail as a query param, no body', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resendAdminForgottenPasswordOtp('a@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith(
      '/api/v1/auth/resend-admin-forgotten-password-otp?adminEmail=a%40b.com',
      { method: 'POST', auth: false },
    )
  })

  it('resetAdminPassword posts email (not adminEmail), otp, and newPassword', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resetAdminPassword('a@b.com', '123456', 'NewPass1!')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/reset-admin-password', {
      method: 'POST', body: { email: 'a@b.com', otp: '123456', newPassword: 'NewPass1!' }, auth: false,
    })
  })

  it('adminRecoveryInitiate sends adminEmail as a query param, no body', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await adminRecoveryInitiate('a@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith(
      '/api/v1/auth/recovery/admin/initiate?adminEmail=a%40b.com',
      { method: 'POST', auth: false },
    )
  })

  it('adminRecoveryConfirm sends adminEmail and otp as query params, no body, stores the returned token', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ accessToken: 'tok3' })
    await adminRecoveryConfirm('a@b.com', '654321')
    expect(client.adminApiFetch).toHaveBeenCalledWith(
      '/api/v1/auth/recovery/admin/confirm?adminEmail=a%40b.com&otp=654321',
      { method: 'POST', auth: false },
    )
    expect(getAdminAccessToken()).toBe('tok3')
  })

  it('resendAdminRecoveryOtp sends adminEmail as a query param, no body, and does not force auth: false ' +
    '(the real backend requires an ADMIN JWT for this endpoint despite it living under the recovery flow)', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resendAdminRecoveryOtp('a@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/resend-recovery-otp?adminEmail=a%40b.com', {
      method: 'POST',
    })
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

  it('changeAdminEmailInitiate posts oldAdminEmail and newAdminEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminEmailInitiate('old@b.com', 'new@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/change-admin-email/initiate', {
      method: 'POST', body: { oldAdminEmail: 'old@b.com', newAdminEmail: 'new@b.com' },
    })
  })

  it('changeAdminEmailVerify posts oldAdminEmail, newAdminEmail, and otp', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminEmailVerify('old@b.com', 'new@b.com', '654321')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/change-admin-email/verify', {
      method: 'POST', body: { oldAdminEmail: 'old@b.com', newAdminEmail: 'new@b.com', otp: '654321' },
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

  it('getAdminBroadcastHistory fetches the notifications path and unwraps the notifications array ' +
    'from the wrapped NotificationDashboardResponse', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({
      totalSent: 2, toAllUsers: 1, reEngagement: 1,
      notifications: [{ formattedId: 'NTF-0001', title: 'Hi', message: 'msg', segment: 'ALL_USERS', sentAt: '2026-08-05T14:00:00Z' }],
    })
    const result = await getAdminBroadcastHistory()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/dashboard/notifications')
    expect(result).toEqual([{ formattedId: 'NTF-0001', title: 'Hi', message: 'msg', segment: 'ALL_USERS', sentAt: '2026-08-05T14:00:00Z' }])
  })

  it('getAdminAnalytics fetches the anaytics path exactly as documented, missing the l, and maps ' +
    'count/mood/requests onto the { date, value } chart shape', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({
      userGrowth: [{ date: '2026-08-01', count: 10 }],
      dailyActiveUsers: [],
      moodStatistics: [{ mood: 'Happy', count: 5 }],
      journalStatistics: [],
      aiUsageStatistics: [{ date: '2026-08-01', requests: 20, successful: 18 }],
    })
    const result = await getAdminAnalytics()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/anaytics')
    expect(result).toEqual({
      userGrowth: [{ date: '2026-08-01', value: 10 }],
      moods: [{ date: 'Happy', value: 5 }],
      aiUsage: [{ date: '2026-08-01', value: 20 }],
    })
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

import { suspendAdminUser, reactivateAdminUser, changeAdminUserEmail, generateAdminUserOtp } from './endpoints'

describe('admin user action endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('suspendAdminUser sends a JSON body, never a query string', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await suspendAdminUser('grace.okafor@example.com')
    const [path, opts] = (client.adminApiFetch as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(path).not.toContain('?')
    expect(opts).toEqual({ method: 'PUT', body: { userEmail: 'grace.okafor@example.com' } })
  })

  it('reactivateAdminUser sends a JSON body with userEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await reactivateAdminUser('amara.chukwu@example.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users/reactivate', {
      method: 'PUT', body: { userEmail: 'amara.chukwu@example.com' },
    })
  })

  it('changeAdminUserEmail sends currentEmail and newEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminUserEmail('old@example.com', 'new@example.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users/change-email', {
      method: 'PUT', body: { currentEmail: 'old@example.com', newEmail: 'new@example.com' },
    })
  })

  it('generateAdminUserOtp dispatches to the correct failover path per kind', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ otp: '482913' })
    await generateAdminUserOtp('grace.okafor@example.com', 'registration')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users/failover/registration-otp', {
      method: 'POST', body: { userEmail: 'grace.okafor@example.com' },
    })

    await generateAdminUserOtp('grace.okafor@example.com', 'password-change')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users/failover/password-change-otp', {
      method: 'POST', body: { userEmail: 'grace.okafor@example.com' },
    })
  })
})
