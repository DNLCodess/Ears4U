// app/(app)/home/page.test.tsx
import { describe, it, expect } from 'vitest'
import { subLineFor } from './page'

describe('subLineFor', () => {
  it('invites a first check-in when there is no mood history', () => {
    expect(subLineFor(null, false)).toMatch(/quiet place/i)
  })
  it('acknowledges an already-logged today without pressure to act again', () => {
    expect(subLineFor({ id: 1, primaryMood: 'Hopeful', moodIntensity: 6, stressLevel: 3, energyLevel: 7, createdAt: '' }, true))
      .toMatch(/here for it|come back/i)
  })
  it('never claims a specific day for a past check-in', () => {
    const text = subLineFor(
      { id: 1, primaryMood: 'Restless', moodIntensity: 7, stressLevel: 6, energyLevel: 4, createdAt: '' }, false
    )
    expect(text.toLowerCase()).not.toMatch(/\byesterday\b/)
  })

  it('never mentions watering, tending, or the garden', () => {
    const withMood = subLineFor(
      { id: 1, primaryMood: 'Restless', moodIntensity: 7, stressLevel: 6, energyLevel: 4, createdAt: '' }, false
    )
    const withoutMood = subLineFor(null, false)
    for (const text of [withMood, withoutMood]) {
      expect(text.toLowerCase()).not.toMatch(/water|tend|garden/)
    }
  })
})
