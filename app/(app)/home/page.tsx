// app/(app)/home/page.tsx
'use client'
import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getDashboard, getInsights, getUnreadCount, getJournalHistory } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/keys'
import type { InsightPoint, JournalEntry, MoodEntry } from '@/lib/api/types'
import { greetingInitial } from '@/lib/greeting'
import { ListeningHero } from '@/components/listening/listening-hero'
import { TerrainChart } from '@/components/charts/terrain-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'

function sentenceCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

export function subLineFor(mood: MoodEntry | null, loggedToday: boolean): string {
  if (!mood) return "This is a quiet place to say how you're doing. Nothing you share here needs to be impressive."
  if (loggedToday) return `Already checked in today, feeling ${mood.primaryMood.toLowerCase()}. Come back anytime, I'm still listening.`
  return `Yesterday you said you were feeling ${sentenceCase(mood.primaryMood).toLowerCase()}. However today's landed, I'm here for it.`
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
      <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </svg>
  )
}

function TalkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className="h-[16px] w-[16px]" aria-hidden>
      <path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.4-.2-3.4-.6L3 21l1.8-4.2C3.7 15.4 3 13.8 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
    </svg>
  )
}

function TopBar({ unread, initial }: { unread: number; initial: string }) {
  return (
    <div className="absolute inset-x-0 top-0 z-[4] flex items-center justify-end gap-2.5 px-6 pt-5 lg:px-11">
      <Link
        href="/notifications"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-warm-cream/12 text-warm-cream
          backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold"
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center
            rounded-full bg-marigold px-1 text-[10px] font-bold text-fir-deep shadow">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Link>
      <Link
        href="/you"
        aria-label="Your profile"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-marigold text-[13px] font-semibold
          text-fir-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oat"
      >
        {initial}
      </Link>
    </div>
  )
}

function TalkCta() {
  return (
    <Link
      href="/chat"
      className="mt-4 inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full bg-white
        py-3 pl-4 pr-5 text-[13.5px] font-bold text-fir-deep shadow-[0_8px_20px_rgba(0,0,0,.28)]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oat"
    >
      <TalkIcon />
      Talk to me
    </Link>
  )
}

function AffirmationCard({ text }: { text: string }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-card px-[26px] pb-4 pt-[22px]
      shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_1px_0_rgba(34,55,43,.05),0_14px_32px_rgba(34,55,43,.08)]
      border border-fir/[.04]">
      <svg className="absolute right-4 top-3.5 h-8 w-[42px] opacity-[.09]" viewBox="0 0 46 34" fill="#2E7D49" aria-hidden>
        <path d="M0 34V21.5C0 9.6 6.5 1.9 17.5 0l2 5.5C13 7.3 9.5 12 9.5 18H19V34H0Z" />
        <path d="M27 34V21.5C27 9.6 33.5 1.9 44.5 0l2 5.5C40 7.3 36.5 12 36.5 18H46V34H27Z" />
      </svg>
      <p className="relative flex items-center gap-1.5 text-[11px] font-bold text-[#C98A1E]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round" className="h-3 w-3" aria-hidden>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
        Just for you, right now
      </p>
      <p className="relative mt-3 font-display text-lg font-medium leading-[1.35] tracking-[-0.01em]">{text}</p>
    </div>
  )
}

function CheckinSummary({ points, streak, mood }: { points: InsightPoint[]; streak: number; mood: MoodEntry | null }) {
  const levels = points.slice(-7)
  const label = mood
    ? `You've checked in ${streak} time${streak === 1 ? '' : 's'} this week · ${mood.primaryMood.toLowerCase()}`
    : `You've checked in ${streak} time${streak === 1 ? '' : 's'} this week`
  return (
    <Link
      href="/insights"
      className="flex items-center gap-3 rounded-[20px] bg-card px-5 py-3.5 lg:h-full
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
    >
      <span className="flex h-5 items-end gap-[3px]" aria-hidden>
        {levels.length > 0
          ? levels.map((p, i) => (
            <span key={i} className="w-1 rounded-sm bg-leaf" style={{ height: `${4 + (p.mood / 10) * 16}px` }} />
          ))
          : <span className="w-1 rounded-sm bg-leaf/20" style={{ height: '4px' }} />}
      </span>
      <span className="text-[13.5px] opacity-65">{label}</span>
    </Link>
  )
}

function RecentJournal({ entries }: { entries: JournalEntry[] }) {
  const recent = entries.slice(0, 2)
  if (recent.length === 0) {
    return (
      <div className="rounded-[20px] bg-card px-6 py-6 text-[13.5px] opacity-55">
        Nothing written yet. Your journal will show up here.
      </div>
    )
  }
  return (
    <div className="rounded-[20px] bg-card px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_1px_0_rgba(34,55,43,.05),0_14px_32px_rgba(34,55,43,.08)]
      border border-fir/[.04]">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-leaf">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round" className="h-3 w-3" aria-hidden>
          <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
          <path d="M5 4v13a3 3 0 0 0 3 3" />
        </svg>
        Recent journal
      </p>
      <div className="flex flex-col">
        {recent.map((e, i) => (
          <Link
            key={e.journalId}
            href={`/journal/${e.journalId}`}
            className={`relative flex items-baseline justify-between gap-3 py-3 pl-4
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir
              ${i < recent.length - 1 ? 'border-b border-fir/[.08]' : ''}`}
          >
            <span className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-full bg-leaf/35" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold">{e.title || 'Untitled'}</span>
              <span className="mt-0.5 block truncate text-xs opacity-55">{e.content}</span>
            </span>
            <span className="flex-none text-[11px] opacity-45">
              {new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div>
      <div className="h-[400px] bg-gradient-to-b from-[#170F07] to-[#2A1B0C] lg:h-[300px]" />
      <div className="relative z-10 -mt-8 rounded-t-3xl bg-oat px-5 pt-7">
        <Skeleton lines={2} className="max-w-[220px]" />
        <div className="mt-8 rounded-[22px] bg-card p-5">
          <Skeleton lines={3} />
        </div>
      </div>
    </div>
  )
}

const noSubscribe = () => () => undefined
const onClient = () => true
const onServer = () => false

export default function HomePage() {
  const dashboard = useQuery({ queryKey: qk.dashboard, queryFn: getDashboard })
  const unread = useQuery({ queryKey: qk.unread, queryFn: getUnreadCount })
  const insights = useQuery({ queryKey: qk.insights, queryFn: getInsights })
  const journal = useQuery({ queryKey: qk.journal, queryFn: getJournalHistory })

  // The device clock is only read once mounted, so server and client markup agree.
  const mounted = useSyncExternalStore(noSubscribe, onClient, onServer)

  if (dashboard.isError) {
    return (
      <div className="px-5 py-10">
        <ErrorState error={dashboard.error} retry={() => void dashboard.refetch()} />
      </div>
    )
  }
  if (!dashboard.data || !mounted) return <HomeSkeleton />

  const { greeting, dailyAffirmation, currentStreak, latestMood, loggedToday } = dashboard.data
  const unreadCount = unread.data ? (unread.data.count ?? unread.data.unreadCount ?? 0) : 0
  const initial = greetingInitial(greeting)
  const weeklyTrends = insights.data?.weeklyTrends ?? []

  return (
    <div>
      <div className="relative">
        <ListeningHero
          greeting={greeting}
          sub={subLineFor(latestMood, loggedToday)}
          cta={<TalkCta />}
          weeklyTrends={weeklyTrends}
        />
        <TopBar unread={unreadCount} initial={initial} />
      </div>

      <div className="relative z-10 -mt-8 rounded-t-3xl bg-oat px-5 pb-6 pt-4 lg:px-11 lg:pt-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3.5 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-5">
          <AffirmationCard text={dailyAffirmation} />

          {/* Mobile: always the quiet single-line summary, never the desktop chart card. */}
          <div className="lg:hidden">
            <CheckinSummary points={weeklyTrends} streak={currentStreak} mood={latestMood} />
          </div>

          {/* Desktop: the richer chart card once there is enough data, otherwise the same quiet summary. */}
          <div className="hidden lg:block">
            {insights.isSuccess && weeklyTrends.length >= 2 ? (
              <div className="h-full rounded-[20px] bg-card px-5 py-4
                shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_1px_0_rgba(34,55,43,.05),0_14px_32px_rgba(34,55,43,.08)]
                border border-fir/[.04] flex flex-col">
                <p className="flex items-baseline justify-between text-[13.5px] font-semibold text-leaf">
                  This week
                  <span className="text-[11.5px]">Insights</span>
                </p>
                <div className="mt-2.5 flex-1">
                  <TerrainChart points={weeklyTrends} mini />
                </div>
              </div>
            ) : (
              <CheckinSummary points={weeklyTrends} streak={currentStreak} mood={latestMood} />
            )}
          </div>

          <RecentJournal entries={journal.data ?? []} />
        </div>
      </div>
    </div>
  )
}
