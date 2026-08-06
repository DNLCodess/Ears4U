export type SkyState = 'morning' | 'day' | 'evening' | 'night'

export function skyStateFor(hour: number): SkyState {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'day'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}
