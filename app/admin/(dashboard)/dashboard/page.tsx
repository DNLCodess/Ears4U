'use client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getAdminDashboard, getAdminBroadcastHistory, downloadAdminDashboardExport } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import type { AdminDashboardMetrics } from '@/lib/api/admin/types'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/errors'

const METRIC_LABELS: { key: keyof AdminDashboardMetrics; label: string }[] = [
  { key: 'totalUsers', label: 'Total users' },
  { key: 'activeUsers', label: 'Active users' },
  { key: 'newSignups', label: 'New signups' },
  { key: 'checkInsLogged', label: 'Check-ins logged' },
  { key: 'emergencyResourceViews', label: 'Emergency resource views' },
  { key: 'suspendedAccounts', label: 'Suspended accounts' },
]

export function formatSentAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function AdminDashboardPage() {
  const dashboard = useQuery({ queryKey: adminQk.dashboard, queryFn: getAdminDashboard })
  const broadcasts = useQuery({ queryKey: adminQk.broadcastHistory, queryFn: getAdminBroadcastHistory })
  const exportCsv = useMutation({
    mutationFn: downloadAdminDashboardExport,
    onSuccess: blob => triggerDownload(blob, 'platform-metrics.csv'),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <Button type="button" variant="ghost" busy={exportCsv.isPending} onClick={() => exportCsv.mutate()}>
          Export CSV
        </Button>
      </div>
      {exportCsv.isError ? (
        <p role="alert" className="text-sm text-clay">
          {exportCsv.error instanceof ApiError ? exportCsv.error.friendly : 'Something went wrong. Try again.'}
        </p>
      ) : null}

      {dashboard.isError ? (
        <ErrorState error={dashboard.error} retry={() => void dashboard.refetch()} />
      ) : dashboard.isLoading || !dashboard.data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {METRIC_LABELS.map(m => (
            <div key={m.key} className="rounded-2xl bg-card px-4 py-3.5">
              <Skeleton lines={2} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {METRIC_LABELS.map(m => {
            const raw = dashboard.data![m.key]
            const display = typeof raw === 'number' ? raw.toLocaleString() : '0'
            return (
              <div key={m.key} className="rounded-2xl bg-card px-4 py-3.5">
                <p className="text-xs opacity-60">{m.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{display}</p>
              </div>
            )
          })}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold opacity-70">Recent broadcasts</p>
        {broadcasts.isError ? (
          <ErrorState error={broadcasts.error} retry={() => void broadcasts.refetch()} />
        ) : broadcasts.isLoading || !broadcasts.data ? (
          <div className="rounded-2xl bg-card px-4 py-3.5">
            <Skeleton lines={3} />
          </div>
        ) : broadcasts.data.length === 0 ? (
          <div className="rounded-2xl bg-card px-4 py-6 text-center text-sm opacity-55">
            No broadcasts sent yet.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-fir/10 rounded-2xl bg-card px-4">
            {broadcasts.data.map(b => (
              <div key={b.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px]">{b.message}</p>
                  <p className="text-xs opacity-55">{b.segment}</p>
                </div>
                <span className="flex-none text-xs opacity-50">{formatSentAt(b.sentAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
