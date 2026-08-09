import { adminApiFetch, adminApiFetchBlob } from './client'
import { setAdminAccessToken, clearAdminAccessToken } from './token'
import type {
  AdminProfile, AdminRegisterPayload, UpdateAdminProfilePayload,
  AdminDashboardMetrics, AdminBroadcastHistoryItem, AdminAnalytics,
  AdminUsersPage, AdminAuditLogItem,
} from './types'

export async function adminLogin(email: string, password: string): Promise<void> {
  const r = await adminApiFetch<{ accessToken: string }>('/api/v1/auth/admin-login', {
    method: 'POST', body: { adminEmail: email, password }, auth: false,
  })
  setAdminAccessToken(r.accessToken)
}

export async function adminLogout(): Promise<void> {
  await adminApiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined)
  clearAdminAccessToken()
}

export const registerAdmin = (p: AdminRegisterPayload) =>
  adminApiFetch('/api/v1/admins/register-admin', { method: 'POST', body: p, auth: false })

export async function verifyAdmin(email: string, otp: string): Promise<void> {
  const r = await adminApiFetch<{ accessToken?: string; token?: string }>('/api/v1/admins/verify-admin', {
    method: 'POST', body: { email, otp }, auth: false,
  })
  const token = r?.accessToken ?? r?.token
  if (token) setAdminAccessToken(token)
}

export const resendAdminRegistrationOtp = (email: string) =>
  adminApiFetch('/api/v1/admins/resend-registration-otp', { method: 'POST', body: { adminEmail: email }, auth: false })

export const forgotAdminPassword = (email: string) =>
  adminApiFetch('/api/v1/auth/forgot-admin-password', { method: 'POST', body: { adminEmail: email }, auth: false })

export const resendAdminForgottenPasswordOtp = (email: string) =>
  adminApiFetch('/api/v1/auth/resend-admin-forgotten-password-otp', { method: 'POST', body: { adminEmail: email }, auth: false })

export const resetAdminPassword = (email: string, otp: string, newPassword: string) =>
  adminApiFetch('/api/v1/auth/reset-admin-password', {
    method: 'POST', body: { adminEmail: email, otp, newPassword }, auth: false,
  })

export const adminRecoveryInitiate = (email: string) =>
  adminApiFetch('/api/v1/auth/recovery/admin/initiate', { method: 'POST', body: { adminEmail: email }, auth: false })

export async function adminRecoveryConfirm(email: string, otp: string): Promise<void> {
  const r = await adminApiFetch<{ accessToken?: string; token?: string }>('/api/v1/auth/recovery/admin/confirm', {
    method: 'POST', body: { adminEmail: email, otp }, auth: false,
  })
  const token = r?.accessToken ?? r?.token
  if (token) setAdminAccessToken(token)
}

export const resendAdminRecoveryOtp = (email: string) =>
  adminApiFetch('/api/v1/admins/resend-recovery-otp', { method: 'POST', body: { adminEmail: email }, auth: false })

export const getAdminProfile = () => adminApiFetch<AdminProfile>('/api/v1/admins/me')
export const updateAdminProfile = (p: UpdateAdminProfilePayload) =>
  adminApiFetch('/api/v1/admins/me', { method: 'PUT', body: p })
export const deleteAdminAccount = () => adminApiFetch('/api/v1/admins/me', { method: 'DELETE' })

export const changeAdminPasswordInitiate = (email: string, oldPassword: string) =>
  adminApiFetch('/api/v1/admins/change-admin-password/initiate', { method: 'POST', body: { email, oldPassword } })
export const changeAdminPasswordVerify = (email: string, oldPassword: string, newPassword: string, otp: string) =>
  adminApiFetch('/api/v1/admins/change-admin-password/verify', {
    method: 'POST', body: { email, oldPassword, newPassword, otp },
  })
export const resendAdminPasswordChangeOtp = () =>
  adminApiFetch('/api/v1/admins/resend-password-change-otp', { method: 'POST' })
export const changeAdminEmailInitiate = (oldEmail: string, newEmail: string) =>
  adminApiFetch('/api/v1/admins/change-admin-email/initiate', { method: 'POST', body: { oldEmail, newEmail } })
export const changeAdminEmailVerify = (oldEmail: string, newEmail: string, otp: string) =>
  adminApiFetch('/api/v1/admins/change-admin-email/verify', { method: 'POST', body: { oldEmail, newEmail, otp } })
export const resendAdminEmailChangeOtp = () =>
  adminApiFetch('/api/v1/admins/resend-email-change-otp', { method: 'POST' })

export const getAdminDashboard = () => adminApiFetch<AdminDashboardMetrics>('/api/v1/admins/dashboard')
export const getAdminBroadcastHistory = () =>
  adminApiFetch<AdminBroadcastHistoryItem[]>('/api/v1/admins/dashboard/notifications')
export const getAdminAnalytics = () => adminApiFetch<AdminAnalytics>('/api/v1/admins/anaytics')
export const downloadAdminDashboardExport = () => adminApiFetchBlob('/api/v1/admins/dashboard/exports')

export function getAdminUsers(params: { search?: string; status?: 'active' | 'suspended'; page?: number } = {}) {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.status) qs.set('status', params.status)
  if (params.page) qs.set('page', String(params.page))
  const query = qs.toString()
  return adminApiFetch<AdminUsersPage>(`/api/v1/admins/users${query ? `?${query}` : ''}`)
}
export const getAdminAuditLogs = () => adminApiFetch<AdminAuditLogItem[]>('/api/v1/admins/audit-logs')

export const suspendAdminUser = (userEmail: string) =>
  adminApiFetch('/api/v1/admins/users/suspend', { method: 'PUT', body: { userEmail } })
export const reactivateAdminUser = (userEmail: string) =>
  adminApiFetch('/api/v1/admins/users/reactivate', { method: 'PUT', body: { userEmail } })
export const changeAdminUserEmail = (currentEmail: string, newEmail: string) =>
  adminApiFetch('/api/v1/admins/users/change-email', { method: 'PUT', body: { currentEmail, newEmail } })

const FAILOVER_OTP_PATHS: Record<'registration' | 'password' | 'email' | 'password-change', string> = {
  registration: '/api/v1/admins/users/failover/registration-otp',
  password: '/api/v1/admins/users/failover/password-otp',
  email: '/api/v1/admins/users/failover/email-otp',
  'password-change': '/api/v1/admins/users/failover/password-change-otp',
}
export const generateAdminUserOtp = (userEmail: string, kind: keyof typeof FAILOVER_OTP_PATHS) =>
  adminApiFetch<{ otp: string }>(FAILOVER_OTP_PATHS[kind], { method: 'POST', body: { userEmail } })
