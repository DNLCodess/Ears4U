import type {
  UserProfile, DashboardHome, MoodEntry, MoodLogPayload, InsightPoint, Insights,
  JournalEntry, JournalPayload, ChatMessage, NotificationItem, NotificationSettings,
  EmergencyResource,
} from './types'

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function isoAt(daysOffset: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  d.setHours(hour, minute, 0, 0)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

function now(): string {
  const d = new Date()
  return isoAt(0, d.getHours(), d.getMinutes())
}

const MOOD_CYCLE = [
  { mood: 'Calm', intensity: 4, stress: 3, energy: 6 },
  { mood: 'Hopeful', intensity: 6, stress: 4, energy: 7 },
  { mood: 'Restless', intensity: 7, stress: 6, energy: 4 },
  { mood: 'Drained', intensity: 5, stress: 7, energy: 2 },
  { mood: 'Fine, actually', intensity: 5, stress: 4, energy: 5 },
  { mood: 'Hopeful', intensity: 7, stress: 3, energy: 7 },
  { mood: 'Heavy', intensity: 6, stress: 6, energy: 3 },
]

let nextMoodId = 100
const moodEntries: MoodEntry[] = MOOD_CYCLE.map((m, i) => ({
  id: nextMoodId++,
  primaryMood: m.mood,
  moodIntensity: m.intensity,
  stressLevel: m.stress,
  energyLevel: m.energy,
  createdAt: isoAt(-(MOOD_CYCLE.length - i), 9, 15),
}))

let currentStreak = 12
let loggedToday = false

let profile: UserProfile = {
  userId: 1,
  name: 'Dami Okonkwo',
  email: 'dami@example.com',
  gender: 'Prefer not to say',
  country: 'Nigeria',
  dateOfBirth: '1998-04-12',
  generation: 'Gen-Z',
  maritalStatus: 'Single',
  employmentStatus: 'Employed',
  role: 'User',
  createdAt: isoAt(-140, 10, 0),
}

const AFFIRMATIONS = [
  "Rough days still count. You showed up, and that's the whole assignment.",
  "You don't have to feel ready. Today only asks you to begin.",
  "Whatever it is, you're allowed to name it before you fix it.",
  'Small and steady beats loud and gone. Keep showing up for yourself.',
]

function greetingFor(): string {
  const hour = new Date().getHours()
  const name = profile.name.split(' ')[0] ?? 'there'
  const part = hour < 5 ? 'evening' : hour < 11 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  return `Good ${part}, ${name}.`
}

let journalEntries: JournalEntry[] = [
  {
    journalId: 1,
    title: 'Giving myself credit',
    content: 'I did the thing I was scared of today and nothing bad happened. Writing this down so future me remembers that fear was lying.',
    createdAt: isoAt(-2, 21, 10),
    updatedAt: isoAt(-2, 21, 10),
  },
  {
    journalId: 2,
    title: 'Untitled',
    content: "Long day. Writing helps though, even when I don't know what I'm trying to say yet.",
    createdAt: isoAt(-5, 22, 40),
    updatedAt: isoAt(-5, 22, 40),
  },
  {
    journalId: 3,
    title: 'A good kind of tired',
    content: 'Finished the thing. Body is exhausted but the part of my brain that worries is finally quiet.',
    createdAt: isoAt(-9, 20, 5),
    updatedAt: isoAt(-9, 20, 5),
  },
]
let nextJournalId = 4

const chatHistory: ChatMessage[] = [
  { role: 'User', content: 'I keep replaying the interview. I know I messed it up.', timestamp: isoAt(-1, 19, 2) },
  { role: 'Assistant', content: "That sounds exhausting, running it back over and over. What's the moment your mind keeps snagging on?", timestamp: isoAt(-1, 19, 3) },
  { role: 'User', content: 'Probably when I went blank on the second question.', timestamp: isoAt(-1, 19, 6) },
  { role: 'Assistant', content: "Going blank happens to almost everyone under pressure, it's not proof you weren't prepared. What would you tell a friend who told you this exact story?", timestamp: isoAt(-1, 19, 7) },
]

const REPLIES = [
  'That makes sense. What do you think is underneath that feeling?',
  "Thank you for telling me that. You don't have to have it figured out right now.",
  "That sounds like a lot to carry today. What's one small thing that would help in the next hour?",
  "I'm listening. Keep going, whatever comes next.",
]
let replyIndex = 0

const notifications: NotificationItem[] = [
  { id: 1, title: 'Your weekly insight is ready', message: 'See how your week looked, mood, energy and stress together.', actionUrl: '/insights', read: false, createdAt: isoAt(0, 8, 0) },
  { id: 2, title: 'Reminder: check in today', message: "You haven't logged how today feels yet.", actionUrl: '/checkin', read: false, createdAt: isoAt(0, 9, 30) },
  { id: 3, title: 'New affirmation waiting for you', message: 'A fresh line to hold onto today.', actionUrl: '/home', read: true, createdAt: isoAt(-1, 8, 0) },
  { id: 4, title: 'Emergency resources updated', message: 'Hotlines and clinics for your country were refreshed.', actionUrl: '/you', read: true, createdAt: isoAt(-3, 12, 0) },
]

let notificationSettings: NotificationSettings = {
  pushNotifications: true,
  emailNotifications: false,
  moodReminders: true,
  moodReminderTime: '09:00',
  journalReminders: true,
  therapySessionReminders: false,
  communityActivity: true,
}

const emergencyResources: EmergencyResource[] = [
  { id: 1, name: 'Nigeria Suicide Prevention Initiative', country: 'Nigeria', resourceType: 'HOTLINE', contactInfo: '+234 806 210 6493', active: true },
  { id: 2, name: 'Lagos Crisis and Mental Health Clinic', country: 'Nigeria', resourceType: 'CLINIC', contactInfo: '14 Awolowo Road, Ikoyi, Lagos', active: true },
  { id: 3, name: 'Mentally Aware Nigeria Initiative', country: 'Nigeria', resourceType: 'WEBSITE', contactInfo: 'https://mentallyaware.org', active: true },
]

function recomputeWeeklyTrends(): InsightPoint[] {
  return moodEntries.slice(-7).map(e => ({
    date: e.createdAt.slice(0, 10),
    mood: e.moodIntensity,
    stress: e.stressLevel,
    energy: e.energyLevel,
  }))
}

export const mockStore = {
  getProfile: (): UserProfile => profile,
  updateProfile: (p: Partial<UserProfile>): UserProfile => {
    profile = { ...profile, ...p }
    return profile
  },

  getDashboard: (): DashboardHome => ({
    greeting: greetingFor(),
    dailyAffirmation: AFFIRMATIONS[new Date().getDate() % AFFIRMATIONS.length]!,
    currentStreak,
    loggedToday,
    latestMood: moodEntries[moodEntries.length - 1] ?? null,
  }),

  logMood: (p: MoodLogPayload): MoodEntry => {
    const entry: MoodEntry = { id: nextMoodId++, ...p, createdAt: now() }
    moodEntries.push(entry)
    currentStreak += 1
    loggedToday = true
    return entry
  },

  getInsights: (): Insights => ({
    weeklyTrends: recomputeWeeklyTrends(),
    personalInsight: 'Your best days follow a check-in before noon. Midweek energy dips are your pattern, not your fault.',
  }),

  getStreak: (): number => currentStreak,

  getJournalHistory: (): JournalEntry[] =>
    [...journalEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  getJournal: (id: number): JournalEntry | null =>
    journalEntries.find(e => e.journalId === id) ?? null,
  createJournal: (p: JournalPayload): JournalEntry => {
    const timestamp = now()
    const entry: JournalEntry = { journalId: nextJournalId++, title: p.title, content: p.content, createdAt: timestamp, updatedAt: timestamp }
    journalEntries.push(entry)
    return entry
  },
  updateJournal: (id: number, p: JournalPayload): JournalEntry | null => {
    const entry = journalEntries.find(e => e.journalId === id)
    if (!entry) return null
    entry.title = p.title
    entry.content = p.content
    entry.updatedAt = now()
    return entry
  },
  deleteJournal: (id: number): void => {
    journalEntries = journalEntries.filter(e => e.journalId !== id)
  },

  getChatHistory: (): ChatMessage[] => [...chatHistory],
  sendChat: (message: string): { reply: string } => {
    chatHistory.push({ role: 'User', content: message, timestamp: now() })
    const reply = REPLIES[replyIndex % REPLIES.length]!
    replyIndex += 1
    chatHistory.push({ role: 'Assistant', content: reply, timestamp: now() })
    return { reply }
  },

  getNotifications: (): NotificationItem[] =>
    [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  getUnreadCount: (): { count: number } => ({ count: notifications.filter(n => !n.read).length }),
  markNotificationRead: (id: number): void => {
    const n = notifications.find(item => item.id === id)
    if (n) n.read = true
  },
  getNotificationSettings: (): NotificationSettings => notificationSettings,
  updateNotificationSettings: (s: NotificationSettings): void => {
    notificationSettings = s
  },

  getEmergencyResources: (): EmergencyResource[] => emergencyResources,
}
