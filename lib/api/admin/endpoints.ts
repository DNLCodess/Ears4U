import { adminApiFetch, adminApiFetchBlob } from './client'
import { setAdminAccessToken, clearAdminAccessToken } from './token'
import { ADMIN_USERS_PAGE_SIZE } from './types'
import type {
  AdminProfile, AdminRegisterPayload, UpdateAdminProfilePayload,
  AdminDashboardMetrics, AdminBroadcastHistoryItem, AdminNotificationDashboardResponse,
  AdminAnalytics, AdminAnalyticsResponse,
  AdminUsersPage, AdminAuditLogItem, AdminEmergencyDashboard,
  AdminEmergencyResource, AdminEmergencyResourceInput,
  AdminSystemSettings, AdminSettingResetKey, AdminTelemetry,
} from './types'

export async function adminLogin(email: string, password: string): Promise<void> {
  const r = await adminApiFetch<{ accessToken: string }>('/api/v1/auth/admin-login', {
    method: 'POST', body: { username: email, password }, auth: false,
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
  adminApiFetch(`/api/v1/admins/resend-registration-otp?adminEmail=${encodeURIComponent(email)}`, {
    method: 'POST', auth: false,
  })

export const forgotAdminPassword = (email: string) =>
  adminApiFetch(`/api/v1/auth/forgot-admin-password?adminEmail=${encodeURIComponent(email)}`, {
    method: 'POST', auth: false,
  })

export const resendAdminForgottenPasswordOtp = (email: string) =>
  adminApiFetch(`/api/v1/auth/resend-admin-forgotten-password-otp?adminEmail=${encodeURIComponent(email)}`, {
    method: 'POST', auth: false,
  })

export const resetAdminPassword = (email: string, otp: string, newPassword: string) =>
  adminApiFetch('/api/v1/auth/reset-admin-password', {
    method: 'POST', body: { email, otp, newPassword }, auth: false,
  })

export const adminRecoveryInitiate = (email: string) =>
  adminApiFetch(`/api/v1/auth/recovery/admin/initiate?adminEmail=${encodeURIComponent(email)}`, {
    method: 'POST', auth: false,
  })

export async function adminRecoveryConfirm(email: string, otp: string): Promise<void> {
  const r = await adminApiFetch<{ accessToken?: string; token?: string }>(
    `/api/v1/auth/recovery/admin/confirm?adminEmail=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
    { method: 'POST', auth: false },
  )
  const token = r?.accessToken ?? r?.token
  if (token) setAdminAccessToken(token)
}

// Backend inconsistency (SecurityConfig): /api/v1/admins/resend-recovery-otp is NOT in the
// permitAll matcher list despite living under a "recovery" flow meant for a locked-out, logged-out
// admin. It requires a valid ADMIN JWT, so this call will 401 for a logged-out admin on the real
// backend. This cannot be worked around from the frontend - `auth` is intentionally left at its
// default (true) to match what the backend actually requires; do not set `auth: false` here.
export const resendAdminRecoveryOtp = (email: string) =>
  adminApiFetch(`/api/v1/admins/resend-recovery-otp?adminEmail=${encodeURIComponent(email)}`, { method: 'POST' })

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
  adminApiFetch('/api/v1/admins/change-admin-email/initiate', {
    method: 'POST', body: { oldAdminEmail: oldEmail, newAdminEmail: newEmail },
  })
export const changeAdminEmailVerify = (oldEmail: string, newEmail: string, otp: string) =>
  adminApiFetch('/api/v1/admins/change-admin-email/verify', {
    method: 'POST', body: { oldAdminEmail: oldEmail, newAdminEmail: newEmail, otp },
  })
export const resendAdminEmailChangeOtp = () =>
  adminApiFetch('/api/v1/admins/resend-email-change-otp', { method: 'POST' })

export const getAdminDashboard = () => adminApiFetch<AdminDashboardMetrics>('/api/v1/admins/dashboard')
export const getAdminEmergencyDashboard = () =>
  adminApiFetch<AdminEmergencyDashboard>('/api/v1/admins/emergency/dashboard')

export const createAdminEmergencyResource = (input: AdminEmergencyResourceInput) =>
  adminApiFetch<AdminEmergencyResource>('/api/v1/admins/resources', { method: 'POST', body: input })
export const updateAdminEmergencyResource = (id: number, input: AdminEmergencyResourceInput) =>
  adminApiFetch<AdminEmergencyResource>(`/api/v1/admins/resources/${id}`, { method: 'PUT', body: input })
export const deleteAdminEmergencyResource = (id: number) =>
  adminApiFetch(`/api/v1/admins/resources/${id}`, { method: 'DELETE' })

// Real endpoint returns a NotificationDashboardResponse wrapper (totalSent/toAllUsers/
// reEngagement/notifications), not a bare array - unwrap it here so callers keep working with a
// plain AdminBroadcastHistoryItem[].
export async function getAdminBroadcastHistory(): Promise<AdminBroadcastHistoryItem[]> {
  const r = await adminApiFetch<AdminNotificationDashboardResponse>('/api/v1/admins/dashboard/notifications')
  return r.notifications
}

// Path is genuinely misspelled on the backend ("/anaytics", missing the "l") - do not "fix" it,
// there is no "/analytics" route. Maps the real wire fields onto the { date, value } shape
// TimeSeriesChart already expects (see AdminAnalyticsPoint's doc comment in types.ts for why this
// is safe for the Moods category chart specifically).
export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const r = await adminApiFetch<AdminAnalyticsResponse>('/api/v1/admins/anaytics')
  // dailyActiveUsers and journalStatistics are also present on this response but are out of this
  // phase's 3-chart scope (User growth, Moods, AI usage) - left unconsumed for a future phase.
  return {
    userGrowth: r.userGrowth.map(p => ({ date: p.date, value: p.count })),
    moods: r.moodStatistics.map(p => ({ date: p.mood, value: p.count })),
    // `successful` is also available per point on aiUsageStatistics but not currently charted -
    // a future phase could add it as a second series or a success-rate view.
    aiUsage: r.aiUsageStatistics.map(p => ({ date: p.date, value: p.requests })),
  }
}

export const downloadAdminDashboardExport = () => adminApiFetchBlob('/api/v1/admins/dashboard/exports')

// Backend GET /api/v1/admins/users `status` query param only has its default value ("ALL")
// confirmed from source - the class that interprets non-default values, UserSpecification, is not
// present in the available backend source tree. 'ACTIVE'/'SUSPENDED' is a best-guess only,
// matching "ALL"'s uppercase casing convention - unlike every other fix in this file, which is
// directly confirmed from reading Java source.
export function getAdminUsers(
  params: { search?: string; status?: 'ACTIVE' | 'SUSPENDED'; page?: number; size?: number } = {},
) {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.status) qs.set('status', params.status)
  // The Users page keeps its own page state 1-indexed for display; the backend's `page` query
  // param (and its response's `currentPage`) are 0-indexed, so convert only at this boundary.
  qs.set('page', String((params.page ?? 1) - 1))
  qs.set('size', String(params.size ?? ADMIN_USERS_PAGE_SIZE))
  return adminApiFetch<AdminUsersPage>(`/api/v1/admins/users?${qs.toString()}`)
}
export const getAdminAuditLogs = () => adminApiFetch<AdminAuditLogItem[]>('/api/v1/admins/audit-logs')

// PUT /users/suspend, /users/reactivate, and /users/change-email all take @RequestParam query
// params on the real backend, never a request body, despite being PUT requests - a wrong "every
// PUT/POST sends JSON" assumption was carried through the whole users-mutation surface. No `body`
// key is passed at all (not `body: undefined`) so the client never sets a content-type header for
// these.
export const suspendAdminUser = (userEmail: string) =>
  adminApiFetch(`/api/v1/admins/users/suspend?userEmail=${encodeURIComponent(userEmail)}`, { method: 'PUT' })
export const reactivateAdminUser = (userEmail: string) =>
  adminApiFetch(`/api/v1/admins/users/reactivate?userEmail=${encodeURIComponent(userEmail)}`, { method: 'PUT' })
export const changeAdminUserEmail = (currentEmail: string, newEmail: string) =>
  adminApiFetch(
    `/api/v1/admins/users/change-email?currentEmail=${encodeURIComponent(currentEmail)}` +
      `&newEmail=${encodeURIComponent(newEmail)}`,
    { method: 'PUT' },
  )

const FAILOVER_OTP_PATHS: Record<'registration' | 'password' | 'email' | 'password-change', string> = {
  registration: '/api/v1/admins/users/failover/registration-otp',
  password: '/api/v1/admins/users/failover/password-otp',
  email: '/api/v1/admins/users/failover/email-otp',
  'password-change': '/api/v1/admins/users/failover/password-change-otp',
}
// All four failover endpoints are POSTs that take only a `userEmail` query param, no body.
export const generateAdminUserOtp = (userEmail: string, kind: keyof typeof FAILOVER_OTP_PATHS) =>
  adminApiFetch<{ otp: string }>(
    `${FAILOVER_OTP_PATHS[kind]}?userEmail=${encodeURIComponent(userEmail)}`,
    { method: 'POST' },
  )

export const getAdminSettings = () => adminApiFetch<AdminSystemSettings>('/api/v1/admins/settings')
export const getAdminTelemetry = () => adminApiFetch<AdminTelemetry>('/api/v1/admins/telemetry')

// Always sends the full settings object (all five nested sections), per this phase's design
// decision - a partial payload is technically valid on the backend too, but resending an
// unchanged section back is harmless (the backend just rewrites the same values), except the
// masked API key, which the backend detects and skips writing (see mock-store.ts for the mirrored
// guard in mock mode).
export const updateAdminSettings = (settings: AdminSystemSettings) =>
  adminApiFetch('/api/v1/admins/settings', { method: 'PATCH', body: settings })
// key is one of the 19 flat Redis key names from the design spec's table (e.g. 'api_base_url'),
// not a nested DTO field name - sent as a path variable, not a query string or body.
export const resetAdminSetting = (key: AdminSettingResetKey) =>
  adminApiFetch(`/api/v1/admins/settings/${encodeURIComponent(key)}`, { method: 'DELETE' })
