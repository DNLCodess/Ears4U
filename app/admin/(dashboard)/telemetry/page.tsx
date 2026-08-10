'use client'
import { useQuery } from '@tanstack/react-query'
import { getAdminTelemetry } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import type { AdminTelemetry } from '@/lib/api/admin/types'
import { TimeSeriesChart } from '@/components/admin/time-series-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { bounds } from '@/app/admin/(dashboard)/analytics/page'

type MetricKey = 'totalRequests' | 'successfulRequests' | 'failedRequests' | 'averageLatencyMs'

const METRIC_CARDS: { key: MetricKey; label: string; format: (v: number) => string }[] = [
  { key: 'totalRequests', label: 'Total requests', format: n => n.toLocaleString() },
  { key: 'successfulRequests', label: 'Successful requests', format: n => n.toLocaleString() },
  { key: 'failedRequests', label: 'Failed requests', format: n => n.toLocaleString() },
  { key: 'averageLatencyMs', label: 'Average latency', format: n => `${n.toLocaleString()} ms` },
]

// OPERATIONAL is a genuine healthy state (leaf, matching the rest of the admin surface's
// "good/active" convention - see CLINIC's badge in emergency/page.tsx). OFFLINE is a real
// error/problem state, not a neutral content flag like Phase 4's "inactive" resource badge, so it
// deliberately uses clay here rather than following that phase's clay-avoidance precedent (see
// this task's brief and the design spec's Telemetry section for the explicit reasoning).
const STATUS_BADGE: Record<AdminTelemetry['providerStatus'], { label: string; className: string }> = {
  OPERATIONAL: { label: 'Operational', className: 'bg-leaf/15 text-leaf' },
  OFFLINE: { label: 'Offline', className: 'bg-clay/15 text-clay' },
}

export default function AdminTelemetryPage() {
  const telemetry = useQuery({ queryKey: adminQk.telemetry, queryFn: getAdminTelemetry })

  if (telemetry.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold">Telemetry</h1>
        <ErrorState error={telemetry.error} retry={() => void telemetry.refetch()} />
      </div>
    )
  }

  if (telemetry.isLoading || !telemetry.data) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold">Telemetry</h1>
        {/* GET /api/v1/admins/telemetry runs a real synchronous outbound health check to the AI
            provider on every call, so this can take materially longer than a normal admin GET (or
            fail outright if the provider is unreachable) - say so explicitly rather than showing a
            bare skeleton that looks identical to a fast call. */}
        <p className="text-sm opacity-60">Checking AI provider status…</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {METRIC_CARDS.map(m => (
            <div key={m.key} className="rounded-2xl bg-card px-4 py-3.5">
              <Skeleton lines={2} />
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-card px-5 py-4">
          <Skeleton lines={4} />
        </div>
      </div>
    )
  }

  const data = telemetry.data
  const badge = STATUS_BADGE[data.providerStatus]
  // Map the raw wire shape (date/totalRequests/successfulRequests/failedRequests per point) onto
  // TimeSeriesChart's { date, value } contract here at the page, not at the API boundary - unlike
  // getAdminAnalytics, getAdminTelemetry (Task 1) intentionally returns AdminTelemetry's
  // requestTimeline in its full raw shape so successfulRequests/failedRequests per point stay
  // available for a future view, mirroring the "pick the single most informative field, note the
  // others as available-but-unused" precedent from aiUsageStatistics. totalRequests is charted.
  const timelinePoints = data.requestTimeline.map(p => ({ date: p.date, value: p.totalRequests }))
  const [min, max] = bounds(timelinePoints)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Telemetry</h1>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {badge.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRIC_CARDS.map(m => (
          <div key={m.key} className="rounded-2xl bg-card px-4 py-3.5">
            <p className="text-xs opacity-60">{m.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{m.format(data[m.key])}</p>
          </div>
        ))}
      </div>
      <TimeSeriesChart title="Request timeline" points={timelinePoints} min={min} max={max} color="#D9822B" />
    </div>
  )
}
