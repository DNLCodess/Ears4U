import { mockStore } from './mock-store'
import type {
  MoodLogPayload, JournalPayload, UserProfile, NotificationSettings,
} from './types'

const DELAY_MS = 350

function delay<T>(value: T, ms = DELAY_MS): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

type Opts = { method?: string; body?: unknown }

export async function mockFetch<T>(path: string, opts: Opts = {}): Promise<T> {
  const method = (opts.method ?? 'GET').toUpperCase()
  const pathname = path.split('?')[0]!
  const body = opts.body

  const journalRetrieve = pathname.match(/^\/api\/v1\/journal\/retrieve\/(\d+)$/)
  const journalUpdate = pathname.match(/^\/api\/v1\/journal\/update-journal\/(\d+)$/)
  const journalDelete = pathname.match(/^\/api\/v1\/journal\/delete-journal\/(\d+)$/)
  const notificationRead = pathname.match(/^\/api\/v1\/users\/notifications\/(\d+)\/read$/)

  if (pathname === '/api/v1/auth/user-login' && method === 'POST') {
    return delay({ accessToken: 'mock-access-token' } as T)
  }
  if (pathname === '/api/v1/auth/logout' && method === 'POST') {
    return delay(undefined as T)
  }
  if (pathname === '/api/v1/users/register-user' && method === 'POST') {
    return delay({ message: 'Registration started' } as T)
  }
  if (pathname === '/api/v1/users/verify-user' && method === 'POST') {
    return delay({ accessToken: 'mock-access-token' } as T)
  }
  if (
    method === 'POST' &&
    (pathname === '/api/v1/users/resend-registration-otp' ||
      pathname === '/api/v1/auth/forgot-password' ||
      pathname === '/api/v1/auth/resend-forgotten-password-otp' ||
      pathname === '/api/v1/auth/reset-password' ||
      pathname === '/api/v1/auth/recovery/initiate')
  ) {
    return delay({ message: 'ok' } as T)
  }
  if (pathname === '/api/v1/auth/recovery/confirm' && method === 'POST') {
    return delay({ accessToken: 'mock-access-token' } as T)
  }

  if (pathname === '/api/v1/dashboard/home' && method === 'GET') {
    return delay(mockStore.getDashboard() as T)
  }
  if (pathname === '/api/v1/mood/log' && method === 'POST') {
    return delay(mockStore.logMood(body as MoodLogPayload) as T)
  }
  if (pathname === '/api/v1/mood/analytics' && method === 'GET') {
    return delay(mockStore.getInsights() as T)
  }
  if (pathname === '/api/v1/mood/streak' && method === 'GET') {
    return delay(mockStore.getStreak() as T)
  }

  if (pathname === '/api/v1/journal/history' && method === 'GET') {
    return delay(mockStore.getJournalHistory() as T)
  }
  if (pathname === '/api/v1/journal/entry' && method === 'POST') {
    return delay(mockStore.createJournal(body as JournalPayload) as T)
  }
  if (journalRetrieve && method === 'GET') {
    return delay(mockStore.getJournal(Number(journalRetrieve[1])) as T)
  }
  if (journalUpdate && method === 'PUT') {
    return delay(mockStore.updateJournal(Number(journalUpdate[1]), body as JournalPayload) as T)
  }
  if (journalDelete && method === 'DELETE') {
    mockStore.deleteJournal(Number(journalDelete[1]))
    return delay(undefined as T)
  }

  if (pathname === '/api/v1/users/chat' && method === 'POST') {
    return delay(mockStore.sendChat((body as { message: string }).message) as T, 900)
  }
  if (pathname === '/api/v1/users/chat/history' && method === 'GET') {
    return delay(mockStore.getChatHistory() as T)
  }

  if (pathname === '/api/v1/users/notifications' && method === 'GET') {
    return delay(mockStore.getNotifications() as T)
  }
  if (pathname === '/api/v1/users/notifications/unread-count' && method === 'GET') {
    return delay(mockStore.getUnreadCount() as T)
  }
  if (notificationRead && method === 'PATCH') {
    mockStore.markNotificationRead(Number(notificationRead[1]))
    return delay(undefined as T)
  }
  if (pathname === '/api/v1/users/notifications/settings' && method === 'GET') {
    return delay(mockStore.getNotificationSettings() as T)
  }
  if (pathname === '/api/v1/users/notifications/settings' && method === 'PUT') {
    mockStore.updateNotificationSettings(body as NotificationSettings)
    return delay(undefined as T)
  }

  if (pathname === '/api/v1/users/me' && method === 'GET') {
    return delay(mockStore.getProfile() as T)
  }
  if (pathname === '/api/v1/users/me' && method === 'PUT') {
    return delay(mockStore.updateProfile(body as Partial<UserProfile>) as T)
  }
  if (pathname === '/api/v1/users/me' && method === 'DELETE') {
    return delay(undefined as T)
  }
  if (
    method === 'POST' &&
    (pathname === '/api/v1/users/change-password/initiate' ||
      pathname === '/api/v1/users/change-password/verify' ||
      pathname === '/api/v1/users/resend-password-change-otp' ||
      pathname === '/api/v1/users/change-email/initiate' ||
      pathname === '/api/v1/users/change-email/verify' ||
      pathname === '/api/v1/users/resend-email-change-otp')
  ) {
    return delay({ message: 'ok' } as T)
  }

  if (pathname === '/api/v1/users/support/emergency-resources' && method === 'GET') {
    return delay(mockStore.getEmergencyResources() as T)
  }
  if (pathname === '/api/v1/users/ping' && method === 'GET') {
    return delay(undefined as T)
  }

  throw new Error(`[mock-fetch] no mock handler for ${method} ${pathname}`)
}
