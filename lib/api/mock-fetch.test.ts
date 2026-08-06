import { describe, it, expect } from 'vitest'
import { mockFetch } from './mock-fetch'

describe('mockFetch', () => {
  it('returns a token for login regardless of credentials', async () => {
    const r = await mockFetch<{ accessToken: string }>('/api/v1/auth/user-login', {
      method: 'POST', body: { username: 'anyone@example.com', password: 'whatever' },
    })
    expect(r.accessToken).toBe('mock-access-token')
  })

  it('returns dashboard data with a streak and a greeting', async () => {
    const r = await mockFetch<{ greeting: string; currentStreak: number }>('/api/v1/dashboard/home')
    expect(r.greeting).toMatch(/^Good \w+, \w+\.$/)
    expect(r.currentStreak).toBeGreaterThan(0)
  })

  it('logging a mood increases the streak on the next read', async () => {
    const before = await mockFetch<number>('/api/v1/mood/streak')
    await mockFetch('/api/v1/mood/log', {
      method: 'POST',
      body: { primaryMood: 'Calm', moodIntensity: 5, stressLevel: 5, energyLevel: 5 },
    })
    const after = await mockFetch<number>('/api/v1/mood/streak')
    expect(after).toBe(before + 1)
  })

  it('creates, updates, and deletes a journal entry', async () => {
    const created = await mockFetch<{ journalId: number; title: string }>('/api/v1/journal/entry', {
      method: 'POST', body: { title: 'Test entry', content: 'Body' },
    })
    expect(created.title).toBe('Test entry')

    const updated = await mockFetch<{ title: string }>(`/api/v1/journal/update-journal/${created.journalId}`, {
      method: 'PUT', body: { title: 'Updated', content: 'New body' },
    })
    expect(updated.title).toBe('Updated')

    const history = await mockFetch<Array<{ journalId: number }>>('/api/v1/journal/history')
    expect(history.some(e => e.journalId === created.journalId)).toBe(true)

    await mockFetch(`/api/v1/journal/delete-journal/${created.journalId}`, { method: 'DELETE' })
    const afterDelete = await mockFetch<Array<{ journalId: number }>>('/api/v1/journal/history')
    expect(afterDelete.some(e => e.journalId === created.journalId)).toBe(false)
  })

  it('sending a chat message appends it and returns an assistant reply', async () => {
    const before = await mockFetch<Array<{ content: string }>>('/api/v1/users/chat/history')
    const r = await mockFetch<{ reply: string }>('/api/v1/users/chat', {
      method: 'POST', body: { message: 'Testing mock chat' },
    })
    expect(r.reply.length).toBeGreaterThan(0)
    const after = await mockFetch<Array<{ content: string }>>('/api/v1/users/chat/history')
    expect(after.length).toBe(before.length + 2)
    expect(after.some(m => m.content === 'Testing mock chat')).toBe(true)
  })

  it('marks a notification as read', async () => {
    const list = await mockFetch<Array<{ id: number; read: boolean }>>('/api/v1/users/notifications')
    const unread = list.find(n => !n.read)!
    await mockFetch(`/api/v1/users/notifications/${unread.id}/read`, { method: 'PATCH' })
    const after = await mockFetch<Array<{ id: number; read: boolean }>>('/api/v1/users/notifications')
    expect(after.find(n => n.id === unread.id)?.read).toBe(true)
  })

  it('throws for an unmatched path so gaps are loud, not silent', async () => {
    await expect(mockFetch('/api/v1/does-not-exist')).rejects.toThrow(/no mock handler/)
  })
})
