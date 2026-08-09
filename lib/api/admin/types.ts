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
