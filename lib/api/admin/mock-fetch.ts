import { adminMockStore } from './mock-store'
import type { UpdateAdminProfilePayload } from './types'

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
    const { newEmail } = (opts.body ?? {}) as { newEmail?: string }
    return delay(adminMockStore.confirmEmailChange(newEmail ?? '') as T)
  }
  if (pathname === '/api/v1/admins/resend-email-change-otp' && method === 'POST') {
    return delay({ message: 'ok' } as T)
  }

  if (pathname === '/api/v1/admins/dashboard' && method === 'GET') {
    return delay(adminMockStore.getDashboard() as T)
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

  throw new Error(`adminMockFetch: no mock route for ${method} ${pathname}`)
}
