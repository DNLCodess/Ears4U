'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getJournalHistory } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/keys'
import type { JournalEntry } from '@/lib/api/types'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** createdAt is a zone-less Java LocalDateTime, so it is read as local time. */
function groupLabel(createdAt: string, now: Date): string {
  const at = new Date(createdAt)
  if (Number.isNaN(at.getTime())) return 'Earlier'

  const day = new Date(at)
  day.setHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dayKey(day) === dayKey(today)) return 'Today'
  if (dayKey(day) === dayKey(yesterday)) return 'Yesterday'
  return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function firstLine(content: string): string {
  const line = content.split('\n').find(l => l.trim().length > 0)
  return line ? line.trim() : ''
}

function Row({ entry }: { entry: JournalEntry }) {
  const hasTitle = entry.title.trim().length > 0
  return (
    <Link
      href={`/journal/${entry.journalId}`}
      className="mb-3 block break-inside-avoid rounded-2xl bg-card px-5 py-4
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
    >
      <p className={`font-display text-base font-semibold ${hasTitle ? '' : 'opacity-60'}`}>
        {hasTitle ? entry.title : 'Untitled'}
      </p>
      <p className="mt-1 truncate text-sm opacity-70">{firstLine(entry.content)}</p>
    </Link>
  )
}

function JournalSkeleton() {
  return (
    <div className="px-5 py-6 lg:px-6">
      <div className="mx-auto max-w-3xl space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-card px-5 py-4">
            <Skeleton lines={2} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function JournalPage() {
  const router = useRouter()
  const journal = useQuery({ queryKey: qk.journal, queryFn: getJournalHistory })

  if (journal.isError) {
    return (
      <div className="px-5 py-10 lg:px-6">
        <div className="mx-auto max-w-3xl">
          <ErrorState error={journal.error} retry={() => void journal.refetch()} />
        </div>
      </div>
    )
  }
  if (journal.isLoading || !journal.data) return <JournalSkeleton />

  const now = new Date()
  const sorted = [...journal.data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const groups: { label: string; entries: JournalEntry[] }[] = []
  for (const entry of sorted) {
    const label = groupLabel(entry.createdAt, now)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.entries.push(entry)
    else groups.push({ label, entries: [entry] })
  }

  return (
    <div className="px-5 pb-10 pt-6 lg:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em]">Journal</h1>
          {sorted.length > 0 ? (
            <Button type="button" onClick={() => router.push('/journal/new')}>Write something</Button>
          ) : null}
        </div>

        {sorted.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Nothing planted yet."
              body="Write the first thing that comes. No structure needed."
              action={
                <Button type="button" onClick={() => router.push('/journal/new')} className="mt-2">
                  Write something
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 lg:columns-2 lg:gap-5">
            {groups.map(group => (
              <div key={`${group.label}-${group.entries[0]?.journalId}`} className="mb-2">
                <p className="mb-2 text-[12.5px] font-semibold opacity-55">{group.label}</p>
                {group.entries.map(entry => (
                  <Row key={entry.journalId} entry={entry} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
