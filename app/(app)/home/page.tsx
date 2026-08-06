'use client'
import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getDashboard, getInsights, getUnreadCount } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/keys'
import type { InsightPoint, MoodEntry } from '@/lib/api/types'
import { skyStateFor, type SkyState } from '@/lib/sky'
import { parseInsightDate } from '@/lib/insight-dates'
import { SkyScene, isDarkSky, greetingInitial } from '@/components/garden/sky-scene'
import { TerrainChart } from '@/components/charts/terrain-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'

const SAVED_KEY = 'saved-affirmations'

/**
 * Saved affirmations live in localStorage, so they are read through an external
 * store: the value is only available on the client and can change in any tab.
 */
const NO_SAVED: string[] = []
const savedListeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedSaved: string[] = NO_SAVED

function subscribeSaved(onChange: () => void) {
  savedListeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    savedListeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function readSaved(): string[] {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY)
    if (raw === cachedRaw) return cachedSaved
    cachedRaw = raw
    const parsed: unknown = raw ? JSON.parse(raw) : []
    cachedSaved = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : NO_SAVED
    return cachedSaved
  } catch {
    return NO_SAVED
  }
}

function writeSaved(next: string[]) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next))
  } catch {
    // A blocked or full store just means this one stays unsaved.
  }
  savedListeners.forEach(l => l())
}

const noSubscribe = () => () => undefined
const shareIsAvailable = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const onClient = () => true
const onServer = () => false

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function shiftDays(from: Date, days: number) {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d
}

function sentenceCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function subLineFor(mood: MoodEntry | null, streak: number, loggedToday: boolean) {
  if (!mood) return 'A fresh start. Plant the first check-in.'
  if (loggedToday) return `Day ${streak} is watered. Come back tomorrow.`
  return `${sentenceCase(mood.primaryMood)} earlier, strength ${mood.moodIntensity}.`
    + " The garden's still waiting on today's water."
}

function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[15px] w-[15px]" aria-hidden>
      <path
        d="M12 3 C 8 8.5 6 11.5 6 14.5 a6 6 0 0 0 12 0 C 18 11.5 16 8.5 12 3 Z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
      />
    </svg>
  )
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

function TopBar({ dark, unread, initial }: { dark: boolean; unread: number; initial: string }) {
  return (
    <div className="absolute inset-x-0 top-0 z-[4] flex items-center justify-end gap-2.5 px-6 pt-5">
      <Link
        href="/notifications"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl backdrop-blur
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
          ${dark ? 'bg-oat/12 text-oat focus-visible:outline-marigold' : 'bg-fir/8 text-fir focus-visible:outline-fir'}`}
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
        className={`flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-semibold
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
          ${dark ? 'bg-marigold text-fir-deep focus-visible:outline-oat' : 'bg-leaf text-oat focus-visible:outline-fir'}`}
      >
        {initial}
      </Link>
    </div>
  )
}

function WeekDots({ points, streak, loggedToday, today }:
{ points: InsightPoint[]; streak: number; loggedToday: boolean; today: Date }) {
  // Point dates arrive as "Aug 6", so they are rebuilt against today's calendar.
  const logged = new Set(
    points
      .filter(p => p.mood > 0)
      .map(p => parseInsightDate(p.date, today))
      .filter((d): d is Date => d !== null)
      .map(dayKey)
  )
  const days = Array.from({ length: 7 }, (_, i) => shiftDays(today, i - 6))
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {days.map((day, i) => {
        const isToday = i === 6
        const filled = logged.has(dayKey(day)) || (isToday && loggedToday)
        const index = streak - (6 - i)
        const milestone = filled && index > 0 && index % 7 === 0
        if (milestone) return <span key={i} className="h-3 w-3 rounded-full bg-marigold" />
        if (filled) return <span key={i} className="h-[9px] w-[9px] rounded-full bg-leaf" />
        return (
          <span key={i}
            className={`h-[9px] w-[9px] rounded-full ${isToday ? 'border-[1.5px] border-dashed border-fir/40' : 'bg-fir/12'}`} />
        )
      })}
    </div>
  )
}

function AffirmationCard({ text }: { text: string }) {
  const savedList = useSyncExternalStore(subscribeSaved, readSaved, () => NO_SAVED)
  const canShare = useSyncExternalStore(noSubscribe, shareIsAvailable, () => false)
  const saved = savedList.includes(text)

  function toggleSave() {
    writeSaved(saved ? savedList.filter(v => v !== text) : [...savedList, text])
  }

  function share() {
    void navigator.share({ text }).catch(() => undefined)
  }

  return (
    <div className="relative overflow-hidden rounded-[22px] bg-card px-[22px] pb-4 pt-5
      shadow-[0_2px_0_rgba(34,55,43,.05),0_14px_34px_rgba(34,55,43,.09)]">
      <svg className="absolute -right-4 -top-[18px] h-[90px] w-[90px] opacity-[.07]" viewBox="0 0 100 100" fill="none" aria-hidden>
        <path d="M50 96 C 46 70 46 40 50 8" stroke="#22372B" strokeWidth="3" />
        <path d="M50 55 C 30 52 18 38 20 20 C 40 24 50 38 50 55 Z" fill="#22372B" />
        <path d="M50 70 C 68 66 80 52 78 36 C 60 40 50 54 50 70 Z" fill="#22372B" />
      </svg>
      <span className="absolute left-4 -top-3 font-display text-[56px] font-bold leading-none text-leaf opacity-90" aria-hidden>
        &ldquo;
      </span>
      <p className="relative font-display text-xl font-medium leading-[1.28] tracking-[-0.01em]">{text}</p>
      <div className="relative mt-3 flex items-center justify-between">
        <span className="text-[11.5px] opacity-55">{"Today's affirmation"}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleSave}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved affirmations' : 'Save this affirmation'}
            className={`flex h-11 w-11 items-center justify-center rounded-[10px] border-[1.5px] transition
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir
              ${saved ? 'border-leaf bg-leaf/10 text-leaf' : 'border-fir/16 text-fir'}`}
          >
            <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]" aria-hidden>
              <path d="M19 21 12 16 5 21 V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
            </svg>
          </button>
          {canShare ? (
            <button
              type="button"
              onClick={share}
              aria-label="Share this affirmation"
              className="flex h-11 w-11 items-center justify-center rounded-[10px] border-[1.5px] border-fir/16 text-fir
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]" aria-hidden>
                <path d="M4 12v7a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-7" />
                <path d="M12 15V3.5" />
                <path d="m7.5 8 4.5-4.5L16.5 8" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function WeekTeaser({ points }: { points: InsightPoint[] }) {
  const enough = points.length >= 2
  return (
    <Link
      href="/insights"
      className="block rounded-[22px] bg-card px-5 pb-3 pt-4
        shadow-[0_2px_0_rgba(34,55,43,.05),0_14px_34px_rgba(34,55,43,.09)]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
    >
      <span className="flex items-baseline justify-between text-[13.5px] font-semibold">
        {"This week's ground"}
        <span className="text-[11.5px] text-leaf">Insights</span>
      </span>
      {enough ? (
        <span className="mt-3 block">
          <TerrainChart points={points} mini />
        </span>
      ) : (
        <span className="mt-3 flex h-16 items-center justify-center rounded-xl border-[1.5px] border-dashed
          border-fir/15 text-[12.5px] opacity-55">
          Your week takes shape here
        </span>
      )}
    </Link>
  )
}

function HomeSkeleton() {
  return (
    <div>
      <div className="h-[348px] bg-gradient-to-b from-leaf/25 via-leaf/10 to-oat lg:h-[300px]" />
      <div className="relative z-10 -mt-8 rounded-t-3xl bg-oat px-5 pt-7">
        <Skeleton lines={2} className="max-w-[220px]" />
        <div className="mt-8 rounded-[22px] bg-card p-5">
          <Skeleton lines={3} />
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const dashboard = useQuery({ queryKey: qk.dashboard, queryFn: getDashboard })
  const unread = useQuery({ queryKey: qk.unread, queryFn: getUnreadCount })
  const insights = useQuery({ queryKey: qk.insights, queryFn: getInsights })

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

  const now = new Date()
  const { greeting, dailyAffirmation, currentStreak, latestMood } = dashboard.data
  const sky: SkyState = skyStateFor(now.getHours())
  const dark = isDarkSky(sky)
  // createdAt is a zone-less Java LocalDateTime, so it carries the server's idea
  // of the clock. Comparing it to the device's calendar day is the best we can do
  // and can be off near midnight or for users far from the server's timezone.
  const moodDay = latestMood ? parseInsightDate(latestMood.createdAt, now) : null
  const loggedToday = moodDay ? dayKey(moodDay) === dayKey(now) : false
  const unreadCount = unread.data ? (unread.data.count ?? unread.data.unreadCount ?? 0) : 0
  const initial = greetingInitial(greeting)

  const cta = loggedToday ? undefined : (
    <Link
      href="/checkin"
      className={`mt-3.5 inline-flex items-center gap-[7px] rounded-full py-[9px] pl-3 pr-4 text-[13px] font-semibold
        shadow-[0_8px_20px_rgba(0,0,0,.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        ${dark ? 'bg-marigold text-fir-deep focus-visible:outline-oat' : 'bg-fir text-oat focus-visible:outline-fir'}`}
    >
      <DropIcon />
      Water day {currentStreak + 1}
    </Link>
  )

  return (
    <div>
      <div className="relative">
        <SkyScene
          state={sky}
          streak={currentStreak}
          latestMood={latestMood}
          greeting={greeting}
          sub={subLineFor(latestMood, currentStreak, loggedToday)}
          cta={cta}
        />
        <TopBar dark={dark} unread={unreadCount} initial={initial} />
      </div>

      <div className="relative z-10 -mt-8 rounded-t-3xl bg-oat px-5 pb-4 pt-3 lg:px-6 lg:pt-6">
        <div className="grid gap-3.5 lg:grid-cols-2 lg:gap-6">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-1 pt-0.5">
              <p className="font-display text-5xl font-bold leading-none tracking-[-0.02em]">
                {currentStreak}
                <span className="mt-1 block font-body text-[12.5px] font-medium tracking-normal opacity-60">
                  days tended
                </span>
              </p>
              <WeekDots
                points={insights.data?.weeklyTrends ?? []}
                streak={currentStreak}
                loggedToday={loggedToday}
                today={now}
              />
            </div>
            <AffirmationCard text={dailyAffirmation} />
          </div>
          {insights.isSuccess ? <WeekTeaser points={insights.data.weeklyTrends} /> : null}
        </div>
      </div>
    </div>
  )
}
