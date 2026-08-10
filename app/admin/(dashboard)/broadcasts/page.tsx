'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdminBroadcastHistory, sendAdminBroadcast } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { errorMessage } from '@/lib/api/errors'
import type { AdminBroadcastPayload, AdminNotificationDashboardResponse } from '@/lib/api/admin/types'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

const SUMMARY_LABELS: { key: keyof Omit<AdminNotificationDashboardResponse, 'notifications'>; label: string }[] = [
  { key: 'totalSent', label: 'Total sent' },
  { key: 'toAllUsers', label: 'To all users' },
  { key: 'reEngagement', label: 'Re-engagement' },
]

const SEGMENT_OPTIONS: { value: AdminBroadcastPayload['segment']; label: string }[] = [
  { value: 'ALL_USERS', label: 'All users' },
  { value: 'RE_ENGAGEMENT', label: 'Re-engagement' },
  { value: 'SYSTEM_MAINTENANCE', label: 'System maintenance' },
]

const EMPTY_FORM: AdminBroadcastPayload = { title: '', message: '', segment: 'ALL_USERS' }

// text-marigold/-deep both fail a 3:1 contrast check against a light card surface (marigold is an
// inherently light hue) - text-fir-deep is the established fallback used elsewhere in this codebase
// (see the TYPE_BADGE map on the Emergency Resources page) for text sitting on a marigold badge.
const SEGMENT_BADGE: Record<string, { label: string; className: string }> = {
  ALL_USERS: { label: 'All users', className: 'bg-fir/15 text-fir' },
  RE_ENGAGEMENT: { label: 'Re-engagement', className: 'bg-leaf/15 text-leaf' },
  SYSTEM_MAINTENANCE: { label: 'System maintenance', className: 'bg-marigold/15 text-fir-deep' },
}

function segmentBadge(segment: string): { label: string; className: string } {
  return SEGMENT_BADGE[segment] ?? { label: segment, className: 'bg-fir/10 text-fir' }
}

// Local copy of Dashboard's own `formatSentAt` (app/admin/(dashboard)/dashboard/page.tsx) - each
// admin page owns its own small formatter rather than importing one from a sibling route's
// page.tsx (see e.g. the Users page's own date handling), so this route's bundle never couples to
// Dashboard's unrelated module (its CSV-export mutation, etc.).
function formatSentAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const TITLE_MAX_LENGTH = 120
const MESSAGE_MAX_LENGTH = 500

function ComposeForm() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<AdminBroadcastPayload>(EMPTY_FORM)
  // Only meaningful when form.segment === 'ALL_USERS': gates the irreversible full-broadcast send
  // behind one extra confirm click, mirroring StatusAction's suspend/reactivate confirm in
  // components/admin/user-manage-sheet.tsx and DeleteAction's delete confirm on the Emergency
  // Resources page.
  const [confirming, setConfirming] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      sendAdminBroadcast({ ...form, title: form.title.trim(), message: form.message.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.broadcastHistory })
      setForm(EMPTY_FORM)
      setConfirming(false)
    },
  })

  const valid = form.title.trim() !== '' && form.message.trim() !== ''

  // A send actually in flight owns the mutation until it resolves - resetting here would detach
  // from it (TanStack Query v5 `reset()` behavior), silently dropping its onSuccess/onError and
  // re-enabling Send while the first request is still outstanding. Only reset once it's idle.
  const resetMutationIfIdle = () => { if (!mutation.isPending) mutation.reset() }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        if (!valid || mutation.isPending) return
        if (form.segment === 'ALL_USERS' && !confirming) { setConfirming(true); return }
        mutation.mutate()
      }}
      className="flex flex-col gap-4 rounded-2xl bg-card px-4 py-4"
    >
      <p className="text-sm font-semibold opacity-70">Compose broadcast</p>
      {mutation.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(mutation.error)}</p> : null}
      {mutation.isSuccess ? (
        <p role="status" className="text-sm text-leaf">
          Broadcast queued for delivery. It may take a moment to appear below.
        </p>
      ) : null}
      <Field
        label="Title"
        required
        maxLength={TITLE_MAX_LENGTH}
        value={form.title}
        onChange={e => { setForm(f => ({ ...f, title: e.target.value })); resetMutationIfIdle() }}
      />
      <label className="block">
        <span className="block text-sm font-medium mb-1.5">Message</span>
        <textarea
          required
          rows={4}
          maxLength={MESSAGE_MAX_LENGTH}
          value={form.message}
          onChange={e => { setForm(f => ({ ...f, message: e.target.value })); resetMutationIfIdle() }}
          className="w-full rounded-xl border-[1.5px] border-fir/30 bg-card px-4 py-3 text-[15px]
            outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/25"
        />
      </label>
      <div>
        <p id="segment-label" className="mb-2 text-sm font-semibold opacity-70">Segment</p>
        <div role="group" aria-labelledby="segment-label" className="flex flex-wrap gap-2">
          {SEGMENT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={form.segment === opt.value}
              onClick={() => {
                setForm(f => ({ ...f, segment: opt.value }))
                resetMutationIfIdle()
                setConfirming(false)
              }}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                form.segment === opt.value ? 'bg-fir text-oat' : 'bg-oat'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {confirming ? (
        <div className="flex gap-2">
          <Button type="submit" variant="destructive" busy={mutation.isPending} disabled={!valid}>
            Confirm send to all users
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => { resetMutationIfIdle(); setConfirming(false) }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="submit" busy={mutation.isPending} disabled={!valid}>
          Send broadcast
        </Button>
      )}
    </form>
  )
}

export default function AdminBroadcastsPage() {
  const broadcasts = useQuery({ queryKey: adminQk.broadcastHistory, queryFn: getAdminBroadcastHistory })
  const data = broadcasts.data
  const loading = broadcasts.isLoading || !data
  // Most-recent-first, so a broadcast an admin just sent (the one visible confirmation a
  // fire-and-forget send worked) lands at the top instead of the unsorted bottom.
  const sortedNotifications = data
    ? [...data.notifications].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    : []

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Broadcasts</h1>

      {broadcasts.isError ? (
        <ErrorState error={broadcasts.error} retry={() => void broadcasts.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SUMMARY_LABELS.map(m => (
            <div key={m.key} className="rounded-2xl bg-card px-4 py-3.5">
              {loading ? (
                <Skeleton lines={2} />
              ) : (
                <>
                  <p className="text-xs opacity-60">{m.label}</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{data[m.key].toLocaleString()}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        <ComposeForm />

        {broadcasts.isError ? null : (
          <div>
            <p className="mb-2 text-sm font-semibold opacity-70">Broadcast history</p>
            {loading ? (
              <div className="rounded-2xl bg-card px-4 py-3.5">
                <Skeleton lines={5} />
              </div>
            ) : sortedNotifications.length === 0 ? (
              <div className="rounded-2xl bg-card px-4 py-6 text-center text-sm opacity-55">
                No broadcasts sent yet.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-fir/10 rounded-2xl bg-card px-4">
                {sortedNotifications.map(b => {
                  const badge = segmentBadge(b.segment)
                  return (
                    <div
                      key={b.formattedId}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[14px] font-medium">{b.title}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="truncate text-xs opacity-55">{b.message}</p>
                      </div>
                      <span className="flex-none text-xs opacity-50">{formatSentAt(b.sentAt)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
