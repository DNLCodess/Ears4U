export const qk = {
  dashboard: ['dashboard'] as const,
  insights: ['insights'] as const,
  streak: ['streak'] as const,
  journal: ['journal'] as const,
  journalEntry: (id: number) => ['journal', id] as const,
  chat: ['chat'] as const,
  notifications: ['notifications'] as const,
  unread: ['unread'] as const,
  notificationSettings: ['notification-settings'] as const,
  profile: ['profile'] as const,
  resources: ['resources'] as const,
}
