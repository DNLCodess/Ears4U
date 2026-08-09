import type {
  AdminProfile, AdminDashboardMetrics, AdminBroadcastHistoryItem, AdminAnalytics, AdminAnalyticsPoint,
} from './types'

let profile: AdminProfile = {
  id: 1,
  name: 'Ada Admin',
  email: 'admin@earsforyou.test',
  createdAt: '2026-01-01T00:00:00Z',
}

const dashboardMetrics: AdminDashboardMetrics = {
  totalUsers: 4820,
  activeUsers: 1264,
  newSignups: 58,
  checkInsLogged: 973,
  emergencyResourceViews: 41,
  suspendedAccounts: 3,
}

const broadcastHistory: AdminBroadcastHistoryItem[] = [
  {
    id: 1,
    message: 'We are aware of the recent slow load times and are working on a fix.',
    segment: 'All users',
    sentAt: '2026-08-05T14:00:00Z',
  },
  {
    id: 2,
    message: 'New breathing exercise added to the check-in flow.',
    segment: 'Active users',
    sentAt: '2026-07-28T09:30:00Z',
  },
]

function buildSeries(base: number, spread: number, days = 30): AdminAnalyticsPoint[] {
  const points: AdminAnalyticsPoint[] = []
  const start = new Date('2026-07-11T00:00:00Z')
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    const value = Math.round(base + Math.sin(i / 3) * spread + i * (spread / days))
    points.push({ date: d.toISOString().slice(0, 10), value })
  }
  return points
}

const analytics: AdminAnalytics = {
  userGrowth: buildSeries(4200, 40),
  moods: buildSeries(6, 1.5),
  aiUsage: buildSeries(300, 60),
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
  getDashboard(): AdminDashboardMetrics {
    return dashboardMetrics
  },
  getBroadcastHistory(): AdminBroadcastHistoryItem[] {
    return broadcastHistory
  },
  getAnalytics(): AdminAnalytics {
    return analytics
  },
  getExportCsv(): Blob {
    const rows = Object.entries(dashboardMetrics).map(([key, value]) => `${key},${value}`)
    return new Blob([`metric,value\n${rows.join('\n')}\n`], { type: 'text/csv' })
  },
}
