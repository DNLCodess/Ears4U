export interface UserProfile {
  userId: number; name: string; email: string; gender: string; country: string;
  dateOfBirth: string; generation: string; maritalStatus: string;
  employmentStatus: string; role: string; createdAt: string;
}
export interface MoodEntry {
  id: number; primaryMood: string; moodIntensity: number;
  stressLevel: number; energyLevel: number; createdAt: string;
}
export interface DashboardHome {
  greeting: string; dailyAffirmation: string; currentStreak: number;
  loggedToday: boolean; latestMood: MoodEntry | null;
}
export interface MoodLogPayload {
  primaryMood: string; moodIntensity: number; stressLevel: number; energyLevel: number;
}
export interface InsightPoint { date: string; mood: number; stress: number; energy: number }
export interface Insights { weeklyTrends: InsightPoint[]; personalInsight: string }
export interface JournalEntry {
  journalId: number; title: string; content: string; createdAt: string; updatedAt: string;
}
export interface JournalPayload { title: string; content: string }
export interface ChatMessage { content: string; role: string; timestamp: string }
export interface NotificationItem {
  id: number; title: string; message: string; actionUrl: string | null;
  read: boolean; createdAt: string;
}
export interface NotificationSettings {
  pushNotifications: boolean; emailNotifications: boolean; moodReminders: boolean;
  moodReminderTime: string; journalReminders: boolean;
  therapySessionReminders: boolean; communityActivity: boolean;
}
export interface EmergencyResource {
  id: number; name: string; country: string;
  resourceType: 'HOTLINE' | 'WEBSITE' | 'CLINIC'; contactInfo: string; active: boolean;
}
export interface RegisterPayload {
  name: string; gender: string; email: string; password: string;
  dateOfBirth: string; maritalStatus: string; employmentStatus: string; country: string;
}
export type UpdateProfilePayload = Partial<Omit<RegisterPayload, 'password'>>
