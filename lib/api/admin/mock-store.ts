import type {
  AdminProfile, AdminDashboardMetrics, AdminBroadcastHistoryItem, AdminNotificationDashboardResponse,
  AdminAnalyticsResponse, AdminTimeSeriesPoint, AdminAiUsagePoint,
  AdminUserSummary, AdminUsersPage, AdminAuditLogItem,
} from './types'

let profile: AdminProfile = {
  adminName: 'Ada Admin',
  adminEmail: 'admin@earsforyou.test',
  role: 'Admin',
  createdAt: null,
}

const dashboardMetrics: AdminDashboardMetrics = {
  totalUsers: 4820,
  activeUsers: 1264,
  journalEntries: 973,
  moodLogs: 2140,
  aiChats: 356,
}

const broadcastNotifications: AdminBroadcastHistoryItem[] = [
  {
    formattedId: 'NTF-0001',
    title: 'Service disruption notice',
    message: 'We are aware of the recent slow load times and are working on a fix.',
    segment: 'ALL_USERS',
    sentAt: '2026-08-05T14:00:00Z',
  },
  {
    formattedId: 'NTF-0002',
    title: 'New breathing exercise',
    message: 'New breathing exercise added to the check-in flow.',
    segment: 'RE_ENGAGEMENT',
    sentAt: '2026-07-28T09:30:00Z',
  },
]

const broadcastHistory: AdminNotificationDashboardResponse = {
  totalSent: 128,
  toAllUsers: 96,
  reEngagement: 32,
  notifications: broadcastNotifications,
}

function buildTimeSeries(base: number, spread: number, days = 30): AdminTimeSeriesPoint[] {
  const points: AdminTimeSeriesPoint[] = []
  const start = new Date('2026-07-11T00:00:00Z')
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    const count = Math.round(base + Math.sin(i / 3) * spread + i * (spread / days))
    points.push({ date: d.toISOString().slice(0, 10), count })
  }
  return points
}

function buildAiUsageSeries(base: number, spread: number, days = 30): AdminAiUsagePoint[] {
  return buildTimeSeries(base, spread, days).map(p => ({
    date: p.date,
    requests: p.count,
    successful: Math.round(p.count * 0.92),
  }))
}

const analytics: AdminAnalyticsResponse = {
  userGrowth: buildTimeSeries(4200, 40),
  dailyActiveUsers: buildTimeSeries(1100, 90),
  moodStatistics: [
    { mood: 'Happy', count: 412 },
    { mood: 'Calm', count: 356 },
    { mood: 'Anxious', count: 198 },
    { mood: 'Sad', count: 143 },
    { mood: 'Angry', count: 61 },
  ],
  journalStatistics: buildTimeSeries(80, 20),
  aiUsageStatistics: buildAiUsageSeries(300, 60),
}

const users: AdminUserSummary[] = [
  { id: 1, name: 'Grace Okafor', email: 'grace.okafor@example.com', status: 'active', joinedAt: '2026-02-14T00:00:00Z' },
  { id: 2, name: 'Daniel Osei', email: 'daniel.osei@example.com', status: 'active', joinedAt: '2026-03-01T00:00:00Z' },
  { id: 3, name: 'Amara Chukwu', email: 'amara.chukwu@example.com', status: 'suspended', joinedAt: '2026-01-20T00:00:00Z' },
  { id: 4, name: 'Tomiwa Bello', email: 'tomiwa.bello@example.com', status: 'active', joinedAt: '2026-04-10T00:00:00Z' },
  { id: 5, name: 'Chiamaka Eze', email: 'chiamaka.eze@example.com', status: 'active', joinedAt: '2026-05-02T00:00:00Z' },
  { id: 6, name: 'Femi Adeyemi', email: 'femi.adeyemi@example.com', status: 'suspended', joinedAt: '2026-02-28T00:00:00Z' },
]

const auditLogs: AdminAuditLogItem[] = [
  { id: 1, action: 'Suspended user amara.chukwu@example.com', actor: 'Ada Admin', createdAt: '2026-08-06T10:00:00Z' },
  { id: 2, action: 'Sent broadcast to All users', actor: 'Ada Admin', createdAt: '2026-08-05T14:00:00Z' },
]

const USERS_PAGE_SIZE = 5

export const adminMockStore = {
  getProfile(): AdminProfile {
    return profile
  },
  updateProfile(patch: Partial<AdminProfile>): AdminProfile {
    profile = { ...profile, ...patch }
    return profile
  },
  confirmEmailChange(newEmail: string): AdminProfile {
    profile = { ...profile, adminEmail: newEmail }
    return profile
  },
  getDashboard(): AdminDashboardMetrics {
    return dashboardMetrics
  },
  getBroadcastHistory(): AdminNotificationDashboardResponse {
    return broadcastHistory
  },
  getAnalytics(): AdminAnalyticsResponse {
    return analytics
  },
  getExportCsv(): Blob {
    const rows = Object.entries(dashboardMetrics).map(([key, value]) => `${key},${value}`)
    return new Blob([`metric,value\n${rows.join('\n')}\n`], { type: 'text/csv' })
  },
  getUsers(params: { search?: string; status?: 'active' | 'suspended'; page?: number }): AdminUsersPage {
    const page = params.page ?? 1
    let filtered = users
    if (params.status) filtered = filtered.filter(u => u.status === params.status)
    if (params.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    const totalPages = Math.max(1, Math.ceil(filtered.length / USERS_PAGE_SIZE))
    const start = (page - 1) * USERS_PAGE_SIZE
    return { users: filtered.slice(start, start + USERS_PAGE_SIZE), page, totalPages }
  },
  getAuditLogs(): AdminAuditLogItem[] {
    return auditLogs
  },
  setUserStatus(email: string, status: 'active' | 'suspended'): AdminUserSummary | undefined {
    const u = users.find(u => u.email === email)
    if (u) u.status = status
    return u
  },
  setUserEmail(currentEmail: string, newEmail: string): AdminUserSummary | undefined {
    const u = users.find(u => u.email === currentEmail)
    if (u) u.email = newEmail
    return u
  },
  generateOtp(): { otp: string } {
    return { otp: '482913' }
  },
}
