# EARS FOR YOU User App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete EARS FOR YOU user-facing wellness app (auth, home garden, mood check-in, insights, journal, AI chat, notifications, settings) against the deployed Spring Boot API, per the approved spec at `docs/superpowers/specs/2026-08-06-earsforyou-user-app-design.md`.

**Architecture:** Next.js 16.3 App Router, all screens client components behind a same-origin proxy to `https://earsforyou-2.onrender.com`. A single fetch wrapper owns the in-memory access token, silent refresh, and error mapping; TanStack Query owns server state. The Good Soil design system (Chillax + General Sans, oat/fir/leaf/marigold tokens) is implemented as Tailwind v4 theme tokens with hand-rolled SVG illustration and charts.

**Tech Stack:** Next.js 16.3, React 19, TypeScript 5, Tailwind v4, @tanstack/react-query, motion, vitest + @testing-library/react.

## Global Constraints

- Read `node_modules/next/dist/docs/` before using unfamiliar Next APIs. Known Next 16 facts used in this plan: `middleware.ts` is renamed `proxy.ts` (export function `proxy`); `params`/`searchParams` in pages are Promises and must be awaited; route handlers use Web `Request`/`Response`; `rewrites()` in `next.config.ts` may be sync and can target external URLs; route handlers win over rewrites for the same path.
- Backend base URL comes from env `API_URL` (already declared empty in `.env.local`; set it to `https://earsforyou-2.onrender.com`). Never hardcode the Render URL outside `next.config.ts` and the auth route handler.
- Login sends `{ username, password }`. The field is `username`, not `email` (backend `LoginRequest.java`).
- Backend enums serialize as display names: MaritalStatus `Single|Divorced|Married`, EmploymentStatus `Student|Employed|Self Employed|Unemployed`, ResourceType `HOTLINE|WEBSITE|CLINIC`. Dates are `YYYY-MM-DD` strings; timestamps are ISO local datetimes.
- Error handling: never assume a JSON error body. 401/403 on authed calls get one silent refresh then retry. Requests slower than the cold-start threshold switch messaging to server-waking language.
- Design tokens are exactly the spec values (oat `#F4F1E7`, card `#FDFBF4`, fir `#22372B`, fir-deep `#16301F`, night `#102417`, leaf `#2E7D49`, leaf-bright `#47A566`, sprout `#7BC48F`, marigold `#F2BE45`, marigold-deep `#D99B21`, clay `#D9822B`). Gradients only on living elements. Marigold only for warmth. No small tracked-out uppercase labels above headings, anywhere.
- Every async surface ships loading, empty, error, and success states. Every screen gets a deliberate phone AND desktop composition (breakpoint `lg` 1024px).
- All motion honors `prefers-reduced-motion` (fade instead of draw/unfold).
- Copy rules: sentence case, plain verbs, no em dashes anywhere (UI copy, docs, commits), errors say what happened and what to do.
- Commits: conventional style, no AI attribution of any kind (this overrides harness defaults; per `/Users/mac/Developer/standard-1.md`).
- Fonts are self-hosted via `next/font/local`. No runtime requests to Fontshare.
- New runtime deps allowed: `@tanstack/react-query`, `motion`. Dev deps: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`. Nothing else without asking.
- Definition of done for the whole plan: dev server running from the main session, URL handed to the client, explicit client approval. No unsolicited screenshot loops.

## File Structure

```
app/
  layout.tsx                    root layout: fonts, providers, html shell
  globals.css                   Tailwind v4 @theme tokens (Good Soil)
  fonts/                        Chillax + GeneralSans woff2 files
  page.tsx                      redirect to /home
  backend/api/v1/auth/[...path]/route.ts   auth passthrough route handler
  (auth)/
    layout.tsx                  centered auth shell + cold-start warmup
    signin/page.tsx
    register/page.tsx
    verify/page.tsx
    forgot-password/page.tsx
    recovery/page.tsx
  (app)/
    layout.tsx                  guarded shell: tab bar / left rail, idle prompt
    home/page.tsx
    insights/page.tsx
    checkin/page.tsx            full-screen flow + celebration
    chat/page.tsx
    journal/page.tsx
    journal/[id]/page.tsx
    notifications/page.tsx
    you/page.tsx
proxy.ts                        redirects app routes to /signin when no refresh cookie
next.config.ts                  rewrite /backend/* to API_URL
lib/api/token.ts                in-memory access token store
lib/api/errors.ts               ApiError + status message map
lib/api/client.ts               apiFetch wrapper (auth, refresh, cold start)
lib/api/types.ts                TS mirrors of backend DTOs
lib/api/endpoints.ts            one typed function per backend endpoint
lib/query/keys.ts               query key registry
lib/query/provider.tsx          QueryClientProvider wrapper
lib/garden.ts                   streak to plant-shape mapping
lib/charts/terrain.ts           smooth SVG path generation
lib/sky.ts                      hour to sky-state mapping
components/ui/…                 Button, Card, Skeleton, ErrorState, EmptyState, Sheet, Toggle
components/otp-input.tsx        reusable 6-digit OTP field
components/shell/tab-bar.tsx    phone tab bar + desktop left rail
components/garden/plant.tsx     parameterized plant SVG
components/garden/sky-scene.tsx time-aware hero scene
components/charts/terrain-chart.tsx
components/lifeline.tsx         emergency resources trigger row + sheet
```

Interfaces named here are binding across tasks; later tasks import exactly these names.

---

### Task 1: Tooling, dependencies, and test harness

**Files:**
- Modify: `package.json` (scripts)
- Create: `vitest.config.ts`, `vitest.setup.ts`, `lib/api/token.ts`, `lib/api/token.test.ts`

**Interfaces:**
- Produces: `getAccessToken(): string | null`, `setAccessToken(t: string | null): void`, `clearAccessToken(): void` from `lib/api/token.ts`; `npm test` runs vitest.

- [ ] **Step 1: Install dependencies**

```bash
npm i @tanstack/react-query motion
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 2: Create vitest config and setup**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
  },
  resolve: { alias: { '@': path.resolve(__dirname) } },
})
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`.
Confirm `tsconfig.json` maps `@/*` to the repo root (create-next-app default); if the alias differs, match the existing one in vitest.config.

- [ ] **Step 3: Write the failing token store test**

```ts
// lib/api/token.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getAccessToken, setAccessToken, clearAccessToken } from './token'

describe('token store', () => {
  beforeEach(() => clearAccessToken())

  it('starts empty', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('stores and returns a token in memory', () => {
    setAccessToken('abc123')
    expect(getAccessToken()).toBe('abc123')
  })

  it('clears on demand', () => {
    setAccessToken('abc123')
    clearAccessToken()
    expect(getAccessToken()).toBeNull()
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- token`
Expected: FAIL, cannot resolve `./token`

- [ ] **Step 5: Implement the token store**

```ts
// lib/api/token.ts
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(t: string | null): void {
  accessToken = t
}

export function clearAccessToken(): void {
  accessToken = null
}
```

- [ ] **Step 6: Run tests, verify pass; typecheck**

Run: `npm test -- token && npx tsc --noEmit`
Expected: PASS, no type errors

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts lib/api/token.ts lib/api/token.test.ts
git commit -m "chore: add test harness, query and motion deps, token store"
```

---

### Task 2: Good Soil tokens and self-hosted fonts

**Files:**
- Create: `app/fonts/` (woff2 files)
- Modify: `app/globals.css`, `app/layout.tsx`

**Interfaces:**
- Produces: CSS variables `--color-oat, --color-card, --color-fir, --color-fir-deep, --color-night, --color-leaf, --color-leaf-bright, --color-sprout, --color-marigold, --color-marigold-deep, --color-clay` usable as Tailwind classes (`bg-oat`, `text-fir`, ...); font classes via `--font-display` (Chillax) and `--font-body` (General Sans), Tailwind `font-display` / `font-body`.

- [ ] **Step 1: Download and place fonts**

```bash
cd /tmp && curl -sL "https://api.fontshare.com/v2/fonts/download/chillax" -o chillax.zip && unzip -o chillax.zip -d chillax
curl -sL "https://api.fontshare.com/v2/fonts/download/general-sans" -o gs.zip && unzip -o gs.zip -d gs
```

Inspect the extracted folders; copy the variable woff2 files (named like `Chillax-Variable.woff2`, `GeneralSans-Variable.woff2`, under a `Variable/` or `WEB/fonts/` subfolder) into `app/fonts/`. If the zip layout differs, any weights 400 to 700 woff2 set is acceptable; adjust the `next/font/local` config to match the actual filenames.

- [ ] **Step 2: Replace globals.css theme**

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-oat: #F4F1E7;
  --color-card: #FDFBF4;
  --color-fir: #22372B;
  --color-fir-deep: #16301F;
  --color-night: #102417;
  --color-leaf: #2E7D49;
  --color-leaf-bright: #47A566;
  --color-sprout: #7BC48F;
  --color-marigold: #F2BE45;
  --color-marigold-deep: #D99B21;
  --color-clay: #D9822B;
  --font-display: var(--font-chillax);
  --font-body: var(--font-general-sans);
}

body {
  background: var(--color-oat);
  color: var(--color-fir);
  font-family: var(--font-body), system-ui, sans-serif;
}
```

- [ ] **Step 3: Rewrite root layout with local fonts**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const chillax = localFont({
  src: "./fonts/Chillax-Variable.woff2",
  variable: "--font-chillax",
  display: "swap",
});

const generalSans = localFont({
  src: "./fonts/GeneralSans-Variable.woff2",
  variable: "--font-general-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ears for you",
  description: "A companion that listens. Check in, journal, talk, grow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${chillax.variable} ${generalSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Smoke check**

Replace `app/page.tsx` content with a temporary token sampler (heading in `font-display text-fir`, swatch divs for each color) and run `npm run dev`; open http://localhost:3000 and confirm fonts render (rounded Chillax heading) and colors match the spec. Then restore `app/page.tsx` to:

```tsx
import { redirect } from "next/navigation";

export default function Index() {
  redirect("/home");
}
```

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add app/fonts app/globals.css app/layout.tsx app/page.tsx
git commit -m "feat: Good Soil design tokens and self-hosted Chillax and General Sans"
```

---

### Task 3: Backend proxy plumbing

**Files:**
- Modify: `next.config.ts`, `.env.local`
- Create: `app/backend/api/v1/auth/[...path]/route.ts`, `app/backend/api/v1/auth/route.test.ts`

**Interfaces:**
- Produces: browser-reachable base path `/backend` that forwards verbatim to `${API_URL}`; auth paths under `/backend/api/v1/auth/*` flow through the route handler (Set-Cookie passthrough); everything else through the rewrite.

- [ ] **Step 1: Set env and rewrite**

`.env.local`: `API_URL=https://earsforyou-2.onrender.com`

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${process.env.API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Write failing route handler test**

The handler forwards method, body, cookies, and Authorization to the upstream and returns status, body, and Set-Cookie unchanged. Test with a mocked global fetch:

```ts
// app/backend/api/v1/auth/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './[...path]/route'

describe('auth passthrough', () => {
  beforeEach(() => {
    process.env.API_URL = 'https://upstream.example'
    vi.restoreAllMocks()
  })

  it('forwards POST body and returns upstream set-cookie', async () => {
    const upstream = new Response(JSON.stringify({ accessToken: 't1' }), {
      status: 200,
      headers: { 'set-cookie': 'user_refresh_token=r1; HttpOnly; Path=/', 'content-type': 'application/json' },
    })
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(upstream)

    const req = new Request('http://localhost:3000/backend/api/v1/auth/user-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'x=1' },
      body: JSON.stringify({ username: 'a@b.c', password: 'pw' }),
    })
    const res = await POST(req, { params: Promise.resolve({ path: ['user-login'] }) })

    expect(spy).toHaveBeenCalledWith(
      'https://upstream.example/api/v1/auth/user-login',
      expect.objectContaining({ method: 'POST' })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('user_refresh_token=r1')
    expect(await res.json()).toEqual({ accessToken: 't1' })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- auth`
Expected: FAIL, module not found

- [ ] **Step 4: Implement the passthrough handler**

```ts
// app/backend/api/v1/auth/[...path]/route.ts
type Ctx = { params: Promise<{ path: string[] }> }

async function forward(req: Request, ctx: Ctx) {
  const { path } = await ctx.params
  const url = `${process.env.API_URL}/api/v1/auth/${path.join("/")}`

  const headers = new Headers()
  const passthrough = ["content-type", "authorization", "cookie", "accept"]
  for (const h of passthrough) {
    const v = req.headers.get(h)
    if (v) headers.set(h, v)
  }

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    redirect: "manual",
  })

  const resHeaders = new Headers()
  for (const h of ["content-type", "set-cookie"]) {
    const v = upstream.headers.get(h)
    if (v) resHeaders.set(h, v)
  }
  return new Response(upstream.body, { status: upstream.status, headers: resHeaders })
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE }
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test -- auth`
Expected: PASS

- [ ] **Step 6: Verify against the live backend**

With `npm run dev` running:

```bash
curl -s -w '\n%{http_code}\n' -X POST http://localhost:3000/backend/api/v1/auth/user-login \
  -H 'Content-Type: application/json' -d '{"username":"probe@example.com","password":"wrong"}'
```

Expected: `403` (auth rejection from Spring, not an HTML error page and not `Invalid CORS request`). A 5xx or long hang likely means Render cold start; retry once after a minute.

- [ ] **Step 7: Commit**

```bash
git add next.config.ts app/backend .env.local 2>/dev/null || git add next.config.ts app/backend
git commit -m "feat: same-origin proxy to backend with auth cookie passthrough"
```

Note: `.env.local` is gitignored; that is fine. Document the required var in README later (Task 14).

---

### Task 4: apiFetch wrapper with refresh, error mapping, cold-start detection

**Files:**
- Create: `lib/api/errors.ts`, `lib/api/client.ts`, `lib/api/client.test.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; friendly: string; coldStart: boolean }`
  - `apiFetch<T>(path: string, opts?: { method?: string; body?: unknown; auth?: boolean; coldStartMs?: number }): Promise<T>` where `path` starts with `/api/v1/...` and is automatically prefixed with `/backend`.
  - `onAuthExpired(cb: () => void): void` registration used by the app shell to redirect to sign-in.
  - Refresh endpoint used internally: `POST /backend/api/v1/auth/user-refresh` returning `{ accessToken: string }`.

- [ ] **Step 1: Write errors module**

```ts
// lib/api/errors.ts
const STATUS_MESSAGES: Record<number, string> = {
  400: "Something about that request was not right. Check the fields and try again.",
  401: "You are signed out. Sign in to continue.",
  403: "You are signed out. Sign in to continue.",
  404: "We could not find that.",
  409: "That conflicts with something that already exists.",
  429: "Slow down a little. Try again in a minute.",
  500: "The server had a problem. Try again.",
  502: "The server had a problem. Try again.",
  503: "The server is unavailable right now. Try again shortly.",
}

export const COLD_START_MESSAGE =
  "The server is waking up. This can take about a minute after quiet periods."

export class ApiError extends Error {
  status: number
  friendly: string
  coldStart: boolean
  constructor(status: number, friendly: string, coldStart = false) {
    super(friendly)
    this.status = status
    this.friendly = friendly
    this.coldStart = coldStart
  }
}

export function friendlyFor(status: number, bodyMessage?: string): string {
  return bodyMessage || STATUS_MESSAGES[status] || "Something went wrong. Try again."
}
```

- [ ] **Step 2: Write failing client tests**

```ts
// lib/api/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiFetch, onAuthExpired } from './client'
import { setAccessToken, getAccessToken, clearAccessToken } from './token'
import { ApiError } from './errors'

function jsonRes(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
  })
}

describe('apiFetch', () => {
  beforeEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  it('attaches bearer token and parses json', async () => {
    setAccessToken('tok')
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonRes(200, { greeting: 'hi' }))
    const out = await apiFetch<{ greeting: string }>('/api/v1/dashboard/home')
    expect(out.greeting).toBe('hi')
    const [url, init] = spy.mock.calls[0]!
    expect(url).toBe('/backend/api/v1/dashboard/home')
    expect(new Headers(init!.headers).get('authorization')).toBe('Bearer tok')
  })

  it('refreshes once on 401 and retries with the new token', async () => {
    setAccessToken('stale')
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonRes(401))
      .mockResolvedValueOnce(jsonRes(200, { accessToken: 'fresh' }))
      .mockResolvedValueOnce(jsonRes(200, { ok: true }))
    const out = await apiFetch<{ ok: boolean }>('/api/v1/journal/history')
    expect(out.ok).toBe(true)
    expect(getAccessToken()).toBe('fresh')
    expect(spy.mock.calls[1]![0]).toBe('/backend/api/v1/auth/user-refresh')
  })

  it('fires onAuthExpired and throws when refresh fails', async () => {
    setAccessToken('stale')
    const expired = vi.fn()
    onAuthExpired(expired)
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonRes(401))
      .mockResolvedValueOnce(jsonRes(403))
    await expect(apiFetch('/api/v1/journal/history')).rejects.toBeInstanceOf(ApiError)
    expect(expired).toHaveBeenCalled()
  })

  it('maps empty error bodies to friendly messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonRes(500))
    const err = await apiFetch('/api/v1/mood/analytics', { auth: false }).catch(e => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.friendly).toMatch(/server had a problem/i)
  })

  it('marks slow requests as cold start', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(jsonRes(503)), 30))
    )
    const err = await apiFetch('/api/v1/users/ping', { auth: false, coldStartMs: 10 }).catch(e => e)
    expect(err.coldStart).toBe(true)
  })

  it('does not attempt refresh for auth:false requests', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonRes(403))
    await expect(apiFetch('/api/v1/auth/user-login', { auth: false, method: 'POST', body: {} }))
      .rejects.toBeInstanceOf(ApiError)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- client`
Expected: FAIL, module not found

- [ ] **Step 4: Implement the client**

```ts
// lib/api/client.ts
import { getAccessToken, setAccessToken, clearAccessToken } from './token'
import { ApiError, friendlyFor, COLD_START_MESSAGE } from './errors'

const BASE = '/backend'
const DEFAULT_COLD_START_MS = 8000

let authExpiredCb: (() => void) | null = null
export function onAuthExpired(cb: () => void): void {
  authExpiredCb = cb
}

type Opts = {
  method?: string
  body?: unknown
  auth?: boolean
  coldStartMs?: number
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '')
  if (!text) return undefined
  try { return JSON.parse(text) } catch { return undefined }
}

async function refresh(): Promise<boolean> {
  const res = await fetch(`${BASE}/api/v1/auth/user-refresh`, { method: 'POST' })
  if (!res.ok) return false
  const body = (await parseBody(res)) as { accessToken?: string } | undefined
  if (!body?.accessToken) return false
  setAccessToken(body.accessToken)
  return true
}

export async function apiFetch<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const { method = 'GET', body, auth = true, coldStartMs = DEFAULT_COLD_START_MS } = opts

  const doFetch = () => {
    const headers = new Headers()
    if (body !== undefined) headers.set('content-type', 'application/json')
    const token = getAccessToken()
    if (auth && token) headers.set('authorization', `Bearer ${token}`)
    return fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  const started = Date.now()
  let res = await doFetch()

  if (auth && (res.status === 401 || res.status === 403)) {
    const ok = await refresh()
    if (ok) {
      res = await doFetch()
    } else {
      clearAccessToken()
      authExpiredCb?.()
      throw new ApiError(res.status, friendlyFor(401))
    }
  }

  const elapsed = Date.now() - started
  const parsed = await parseBody(res)

  if (!res.ok) {
    const msg = (parsed as { message?: string } | undefined)?.message
    const coldStart = elapsed >= coldStartMs && (res.status === 503 || res.status === 502 || res.status === 504)
    throw new ApiError(res.status, coldStart ? COLD_START_MESSAGE : friendlyFor(res.status, msg), coldStart)
  }

  return parsed as T
}
```

- [ ] **Step 5: Run tests, verify pass; typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add lib/api
git commit -m "feat: api client with silent refresh, friendly errors, cold start detection"
```

---

### Task 5: Types, endpoint functions, query plumbing

**Files:**
- Create: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/query/keys.ts`, `lib/query/provider.tsx`, `lib/api/endpoints.test.ts`

**Interfaces:**
- Produces (types): `UserProfile`, `DashboardHome`, `MoodEntry`, `MoodLogPayload`, `InsightPoint`, `Insights`, `JournalEntry`, `JournalPayload`, `ChatMessage`, `NotificationItem`, `NotificationSettings`, `EmergencyResource`, `RegisterPayload`, `UpdateProfilePayload`.
- Produces (functions, all thin wrappers over `apiFetch`): `login(username, password)`, `logout()`, `registerUser(p: RegisterPayload)`, `verifyUser(email, otp)`, `resendRegistrationOtp(email)`, `forgotPassword(email)`, `resetPassword(email, otp, newPassword)`, `recoveryInitiate(email)`, `recoveryConfirm(email, otp)`, `getDashboard()`, `logMood(p: MoodLogPayload)`, `getInsights()`, `getStreak()`, `getJournalHistory()`, `getJournal(id)`, `createJournal(p)`, `updateJournal(id, p)`, `deleteJournal(id)`, `sendChat(message)`, `getChatHistory()`, `getNotifications()`, `getUnreadCount()`, `markNotificationRead(id)`, `getNotificationSettings()`, `updateNotificationSettings(s)`, `getProfile()`, `updateProfile(p)`, `deleteAccount()`, `changePasswordInitiate(email, oldPassword)`, `changePasswordVerify(email, oldPassword, newPassword, otp)`, `changeEmailInitiate(oldEmail, newEmail)`, `changeEmailVerify(oldEmail, newEmail, otp)`, `getEmergencyResources()`, `ping()`.
- Produces: `qk` query key registry; `QueryProvider` client component.

- [ ] **Step 1: Write types (mirror backend DTOs exactly)**

```ts
// lib/api/types.ts
export interface UserProfile {
  userId: number; name: string; email: string; gender: string; country: string;
  dateOfBirth: string; generation: string; maritalStatus: string;
  employmentStatus: string; role: string; createdAt: string;
}
export interface MoodEntry {
  id: number; primaryMood: string; moodIntensity: number;
  stressLevel: number; energyLevel: number; createdAt: string;
}
export interface DashboardHome {
  greeting: string; dailyAffirmation: string; currentStreak: number;
  latestMood: MoodEntry | null;
}
export interface MoodLogPayload {
  primaryMood: string; moodIntensity: number; stressLevel: number; energyLevel: number;
}
export interface InsightPoint { date: string; mood: number; stress: number; energy: number }
export interface Insights { weeklyTrends: InsightPoint[]; personalInsight: string }
export interface JournalEntry {
  journalId: number; title: string; content: string; createdAt: string; updatedAt: string;
}
export interface JournalPayload { title: string; content: string }
export interface ChatMessage { content: string; role: string; timestamp: string }
export interface NotificationItem {
  id: number; title: string; message: string; actionUrl: string | null;
  read: boolean; createdAt: string;
}
export interface NotificationSettings {
  pushNotifications: boolean; emailNotifications: boolean; moodReminders: boolean;
  moodReminderTime: string; journalReminders: boolean;
  therapySessionReminders: boolean; communityActivity: boolean;
}
export interface EmergencyResource {
  id: number; name: string; country: string;
  resourceType: 'HOTLINE' | 'WEBSITE' | 'CLINIC'; contactInfo: string; active: boolean;
}
export interface RegisterPayload {
  name: string; gender: string; email: string; password: string;
  dateOfBirth: string; maritalStatus: string; employmentStatus: string; country: string;
}
export type UpdateProfilePayload = Partial<Omit<RegisterPayload, 'password'>>
```

Note: `NotificationDTO.isRead` may serialize as `read` (Lombok boolean getter). Verify against a live response during Task 12 and adjust the field name in ONE place (this type).

- [ ] **Step 2: Write a representative endpoint test**

```ts
// lib/api/endpoints.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from './endpoints'
import { setAccessToken } from './token'

describe('endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setAccessToken('tok')
  })

  it('login posts username and password without auth header, stores token', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'newtok' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    )
    await api.login('a@b.c', 'pw')
    const [url, init] = spy.mock.calls[0]!
    expect(url).toBe('/backend/api/v1/auth/user-login')
    expect(JSON.parse(init!.body as string)).toEqual({ username: 'a@b.c', password: 'pw' })
  })

  it('logMood posts the exact backend payload shape', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
    await api.logMood({ primaryMood: 'Restless', moodIntensity: 7, stressLevel: 6, energyLevel: 4 })
    const [url, init] = spy.mock.calls[0]!
    expect(url).toBe('/backend/api/v1/mood/log')
    expect(JSON.parse(init!.body as string)).toEqual({
      primaryMood: 'Restless', moodIntensity: 7, stressLevel: 6, energyLevel: 4,
    })
  })
})
```

- [ ] **Step 3: Run to verify failure, then implement endpoints**

```ts
// lib/api/endpoints.ts
import { apiFetch } from './client'
import { setAccessToken, clearAccessToken } from './token'
import type {
  DashboardHome, Insights, JournalEntry, JournalPayload, ChatMessage,
  NotificationItem, NotificationSettings, EmergencyResource, MoodLogPayload,
  MoodEntry, RegisterPayload, UpdateProfilePayload, UserProfile,
} from './types'

export async function login(username: string, password: string): Promise<void> {
  const r = await apiFetch<{ accessToken: string }>('/api/v1/auth/user-login', {
    method: 'POST', body: { username, password }, auth: false,
  })
  setAccessToken(r.accessToken)
}
export async function logout(): Promise<void> {
  await apiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined)
  clearAccessToken()
}
export const registerUser = (p: RegisterPayload) =>
  apiFetch('/api/v1/users/register-user', { method: 'POST', body: p, auth: false })
export async function verifyUser(email: string, otp: string): Promise<void> {
  const r = await apiFetch<{ accessToken?: string }>('/api/v1/users/verify-user', {
    method: 'POST', body: { email, otp }, auth: false,
  })
  if (r?.accessToken) setAccessToken(r.accessToken)
}
export const resendRegistrationOtp = (email: string) =>
  apiFetch(`/api/v1/users/resend-registration-otp?email=${encodeURIComponent(email)}`, { method: 'POST', auth: false })
export const forgotPassword = (email: string) =>
  apiFetch(`/api/v1/auth/forgot-password?email=${encodeURIComponent(email)}`, { method: 'POST', auth: false })
export const resetPassword = (email: string, otp: string, newPassword: string) =>
  apiFetch('/api/v1/auth/reset-password', { method: 'POST', body: { email, otp, newPassword }, auth: false })
export const recoveryInitiate = (email: string) =>
  apiFetch(`/api/v1/auth/recovery/initiate?email=${encodeURIComponent(email)}`, { method: 'POST', auth: false })
export async function recoveryConfirm(email: string, otp: string): Promise<void> {
  const r = await apiFetch<{ accessToken?: string }>(
    `/api/v1/auth/recovery/confirm?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
    { method: 'POST', auth: false })
  if (r?.accessToken) setAccessToken(r.accessToken)
}

export const getDashboard = () => apiFetch<DashboardHome>('/api/v1/dashboard/home')
export const logMood = (p: MoodLogPayload) => apiFetch<MoodEntry>('/api/v1/mood/log', { method: 'POST', body: p })
export const getInsights = () => apiFetch<Insights>('/api/v1/mood/analytics')
export const getStreak = () => apiFetch<number>('/api/v1/mood/streak')
export const getJournalHistory = () => apiFetch<JournalEntry[]>('/api/v1/journal/history')
export const getJournal = (id: number) => apiFetch<JournalEntry>(`/api/v1/journal/retrieve/${id}`)
export const createJournal = (p: JournalPayload) => apiFetch<JournalEntry>('/api/v1/journal/entry', { method: 'POST', body: p })
export const updateJournal = (id: number, p: JournalPayload) => apiFetch<JournalEntry>(`/api/v1/journal/update-journal/${id}`, { method: 'PUT', body: p })
export const deleteJournal = (id: number) => apiFetch(`/api/v1/journal/delete-journal/${id}`, { method: 'DELETE' })
export const sendChat = (message: string) => apiFetch<{ response?: string; message?: string }>('/api/v1/users/chat', { method: 'POST', body: { message } })
export const getChatHistory = () => apiFetch<ChatMessage[]>('/api/v1/users/chat/history')
export const getNotifications = () => apiFetch<NotificationItem[]>('/api/v1/users/notifications')
export const getUnreadCount = () => apiFetch<{ count?: number; unreadCount?: number }>('/api/v1/users/notifications/unread-count')
export const markNotificationRead = (id: number) => apiFetch(`/api/v1/users/notifications/${id}/read`, { method: 'PATCH' })
export const getNotificationSettings = () => apiFetch<NotificationSettings>('/api/v1/users/notifications/settings')
export const updateNotificationSettings = (s: NotificationSettings) => apiFetch('/api/v1/users/notifications/settings', { method: 'PUT', body: s })
export const getProfile = () => apiFetch<UserProfile>('/api/v1/users/me')
export const updateProfile = (p: UpdateProfilePayload) => apiFetch('/api/v1/users/me', { method: 'PUT', body: p })
export const deleteAccount = () => apiFetch('/api/v1/users/me', { method: 'DELETE' })
export const changePasswordInitiate = (email: string, oldPassword: string) =>
  apiFetch('/api/v1/users/change-password/initiate', { method: 'POST', body: { email, oldPassword } })
export const changePasswordVerify = (email: string, oldPassword: string, newPassword: string, otp: string) =>
  apiFetch('/api/v1/users/change-password/verify', { method: 'POST', body: { email, oldPassword, newPassword, otp } })
export const changeEmailInitiate = (oldEmail: string, newEmail: string) =>
  apiFetch('/api/v1/users/change-email/initiate', { method: 'POST', body: { oldEmail, newEmail } })
export const changeEmailVerify = (oldEmail: string, newEmail: string, otp: string) =>
  apiFetch('/api/v1/users/change-email/verify', { method: 'POST', body: { oldEmail, newEmail, otp } })
export const getEmergencyResources = () => apiFetch<EmergencyResource[]>('/api/v1/users/support/emergency-resources')
export const ping = () => apiFetch('/api/v1/users/ping')
```

Uncertain response shapes (`getStreak`, `sendChat`, `getUnreadCount`, OTP-flow `Map<String,Object>` bodies): the exact JSON is not visible in the shared backend sources. Treat the types above as the starting contract, verify each against the live API the first time its screen is built, and correct in `types.ts`/`endpoints.ts` only.

- [ ] **Step 4: Query keys and provider**

```ts
// lib/query/keys.ts
export const qk = {
  dashboard: ['dashboard'] as const,
  insights: ['insights'] as const,
  streak: ['streak'] as const,
  journal: ['journal'] as const,
  journalEntry: (id: number) => ['journal', id] as const,
  chat: ['chat'] as const,
  notifications: ['notifications'] as const,
  unread: ['unread'] as const,
  notificationSettings: ['notification-settings'] as const,
  profile: ['profile'] as const,
  resources: ['resources'] as const,
}
```

```tsx
// lib/query/provider.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
    },
  }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

Wrap `{children}` with `<QueryProvider>` inside the root layout body.

- [ ] **Step 5: Run all tests, typecheck, commit**

```bash
npm test && npx tsc --noEmit
git add lib app/layout.tsx
git commit -m "feat: typed endpoint layer and query plumbing"
```

---

### Task 6: Auth guard, sign-in screen, cold-start warmup

**Files:**
- Create: `proxy.ts`, `app/(auth)/layout.tsx`, `app/(auth)/signin/page.tsx`, `components/ui/button.tsx`, `components/ui/field.tsx`

**Interfaces:**
- Consumes: `login`, `ping`, `ApiError`, tokens from Task 2.
- Produces: `<Button variant="primary" | "ghost" | "quiet">` (Chillax label, leaf gradient primary per spec), `<Field label error>` input wrapper. Both reused by every later form. `proxy.ts` bounces cookieless visitors from app routes to `/signin?next=...`.

- [ ] **Step 1: proxy.ts (Next 16 name for middleware)**

```ts
// proxy.ts
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/home', '/insights', '/checkin', '/chat', '/journal', '/notifications', '/you']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PROTECTED.some(p => pathname.startsWith(p)) && !request.cookies.get('user_refresh_token')) {
    const url = new URL('/signin', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/home/:path*', '/insights/:path*', '/checkin/:path*', '/chat/:path*', '/journal/:path*', '/notifications/:path*', '/you/:path*'] }
```

Verify the exact cookie name against a real login response during Step 4; if the backend names it differently, update here only.

- [ ] **Step 2: Button and Field primitives**

```tsx
// components/ui/button.tsx
'use client'
import type { ButtonHTMLAttributes } from 'react'

const styles = {
  primary: 'bg-gradient-to-br from-leaf-bright to-leaf text-white shadow-lg shadow-leaf/30',
  ghost: 'border-2 border-fir text-fir',
  quiet: 'text-fir underline underline-offset-4',
} as const

export function Button({ variant = 'primary', busy, className = '', children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof styles; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={`font-display font-semibold rounded-2xl px-5 py-3.5 text-base transition
        active:scale-[.98] disabled:opacity-60 disabled:pointer-events-none ${styles[variant]} ${className}`}
    >
      {busy ? 'One moment' : children}
    </button>
  )
}
```

```tsx
// components/ui/field.tsx
'use client'
import type { InputHTMLAttributes } from 'react'

export function Field({ label, error, ...rest }:
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      <input
        {...rest}
        aria-invalid={!!error}
        className="w-full rounded-xl border-[1.5px] border-fir/30 bg-card px-4 py-3 text-[15px]
          outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/25"
      />
      {error ? <span role="alert" className="block text-sm text-clay mt-1.5">{error}</span> : null}
    </label>
  )
}
```

Note the gradient exception: the primary button is a living element (the leaf action), the one place chrome may carry the leaf gradient.

- [ ] **Step 3: Auth layout with warmup**

```tsx
// app/(auth)/layout.tsx
'use client'
import { useEffect, useState, type ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const [waking, setWaking] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setWaking(true), 8000)
    fetch('/backend/actuator/health').catch(() => undefined).finally(() => {
      clearTimeout(t); setWaking(false)
    })
    return () => clearTimeout(t)
  }, [])
  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-10 max-w-md mx-auto lg:max-w-lg">
      {waking ? (
        <p className="mb-6 rounded-xl border-[1.5px] border-dashed border-fir/40 px-4 py-3 text-sm">
          Connecting. The server is waking up, this can take about a minute.
        </p>
      ) : null}
      {children}
    </main>
  )
}
```

(The health endpoint currently returns 403; the request still wakes Render. If the backend opens it later per `docs/BACKEND-NOTES.md`, nothing changes here.)

- [ ] **Step 4: Sign-in page**

```tsx
// app/(auth)/signin/page.tsx
'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/api/endpoints'
import { ApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await login(email, password)
      router.replace(params.get('next') ?? '/home')
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 && !err.coldStart
        ? 'Wrong email or password.' : err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1 className="font-display font-semibold text-5xl leading-[1.02] tracking-tight mb-4">
        Ears<br />for <span className="text-leaf">you.</span>
      </h1>
      <Field label="Email" type="email" autoComplete="email" required
        value={email} onChange={e => setEmail(e.target.value)} />
      <Field label="Password" type="password" autoComplete="current-password" required
        value={password} onChange={e => setPassword(e.target.value)} error={error ?? undefined} />
      <Button type="submit" busy={busy}>Sign in</Button>
      <Button type="button" variant="ghost" onClick={() => router.push('/register')}>Create an account</Button>
      <Link className="text-sm underline underline-offset-4 opacity-80 self-start" href="/forgot-password">
        Forgot password?
      </Link>
    </form>
  )
}

export default function SignInPage() {
  return <Suspense><SignInForm /></Suspense>
}
```

- [ ] **Step 5: Verify, commit**

`npm test && npx tsc --noEmit && npm run lint`. Then with dev server: visiting `/home` without a cookie redirects to `/signin?next=/home`; a wrong-password submit shows "Wrong email or password." after the request completes.

```bash
git add proxy.ts app/\(auth\) components/ui
git commit -m "feat: sign in, route protection, cold start warmup"
```

---

### Task 7: OTP input, registration, password reset, recovery

**Files:**
- Create: `components/otp-input.tsx`, `components/otp-input.test.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/verify/page.tsx`, `app/(auth)/forgot-password/page.tsx`, `app/(auth)/recovery/page.tsx`

**Interfaces:**
- Consumes: endpoint functions from Task 5, `Button`/`Field` from Task 6.
- Produces: `<OtpInput length={6} onComplete={(code) => void} />` and `<ResendButton cooldownSeconds={60} onResend={() => Promise<unknown>} />` (exported from `components/otp-input.tsx`), reused later by the You screens (Task 13).

- [ ] **Step 1: Write failing OTP component tests**

```tsx
// components/otp-input.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OtpInput } from './otp-input'

describe('OtpInput', () => {
  it('auto-advances across boxes and fires onComplete with the full code', async () => {
    const done = vi.fn()
    render(<OtpInput length={6} onComplete={done} />)
    const boxes = screen.getAllByRole('textbox')
    expect(boxes).toHaveLength(6)
    await userEvent.type(boxes[0]!, '472913')
    expect(done).toHaveBeenCalledWith('472913')
  })

  it('fills all boxes from a paste', async () => {
    const done = vi.fn()
    render(<OtpInput length={6} onComplete={done} />)
    const boxes = screen.getAllByRole('textbox')
    boxes[0]!.focus()
    await userEvent.paste('307211')
    expect(done).toHaveBeenCalledWith('307211')
  })

  it('ignores non-digits', async () => {
    const done = vi.fn()
    render(<OtpInput length={6} onComplete={done} />)
    const boxes = screen.getAllByRole('textbox')
    await userEvent.type(boxes[0]!, 'ab12cd34xy')
    expect(done).toHaveBeenCalledWith(expect.stringMatching(/^\d{6}$/))
  })
})
```

- [ ] **Step 2: Run to verify fail, implement OtpInput + ResendButton**

```tsx
// components/otp-input.tsx
'use client'
import { useRef, useState, useEffect } from 'react'

export function OtpInput({ length = 6, onComplete }: { length?: number; onComplete: (code: string) => void }) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const refs = useRef<Array<HTMLInputElement | null>>([])

  function commit(next: string[]) {
    setValues(next)
    const code = next.join('')
    if (code.length === length && next.every(Boolean)) onComplete(code)
  }

  function handleChange(i: number, raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return
    const next = [...values]
    let cursor = i
    for (const d of digits.slice(0, length - i)) {
      next[cursor] = d
      cursor += 1
    }
    commit(next)
    refs.current[Math.min(cursor, length - 1)]?.focus()
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !values[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'Backspace') {
      const next = [...values]; next[i] = ''; setValues(next)
    }
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Verification code">
      {values.map((v, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          value={v}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={e => { e.preventDefault(); handleChange(i, e.clipboardData.getData('text')) }}
          className="w-12 h-14 rounded-xl border-[1.5px] border-fir/30 bg-card text-center
            font-display font-semibold text-xl focus:border-leaf focus:ring-2 focus:ring-leaf/25 outline-none"
        />
      ))}
    </div>
  )
}

export function ResendButton({ cooldownSeconds = 60, onResend }:
  { cooldownSeconds?: number; onResend: () => Promise<unknown> }) {
  const [left, setLeft] = useState(cooldownSeconds)
  useEffect(() => {
    if (left <= 0) return
    const t = setInterval(() => setLeft(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [left])
  return (
    <button
      type="button"
      disabled={left > 0}
      onClick={async () => { await onResend(); setLeft(cooldownSeconds) }}
      className="text-sm underline underline-offset-4 disabled:no-underline disabled:opacity-60"
    >
      {left > 0 ? `Resend code (0:${String(left).padStart(2, '0')})` : 'Resend code'}
    </button>
  )
}
```

Run: `npm test -- otp` until PASS.

- [ ] **Step 3: Registration page (three steps, one route)**

`app/(auth)/register/page.tsx` is a client component holding a `step` state (1 identity, 2 about you, 3 password) and one `RegisterPayload` draft object. Key requirements, all in this file:

- Step 1: name (`Field`), email (`Field type=email`). Continue disabled until both valid (email via `/.+@.+\..+/`).
- Step 2: gender (native `<select>`: Female, Male, Non-binary, Prefer not to say), country (`<select>` from a `COUNTRIES` const of ~30 common countries including Nigeria first; plain strings, backend takes any string), date of birth (`<input type="date">`, max = today minus 13 years), marital status (`<select>`: Single, Married, Divorced), employment status (`<select>`: Student, Employed, Self Employed, Unemployed). Values must be the exact display strings listed here (backend enum `@JsonCreator` matches display names). Include the line: "Why we ask: it shapes how the companion talks with you. Never shown to anyone."
- Step 3: password + confirm (min 8 chars, must match), then submit `registerUser(draft)`; on success `router.push('/verify?email=' + encodeURIComponent(draft.email))`. Show `ApiError.friendly` on failure. A progress line "Step N of 3" in plain text (not an uppercase eyebrow), Back buttons on steps 2 and 3.
- Each step is a `<form>` whose submit advances; step transitions animate with a simple `motion.div` fade/slide (import from `motion/react`), skipped under reduced motion (use the `useReducedMotion()` hook from `motion/react`).

- [ ] **Step 4: Verify page**

`app/(auth)/verify/page.tsx` (wrap in Suspense like signin): reads `email` from search params, headline "Check your email", masked email line, `OtpInput` calling `verifyUser(email, code)` on complete, `ResendButton` calling `resendRegistrationOtp(email)`. On success route `router.replace('/home')` (verify logs the user in). On `ApiError` show the friendly message under the boxes and clear focus back to the first box.

- [ ] **Step 5: Forgot password and recovery pages**

`app/(auth)/forgot-password/page.tsx`: three inline stages in one client component. Stage 1 email form calling `forgotPassword(email)`; stage 2 `OtpInput` (collect code only, no request yet) + `ResendButton` with `resendForgottenPasswordOtp`; add that function to `lib/api/endpoints.ts`:

```ts
export const resendForgottenPasswordOtp = (email: string) =>
  apiFetch(`/api/v1/auth/resend-forgotten-password-otp?email=${encodeURIComponent(email)}`, { method: 'POST', auth: false })
```

Stage 3 new password + confirm, submit `resetPassword(email, otp, newPassword)`, success message with a "Sign in" button to `/signin`.

`app/(auth)/recovery/page.tsx`: stage 1 email calling `recoveryInitiate(email)`; stage 2 `OtpInput` calling `recoveryConfirm(email, code)` which signs the user in; on success `router.replace('/home')`. Link to `/recovery` from the forgot-password page ("Lost access to this email? Recover your account").

- [ ] **Step 6: Verify all states manually, commit**

`npm test && npx tsc --noEmit && npm run lint`. Dev server: register with a real email you control, receive OTP, verify, land on `/home` (404 for now, fine). Confirm resend cooldown ticks, wrong OTP shows a sentence, back buttons preserve entered data.

```bash
git add components/otp-input.tsx components/otp-input.test.tsx app/\(auth\) lib/api/endpoints.ts
git commit -m "feat: registration, otp verification, password reset and recovery"
```

---

### Task 8: App shell, tab bar, state primitives

**Files:**
- Create: `app/(app)/layout.tsx`, `components/shell/tab-bar.tsx`, `components/ui/skeleton.tsx`, `components/ui/error-state.tsx`, `components/ui/empty-state.tsx`, `components/ui/sheet.tsx`, `lib/use-idle-ping.ts`

**Interfaces:**
- Consumes: `onAuthExpired`, `ping`, `logout`.
- Produces: `<TabBar />` (phone bottom bar + desktop left rail, center leaf links to `/checkin`), `<Skeleton lines>` ground-line shimmer, `<ErrorState error retry>` (renders `ApiError.friendly` + one retry button; if `error.coldStart`, shows the waking message), `<EmptyState title body action>`, `<Sheet open onClose title>` bottom sheet (phone) / centered dialog (desktop). Every screen task consumes these; no screen invents its own state visuals.

- [ ] **Step 1: Shell layout**

```tsx
// app/(app)/layout.tsx
'use client'
import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { QueryProvider } from '@/lib/query/provider'
import { onAuthExpired } from '@/lib/api/client'
import { TabBar } from '@/components/shell/tab-bar'
import { useIdlePing } from '@/lib/use-idle-ping'

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    onAuthExpired(() => router.replace('/signin'))
  }, [router])
  const idlePrompt = useIdlePing()
  return (
    <QueryProvider>
      <div className="min-h-dvh flex flex-col lg:flex-row lg:max-w-6xl lg:mx-auto">
        <TabBar />
        <main className="flex-1 pb-28 lg:pb-8 lg:pl-8">{children}</main>
        {idlePrompt}
      </div>
    </QueryProvider>
  )
}
```

(Move `QueryProvider` here from the root layout if Task 5 put it there; auth pages do not need it.)

- [ ] **Step 2: TabBar with recomposition**

`components/shell/tab-bar.tsx`, client component using `usePathname()`. Phone (`lg:hidden`): fixed bottom bar, five slots in order Home `/home`, Insights `/insights`, raised center leaf `/checkin` (56px circle, leaf gradient, white leaf SVG icon from the approved mockups), Chat `/chat`, Journal `/journal`; active tab full opacity + semibold, inactive 55%. Desktop (`hidden lg:flex`): left rail, wordmark "Ears for you." in Chillax at top, vertical nav with the same five items (leaf button rendered as a full-width primary button labeled "Check in"), pushed-to-bottom link to `/you`. Icons: inline SVGs copied from the approved hi-fi mockups (home roofline, insights layered lines, chat bubble, journal book), 21px, `stroke-width 1.8`.

- [ ] **Step 3: State primitives**

```tsx
// components/ui/skeleton.tsx
export function Skeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-full bg-fir/10"
          style={{ width: `${85 - (i % 3) * 15}%` }} />
      ))}
    </div>
  )
}
```

```tsx
// components/ui/error-state.tsx
import { ApiError, COLD_START_MESSAGE } from '@/lib/api/errors'
import { Button } from './button'

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const msg = error instanceof ApiError
    ? (error.coldStart ? COLD_START_MESSAGE : error.friendly)
    : 'Something went wrong. Try again.'
  return (
    <div role="alert" className="rounded-2xl bg-card px-5 py-6 text-center space-y-3">
      <p className="text-[15px]">{msg}</p>
      {retry ? <Button variant="ghost" onClick={retry}>Try again</Button> : null}
    </div>
  )
}
```

```tsx
// components/ui/empty-state.tsx
import type { ReactNode } from 'react'

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-dashed border-fir/30 px-5 py-8 text-center space-y-2">
      <p className="font-display font-semibold text-lg">{title}</p>
      <p className="text-sm opacity-70">{body}</p>
      {action}
    </div>
  )
}
```

`components/ui/sheet.tsx`: client component, `{ open, onClose, title, children }`. Renders a fixed inset overlay (`bg-night/50`) and a panel: phone slides from bottom (`rounded-t-3xl bg-oat max-h-[85dvh] overflow-auto`), desktop (`lg:`) centered `max-w-lg rounded-3xl`. Closes on overlay click and Escape. Focus the panel on open (`ref` + `useEffect`), `role="dialog"` `aria-modal`.

- [ ] **Step 4: Idle keep-alive hook**

`lib/use-idle-ping.ts`: tracks `pointerdown`/`keydown` timestamps; after 12 minutes without events while tab visible, returns a small fixed banner element ("Still there? Stay signed in" + Button calling `ping()` then dismissing). Returns `ReactNode | null`. Simple `useState` + `useEffect` interval check every 30s; no test required beyond typecheck (browser-only timing).

- [ ] **Step 5: Placeholder pages, verify, commit**

Create minimal `app/(app)/home/page.tsx` (`<Skeleton lines={4} />` inside a heading shell) so the shell renders. Sign in on the dev server: phone viewport shows bottom bar with raised leaf; desktop (resize past 1024px) shows the left rail instead. Keyboard-tab through the bar; focus visible.

```bash
npm test && npx tsc --noEmit && npm run lint
git add app/\(app\) components lib/use-idle-ping.ts lib/query/provider.tsx app/layout.tsx
git commit -m "feat: app shell with adaptive tab bar and shared state primitives"
```

---

### Task 9: Home with the time-aware garden

**Files:**
- Create: `lib/sky.ts`, `lib/sky.test.ts`, `lib/garden.ts`, `lib/garden.test.ts`, `components/garden/plant.tsx`, `components/garden/sky-scene.tsx`, `app/(app)/home/page.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `getDashboard`, `getUnreadCount`, `getInsights`, `qk`, state primitives.
- Produces: `skyStateFor(hour: number): 'morning' | 'day' | 'evening' | 'night'`; `plantShape(streak: number): { leaves: number; hasBloom: boolean }`; `<Plant streak size />` SVG; `<SkyScene state streak latestMood greeting sub cta />` hero.

- [ ] **Step 1: Failing tests for the pure logic**

```ts
// lib/sky.test.ts
import { describe, it, expect } from 'vitest'
import { skyStateFor } from './sky'

describe('skyStateFor', () => {
  it.each([
    [5, 'morning'], [9, 'morning'],
    [11, 'day'], [16, 'day'],
    [17, 'evening'], [20, 'evening'],
    [22, 'night'], [2, 'night'],
  ] as const)('hour %i is %s', (hour, state) => {
    expect(skyStateFor(hour)).toBe(state)
  })
})
```

```ts
// lib/garden.test.ts
import { describe, it, expect } from 'vitest'
import { plantShape } from './garden'

describe('plantShape', () => {
  it('earns one leaf per two days, capped at 8', () => {
    expect(plantShape(0).leaves).toBe(0)
    expect(plantShape(1).leaves).toBe(0)
    expect(plantShape(12).leaves).toBe(6)
    expect(plantShape(40).leaves).toBe(8)
  })
  it('blooms on multiples of 7', () => {
    expect(plantShape(7).hasBloom).toBe(true)
    expect(plantShape(12).hasBloom).toBe(false)
    expect(plantShape(21).hasBloom).toBe(true)
    expect(plantShape(0).hasBloom).toBe(false)
  })
})
```

- [ ] **Step 2: Implement the logic**

```ts
// lib/sky.ts
export type SkyState = 'morning' | 'day' | 'evening' | 'night'
export function skyStateFor(hour: number): SkyState {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'day'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}
```

```ts
// lib/garden.ts
export function plantShape(streak: number): { leaves: number; hasBloom: boolean } {
  return {
    leaves: Math.min(8, Math.floor(streak / 2)),
    hasBloom: streak > 0 && streak % 7 === 0,
  }
}
```

Run: `npm test -- sky garden` until PASS.

- [ ] **Step 3: Plant and SkyScene components**

`components/garden/plant.tsx`: an SVG (viewBox `0 0 200 150`) generated from `plantShape(streak)`. Two stems (paths from the approved mockup), then up to 8 leaves: use the four leaf paths from the hi-fi mockup as positions 1 to 4 and four more mirrored/offset variants for 5 to 8, rendered when `index < leaves`, alternating fills `#47A566`/`#2E7D49` with the sprout tip `#7BC48F` always present once `leaves >= 1`. Bloom: marigold circle pair at the stem tip when `hasBloom`. Wrap paths in a `<g>`; when `prefers-reduced-motion` is not set, animate `pathLength`/opacity on mount with `motion` (stems draw over 600ms, leaves fade in staggered 60ms). Exact base paths: copy from `.superpowers/brainstorm/31663-1785999184/content/hifi-home-v2.html` (the `<g transform="translate(236 176)">` group).

`components/garden/sky-scene.tsx`: props `{ state: SkyState; streak: number; latestMood: MoodEntry | null; greeting: string; sub: string; cta?: ReactNode }`. Renders the 348px-tall hero: an SVG scene per state (copy the evening and morning scenes verbatim from the mockup file; day = morning sky without the low sun glow, sun higher and smaller; night = evening sky without the gold horizon band, more stars, fireflies kept), the `<Plant streak>` positioned on the front hill, a clay flag group at fixed position labeled by `latestMood` (omit when null), and the greeting block overlaid (Chillax 38px, `.glow` word in marigold on dark states / leaf on light states, sub line 13.5px, optional cta chip). Text colors switch by dark/light state exactly as in the mockup CSS (`.eve`/`.morn` rules). The paper-colored ground curve at the bottom is part of the scene SVG.

- [ ] **Step 4: Home page**

`app/(app)/home/page.tsx` (client):

- `useQuery({ queryKey: qk.dashboard, queryFn: getDashboard })`, `useQuery({ queryKey: qk.unread, queryFn: getUnreadCount })`, `useQuery({ queryKey: qk.insights, queryFn: getInsights })` (for the week teaser; tolerate failure silently by rendering the teaser only on success).
- Loading: full-width sky-colored block with `Skeleton` inside the sheet area. Error: `ErrorState` with `refetch`. Success: `SkyScene` with `state = skyStateFor(new Date().getHours())`, greeting from API, sub line composed from data: if `latestMood` today, `"{mood} earlier, strength {intensity}. The garden's still waiting on today's water."` or `"Day {n} is watered. Come back tomorrow."` if already logged today (compare `latestMood.createdAt` date to today); if no mood ever, `"A fresh start. Plant the first check-in."`. CTA chip "Water day {streak + 1}" links `/checkin`, hidden when today is already logged.
- Top bar overlaid on the scene: bell button (badge = unread count when > 0) linking `/notifications`, avatar initial linking `/you`.
- Sheet below (pulled up over the scene bottom, `-mt-8 rounded-t-3xl bg-oat relative z-10` on phone): streak numeral block (`font-display font-bold text-5xl` + "days tended" small), week dots (7 dots for the last 7 days: filled leaf when that date has a `weeklyTrends` point with mood, marigold when that date's streak index is a multiple of 7, dashed outline for today-unlogged), affirmation card (oversized `"` mark in leaf, `dailyAffirmation` text in Chillax 20px, save action writing to `localStorage` key `saved-affirmations` and share action using `navigator.share` when available, hidden otherwise), week teaser card (mini `TerrainChart` from Task 10 once it exists; until then a static placeholder box with "This week's ground" linking `/insights`; circle back after Task 10 and swap in `<TerrainChart points={...} mini />`).
- Desktop `lg:` recomposition: scene keeps full width at 300px tall; below, two columns (`grid lg:grid-cols-2 gap-6`): left column streak + affirmation, right column week chart card.

- [ ] **Step 5: Verify states, commit**

Dev server checks: fresh account (no moods) shows the planted-first-check-in copy and no flag; the scene matches the current time of day; system clock change (or temporarily hardcoding `skyStateFor(7)`) shows the morning world; reduced motion in OS settings stops the draw-in. `npm test && npx tsc --noEmit && npm run lint`.

```bash
git add lib/sky.ts lib/sky.test.ts lib/garden.ts lib/garden.test.ts components/garden app/\(app\)/home
git commit -m "feat: home with time-aware garden scene and earned plant"
```

---

### Task 10: Terrain chart and Insights

**Files:**
- Create: `lib/charts/terrain.ts`, `lib/charts/terrain.test.ts`, `components/charts/terrain-chart.tsx`, `app/(app)/insights/page.tsx`
- Modify: `app/(app)/home/page.tsx` (swap teaser placeholder for `<TerrainChart mini>`)

**Interfaces:**
- Consumes: `getInsights`, `getStreak`, `qk`, state primitives.
- Produces: `terrainPath(values: number[], width: number, height: number, min?: number, max?: number): string` (smooth SVG path through the points); `<TerrainChart points: InsightPoint[]; mini?: boolean />`.

- [ ] **Step 1: Failing path generation tests**

```ts
// lib/charts/terrain.test.ts
import { describe, it, expect } from 'vitest'
import { terrainPath } from './terrain'

describe('terrainPath', () => {
  it('starts at the left edge and visits the right edge', () => {
    const d = terrainPath([5, 7, 3], 300, 100)
    expect(d.startsWith('M 0')).toBe(true)
    expect(d).toContain('300')
  })
  it('maps higher values to smaller y (up)', () => {
    const low = terrainPath([1], 100, 100)
    const high = terrainPath([10], 100, 100)
    const yOf = (d: string) => Number(d.split(' ')[2])
    expect(yOf(high)).toBeLessThan(yOf(low))
  })
  it('returns empty string for no points', () => {
    expect(terrainPath([], 300, 100)).toBe('')
  })
  it('handles a single point without NaN', () => {
    expect(terrainPath([5], 300, 100)).not.toMatch(/NaN/)
  })
})
```

- [ ] **Step 2: Implement terrainPath (Catmull-Rom to bezier)**

```ts
// lib/charts/terrain.ts
export function terrainPath(values: number[], width: number, height: number, min = 1, max = 10): string {
  if (values.length === 0) return ''
  const pad = 6
  const usable = height - pad * 2
  const x = (i: number) => values.length === 1 ? 0 : (i / (values.length - 1)) * width
  const y = (v: number) => pad + usable * (1 - (v - min) / (max - min))
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

Run: `npm test -- terrain` until PASS.

- [ ] **Step 3: TerrainChart component**

`components/charts/terrain-chart.tsx` (client): props `{ points: InsightPoint[]; mini?: boolean }`. Full mode: `viewBox 0 0 320 150`, three series drawn with `terrainPath`: mood (leaf, `stroke-width 2.8`, plus a soft fill: the mood path closed down to the baseline filled with a leaf gradient at 0.5 to 0.06 opacity), energy (marigold-deep, 2.2), stress (clay, 2, `stroke-dasharray="5 5"`); horizontal gridlines at values 3/6/9 (fir at 7 to 10% opacity); first and last date labels (10px, format weekday short from `date`); a legend row below (Mood, Energy, Stress dashed). Mini mode: `viewBox 0 0 328 64`, mood series only with fill, latest point marked with a marigold dot. Entry animation: `motion` path `pathLength` 0 to 1 over 700ms staggered per series; skip under reduced motion. Accessibility: `role="img"` with an `aria-label` summarizing the latest values ("Mood 7, energy 4, stress 6 on the latest day").

- [ ] **Step 4: Insights page**

`app/(app)/insights/page.tsx` (client): queries `qk.insights` / `getInsights` and `qk.streak` / `getStreak`.

- Heading "Your week, as ground." in Chillax 30px with sub line showing the date range and check-in count from `weeklyTrends`.
- Success with `weeklyTrends.length >= 2`: card with `TerrainChart`, then the pressed-leaf note (fir-deep card, ghosted white leaf SVG at low opacity in the corner, `personalInsight` in Chillax 16.5px, source line "Written from your recent check-ins"), then streak stat card ("Current streak" + Chillax numeral).
- Fewer than 2 points: `EmptyState` "Not enough ground yet." / "Two check-ins is all it takes to draw your first line." with a Button linking `/checkin` in the chart's place; still show `personalInsight` if the API returned one.
- Loading: `Skeleton lines={6}`. Error: `ErrorState` + refetch.
- Desktop: chart card and insight note side by side (`lg:grid-cols-[3fr_2fr]`), streak stat under the note.
- Also update the Home teaser card to `<TerrainChart points={insights.weeklyTrends} mini />` per Task 9 Step 4.

- [ ] **Step 5: Verify, commit**

Log two moods on different values via the UI or curl, confirm the lines draw and the empty state disappears at 2 points. `npm test && npx tsc --noEmit && npm run lint`.

```bash
git add lib/charts components/charts app/\(app\)/insights app/\(app\)/home
git commit -m "feat: terrain charts and insights page"
```

---

### Task 11: Check-in flow and celebration

**Files:**
- Create: `app/(app)/checkin/page.tsx`, `components/checkin/mood-slider.tsx`, `components/checkin/mood-slider.test.tsx`, `components/checkin/celebration.tsx`

**Interfaces:**
- Consumes: `logMood`, `getStreak`, `qk`, `Button`, motion.
- Produces: self-contained; Home's CTA and the tab leaf already link here.

- [ ] **Step 1: Failing slider test**

```tsx
// components/checkin/mood-slider.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MoodSlider } from './mood-slider'

describe('MoodSlider', () => {
  it('renders the current value and calls onChange within 1..10', async () => {
    const onChange = vi.fn()
    render(<MoodSlider label="Stress" color="clay" value={6} onChange={onChange} />)
    expect(screen.getByText('6')).toBeInTheDocument()
    const input = screen.getByRole('slider', { name: /stress/i })
    await userEvent.type(input, '{arrowright}')
    expect(onChange).toHaveBeenCalledWith(7)
  })
})
```

- [ ] **Step 2: Implement MoodSlider**

`components/checkin/mood-slider.tsx`: a labeled native `<input type="range" min={1} max={10} step={1}>` (native = free keyboard and touch a11y) visually styled per the mockup: the native input is transparent over a custom track (rounded rail `bg-fir/15`, filled portion in the dimension color, notch ticks) with a 30px knob showing the dimension glyph (leaf/ring/sun inline SVGs from the hi-fi mockup, chosen by `color` prop: `leaf` | `clay` | `marigold`). Props: `{ label: string; color: 'leaf' | 'clay' | 'marigold'; value: number; onChange: (v: number) => void }`. Value displayed in Chillax next to the label. Run the test until PASS.

- [ ] **Step 3: Check-in page**

`app/(app)/checkin/page.tsx` (client), full-screen flow (no tab bar visually competing: the page renders its own close button linking back to `/home`):

- Beat 1: "How's today?" + mood word chips: `['Calm','Restless','Drained','Hopeful','Heavy','Numb','Fine, actually']` plus an "Add your own" chip revealing a text input (free string, max 24 chars). Selecting advances to beat 2 (motion slide; back link available).
- Beat 2: "Where's it sitting?" + three `MoodSlider`s: How strong is it? (leaf, `moodIntensity`), Stress (clay, `stressLevel`), Energy (marigold, `energyLevel`), all defaulting to 5. Submit Button "Log today" runs `useMutation({ mutationFn: () => logMood(payload) })` with `busy` state; on error, `ErrorState` inline with retry (values preserved).
- On success: `queryClient.invalidateQueries({ queryKey: qk.dashboard })`, same for `qk.insights`, `qk.streak`; then render `<Celebration streak={newStreak} />` where `newStreak` comes from refetching `getStreak()` after the mutation (fallback: dashboard's `currentStreak + 1`).

- [ ] **Step 4: Celebration**

`components/checkin/celebration.tsx`: full-screen fixed overlay, night radial background (`bg-[radial-gradient(...)]` values from the mockup), the marigold bloom SVG (8 petals) with each petal `motion` scaling in from the center staggered 40ms with spring easing, 5 drifting seed dots (slow `y` animation), headline "Day {streak}." then "Still growing." with the second line in marigold, sub line "{streak} check-ins in a row. The marigold only blooms for you." Auto-dismisses to `/home` after 2.5s (`setTimeout` + `router.replace`), any tap dismisses immediately, and under reduced motion the bloom renders fully-formed static and dismiss time drops to 1.5s.

- [ ] **Step 5: Verify, commit**

Full loop on dev server: check in, watch celebration, land on Home with streak bumped and the plant one leaf richer (at even streaks). `npm test && npx tsc --noEmit && npm run lint`.

```bash
git add app/\(app\)/checkin components/checkin
git commit -m "feat: mood check-in flow with celebration"
```

---

### Task 12: Journal and Notifications

**Files:**
- Create: `app/(app)/journal/page.tsx`, `app/(app)/journal/[id]/page.tsx`, `app/(app)/notifications/page.tsx`

**Interfaces:**
- Consumes: journal endpoints, notification endpoints, `qk`, primitives, `Sheet`.

- [ ] **Step 1: Journal list**

`app/(app)/journal/page.tsx`: query `qk.journal` / `getJournalHistory`. Success: entries sorted by `createdAt` desc, grouped by human date ("Today", "Yesterday", else "Aug 3"); each row card shows title (or "Untitled" at 60% opacity) and a one-line content preview, links to `/journal/{journalId}`. Primary Button "Write something" links `/journal/new`. Empty: `EmptyState title="Nothing planted yet." body="Write the first thing that comes. No structure needed."` with that same button as action. Loading: three `Skeleton` cards. Error: `ErrorState`. Desktop: two-column masonry-free grid (`lg:columns-2` is acceptable), list capped at `max-w-3xl`.

- [ ] **Step 2: Journal editor**

`app/(app)/journal/[id]/page.tsx` (client; `const { id } = use(params)` per React 19 / Next 16 promise params, where `params` is the prop typed `Promise<{ id: string }>`). `id === 'new'` means create mode; otherwise fetch `qk.journalEntry(Number(id))` / `getJournal`.

- Layout: borderless title input (Chillax 24px, placeholder "Title, if it wants one") and a flex-1 `<textarea>` (General Sans 16px, `leading-relaxed`, placeholder "Say it how it actually is."), oat background, no card chrome. Save Button appears in the top bar once dirty; runs `createJournal` or `updateJournal`, invalidates `qk.journal` (+ the entry key on update), navigates back to `/journal` with the button showing busy state.
- Dirty guard: `beforeunload` listener plus intercepting the in-app Back link with a `Sheet` ("Leave without saving?" / Keep writing / Discard).
- Delete (edit mode only): quiet text button at the bottom, opens `Sheet` "Delete this entry? It cannot be brought back." with a destructive confirm (`bg-clay` Button) calling `deleteJournal`, invalidating `qk.journal`, navigating to `/journal`.
- Error/loading states via primitives; a failed save keeps text intact and shows the error inline above the editor.

- [ ] **Step 3: Notifications**

`app/(app)/notifications/page.tsx`: query `qk.notifications` / `getNotifications`. Rows: unread rows on `bg-card` with a marigold dot, read rows plain at 75% opacity; title semibold, message below, relative time. Tapping a row calls `markNotificationRead(id)` (optimistic: flip the row immediately, invalidate `qk.notifications` and `qk.unread` on settle) and follows `actionUrl` with `router.push` only when it is a non-empty same-app path (starts with `/`). Empty: `EmptyState title="All quiet." body="When something needs you, it lands here."`. Verify the live JSON field (`read` vs `isRead`) here and fix `NotificationItem` if needed. Desktop: centered `max-w-2xl`.

- [ ] **Step 4: Verify, commit**

Create, edit, delete a journal entry against the live backend; confirm the dirty guard fires; notifications mark read and the Home badge drops. `npm test && npx tsc --noEmit && npm run lint`.

```bash
git add app/\(app\)/journal app/\(app\)/notifications
git commit -m "feat: journal crud and notifications"
```

---

### Task 13: Chat with lifeline, You space

**Files:**
- Create: `app/(app)/chat/page.tsx`, `components/lifeline.tsx`, `app/(app)/you/page.tsx`

**Interfaces:**
- Consumes: chat/support/profile/settings endpoints, `OtpInput`/`ResendButton`, `Sheet`, primitives.
- Produces: `<Lifeline />` row + resources sheet, also mounted inside You.

- [ ] **Step 1: Lifeline**

`components/lifeline.tsx` (client): a slim always-visible row (marigold border on `#FBF7EC`-toned card, text "Need support right now?" + underlined "Emergency resources") opening a `Sheet` titled with the user's country when profile is cached ("Right now, Nigeria"). Inside: query `qk.resources` / `getEmergencyResources` with `staleTime: Infinity` and `placeholderData` from the query cache so previously loaded data always renders (the never-dead-end rule); rows grouped by `resourceType`: HOTLINE rows are `<a href={`tel:${contactInfo}`}>` with a fir-deep fill and a bold Call affordance, WEBSITE rows external links (`target="_blank" rel="noopener"`), CLINIC rows plain with the contact info selectable. Filter `active !== false`. Visual restraint: no illustration, no cheer, list only. Error with no cached data: plain text "Could not load resources. Retry." plus a static line "If you are in immediate danger, call your local emergency number."

- [ ] **Step 2: Chat page**

`app/(app)/chat/page.tsx` (client):

- History: `useQuery({ queryKey: qk.chat, queryFn: getChatHistory })`, rendered oldest to newest, auto-scrolled to bottom on load and on new messages (`ref` + `scrollIntoView`). User rows (`role` matching `User`, case-insensitive) right-aligned fir bubbles with cream text; assistant rows left-aligned card bubbles. Timestamps as quiet 11px lines when more than 10 minutes pass between messages. System/other roles are not rendered.
- Composer: pinned bottom (above the tab bar height on phone), rounded-full input + send Button (disabled when empty or while sending). Above it, always: `<Lifeline />`.
- Send: `useMutation` with optimistic update: append the user message to the `qk.chat` cache immediately, set a `thinking` flag rendering the sprout indicator bubble (three `bg-leaf` dots with the staggered bounce from the mockup, `motion` or CSS keyframes, static under reduced motion). On success append the assistant reply (from the send response if it returns one, else `invalidateQueries(qk.chat)`); on error mark the optimistic bubble failed (60% opacity + "Not sent. Tap to retry." button that re-fires the mutation with the same text).
- Empty history: a single assistant-styled welcome bubble rendered client-side: "This space is yours. Say whatever is on your mind, I'm listening." (not sent to the API).
- Desktop: thread centered `max-w-2xl`, composer sticky within the column.

- [ ] **Step 3: You space**

`app/(app)/you/page.tsx` (client): profile query `qk.profile` / `getProfile`. Calm single column (`max-w-xl`), sections:

- Header: avatar circle with initial, name in Chillax, email + "Member since {createdAt year}" quiet.
- Profile details: `Sheet`-based editor (name, gender, country, date of birth, marital status, employment status; same field components and enum options as registration Step 2) submitting `updateProfile` and invalidating `qk.profile`. Note: `UpdateUser` also accepts `email`; do NOT send email here, email changes go through their OTP flow.
- Change password: `Sheet` flow: current password → `changePasswordInitiate(email, oldPassword)` → `OtpInput` + new password + confirm → `changePasswordVerify(email, oldPassword, newPassword, otp)` with `ResendButton` on `resendPasswordChangeOtp`; add to endpoints:

```ts
export const resendPasswordChangeOtp = () =>
  apiFetch('/api/v1/users/resend-password-change-otp', { method: 'POST' })
export const resendEmailChangeOtp = () =>
  apiFetch('/api/v1/users/resend-email-change-otp', { method: 'POST' })
```

- Change email: `Sheet` flow: new email → `changeEmailInitiate(profile.email, newEmail)` → `OtpInput` → `changeEmailVerify(profile.email, newEmail, otp)`; on success invalidate `qk.profile` and show "Email updated."
- Notification preferences: toggles bound to `qk.notificationSettings` / `getNotificationSettings`, each flip optimistic-updating and `updateNotificationSettings({ ...current, [key]: value })`; `moodReminderTime` as `<input type="time">` shown only when `moodReminders` is on. Toggle component: `components/ui/toggle.tsx`, a `role="switch"` button, leaf when on, fir/25 when off.
- Emergency resources: mounts `<Lifeline />`.
- Sign out: Button ghost, calls `logout()` then `router.replace('/signin')`.
- Delete account: quiet text trigger opening a `Sheet` requiring the word `DELETE` typed into a `Field` before the destructive Button (bg-clay) enables; calls `deleteAccount()`, then `clearAccessToken()` via `logout()` path and `router.replace('/signin')`. Copy: "This erases your journals, moods, and conversations. It cannot be undone."
- Every section renders loading skeletons and `ErrorState` from the primitives.

- [ ] **Step 4: Verify, commit**

Live checks: send a chat message and watch the sprout for the 2 to 5s generation; kill the network and confirm the retry affordance; open lifeline with and without network; flip a notification toggle and refetch to confirm persistence; run the password change flow with a real OTP. `npm test && npx tsc --noEmit && npm run lint`.

```bash
git add app/\(app\)/chat app/\(app\)/you components/lifeline.tsx components/ui/toggle.tsx lib/api/endpoints.ts
git commit -m "feat: chat with lifeline and account space"
```

---

### Task 14: Final audit and client review

**Files:**
- Modify: `README.md`, anything the audit flags

- [ ] **Step 1: All-states audit**

Walk every screen against this checklist and fix gaps: loading skeleton present; error state with retry; empty state with invitation copy; success. Force errors by temporarily pointing `API_URL` at an unreachable host. Force cold-start messaging by setting `coldStartMs: 1` temporarily in one call and confirming the waking copy renders, then revert.

- [ ] **Step 2: Breakpoint audit**

Every route at 375px, 768px, and 1280px: phone shows bottom bar compositions, desktop shows rail and the recomposed layouts named in Tasks 9 to 13. No horizontal scroll anywhere, tap targets at least 44px.

- [ ] **Step 3: Motion and a11y audit**

OS reduced-motion on: no draw/unfold/slide animations anywhere (fades acceptable). Keyboard-only pass: sign in, check in, journal save, chat send, sheet close (Escape). Focus visible on oat and on fir-deep surfaces. `aria-label` on the chart, `role="alert"` on errors, `role="switch"` on toggles.

- [ ] **Step 4: Copy audit**

Grep the diff for em dashes and tracked-out uppercase labels; fix any. Buttons say what they do; errors say what happened and what to do next.

```bash
grep -rn $'—' app components lib || echo clean
```

- [ ] **Step 5: README and gates**

Add a short "Frontend" section to `README.md`: required env (`API_URL`), scripts (`dev`, `test`, `lint`), the proxy architecture in two sentences, pointer to the spec and `docs/BACKEND-NOTES.md`. Then run all gates:

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass, build succeeds

- [ ] **Step 6: Commit and hand over**

```bash
git add -A
git commit -m "chore: final state, breakpoint, motion and copy audit"
```

Start `npm run dev` from the main session (it must survive between turns), hand the client http://localhost:3000, and wait for explicit approval. The plan is not done until the client has seen it rendered and approved it.

---

## Self-Review Notes

- Spec coverage: brand tokens (T2), proxy + CORS workaround (T3), fetch wrapper contract (T4), typed endpoints (T5), auth screens incl. recovery (T6, T7), shell/nav + idle ping (T8), Home hero + all its data rules (T9), Insights + charts (T10), check-in + celebration (T11), journal + notifications (T12), chat + lifeline + You incl. delete guard (T13), all-states/breakpoints/reduced-motion/DoD (T14). Emergency resources never-dead-end rule in T13 Step 1.
- Known uncertainties called out inline rather than guessed silently: streak/unread/chat response shapes (T5), `read` vs `isRead` (T5/T12), refresh cookie name (T6), Fontshare zip layout (T2). Each has a single named place to correct.
- Type names and function signatures are consistent across tasks (checked `qk`, `apiFetch` opts, `plantShape`, `terrainPath`, component prop shapes).
