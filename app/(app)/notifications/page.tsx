'use client'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getNotifications, markNotificationRead } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/keys'
import type { NotificationItem } from '@/lib/api/types'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'

function relativeTime(createdAt: string, now: Date): string {
  const at = new Date(createdAt)
  if (Number.isNaN(at.getTime())) return ''
  const diffMin = Math.round((now.getTime() - at.getTime()) / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Row({ n, now, onTap }: { n: NotificationItem; now: Date; onTap: (n: NotificationItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onTap(n)}
      className={`flex w-full items-start gap-3 rounded-2xl px-5 py-4 text-left transition
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir
        ${n.read ? 'opacity-75' : 'bg-card'}`}
    >
      <span className="mt-1.5 h-2 w-2 flex-none rounded-full" aria-hidden>
        {!n.read ? <span className="block h-2 w-2 rounded-full bg-marigold" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-semibold">{n.title}</span>
          <span className="flex-none text-[11.5px] opacity-55">{relativeTime(n.createdAt, now)}</span>
        </span>
        <span className="mt-0.5 block text-[13.5px] opacity-75">{n.message}</span>
      </span>
    </button>
  )
}

function NotificationsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 px-5 py-6 lg:px-6">
      <Skeleton lines={2} />
      <Skeleton lines={2} />
      <Skeleton lines={2} />
    </div>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const notifications = useQuery({
    queryKey: qk.notifications,
    queryFn: async () => {
      const raw = await getNotifications()
      // NotificationController's DTO may serialize the read flag as `read` or
      // `isRead` depending on Lombok's boolean-getter naming. Normalized once
      // here so the rest of the page can trust `.read`.
      return raw.map(n => {
        const loose = n as unknown as { read?: boolean; isRead?: boolean }
        return { ...n, read: loose.read ?? loose.isRead ?? false }
      })
    },
  })

  const markRead = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: qk.notifications })
      const previous = queryClient.getQueryData<NotificationItem[]>(qk.notifications)
      queryClient.setQueryData<NotificationItem[]>(qk.notifications, old =>
        old ? old.map(n => (n.id === id ? { ...n, read: true } : n)) : old
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(qk.notifications, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications })
      void queryClient.invalidateQueries({ queryKey: qk.unread })
    },
  })

  function handleTap(n: NotificationItem) {
    if (!n.read) markRead.mutate(n.id)
    if (n.actionUrl && n.actionUrl.startsWith('/')) router.push(n.actionUrl)
  }

  if (notifications.isError) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 lg:px-6">
        <ErrorState error={notifications.error} retry={() => void notifications.refetch()} />
      </div>
    )
  }
  if (notifications.isLoading || !notifications.data) return <NotificationsSkeleton />

  const now = new Date()
  const items = notifications.data

  return (
    <div className="mx-auto max-w-2xl px-5 pb-10 pt-6 lg:px-6">
      <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em]">Notifications</h1>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="All quiet." body="When something needs you, it lands here." />
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {items.map(n => (
            <Row key={n.id} n={n} now={now} onTap={handleTap} />
          ))}
        </div>
      )}
    </div>
  )
}
