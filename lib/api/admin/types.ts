export interface AdminProfile {
  id: number
  name: string
  email: string
  createdAt: string
}
export interface AdminRegisterPayload {
  name: string
  email: string
  password: string
}
export type UpdateAdminProfilePayload = Pick<AdminProfile, 'name'>
export interface AdminDashboardMetrics {
  totalUsers: number
  activeUsers: number
  newSignups: number
  checkInsLogged: number
  emergencyResourceViews: number
  suspendedAccounts: number
}
export interface AdminBroadcastHistoryItem {
  id: number
  message: string
  segment: string
  sentAt: string
}
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
