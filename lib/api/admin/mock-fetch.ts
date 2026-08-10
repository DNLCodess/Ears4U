import { adminMockStore } from './mock-store'
import { ApiError, friendlyFor } from '../errors'
import type { UpdateAdminProfilePayload, AdminEmergencyResourceInput, AdminSystemSettings, AdminSettingResetKey } from './types'

const DELAY_MS = 350

function delay<T>(value: T, ms = DELAY_MS): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

type Opts = { method?: string; body?: unknown }

export async function adminMockFetch<T>(path: string, opts: Opts = {}): Promise<T> {
  const method = (opts.method ?? 'GET').toUpperCase()
  const pathname = path.split('?')[0]!

  if (pathname === '/api/v1/auth/admin-login' && method === 'POST') {
    return delay({ accessToken: 'mock-admin-access-token' } as T)
  }
  if (pathname === '/api/v1/auth/logout' && method === 'POST') {
    return delay(undefined as T)
  }
  if (pathname === '/api/v1/admins/register-admin' && method === 'POST') {
    return delay({ message: 'Registration started' } as T)
  }
  if (pathname === '/api/v1/admins/verify-admin' && method === 'POST') {
    return delay({ accessToken: 'mock-admin-access-token' } as T)
  }
  if (
    method === 'POST' &&
    (pathname === '/api/v1/admins/resend-registration-otp' ||
      pathname === '/api/v1/admins/resend-recovery-otp' ||
      pathname === '/api/v1/auth/forgot-admin-password' ||
      pathname === '/api/v1/auth/resend-admin-forgotten-password-otp' ||
      pathname === '/api/v1/auth/reset-admin-password' ||
      pathname === '/api/v1/auth/recovery/admin/initiate')
  ) {
    return delay({ message: 'ok' } as T)
  }
  if (pathname === '/api/v1/auth/recovery/admin/confirm' && method === 'POST') {
    return delay({ accessToken: 'mock-admin-access-token' } as T)
  }

  if (pathname === '/api/v1/admins/me' && method === 'GET') {
    return delay(adminMockStore.getProfile() as T)
  }
  if (pathname === '/api/v1/admins/me' && method === 'PUT') {
    return delay(adminMockStore.updateProfile(opts.body as UpdateAdminProfilePayload) as T)
  }
  if (pathname === '/api/v1/admins/me' && method === 'DELETE') {
    return delay(undefined as T)
  }

  if (
    method === 'POST' &&
    (pathname === '/api/v1/admins/change-admin-password/initiate' ||
      pathname === '/api/v1/admins/change-admin-password/verify' ||
      pathname === '/api/v1/admins/resend-password-change-otp')
  ) {
    return delay({ message: 'ok' } as T)
  }
  if (pathname === '/api/v1/admins/change-admin-email/initiate' && method === 'POST') {
    return delay({ message: 'ok' } as T)
  }
  if (pathname === '/api/v1/admins/change-admin-email/verify' && method === 'POST') {
    const { newAdminEmail } = (opts.body ?? {}) as { newAdminEmail?: string }
    return delay(adminMockStore.confirmEmailChange(newAdminEmail ?? '') as T)
  }
  if (pathname === '/api/v1/admins/resend-email-change-otp' && method === 'POST') {
    return delay({ message: 'ok' } as T)
  }

  if (pathname === '/api/v1/admins/dashboard' && method === 'GET') {
    return delay(adminMockStore.getDashboard() as T)
  }
  if (pathname === '/api/v1/admins/emergency/dashboard' && method === 'GET') {
    return delay(adminMockStore.getEmergencyDashboard() as T)
  }

  const resourceIdMatch = pathname.match(/^\/api\/v1\/admins\/resources\/(\d+)$/)
  if (pathname === '/api/v1/admins/resources' && method === 'POST') {
    const body = opts.body as AdminEmergencyResourceInput
    return delay(adminMockStore.addResource(body) as T)
  }
  if (resourceIdMatch && method === 'PUT') {
    const id = Number(resourceIdMatch[1])
    const body = opts.body as AdminEmergencyResourceInput
    const updated = adminMockStore.updateResource(id, body)
    if (!updated) throw new ApiError(404, friendlyFor(404))
    return delay(updated as T)
  }
  if (resourceIdMatch && method === 'DELETE') {
    const id = Number(resourceIdMatch[1])
    adminMockStore.deleteResource(id)
    return delay({ message: 'Emergency resource deleted successfully.' } as T)
  }

  if (pathname === '/api/v1/admins/dashboard/notifications' && method === 'GET') {
    return delay(adminMockStore.getBroadcastHistory() as T)
  }
  if (pathname === '/api/v1/admins/anaytics' && method === 'GET') {
    return delay(adminMockStore.getAnalytics() as T)
  }
  if (pathname === '/api/v1/admins/dashboard/exports' && method === 'GET') {
    return delay(adminMockStore.getExportCsv() as T)
  }

  if (pathname === '/api/v1/admins/users' && method === 'GET') {
    const queryString = path.split('?')[1] ?? ''
    const params = new URLSearchParams(queryString)
    const status = params.get('status')
    return delay(adminMockStore.getUsers({
      search: params.get('search') ?? undefined,
      status: status === 'ACTIVE' || status === 'SUSPENDED' ? status : undefined,
      page: params.get('page') ? Number(params.get('page')) : undefined,
      size: params.get('size') ? Number(params.get('size')) : undefined,
    }) as T)
  }
  if (pathname === '/api/v1/admins/audit-logs' && method === 'GET') {
    return delay(adminMockStore.getAuditLogs() as T)
  }
  if (pathname === '/api/v1/admins/settings' && method === 'GET') {
    return delay(adminMockStore.getSettings() as T)
  }
  if (pathname === '/api/v1/admins/settings' && method === 'PATCH') {
    const body = opts.body as AdminSystemSettings
    adminMockStore.updateSettings(body)
    return delay({ message: 'System settings updated successfully. Changes are now live.' } as T)
  }
  const settingKeyMatch = pathname.match(/^\/api\/v1\/admins\/settings\/([a-z_]+)$/)
  if (settingKeyMatch && method === 'DELETE') {
    const key = settingKeyMatch[1] as AdminSettingResetKey
    adminMockStore.resetSetting(key)
    return delay({ message: `Setting '${key}' has been reset to system default.` } as T)
  }
  if (pathname === '/api/v1/admins/telemetry' && method === 'GET') {
    return delay(adminMockStore.getTelemetry() as T)
  }

  // The real backend's suspend/reactivate/change-email/failover-otp endpoints all take
  // @RequestParam query params, never a JSON body - read from the URL's query string here too,
  // matching what the frontend now actually sends (see endpoints.ts).
  if (pathname === '/api/v1/admins/users/suspend' && method === 'PUT') {
    const params = new URLSearchParams(path.split('?')[1] ?? '')
    adminMockStore.setUserStatus(params.get('userEmail') ?? '', 'Suspended')
    return delay({ message: 'ok' } as T)
  }
  if (pathname === '/api/v1/admins/users/reactivate' && method === 'PUT') {
    const params = new URLSearchParams(path.split('?')[1] ?? '')
    adminMockStore.setUserStatus(params.get('userEmail') ?? '', 'Active')
    return delay({ message: 'ok' } as T)
  }
  if (pathname === '/api/v1/admins/users/change-email' && method === 'PUT') {
    const params = new URLSearchParams(path.split('?')[1] ?? '')
    adminMockStore.setUserEmail(params.get('currentEmail') ?? '', params.get('newEmail') ?? '')
    return delay({ message: 'ok' } as T)
  }
  if (
    method === 'POST' &&
    (pathname === '/api/v1/admins/users/failover/registration-otp' ||
      pathname === '/api/v1/admins/users/failover/password-otp' ||
      pathname === '/api/v1/admins/users/failover/email-otp' ||
      pathname === '/api/v1/admins/users/failover/password-change-otp')
  ) {
    return delay(adminMockStore.generateOtp() as T)
  }

  throw new Error(`adminMockFetch: no mock route for ${method} ${pathname}`)
}
