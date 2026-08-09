import type { AdminProfile } from './types'

let profile: AdminProfile = {
  id: 1,
  name: 'Ada Admin',
  email: 'admin@earsforyou.test',
  createdAt: '2026-01-01T00:00:00Z',
}

export const adminMockStore = {
  getProfile(): AdminProfile {
    return profile
  },
  updateProfile(patch: Partial<AdminProfile>): AdminProfile {
    profile = { ...profile, ...patch }
    return profile
  },
  confirmEmailChange(newEmail: string): AdminProfile {
    profile = { ...profile, email: newEmail }
    return profile
  },
}
