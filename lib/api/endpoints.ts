import { apiFetch } from './client'
import { setAccessToken, clearAccessToken } from './token'
import type {
  DashboardHome, Insights, JournalEntry, JournalPayload, ChatMessage,
  NotificationItem, NotificationSettings, EmergencyResource, MoodLogPayload,
  MoodEntry, RegisterPayload, UpdateProfilePayload, UserProfile,
} from './types'

export async function login(username: string, password: string): Promise<void> {
  const r = await apiFetch<{ accessToken: string }>('/api/v1/auth/user-login', {
    method: 'POST', body: { username, password }, auth: false,
  })
  setAccessToken(r.accessToken)
}
export async function logout(): Promise<void> {
  await apiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined)
  clearAccessToken()
}
export const registerUser = (p: RegisterPayload) =>
  apiFetch('/api/v1/users/register-user', { method: 'POST', body: p, auth: false })
export async function verifyUser(email: string, otp: string): Promise<void> {
  const r = await apiFetch<{ accessToken?: string }>('/api/v1/users/verify-user', {
    method: 'POST', body: { email, otp }, auth: false,
  })
  if (r?.accessToken) setAccessToken(r.accessToken)
}
export const resendRegistrationOtp = (email: string) =>
  apiFetch(`/api/v1/users/resend-registration-otp?email=${encodeURIComponent(email)}`, { method: 'POST', auth: false })
export const forgotPassword = (email: string) =>
  apiFetch(`/api/v1/auth/forgot-password?email=${encodeURIComponent(email)}`, { method: 'POST', auth: false })
export const resendForgottenPasswordOtp = (email: string) =>
  apiFetch(`/api/v1/auth/resend-forgotten-password-otp?email=${encodeURIComponent(email)}`, { method: 'POST', auth: false })
export const resetPassword = (email: string, otp: string, newPassword: string) =>
  apiFetch('/api/v1/auth/reset-password', { method: 'POST', body: { email, otp, newPassword }, auth: false })
export const recoveryInitiate = (email: string) =>
  apiFetch(`/api/v1/auth/recovery/initiate?email=${encodeURIComponent(email)}`, { method: 'POST', auth: false })
export async function recoveryConfirm(email: string, otp: string): Promise<void> {
  const r = await apiFetch<{ accessToken?: string }>(
    `/api/v1/auth/recovery/confirm?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
    { method: 'POST', auth: false })
  if (r?.accessToken) setAccessToken(r.accessToken)
}

export const getDashboard = () => apiFetch<DashboardHome>('/api/v1/dashboard/home')
export const logMood = (p: MoodLogPayload) => apiFetch<MoodEntry>('/api/v1/mood/log', { method: 'POST', body: p })
export const getInsights = () => apiFetch<Insights>('/api/v1/mood/analytics')
export const getStreak = () => apiFetch<number>('/api/v1/mood/streak')
export const getJournalHistory = () => apiFetch<JournalEntry[]>('/api/v1/journal/history')
export const getJournal = (id: number) => apiFetch<JournalEntry>(`/api/v1/journal/retrieve/${id}`)
export const createJournal = (p: JournalPayload) => apiFetch<JournalEntry>('/api/v1/journal/entry', { method: 'POST', body: p })
export const updateJournal = (id: number, p: JournalPayload) => apiFetch<JournalEntry>(`/api/v1/journal/update-journal/${id}`, { method: 'PUT', body: p })
export const deleteJournal = (id: number) => apiFetch(`/api/v1/journal/delete-journal/${id}`, { method: 'DELETE' })
export const sendChat = (message: string) => apiFetch<{ response?: string; message?: string }>('/api/v1/users/chat', { method: 'POST', body: { message } })
export const getChatHistory = () => apiFetch<ChatMessage[]>('/api/v1/users/chat/history')
export const getNotifications = () => apiFetch<NotificationItem[]>('/api/v1/users/notifications')
export const getUnreadCount = () => apiFetch<{ count?: number; unreadCount?: number }>('/api/v1/users/notifications/unread-count')
export const markNotificationRead = (id: number) => apiFetch(`/api/v1/users/notifications/${id}/read`, { method: 'PATCH' })
export const getNotificationSettings = () => apiFetch<NotificationSettings>('/api/v1/users/notifications/settings')
export const updateNotificationSettings = (s: NotificationSettings) => apiFetch('/api/v1/users/notifications/settings', { method: 'PUT', body: s })
export const getProfile = () => apiFetch<UserProfile>('/api/v1/users/me')
export const updateProfile = (p: UpdateProfilePayload) => apiFetch('/api/v1/users/me', { method: 'PUT', body: p })
export const deleteAccount = () => apiFetch('/api/v1/users/me', { method: 'DELETE' })
export const changePasswordInitiate = (email: string, oldPassword: string) =>
  apiFetch('/api/v1/users/change-password/initiate', { method: 'POST', body: { email, oldPassword } })
export const changePasswordVerify = (email: string, oldPassword: string, newPassword: string, otp: string) =>
  apiFetch('/api/v1/users/change-password/verify', { method: 'POST', body: { email, oldPassword, newPassword, otp } })
export const changeEmailInitiate = (oldEmail: string, newEmail: string) =>
  apiFetch('/api/v1/users/change-email/initiate', { method: 'POST', body: { oldEmail, newEmail } })
export const changeEmailVerify = (oldEmail: string, newEmail: string, otp: string) =>
  apiFetch('/api/v1/users/change-email/verify', { method: 'POST', body: { oldEmail, newEmail, otp } })
export const getEmergencyResources = () => apiFetch<EmergencyResource[]>('/api/v1/users/support/emergency-resources')
export const ping = () => apiFetch('/api/v1/users/ping')
