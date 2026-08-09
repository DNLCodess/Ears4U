import { adminApiFetch } from './client'
import { setAdminAccessToken, clearAdminAccessToken } from './token'
import type { AdminProfile, AdminRegisterPayload, UpdateAdminProfilePayload } from './types'

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

export const getAdminProfile = () => adminApiFetch<AdminProfile>('/api/v1/admins/me')
export const updateAdminProfile = (p: UpdateAdminProfilePayload) =>
  adminApiFetch('/api/v1/admins/me', { method: 'PUT', body: p })
export const deleteAdminAccount = () => adminApiFetch('/api/v1/admins/me', { method: 'DELETE' })
