'use client'
import { useQuery } from '@tanstack/react-query'
import { getAdminAnalytics } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { TimeSeriesChart } from '@/components/admin/time-series-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'

export function bounds(points: { value: number }[]): [number, number] {
  if (points.length === 0) return [0, 1]
  const values = points.map(p => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return [min - 1, max + 1]
  const pad = (max - min) * 0.05
  return [min - pad, max + pad]
}

export default function AdminAnalyticsPage() {
  const analytics = useQuery({ queryKey: adminQk.analytics, queryFn: getAdminAnalytics })

  if (analytics.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold">Analytics</h1>
        <ErrorState error={analytics.error} retry={() => void analytics.refetch()} />
      </div>
    )
  }
  if (analytics.isLoading || !analytics.data) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold">Analytics</h1>
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-2xl bg-card px-5 py-4">
            <Skeleton lines={4} />
          </div>
        ))}
      </div>
    )
  }

  const { userGrowth = [], moods = [], aiUsage = [] } = analytics.data
  const [growthMin, growthMax] = bounds(userGrowth)
  const [moodMin, moodMax] = bounds(moods)
  const [usageMin, usageMax] = bounds(aiUsage)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold">Analytics</h1>
      <p className="max-w-lg text-sm opacity-60">Last 30 days.</p>
      <TimeSeriesChart title="User growth" points={userGrowth} min={growthMin} max={growthMax} color="#2E7D49" />
      <TimeSeriesChart title="Moods" points={moods} min={moodMin} max={moodMax} color="#D99B21" />
      <TimeSeriesChart title="AI usage" points={aiUsage} min={usageMin} max={usageMax} color="#D9822B" />
    </div>
  )
}
