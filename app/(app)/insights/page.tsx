'use client'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getInsights, getStreak } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/keys'
import type { InsightPoint } from '@/lib/api/types'
import { parseInsightDate } from '@/lib/insight-dates'
import { TerrainChart } from '@/components/charts/terrain-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

function formatDay(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Point dates arrive as "Aug 6" and unparseable strings are dropped from the summary. */
function subLineFor(points: InsightPoint[]) {
  const dates = points
    .map(p => parseInsightDate(p.date))
    .filter((d): d is Date => d !== null)
  const count = dates.length
  if (count === 0) return 'No check-ins logged yet.'
  const first = dates[0]!
  const last = dates[dates.length - 1]!
  const range = first.getTime() === last.getTime()
    ? formatDay(first)
    : `${formatDay(first)} to ${formatDay(last)}`
  return `${range} · ${count} check-in${count === 1 ? '' : 's'}`
}

function LeafGhost() {
  return (
    <svg className="pointer-events-none absolute -right-5 -top-4 h-24 w-24 opacity-[.08]"
      viewBox="0 0 100 100" fill="none" aria-hidden>
      <path d="M50 96 C 46 70 46 40 50 8" stroke="#F4F1E7" strokeWidth="3" />
      <path d="M50 55 C 30 52 18 38 20 20 C 40 24 50 38 50 55 Z" fill="#F4F1E7" />
      <path d="M50 70 C 68 66 80 52 78 36 C 60 40 50 54 50 70 Z" fill="#F4F1E7" />
    </svg>
  )
}

function InsightNote({ text }: { text: string }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-fir-deep px-5 py-5 text-oat">
      <LeafGhost />
      <p className="relative font-display text-[16.5px] leading-snug">{text}</p>
      <p className="relative mt-3 text-[11.5px] opacity-60">Written from your recent check-ins</p>
    </div>
  )
}

function StreakCard({ streak }: { streak: number | undefined }) {
  return (
    <div className="rounded-[22px] bg-card px-5 py-4">
      <p className="text-[12.5px] opacity-60">Current streak</p>
      <p className="font-display text-3xl font-bold leading-tight">{streak ?? 0}</p>
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="px-5 py-6 lg:px-6">
      <Skeleton lines={6} />
    </div>
  )
}

export default function InsightsPage() {
  const router = useRouter()
  const insights = useQuery({ queryKey: qk.insights, queryFn: getInsights })
  const streak = useQuery({ queryKey: qk.streak, queryFn: getStreak })

  if (insights.isError) {
    return (
      <div className="px-5 py-10 lg:px-6">
        <ErrorState error={insights.error} retry={() => void insights.refetch()} />
      </div>
    )
  }
  if (insights.isLoading || !insights.data) return <InsightsSkeleton />

  const points = insights.data.weeklyTrends
  const enough = points.length >= 2

  return (
    <div className="px-5 pb-10 pt-6 lg:px-6">
      <h1 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.02em]">
        Your week, as ground.
      </h1>
      <p className="mt-1 text-[13px] opacity-60">{subLineFor(points)}</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
        {enough ? (
          <div className="rounded-[22px] bg-card px-5 py-5">
            <TerrainChart points={points} />
          </div>
        ) : (
          <EmptyState
            title="Not enough ground yet."
            body="Two check-ins is all it takes to draw your first line."
            action={
              <Button type="button" onClick={() => router.push('/checkin')} className="mt-2">
                Log a check-in
              </Button>
            }
          />
        )}

        <div className="space-y-4">
          {insights.data.personalInsight ? <InsightNote text={insights.data.personalInsight} /> : null}
          <StreakCard streak={streak.data} />
        </div>
      </div>
    </div>
  )
}
