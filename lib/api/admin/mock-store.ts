import { ADMIN_USERS_PAGE_SIZE } from './types'
import type {
  AdminProfile, AdminDashboardMetrics, AdminBroadcastHistoryItem, AdminNotificationDashboardResponse,
  AdminAnalyticsResponse, AdminTimeSeriesPoint, AdminAiUsagePoint,
  AdminUserSummary, AdminUsersPage, AdminAuditLogItem, AdminEmergencyResource, AdminEmergencyDashboard,
  AdminEmergencyResourceInput,
  AdminSystemSettings, AdminTelemetry, AdminTelemetryPoint,
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

// id is a string and createdAt is a "yyyy-MM-dd"-style date (no time component) to mirror the
// real UserDetails wire shape (id: String, createdAt: pre-formatted String, not an ISO timestamp).
const users: AdminUserSummary[] = [
  { id: '1', name: 'Grace Okafor', email: 'grace.okafor@example.com', status: 'Active', createdAt: '2026-02-14' },
  { id: '2', name: 'Daniel Osei', email: 'daniel.osei@example.com', status: 'Active', createdAt: '2026-03-01' },
  { id: '3', name: 'Amara Chukwu', email: 'amara.chukwu@example.com', status: 'Suspended', createdAt: '2026-01-20' },
  { id: '4', name: 'Tomiwa Bello', email: 'tomiwa.bello@example.com', status: 'Active', createdAt: '2026-04-10' },
  { id: '5', name: 'Chiamaka Eze', email: 'chiamaka.eze@example.com', status: 'Active', createdAt: '2026-05-02' },
  { id: '6', name: 'Femi Adeyemi', email: 'femi.adeyemi@example.com', status: 'Suspended', createdAt: '2026-02-28' },
]

const auditLogs: AdminAuditLogItem[] = [
  { id: 1, action: 'Suspended user amara.chukwu@example.com', adminEmail: 'admin@earsforyou.test', timestamp: '2026-08-06T10:00:00Z' },
  { id: 2, action: 'Sent broadcast to All users', adminEmail: 'admin@earsforyou.test', timestamp: '2026-08-05T14:00:00Z' },
]

const emergencyResources: AdminEmergencyResource[] = [
  { id: 1, name: 'National Crisis Line', country: 'United States', resourceType: 'HOTLINE', contactInfo: '988', active: true },
  { id: 2, name: 'Samaritans', country: 'United Kingdom', resourceType: 'HOTLINE', contactInfo: '116 123', active: true },
  { id: 3, name: 'BetterHelp', country: 'United States', resourceType: 'WEBSITE', contactInfo: 'betterhelp.com', active: true },
  { id: 4, name: 'Mind', country: 'United Kingdom', resourceType: 'WEBSITE', contactInfo: 'mind.org.uk', active: true },
  { id: 5, name: 'Lagos University Teaching Hospital', country: 'Nigeria', resourceType: 'CLINIC', contactInfo: '+234 1 545 0000', active: true },
  { id: 6, name: 'Old Community Line (retired)', country: 'Canada', resourceType: 'HOTLINE', contactInfo: '1-800-000-0000', active: false },
]
let nextResourceId = 7

const settings: AdminSystemSettings = {
  apiConfiguration: { baseUrl: 'https://api.earsfor.you', apiVersion: 'v1', rateLimitPerMinute: 120, timeoutMs: 5000 },
  emailConfiguration: { apiKey: 'sk-x' + '*'.repeat(16) + '3f2a', senderEmail: 'badejoiseoluwa@gmail.com', senderName: 'EarsForYou' },
  otpConfiguration: { otpLength: 6, otpExpiryMinutes: 10, maxAttempts: 3, deliveryChannel: 'EMAIL' },
  securitySettings: { jwtExpiryMinutes: 60, refreshTokenExpiryDays: 7, maxLoginAttempts: 5, sessionTimeoutMinutes: 30, mfaEnabled: true, ipWhitelistEnabled: false },
  aiConfiguration: { enableAiChat: true, aiSystemPrompt: 'You are a mental health support assistant for Ears for You.' },
}

function buildTelemetryTimeline(days = 14): AdminTelemetryPoint[] {
  const points: AdminTelemetryPoint[] = []
  const start = new Date('2026-07-24T00:00:00Z')
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    const totalRequests = Math.round(400 + Math.sin(i / 5) * 150 + i * 10)
    const successfulRequests = Math.round(totalRequests * (0.92 + Math.random() * 0.05))
    const failedRequests = totalRequests - successfulRequests
    points.push({ date: d.toISOString().slice(0, 10), totalRequests, successfulRequests, failedRequests })
  }
  return points
}

const telemetry: AdminTelemetry = {
  totalRequests: 5800,
  successfulRequests: 5400,
  failedRequests: 400,
  averageLatencyMs: 145,
  providerStatus: 'OPERATIONAL',
  requestTimeline: buildTelemetryTimeline(),
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
  // page is 0-indexed here, matching the real backend's `page` query param/`currentPage`
  // response field convention - the frontend's 1-indexed-to-0-indexed conversion happens at the
  // getAdminUsers API boundary, before this ever gets called.
  getUsers(params: { search?: string; status?: 'ACTIVE' | 'SUSPENDED'; page?: number; size?: number }): AdminUsersPage {
    const page = params.page ?? 0
    const size = params.size ?? ADMIN_USERS_PAGE_SIZE
    let filtered = users
    if (params.status) {
      const wanted = params.status === 'ACTIVE' ? 'Active' : 'Suspended'
      filtered = filtered.filter(u => u.status === wanted)
    }
    if (params.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    const totalPages = Math.max(1, Math.ceil(filtered.length / size))
    const start = page * size
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'Active').length,
      suspendedUsers: users.filter(u => u.status === 'Suspended').length,
      users: filtered.slice(start, start + size),
      currentPage: page,
      totalPages,
      totalItems: filtered.length,
    }
  },
  getAuditLogs(): AdminAuditLogItem[] {
    return auditLogs
  },
  setUserStatus(email: string, status: 'Active' | 'Suspended'): AdminUserSummary | undefined {
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
  getEmergencyDashboard(): AdminEmergencyDashboard {
    return {
      totalHotlines: emergencyResources.filter(r => r.resourceType === 'HOTLINE').length,
      totalWebsites: emergencyResources.filter(r => r.resourceType === 'WEBSITE').length,
      totalClinics: emergencyResources.filter(r => r.resourceType === 'CLINIC').length,
      activeCountriesCount: new Set(emergencyResources.filter(r => r.active).map(r => r.country)).size,
      resources: [...emergencyResources],
    }
  },
  addResource(input: AdminEmergencyResourceInput): AdminEmergencyResource {
    const resource: AdminEmergencyResource = { ...input, id: nextResourceId++ }
    emergencyResources.push(resource)
    return resource
  },
  updateResource(id: number, input: AdminEmergencyResourceInput): AdminEmergencyResource | null {
    const existing = emergencyResources.find(r => r.id === id)
    if (!existing) return null
    Object.assign(existing, input)
    return existing
  },
  deleteResource(id: number): void {
    const index = emergencyResources.findIndex(r => r.id === id)
    if (index !== -1) emergencyResources.splice(index, 1)
  },
  getSettings(): AdminSystemSettings {
    return settings
  },
  getTelemetry(): AdminTelemetry {
    return telemetry
  },
}
