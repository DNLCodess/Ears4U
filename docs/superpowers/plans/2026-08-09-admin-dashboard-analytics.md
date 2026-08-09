# Admin Dashboard and Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Dashboard and Analytics stub pages with real screens: overview metric cards, recent broadcast history, a CSV export action, and three time-series charts (User Growth, Moods, AI usage), covering `docs/Admin_Endpoints.pdf` section 4.

**Architecture:** Extends the existing `lib/api/admin/` module (no new API files) with four new endpoint functions and one new low-level fetch variant for binary (CSV) responses. Adds one new generic chart component, mirroring the user app's existing hand-rolled SVG chart pattern rather than a new dependency.

**Tech Stack:** Next.js 16.3, React 19, Tailwind v4, TanStack Query, Vitest + Testing Library (already in place, no new dependencies).

## Global Constraints

- Design spec of record: `docs/superpowers/specs/2026-08-09-earsforyou-admin-dashboard-analytics-design.md`. Every task's requirements implicitly include it.
- The analytics endpoint path is `/api/v1/admins/anaytics`, missing the letter "l". This is copied verbatim from the Admin API doc and is very likely the real backend route, not a documentation typo (every other occurrence of the word in the same document is spelled correctly). Use this exact string everywhere; never "fix" the spelling to `/analytics`.
- Same visual identity, responsive approach, and component reuse conventions as Phase 1: `oat`/`fir`/`card`/`marigold`/`clay` tokens, Chillax display + General Sans body, `Skeleton`/`ErrorState`/`Button` reused as-is, no new tokens, no decorative hero art.
- No new charting library or other new dependency. The new chart component is hand-rolled SVG, mirroring `lib/charts/terrain.ts` + `components/charts/terrain-chart.tsx`'s existing split (a pure path-building function plus a component that renders it).
- Field shapes for all four endpoints in this phase are best-guesses (none are reachable without a valid admin session, so none can be curl-verified pre-auth). Build to the shapes given in this plan; live verification is a follow-up once real admin credentials are available.
- No AI attribution in any commit. No em dashes anywhere (code comments, UI copy, commit messages, docs).
- Verification per task: `npm test && npx tsc --noEmit && npm run lint` at minimum; `npm run build` on the final task. Screenshot-verify any task that changes visible layout with real Playwright renders, not curl or reasoning from source, per this project's established and repeatedly-necessary practice.
- Commit after every task, conventional message, verify with `git log -1 --format=%B` before moving on.

## File Structure

```
lib/api/admin/client.ts          modify: add adminApiFetchBlob for binary responses
lib/api/admin/client.test.ts     modify: add coverage for adminApiFetchBlob
lib/api/admin/types.ts           modify: add AdminDashboardMetrics, AdminBroadcastHistoryItem, AdminAnalyticsPoint, AdminAnalytics
lib/api/admin/endpoints.ts       modify: add getAdminDashboard, getAdminBroadcastHistory, getAdminAnalytics, downloadAdminDashboardExport
lib/api/admin/endpoints.test.ts  modify: add coverage for the four new functions
lib/api/admin/mock-store.ts      modify: add fake dashboard metrics, broadcast history, analytics series, export CSV blob
lib/api/admin/mock-fetch.ts      modify: add matching mock routes
lib/query/admin-keys.ts          modify: add dashboard, broadcastHistory, analytics query keys
lib/charts/time-series.ts        create: timeSeriesPath, a generic version of terrainPath with caller-supplied min/max
lib/charts/time-series.test.ts   create
components/admin/time-series-chart.tsx       create: TimeSeriesChart
components/admin/time-series-chart.test.tsx  create
app/admin/(dashboard)/dashboard/page.tsx     modify: replace the stub with the real dashboard
app/admin/(dashboard)/dashboard/page.test.tsx  create
app/admin/(dashboard)/analytics/page.tsx     modify: replace the stub with the real analytics screen
app/admin/(dashboard)/analytics/page.test.tsx  create
```

Interfaces named here are binding across tasks; later tasks import exactly these names.

---

### Task 1: `adminApiFetchBlob` for binary responses

**Files:**
- Modify: `lib/api/admin/client.ts`, `lib/api/admin/client.test.ts`

**Interfaces:**
- Consumes: `getAdminAccessToken`, `refreshAdminSession`, `clearAdminAccessToken` (existing, in the same file), `ApiError`, `friendlyFor`, `NETWORK_ERROR_MESSAGE` from `../errors` (existing), `MOCKS_ENABLED` from `../../mocks` (existing), `adminMockFetch` from `./mock-fetch` (existing).
- Produces: `adminApiFetchBlob(path: string): Promise<Blob>` from `lib/api/admin/client.ts`. Task 3 (endpoint functions) is the only consumer.

Every existing admin endpoint parses its response as JSON via `adminApiFetch`. The CSV export endpoint returns a raw file, so it needs its own fetch wrapper that mirrors `adminApiFetch`'s auth-header and refresh-and-retry logic but returns `res.blob()` on success instead of parsed JSON. In mock mode, it routes through `adminMockFetch` exactly like `adminApiFetch` does, since the mock backend can return a fake `Blob` value directly (mock mode never touches the real network either way).

- [ ] **Step 1: Write the failing test**

```ts
// lib/api/admin/client.test.ts: append to the existing file
describe('adminApiFetchBlob', () => {
  beforeEach(() => {
    clearAdminAccessToken()
  })
  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns a blob on success, with a bearer token when authenticated', async () => {
    setAdminAccessToken('tok-blob')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(['a,b\n1,2'], { type: 'text/csv' }), { status: 200 })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    const blob = await adminApiFetchBlob('/api/v1/admins/dashboard/exports')

    expect(blob).toBeInstanceOf(Blob)
    const [, init] = fetchMock.mock.calls[0]!
    const headers = init.headers as Headers
    expect(headers.get('authorization')).toBe('Bearer tok-blob')
    expect(init.credentials).toBe('include')
  })

  it('refreshes once on 401 and retries, then returns a blob', async () => {
    setAdminAccessToken('stale')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'fresh' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(new Blob(['x'], { type: 'text/csv' }), { status: 200 }))
    global.fetch = fetchMock as unknown as typeof fetch

    const blob = await adminApiFetchBlob('/api/v1/admins/dashboard/exports')

    expect(blob).toBeInstanceOf(Blob)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1]![0]).toBe('/backend/api/v1/auth/admin-refresh')
  })

  it('throws an ApiError when the request fails and refresh also fails', async () => {
    setAdminAccessToken('stale')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(adminApiFetchBlob('/api/v1/admins/dashboard/exports')).rejects.toThrow()
    expect(getAdminAccessToken()).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/api/admin/client`
Expected: FAIL, `adminApiFetchBlob` is not exported

- [ ] **Step 3: Add `adminApiFetchBlob` to `lib/api/admin/client.ts`**

```ts
// lib/api/admin/client.ts: add after adminApiFetch, at the end of the file
export async function adminApiFetchBlob(path: string): Promise<Blob> {
  if (MOCKS_ENABLED) {
    return adminMockFetch<Blob>(path, { method: 'GET' })
  }

  const doFetch = async (): Promise<Response> => {
    const headers = new Headers()
    const token = getAdminAccessToken()
    if (token) headers.set('authorization', `Bearer ${token}`)
    try {
      return await fetch(`${BASE}${path}`, { method: 'GET', headers, credentials: 'include' })
    } catch {
      throw new ApiError(0, NETWORK_ERROR_MESSAGE)
    }
  }

  let res = await doFetch()

  if (res.status === 401 || res.status === 403) {
    const ok = await refreshAdminSession()
    if (ok) {
      res = await doFetch()
      if (res.status === 401 || res.status === 403) {
        clearAdminAccessToken()
        authExpiredCb?.()
      }
    } else {
      clearAdminAccessToken()
      authExpiredCb?.()
      throw new ApiError(res.status, friendlyFor(401))
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, friendlyFor(res.status))
  }

  return res.blob()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/api/admin/client`
Expected: PASS, 3 new tests passing alongside the existing ones

- [ ] **Step 5: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean

- [ ] **Step 6: Commit**

```bash
git add lib/api/admin/client.ts lib/api/admin/client.test.ts
git commit -m "feat: add a blob-response fetch variant for the admin CSV export"
```

---

### Task 2: Types, endpoint functions, and mock backend for dashboard and analytics

**Files:**
- Modify: `lib/api/admin/types.ts`, `lib/api/admin/endpoints.ts`, `lib/api/admin/endpoints.test.ts`, `lib/api/admin/mock-store.ts`, `lib/api/admin/mock-fetch.ts`, `lib/query/admin-keys.ts`

**Interfaces:**
- Consumes: `adminApiFetch` and `adminApiFetchBlob` from `./client` (existing plus Task 1).
- Produces: `AdminDashboardMetrics`, `AdminBroadcastHistoryItem`, `AdminAnalyticsPoint`, `AdminAnalytics` from `lib/api/admin/types.ts`. `getAdminDashboard(): Promise<AdminDashboardMetrics>`, `getAdminBroadcastHistory(): Promise<AdminBroadcastHistoryItem[]>`, `getAdminAnalytics(): Promise<AdminAnalytics>`, `downloadAdminDashboardExport(): Promise<Blob>` from `lib/api/admin/endpoints.ts`. `adminQk.dashboard`, `adminQk.broadcastHistory`, `adminQk.analytics` from `lib/query/admin-keys.ts`. Tasks 4 and 5 (the two pages) import all of these.

- [ ] **Step 1: Write the failing test**

```ts
// lib/api/admin/endpoints.test.ts: append to the existing file
import {
  getAdminDashboard, getAdminBroadcastHistory, getAdminAnalytics, downloadAdminDashboardExport,
} from './endpoints'
import * as client from './client'

describe('admin dashboard and analytics endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getAdminDashboard fetches the dashboard metrics path', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ totalUsers: 1 })
    await getAdminDashboard()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/dashboard')
  })

  it('getAdminBroadcastHistory fetches the notifications path', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue([])
    await getAdminBroadcastHistory()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/dashboard/notifications')
  })

  it('getAdminAnalytics fetches the anaytics path exactly as documented, missing the l', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ userGrowth: [], moods: [], aiUsage: [] })
    await getAdminAnalytics()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/anaytics')
  })

  it('downloadAdminDashboardExport fetches the exports path via the blob client', async () => {
    const fakeBlob = new Blob(['a,b'], { type: 'text/csv' })
    vi.spyOn(client, 'adminApiFetchBlob').mockResolvedValue(fakeBlob)
    const result = await downloadAdminDashboardExport()
    expect(client.adminApiFetchBlob).toHaveBeenCalledWith('/api/v1/admins/dashboard/exports')
    expect(result).toBe(fakeBlob)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/api/admin/endpoints`
Expected: FAIL, the four new functions are not exported

- [ ] **Step 3: Add the new types to `lib/api/admin/types.ts`**

```ts
// lib/api/admin/types.ts: append
export interface AdminDashboardMetrics {
  totalUsers: number
  activeUsers: number
  newSignups: number
  checkInsLogged: number
  emergencyResourceViews: number
  suspendedAccounts: number
}
export interface AdminBroadcastHistoryItem {
  id: number
  message: string
  segment: string
  sentAt: string
}
export interface AdminAnalyticsPoint {
  date: string
  value: number
}
export interface AdminAnalytics {
  userGrowth: AdminAnalyticsPoint[]
  moods: AdminAnalyticsPoint[]
  aiUsage: AdminAnalyticsPoint[]
}
```

- [ ] **Step 4: Add the four functions to `lib/api/admin/endpoints.ts`**

```ts
// lib/api/admin/endpoints.ts: add near the top imports
import { adminApiFetch, adminApiFetchBlob } from './client'
import type {
  AdminProfile, AdminRegisterPayload, UpdateAdminProfilePayload,
  AdminDashboardMetrics, AdminBroadcastHistoryItem, AdminAnalytics,
} from './types'

// lib/api/admin/endpoints.ts: append at the end of the file
export const getAdminDashboard = () => adminApiFetch<AdminDashboardMetrics>('/api/v1/admins/dashboard')
export const getAdminBroadcastHistory = () =>
  adminApiFetch<AdminBroadcastHistoryItem[]>('/api/v1/admins/dashboard/notifications')
export const getAdminAnalytics = () => adminApiFetch<AdminAnalytics>('/api/v1/admins/anaytics')
export const downloadAdminDashboardExport = () => adminApiFetchBlob('/api/v1/admins/dashboard/exports')
```

The existing `import { adminApiFetch } from './client'` line at the top of the file already exists from Phase 1; adjust it in place to the two-name import shown above and add `AdminDashboardMetrics`/`AdminBroadcastHistoryItem`/`AdminAnalytics` to the existing type import line rather than creating duplicate import statements.

- [ ] **Step 5: Extend `lib/api/admin/mock-store.ts`**

```ts
// lib/api/admin/mock-store.ts: add these imports and definitions, keep the existing profile code as-is
import type {
  AdminProfile, AdminDashboardMetrics, AdminBroadcastHistoryItem, AdminAnalytics, AdminAnalyticsPoint,
} from './types'

const dashboardMetrics: AdminDashboardMetrics = {
  totalUsers: 4820,
  activeUsers: 1264,
  newSignups: 58,
  checkInsLogged: 973,
  emergencyResourceViews: 41,
  suspendedAccounts: 3,
}

const broadcastHistory: AdminBroadcastHistoryItem[] = [
  {
    id: 1,
    message: 'We are aware of the recent slow load times and are working on a fix.',
    segment: 'All users',
    sentAt: '2026-08-05T14:00:00Z',
  },
  {
    id: 2,
    message: 'New breathing exercise added to the check-in flow.',
    segment: 'Active users',
    sentAt: '2026-07-28T09:30:00Z',
  },
]

function buildSeries(base: number, spread: number, days = 30): AdminAnalyticsPoint[] {
  const points: AdminAnalyticsPoint[] = []
  const start = new Date('2026-07-11T00:00:00Z')
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    const value = Math.round(base + Math.sin(i / 3) * spread + i * (spread / days))
    points.push({ date: d.toISOString().slice(0, 10), value })
  }
  return points
}

const analytics: AdminAnalytics = {
  userGrowth: buildSeries(4200, 40),
  moods: buildSeries(6, 1.5),
  aiUsage: buildSeries(300, 60),
}
```

Add these methods to the existing `adminMockStore` object (do not replace the object, add alongside `getProfile`/`updateProfile`/`confirmEmailChange`):

```ts
// lib/api/admin/mock-store.ts: add inside the existing adminMockStore object
  getDashboard(): AdminDashboardMetrics {
    return dashboardMetrics
  },
  getBroadcastHistory(): AdminBroadcastHistoryItem[] {
    return broadcastHistory
  },
  getAnalytics(): AdminAnalytics {
    return analytics
  },
  getExportCsv(): Blob {
    const rows = Object.entries(dashboardMetrics).map(([key, value]) => `${key},${value}`)
    return new Blob([`metric,value\n${rows.join('\n')}\n`], { type: 'text/csv' })
  },
```

- [ ] **Step 6: Add matching mock routes to `lib/api/admin/mock-fetch.ts`**

```ts
// lib/api/admin/mock-fetch.ts: add before the final throw
  if (pathname === '/api/v1/admins/dashboard' && method === 'GET') {
    return delay(adminMockStore.getDashboard() as T)
  }
  if (pathname === '/api/v1/admins/dashboard/notifications' && method === 'GET') {
    return delay(adminMockStore.getBroadcastHistory() as T)
  }
  if (pathname === '/api/v1/admins/anaytics' && method === 'GET') {
    return delay(adminMockStore.getAnalytics() as T)
  }
  if (pathname === '/api/v1/admins/dashboard/exports' && method === 'GET') {
    return delay(adminMockStore.getExportCsv() as T)
  }
```

- [ ] **Step 7: Add query keys to `lib/query/admin-keys.ts`**

```ts
// lib/query/admin-keys.ts: replace the whole file
export const adminQk = {
  profile: ['admin-profile'] as const,
  dashboard: ['admin-dashboard'] as const,
  broadcastHistory: ['admin-broadcast-history'] as const,
  analytics: ['admin-analytics'] as const,
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- lib/api/admin/endpoints`
Expected: PASS, 4 new tests passing alongside the existing ones

- [ ] **Step 9: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean

- [ ] **Step 10: Commit**

```bash
git add lib/api/admin/types.ts lib/api/admin/endpoints.ts lib/api/admin/endpoints.test.ts \
  lib/api/admin/mock-store.ts lib/api/admin/mock-fetch.ts lib/query/admin-keys.ts
git commit -m "feat: add dashboard and analytics endpoints with mock backend"
```

---

### Task 3: The time-series chart

**Files:**
- Create: `lib/charts/time-series.ts`, `lib/charts/time-series.test.ts`, `components/admin/time-series-chart.tsx`, `components/admin/time-series-chart.test.tsx`

**Interfaces:**
- Produces: `timeSeriesPath(values: number[], width: number, height: number, min: number, max: number): string` from `lib/charts/time-series.ts`. `TimeSeriesChart({ title, points, min, max, color }: { title: string; points: { date: string; value: number }[]; min: number; max: number; color?: string }): JSX.Element` from `components/admin/time-series-chart.tsx`. Task 5 (Analytics page) is the only consumer of `TimeSeriesChart`.

`timeSeriesPath` is a generic sibling of the user app's existing `terrainPath` (`lib/charts/terrain.ts`, read-only reference, do not modify): same smooth Catmull-Rom-to-bezier curve, but `min`/`max` are required parameters instead of defaulting to a fixed 1-10 scale, since admin metrics vary wildly in range (user counts vs. mood averages vs. request volumes). No draw-in animation on this chart, unlike the user-facing `TerrainChart`, since the admin surface is deliberately less decorative per the Phase 1 design spec.

- [ ] **Step 1: Write the failing test for the path function**

```ts
// lib/charts/time-series.test.ts
import { describe, it, expect } from 'vitest'
import { timeSeriesPath } from './time-series'

describe('timeSeriesPath', () => {
  it('returns an empty string for no values', () => {
    expect(timeSeriesPath([], 100, 50, 0, 10)).toBe('')
  })

  it('returns a flat line for a single value', () => {
    const d = timeSeriesPath([5], 100, 50, 0, 10)
    expect(d.startsWith('M 0')).toBe(true)
    expect(d).toContain('L 100')
  })

  it('starts at the correct x=0 point and produces a non-empty path for multiple values', () => {
    const d = timeSeriesPath([1, 5, 9], 100, 60, 0, 10)
    expect(d.startsWith('M 0.0')).toBe(true)
    expect(d.length).toBeGreaterThan(10)
  })

  it('does not divide by zero when min equals max', () => {
    const d = timeSeriesPath([5, 5, 5], 100, 60, 5, 5)
    expect(d.length).toBeGreaterThan(0)
    expect(d).not.toContain('NaN')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/charts/time-series`
Expected: FAIL, cannot resolve `./time-series`

- [ ] **Step 3: Create `lib/charts/time-series.ts`**

```ts
// lib/charts/time-series.ts
/**
 * Generic sibling of terrainPath (lib/charts/terrain.ts): same smooth
 * Catmull-Rom-to-bezier curve, but min/max are caller-supplied instead of
 * a fixed 1-10 scale, since admin metrics vary in range far more than a
 * single user's mood score does.
 */
export function timeSeriesPath(values: number[], width: number, height: number, min: number, max: number): string {
  if (values.length === 0) return ''
  const pad = 4
  const usable = height - pad * 2
  const range = max - min || 1
  const x = (i: number) => values.length === 1 ? 0 : (i / (values.length - 1)) * width
  const y = (v: number) => pad + usable * (1 - (v - min) / range)
  const pts = values.map((v, i) => [x(i), y(v)] as const)
  if (pts.length === 1) return `M 0 ${pts[0]![1].toFixed(1)} L ${width} ${pts[0]![1].toFixed(1)}`

  let d = `M ${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/charts/time-series`
Expected: PASS, 4/4

- [ ] **Step 5: Write the failing test for the component**

```tsx
// components/admin/time-series-chart.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimeSeriesChart } from './time-series-chart'

describe('TimeSeriesChart', () => {
  it('renders the title and the latest value', () => {
    render(
      <TimeSeriesChart
        title="User growth"
        points={[{ date: '2026-08-01', value: 10 }, { date: '2026-08-02', value: 20 }]}
        min={0} max={20}
      />
    )
    expect(screen.getByText('User growth')).toBeInTheDocument()
    expect(screen.getByText(/latest: 20/i)).toBeInTheDocument()
  })

  it('renders an empty state with no points', () => {
    render(<TimeSeriesChart title="Moods" points={[]} min={0} max={10} />)
    expect(screen.getByText('Moods')).toBeInTheDocument()
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument()
  })

  it('renders an accessible chart with a labelled role', () => {
    render(
      <TimeSeriesChart
        title="AI usage"
        points={[{ date: '2026-08-01', value: 5 }]}
        min={0} max={10}
      />
    )
    expect(screen.getByRole('img', { name: /AI usage/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- time-series-chart`
Expected: FAIL, cannot resolve `./time-series-chart`

- [ ] **Step 7: Create `components/admin/time-series-chart.tsx`**

```tsx
// components/admin/time-series-chart.tsx
'use client'
import { useId } from 'react'
import { timeSeriesPath } from '@/lib/charts/time-series'

const WIDTH = 600
const HEIGHT = 120

export function TimeSeriesChart({ title, points, min, max, color = '#2E7D49' }: {
  title: string
  points: { date: string; value: number }[]
  min: number
  max: number
  color?: string
}) {
  const uid = useId().replace(/:/g, '')
  const values = points.map(p => p.value)
  const path = timeSeriesPath(values, WIDTH, HEIGHT, min, max)
  const baseline = HEIGHT - 4
  const fillPath = path ? `${path} L ${WIDTH} ${baseline} L 0 ${baseline} Z` : ''
  const first = points[0]
  const last = points[points.length - 1]
  const latest = values[values.length - 1]

  return (
    <div className="rounded-2xl bg-card px-5 py-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">{title}</p>
        {latest !== undefined ? <p className="text-xs opacity-60">Latest: {latest}</p> : null}
      </div>
      {points.length === 0 ? (
        <p className="mt-6 text-sm opacity-55">No data yet.</p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`${title} over time, latest value ${latest}`}
            className="mt-3 w-full"
          >
            <defs>
              <linearGradient id={`ts-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity="0.35" />
                <stop offset="1" stopColor={color} stopOpacity="0.03" />
              </linearGradient>
            </defs>
            {fillPath ? <path d={fillPath} fill={`url(#ts-${uid})`} stroke="none" /> : null}
            {path ? <path d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" /> : null}
          </svg>
          <div className="mt-1.5 flex items-center justify-between text-[11px] opacity-50">
            <span>{first?.date}</span>
            <span>{last?.date}</span>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- time-series-chart`
Expected: PASS, 3/3

- [ ] **Step 9: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean

- [ ] **Step 10: Commit**

```bash
git add lib/charts/time-series.ts lib/charts/time-series.test.ts \
  components/admin/time-series-chart.tsx components/admin/time-series-chart.test.tsx
git commit -m "feat: add the generic admin time-series chart"
```

---

### Task 4: Dashboard page

**Files:**
- Modify: `app/admin/(dashboard)/dashboard/page.tsx`
- Create: `app/admin/(dashboard)/dashboard/page.test.tsx`

**Interfaces:**
- Consumes: `getAdminDashboard`, `getAdminBroadcastHistory`, `downloadAdminDashboardExport` (Task 2), `adminQk` (Task 2), `Skeleton`/`ErrorState`/`Button` (existing, unmodified), `AdminDashboardMetrics` type (Task 2).
- Produces: `formatSentAt(iso: string): string`, exported for testability. Nothing else for other tasks to consume; this is a leaf page.

This replaces the `StubPage`-based stub entirely; `app/admin/(dashboard)/dashboard/page.tsx` no longer imports `StubPage`.

- [ ] **Step 1: Write the failing test**

```tsx
// app/admin/(dashboard)/dashboard/page.test.tsx
import { describe, it, expect } from 'vitest'
import { formatSentAt } from './page'

describe('formatSentAt', () => {
  it('formats a valid ISO date as a short month/day string', () => {
    expect(formatSentAt('2026-08-05T14:00:00Z')).toMatch(/Aug\s+5/)
  })
  it('returns an empty string for an invalid date', () => {
    expect(formatSentAt('not-a-date')).toBe('')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- dashboard/page`
Expected: FAIL, `formatSentAt` is not exported (or the file fails to compile because it still renders `StubPage`)

- [ ] **Step 3: Rewrite `app/admin/(dashboard)/dashboard/page.tsx`**

```tsx
// app/admin/(dashboard)/dashboard/page.tsx
'use client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getAdminDashboard, getAdminBroadcastHistory, downloadAdminDashboardExport } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import type { AdminDashboardMetrics } from '@/lib/api/admin/types'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { Button } from '@/components/ui/button'

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
  URL.revokeObjectURL(url)
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
      {exportCsv.isError ? <p role="alert" className="text-sm text-clay">Could not export. Try again.</p> : null}

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
          {METRIC_LABELS.map(m => (
            <div key={m.key} className="rounded-2xl bg-card px-4 py-3.5">
              <p className="text-xs opacity-60">{m.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {dashboard.data![m.key].toLocaleString()}
              </p>
            </div>
          ))}
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- dashboard/page`
Expected: PASS, 2/2

- [ ] **Step 5: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean

- [ ] **Step 6: Manual verification**

Start the dev server (`NEXT_PUBLIC_USE_MOCKS=true npm run dev`), sign in, visit `/admin/dashboard`, confirm the six metric cards render with the mock numbers, the broadcast list shows two entries with correctly formatted dates, and clicking "Export CSV" triggers a real file download (check the downloaded file's contents match the mock CSV). Check at phone width and desktop width. Screenshot both. Kill the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add "app/admin/(dashboard)/dashboard/page.tsx" "app/admin/(dashboard)/dashboard/page.test.tsx"
git commit -m "feat: replace the dashboard stub with real metrics, broadcasts, and CSV export"
```

---

### Task 5: Analytics page

**Files:**
- Modify: `app/admin/(dashboard)/analytics/page.tsx`
- Create: `app/admin/(dashboard)/analytics/page.test.tsx`

**Interfaces:**
- Consumes: `getAdminAnalytics` (Task 2), `adminQk` (Task 2), `TimeSeriesChart` (Task 3), `Skeleton`/`ErrorState` (existing).
- Produces: `bounds(points: { value: number }[]): [number, number]`, exported for testability. Nothing else for other tasks to consume; this is a leaf page.

Real backend value ranges for these three metrics are unknown (best-guess data, per the field-shape risk), so rather than hardcoding a fixed min/max per series, `bounds` derives the chart's range from the actual returned data each time, with a fallback for a flat series (identical min and max, avoided the same way `timeSeriesPath` avoids a divide-by-zero: pad the range out by one unit on each side).

- [ ] **Step 1: Write the failing test**

```tsx
// app/admin/(dashboard)/analytics/page.test.tsx
import { describe, it, expect } from 'vitest'
import { bounds } from './page'

describe('bounds', () => {
  it('returns the min and max of the values', () => {
    expect(bounds([{ value: 3 }, { value: 9 }, { value: 1 }])).toEqual([1, 9])
  })
  it('pads a flat series so min and max differ', () => {
    expect(bounds([{ value: 5 }, { value: 5 }])).toEqual([4, 6])
  })
  it('returns a default range for an empty series', () => {
    expect(bounds([])).toEqual([0, 1])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- analytics/page`
Expected: FAIL, `bounds` is not exported (or the file fails to compile because it still renders `StubPage`)

- [ ] **Step 3: Rewrite `app/admin/(dashboard)/analytics/page.tsx`**

```tsx
// app/admin/(dashboard)/analytics/page.tsx
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
  return min === max ? [min - 1, max + 1] : [min, max]
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

  const { userGrowth, moods, aiUsage } = analytics.data
  const [growthMin, growthMax] = bounds(userGrowth)
  const [moodMin, moodMax] = bounds(moods)
  const [usageMin, usageMax] = bounds(aiUsage)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold">Analytics</h1>
      <p className="max-w-lg text-sm opacity-60">Last 30 days.</p>
      <TimeSeriesChart title="User growth" points={userGrowth} min={growthMin} max={growthMax} color="#2E7D49" />
      <TimeSeriesChart title="Moods" points={moods} min={moodMin} max={moodMax} color="#F2BE45" />
      <TimeSeriesChart title="AI usage" points={aiUsage} min={usageMin} max={usageMax} color="#D9822B" />
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- analytics/page`
Expected: PASS, 3/3

- [ ] **Step 5: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean. This is the point where the whole suite should be green again (the stub was the last thing importing `StubPage` from these two files; confirm `StubPage` is still used elsewhere, by the five remaining stub sections, so it is not deleted).

- [ ] **Step 6: Manual verification**

On the dev server, visit `/admin/analytics`, confirm all three charts render with visible lines/fill, correct titles, correct latest-value labels, and correct first/last date labels at the bottom of each chart. Check at phone and desktop width. Screenshot both. Kill the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add "app/admin/(dashboard)/analytics/page.tsx" "app/admin/(dashboard)/analytics/page.test.tsx"
git commit -m "feat: replace the analytics stub with real time-series charts"
```

---

### Task 6: Final audit

**Files:** none new; this task only verifies and, if needed, fixes issues found across this phase's two screens.

- [ ] **Step 1: Full gate suite**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass, production build succeeds

- [ ] **Step 2: All-states audit**

For both Dashboard and Analytics: temporarily point `API_URL` at an unreachable host to force error states, confirm `ErrorState` renders correctly on both screens (including the broadcast panel's independent error state on Dashboard), then restore `API_URL`. Confirm the CSV export's own inline error message renders if the export call fails (a temporarily broken `API_URL` also covers this).

- [ ] **Step 3: Copy and token audit**

```bash
grep -rn $'—' app/admin components/admin lib/api/admin lib/charts/time-series.ts lib/query/admin-keys.ts || echo clean
```

Should report clean. Fix in place if not.

- [ ] **Step 4: Breakpoint audit**

At 375px, 768px, and 1900px: confirm no horizontal scroll on `/admin/dashboard` and `/admin/analytics`, the metric card grid reflows sensibly (2 columns on phone, 3 on desktop per the given classes), and the three analytics charts remain legible (not squashed) at phone width. Use real Playwright screenshots.

- [ ] **Step 5: Commit and hand over**

```bash
git add -A
git commit -m "chore: final audit for the admin dashboard and analytics phase"
```

Start `npm run dev` from the main session (it must survive between turns), hand the client the URL, and wait for explicit approval before calling this phase complete, per the project's standing definition of done.

---

## Self-Review Notes

- Spec coverage: the CSV export's binary-response handling (Task 1), all four endpoints including the verbatim `/anaytics` misspelling (Task 2), the generic (non-1-10-scale) chart component (Task 3), the dashboard screen with metric cards, broadcast history, and export (Task 4), the analytics screen with three time-series charts over a fixed 30-day window (Task 5), and the project's standing testing/screenshot/definition-of-done rules (Task 6, Global Constraints) are all covered.
- Placeholder scan: no TBD/TODO markers. Best-guess field shapes are explicitly marked as such with a stated verification plan, not left vague.
- Type consistency checked: `AdminDashboardMetrics`/`AdminBroadcastHistoryItem`/`AdminAnalytics`/`AdminAnalyticsPoint` (Task 2) match their usage in Task 4 (`METRIC_LABELS: { key: keyof AdminDashboardMetrics; ... }`) and Task 5 (`analytics.data.userGrowth` etc.) exactly. `TimeSeriesChart`'s props (`title`, `points`, `min`, `max`, `color`) match between Task 3's definition and Task 5's three call sites. `adminApiFetchBlob`'s signature (Task 1) matches its one consumer, `downloadAdminDashboardExport` (Task 2).
