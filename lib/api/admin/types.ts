export interface AdminProfile {
  adminName: string
  adminEmail: string
  role: string
  createdAt: string | null
}
export interface AdminRegisterPayload {
  adminName: string
  adminEmail: string
  adminPassword: string
}
export type UpdateAdminProfilePayload = Pick<AdminProfile, 'adminName'>
// Backend DashboardMetricsDTO (GET /api/v1/admins/dashboard). The real DTO also carries
// userGrowth/moodStatistics/aiUsageStatistics/journalStatistics chart series, but those are not
// consumed here since the Analytics page already covers the same data via a separate endpoint
// (getAdminAnalytics) - only the 5 scalar counters are needed on the Dashboard page.
export interface AdminDashboardMetrics {
  totalUsers: number
  activeUsers: number
  journalEntries: number
  moodLogs: number
  aiChats: number
}
// Backend NotificationItem (nested inside NotificationDashboardResponse).
export interface AdminBroadcastHistoryItem {
  formattedId: string
  title: string
  message: string
  segment: string
  sentAt: string
}
// Backend NotificationDashboardResponse (GET /api/v1/admins/dashboard/notifications) - the real
// endpoint returns this wrapper object, not a bare array of notifications.
export interface AdminNotificationDashboardResponse {
  totalSent: number
  toAllUsers: number
  reEngagement: number
  notifications: AdminBroadcastHistoryItem[]
}

// Backend TimeSeriesPoint/MoodPoint/AiUsagePoint (shared shapes used by both DashboardMetricsDTO
// and AdminAnalyticsResponse).
export interface AdminTimeSeriesPoint {
  date: string
  count: number
}
export interface AdminMoodPoint {
  mood: string
  count: number
}
export interface AdminAiUsagePoint {
  date: string
  requests: number
  successful: number
}
// Backend AdminAnalyticsResponse (GET /api/v1/admins/anaytics, misspelling preserved verbatim -
// see getAdminAnalytics). dailyActiveUsers and journalStatistics exist on the real response but
// are out of this phase's 3-chart scope (User growth, Moods, AI usage) - a future phase could
// surface them.
export interface AdminAnalyticsResponse {
  userGrowth: AdminTimeSeriesPoint[]
  dailyActiveUsers: AdminTimeSeriesPoint[]
  moodStatistics: AdminMoodPoint[]
  journalStatistics: AdminTimeSeriesPoint[]
  aiUsageStatistics: AdminAiUsagePoint[]
}

// Internal chart-facing shape - kept as { date, value } so TimeSeriesChart's existing prop
// contract (shared, tested code from Phase 2) doesn't need to change. getAdminAnalytics maps the
// real wire fields (count / mood / requests) onto date/value at the API boundary. For the Moods
// chart, "date" holds the mood category label, not an actual date - safe because timeSeriesPath
// (lib/charts/time-series.ts) only consumes an ordered numeric array and never parses this field
// as a Date; it is used purely as a first/last display label.
export interface AdminAnalyticsPoint {
  date: string
  value: number
}
export interface AdminAnalytics {
  userGrowth: AdminAnalyticsPoint[]
  moods: AdminAnalyticsPoint[]
  aiUsage: AdminAnalyticsPoint[]
}
export interface AdminUserSummary {
  id: number
  name: string
  email: string
  status: 'active' | 'suspended'
  joinedAt: string
}
export interface AdminUsersPage {
  users: AdminUserSummary[]
  page: number
  totalPages: number
}
export interface AdminAuditLogItem {
  id: number
  action: string
  actor: string
  createdAt: string
}
