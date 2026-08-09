# Admin Shell and Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 of the EARS FOR YOU admin dashboard: a fully independent `/admin/*` surface with its own auth lifecycle (login, registration, verification, forgot password, recovery), its own session/token handling, a persistent nav shell listing all seven eventual sections (six stubbed, this phase), and a working Account page for the admin's own profile, password, email, and account deletion.

**Architecture:** New, fully additive route group `app/admin/` in the existing Next.js app, with its own parallel API module `lib/api/admin/` (separate in-memory access token, separate refresh flow against `/api/v1/auth/admin-refresh`, separate mock store), reusing every generic shared component and utility already proven on the user side (`Button`, `Field`, `Sheet`, `Skeleton`, `ErrorState`, `OtpInput`, `ResendButton`, `passwordIssue`, `QueryProvider`, `ApiError`/`friendlyFor`) rather than duplicating them. No proxy changes: `/api/v1/auth/*` is already handled by the existing auth route handler, and `/api/v1/admins/*` is already covered by the generic `/backend/:path*` rewrite.

**Tech Stack:** Next.js 16.3, React 19, Tailwind v4, TanStack Query, Vitest + Testing Library (already in place, no new dependencies).

## Global Constraints

- Design spec of record: `docs/superpowers/specs/2026-08-09-earsforyou-admin-shell-and-auth-design.md`. Every task's requirements implicitly include it.
- Color tokens and type pairing are unchanged from the existing system (`oat`, `fir`, `fir-deep`, `leaf`, `leaf-bright`, `marigold`, `marigold-deep`, `clay`, `card`, `night-warm-top`, `night-warm-bottom`, `warm-cream`; Chillax display, General Sans body). No new tokens for this phase.
- No breathing rings, no waveform art, no warm two-zone hero scenes anywhere in the admin surface. Admin auth screens use a quiet, static `fir-deep` panel with the wordmark, nothing animated.
- Full responsive, phone width included. Desktop/tablet (`lg:` and up) gets a persistent left sidebar; phone gets a hamburger-triggered slide-out drawer (not a bottom tab bar; eight nav items is past where a bottom bar reads well).
- Admin session state is fully independent of the user session: separate in-memory access token variable, separate refresh endpoint and cookie (`admin_refresh_token`), separate mock store. Never share state with `lib/api/token.ts`/`lib/api/client.ts`.
- Every admin request includes credentials (cookies) per the Admin API doc's explicit requirement.
- Reuse generic shared components as-is: `components/ui/button.tsx`, `components/ui/field.tsx`, `components/ui/sheet.tsx`, `components/ui/skeleton.tsx`, `components/ui/error-state.tsx`, `components/otp-input.tsx` (`OtpInput`, `ResendButton`), `lib/password.ts` (`passwordIssue`), `lib/query/provider.tsx` (`QueryProvider`), `lib/api/errors.ts` (`ApiError`, `friendlyFor`, `COLD_START_MESSAGE`, `NETWORK_ERROR_MESSAGE`). Do not duplicate these.
- Do not modify any existing file under `app/(app)/**`, `app/(auth)/**`, `lib/api/*.ts` (the user-facing module: `client.ts`, `endpoints.ts`, `token.ts`, `types.ts`, `mock-store.ts`, `mock-fetch.ts`), `components/garden/**` (already deleted), or `components/shell/tab-bar.tsx`. The admin surface is fully additive. Two small, deliberate exceptions to "reuse, don't duplicate": `maskEmail` (currently a private, unexported helper inside `app/(auth)/verify/page.tsx`) and the auth layout's cold-start banner markup are each reimplemented fresh (a few lines) inside the admin equivalents rather than extracting a shared component, specifically to avoid touching the existing, already-shipped user-facing files this phase must not modify.
- Field-shape risk: the Admin API doc gives endpoint paths but not full request/response JSON shapes. Each endpoint function below states its best-guess shape (derived from the doc's `Params:` hints and the equivalent user-facing endpoint's shape) and must be verified with a differential curl check against the live deployed backend (`API_URL` in `.env.local`) before being trusted, the same method already used once on this project's user app (`docs/BACKEND-NOTES.md` item 6). Endpoints requiring a valid admin session (`/me`, credential-change flows) cannot be curl-verified without real admin credentials, which are not committed to this public repo; build those against the stated best-guess shape and full mock-mode coverage, and note remaining live-verification as a follow-up once real admin credentials are available, the same way the original user test account was handled (`docs/BACKEND-NOTES.md` item 5).
- No AI attribution in any commit. No em dashes anywhere (code comments, UI copy, commit messages, docs).
- Verification per task: `npm test && npx tsc --noEmit && npm run lint` at minimum; `npm run build` on the final task. Screenshot-verify any task that changes visible layout, stacking, or responsive behavior, per this project's established practice (CSS-only reasoning has repeatedly missed real bugs here, confirmed across every prior phase of this project). Do not rely on reading JSX alone for anything involving the sidebar/drawer collapse or overlapping elements.
- Commit after every task, conventional message, verify with `git log -1 --format=%B` before moving on.

## File Structure

```
lib/api/admin/token.ts                 create: separate in-memory admin access token
lib/api/admin/token.test.ts            create
lib/api/admin/client.ts                create: adminApiFetch, mirrors lib/api/client.ts against /admin-refresh
lib/api/admin/client.test.ts           create
lib/api/admin/types.ts                 create: AdminProfile, AdminRegisterPayload, etc.
lib/api/admin/endpoints.ts             create: admin endpoint functions
lib/api/admin/endpoints.test.ts        create
lib/api/admin/mock-store.ts            create: seeded fake admin, mock auth/account responses
lib/api/admin/mock-fetch.ts            create: adminMockFetch, wired into adminApiFetch
lib/api/admin/mock-fetch.test.ts       create
lib/query/admin-keys.ts                create: adminQk query keys, parallel to lib/query/keys.ts
components/admin/auth-card.tsx         create: shared quiet auth panel, no hero art
components/admin/auth-card.test.tsx    create
app/admin/page.tsx                     create: bare /admin redirect to /admin/dashboard
app/admin/(auth)/layout.tsx            create: cold-start banner, no shell nav
app/admin/(auth)/login/page.tsx        create
app/admin/(auth)/register/page.tsx     create
app/admin/(auth)/verify/page.tsx       create
app/admin/(auth)/forgot-password/page.tsx  create
app/admin/(auth)/recovery/page.tsx     create
components/admin/shell.tsx             create: sidebar (desktop) + drawer (mobile) nav, top bar
components/admin/shell.test.tsx        create
app/admin/(dashboard)/layout.tsx       create: renders AdminShell, wires onAuthExpired
app/admin/(dashboard)/dashboard/page.tsx    create: stub
app/admin/(dashboard)/analytics/page.tsx    create: stub
app/admin/(dashboard)/users/page.tsx        create: stub
app/admin/(dashboard)/emergency/page.tsx    create: stub
app/admin/(dashboard)/settings/page.tsx     create: stub
app/admin/(dashboard)/telemetry/page.tsx    create: stub
app/admin/(dashboard)/broadcasts/page.tsx   create: stub
components/admin/stub-page.tsx         create: shared "coming soon" stub content
app/admin/(dashboard)/account/page.tsx create: real, this phase
```

Interfaces named here are binding across tasks; later tasks import exactly these names.

---

### Task 1: Admin API core (token, client)

**Files:**
- Create: `lib/api/admin/token.ts`, `lib/api/admin/token.test.ts`, `lib/api/admin/client.ts`, `lib/api/admin/client.test.ts`

**Interfaces:**
- Consumes: `ApiError`, `friendlyFor`, `COLD_START_MESSAGE`, `NETWORK_ERROR_MESSAGE` from `lib/api/errors.ts` (existing, unmodified). `MOCKS_ENABLED` from `lib/mocks.ts` (existing, unmodified).
- Produces: `getAdminAccessToken(): string | null`, `setAdminAccessToken(t: string | null): void`, `clearAdminAccessToken(): void` from `lib/api/admin/token.ts`. `adminApiFetch<T>(path: string, opts?: { method?: string; body?: unknown; auth?: boolean; coldStartMs?: number }): Promise<T>` and `onAdminAuthExpired(cb: () => void): void` from `lib/api/admin/client.ts`. Every later task's admin endpoint functions call `adminApiFetch`; the admin shell layout calls `onAdminAuthExpired`.

This is the admin-side mirror of `lib/api/token.ts` and `lib/api/client.ts`, with the state kept in an entirely separate module (a separate closure-scoped variable) so an admin session never reads or clears the user session's token, and vice versa. The refresh endpoint is `/api/v1/auth/admin-refresh` (not `/api/v1/auth/user-refresh`), and `adminApiFetch` calls into `adminMockFetch` (Task 2) when mocks are enabled, exactly mirroring how `apiFetch` calls `mockFetch`.

- [ ] **Step 1: Write the failing token test**

```ts
// lib/api/admin/token.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getAdminAccessToken, setAdminAccessToken, clearAdminAccessToken } from './token'

describe('admin token', () => {
  beforeEach(() => clearAdminAccessToken())

  it('starts null', () => {
    expect(getAdminAccessToken()).toBeNull()
  })
  it('stores and returns a token', () => {
    setAdminAccessToken('abc')
    expect(getAdminAccessToken()).toBe('abc')
  })
  it('clears back to null', () => {
    setAdminAccessToken('abc')
    clearAdminAccessToken()
    expect(getAdminAccessToken()).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/api/admin/token`
Expected: FAIL, cannot resolve `./token`

- [ ] **Step 3: Create `lib/api/admin/token.ts`**

```ts
// lib/api/admin/token.ts
let adminAccessToken: string | null = null

export function getAdminAccessToken(): string | null {
  return adminAccessToken
}

export function setAdminAccessToken(t: string | null): void {
  adminAccessToken = t
}

export function clearAdminAccessToken(): void {
  adminAccessToken = null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/api/admin/token`
Expected: PASS, 3/3

- [ ] **Step 5: Write the failing client test**

```ts
// lib/api/admin/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { adminApiFetch, onAdminAuthExpired } from './client'
import { getAdminAccessToken, setAdminAccessToken, clearAdminAccessToken } from './token'

const originalFetch = global.fetch

describe('adminApiFetch', () => {
  beforeEach(() => {
    clearAdminAccessToken()
  })
  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('sends a bearer token when authenticated', async () => {
    setAdminAccessToken('tok-123')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await adminApiFetch('/api/v1/admins/me')

    const [, init] = fetchMock.mock.calls[0]!
    const headers = init.headers as Headers
    expect(headers.get('authorization')).toBe('Bearer tok-123')
  })

  it('refreshes once on 401 and retries, then succeeds', async () => {
    setAdminAccessToken('stale')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'fresh' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'content-type': 'application/json' },
      }))
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await adminApiFetch<{ ok: boolean }>('/api/v1/admins/me')

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1]![0]).toBe('/backend/api/v1/auth/admin-refresh')
    expect(getAdminAccessToken()).toBe('fresh')
  })

  it('clears the token and fires onAdminAuthExpired when refresh fails', async () => {
    setAdminAccessToken('stale')
    const expired = vi.fn()
    onAdminAuthExpired(expired)
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(adminApiFetch('/api/v1/admins/me')).rejects.toThrow()

    expect(expired).toHaveBeenCalledTimes(1)
    expect(getAdminAccessToken()).toBeNull()
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- lib/api/admin/client`
Expected: FAIL, cannot resolve `./client`

- [ ] **Step 7: Create `lib/api/admin/client.ts`**

```ts
// lib/api/admin/client.ts
import { getAdminAccessToken, setAdminAccessToken, clearAdminAccessToken } from './token'
import { ApiError, friendlyFor, COLD_START_MESSAGE, NETWORK_ERROR_MESSAGE } from '../errors'
import { MOCKS_ENABLED } from '../../mocks'
import { adminMockFetch } from './mock-fetch'

const BASE = '/backend'
const DEFAULT_COLD_START_MS = 8000

let authExpiredCb: (() => void) | null = null
export function onAdminAuthExpired(cb: () => void): void {
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
  let res: Response
  try {
    res = await fetch(`${BASE}/api/v1/auth/admin-refresh`, { method: 'POST' })
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE)
  }
  if (!res.ok) return false
  const body = (await parseBody(res)) as { accessToken?: string } | undefined
  if (!body?.accessToken) return false
  setAdminAccessToken(body.accessToken)
  return true
}

export async function adminApiFetch<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  if (MOCKS_ENABLED) {
    return adminMockFetch<T>(path, opts)
  }

  const { method = 'GET', body, auth = true, coldStartMs = DEFAULT_COLD_START_MS } = opts

  const doFetch = async (): Promise<Response> => {
    const headers = new Headers()
    if (body !== undefined) headers.set('content-type', 'application/json')
    const token = getAdminAccessToken()
    if (auth && token) headers.set('authorization', `Bearer ${token}`)
    try {
      return await fetch(`${BASE}${path}`, {
        method,
        headers,
        credentials: 'include',
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError(0, NETWORK_ERROR_MESSAGE)
    }
  }

  const started = Date.now()
  let res = await doFetch()

  if (auth && (res.status === 401 || res.status === 403)) {
    const ok = await refresh()
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

  const elapsed = Date.now() - started
  const parsed = await parseBody(res)

  if (!res.ok) {
    const msg = (parsed as { message?: string } | undefined)?.message
    const coldStart = elapsed >= coldStartMs && [500, 502, 503, 504].includes(res.status)
    throw new ApiError(res.status, coldStart ? COLD_START_MESSAGE : friendlyFor(res.status, msg), coldStart)
  }

  return parsed as T
}
```

This imports `adminMockFetch` from `./mock-fetch`, which does not exist until Task 2. Step 8 below only typechecks/tests the non-mock path; the full suite will not be green until Task 2 lands. This mirrors Task 1's equivalent situation in the original redesign plan (a deliberate, documented, temporary gap, not a placeholder).

- [ ] **Step 8: Create a minimal `lib/api/admin/mock-fetch.ts` stub so `client.test.ts` can run**

```ts
// lib/api/admin/mock-fetch.ts
type Opts = { method?: string; body?: unknown }

export async function adminMockFetch<T>(_path: string, _opts: Opts = {}): Promise<T> {
  throw new Error('adminMockFetch not yet implemented (Task 2)')
}
```

Task 2 replaces this file's contents entirely with the real implementation; this step exists only so Task 1's tests (which do not exercise the mock path, `MOCKS_ENABLED` is `false` in the test environment) can import a resolvable module.

- [ ] **Step 9: Run the test to verify it passes**

Run: `npm test -- lib/api/admin/client`
Expected: PASS, 3/3

- [ ] **Step 10: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean

- [ ] **Step 11: Commit**

```bash
git add lib/api/admin/token.ts lib/api/admin/token.test.ts lib/api/admin/client.ts \
  lib/api/admin/client.test.ts lib/api/admin/mock-fetch.ts
git commit -m "feat: add the admin API client with its own token and refresh flow"
```

---

### Task 2: Admin auth endpoints and mock infrastructure

**Files:**
- Create: `lib/api/admin/types.ts`, `lib/api/admin/mock-store.ts`, `lib/api/admin/endpoints.ts`, `lib/api/admin/endpoints.test.ts`
- Modify: `lib/api/admin/mock-fetch.ts` (replace the Task 1 stub entirely)

**Interfaces:**
- Consumes: `adminApiFetch` from `./client` (Task 1).
- Produces: `AdminProfile`, `AdminRegisterPayload`, `UpdateAdminProfilePayload` from `lib/api/admin/types.ts`. `adminLogin(email: string, password: string): Promise<void>`, `adminLogout(): Promise<void>`, `registerAdmin(p: AdminRegisterPayload): Promise<unknown>`, `verifyAdmin(email: string, otp: string): Promise<void>`, `resendAdminRegistrationOtp(email: string): Promise<unknown>`, `forgotAdminPassword(email: string): Promise<unknown>`, `resendAdminForgottenPasswordOtp(email: string): Promise<unknown>`, `resetAdminPassword(email: string, otp: string, newPassword: string): Promise<unknown>`, `adminRecoveryInitiate(email: string): Promise<unknown>`, `adminRecoveryConfirm(email: string, otp: string): Promise<void>` from `lib/api/admin/endpoints.ts`. Tasks 4-6 (auth pages) import exactly these names. Task 8 (Account endpoints) extends this same file rather than creating a second one.

Before writing this task, run the differential curl checks below against the live backend (`API_URL` from `.env.local`) to confirm real field names where possible without valid admin credentials, and adjust the request bodies in this task's code to match what the backend actually validates:

```bash
# Expect a 400 with a validation message naming the real required fields.
curl -s -X POST "$API_URL/api/v1/auth/admin-login" -H 'content-type: application/json' -d '{}'
curl -s -X POST "$API_URL/api/v1/admins/register-admin" -H 'content-type: application/json' -d '{}'
curl -s -X POST "$API_URL/api/v1/auth/forgot-admin-password" -H 'content-type: application/json' -d '{}'
curl -s -X POST "$API_URL/api/v1/auth/recovery/admin/initiate" -H 'content-type: application/json' -d '{}'
```

If the live check contradicts the field names used below, use the live backend's real names instead of what is written here, and note the correction in your task report. `/me` and the credential-change endpoints cannot be checked this way without a valid session; build those in Task 8 against the best-guess shape stated there.

- [ ] **Step 1: Write the failing test**

```ts
// lib/api/admin/endpoints.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as client from './client'
import {
  adminLogin, adminLogout, registerAdmin, verifyAdmin, resendAdminRegistrationOtp,
  forgotAdminPassword, resendAdminForgottenPasswordOtp, resetAdminPassword,
  adminRecoveryInitiate, adminRecoveryConfirm,
} from './endpoints'
import { getAdminAccessToken, clearAdminAccessToken } from './token'

describe('admin auth endpoints', () => {
  beforeEach(() => {
    clearAdminAccessToken()
    vi.restoreAllMocks()
  })

  it('adminLogin posts credentials and stores the access token', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ accessToken: 'tok' })
    await adminLogin('a@b.com', 'pw')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/admin-login', {
      method: 'POST', body: { adminEmail: 'a@b.com', password: 'pw' }, auth: false,
    })
    expect(getAdminAccessToken()).toBe('tok')
  })

  it('adminLogout clears the token even if the request fails', async () => {
    vi.spyOn(client, 'adminApiFetch').mockRejectedValue(new Error('network'))
    await adminLogout()
    expect(getAdminAccessToken()).toBeNull()
  })

  it('registerAdmin posts name, email, password with no auth', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await registerAdmin({ name: 'Dami', email: 'a@b.com', password: 'Aa1!aaaa' })
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/register-admin', {
      method: 'POST', body: { name: 'Dami', email: 'a@b.com', password: 'Aa1!aaaa' }, auth: false,
    })
  })

  it('verifyAdmin posts the otp and stores the returned token', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ accessToken: 'tok2' })
    await verifyAdmin('a@b.com', '123456')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/verify-admin', {
      method: 'POST', body: { email: 'a@b.com', otp: '123456' }, auth: false,
    })
    expect(getAdminAccessToken()).toBe('tok2')
  })

  it('resendAdminRegistrationOtp posts adminEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resendAdminRegistrationOtp('a@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/resend-registration-otp', {
      method: 'POST', body: { adminEmail: 'a@b.com' }, auth: false,
    })
  })

  it('forgotAdminPassword posts a JSON body, never a query string', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await forgotAdminPassword('a@b.com')
    const [path, opts] = (client.adminApiFetch as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(path).not.toContain('?')
    expect(opts.body).toEqual({ adminEmail: 'a@b.com' })
  })

  it('resendAdminForgottenPasswordOtp posts adminEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resendAdminForgottenPasswordOtp('a@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/resend-admin-forgotten-password-otp', {
      method: 'POST', body: { adminEmail: 'a@b.com' }, auth: false,
    })
  })

  it('resetAdminPassword posts email, otp, and newPassword', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resetAdminPassword('a@b.com', '123456', 'NewPass1!')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/reset-admin-password', {
      method: 'POST', body: { adminEmail: 'a@b.com', otp: '123456', newPassword: 'NewPass1!' }, auth: false,
    })
  })

  it('adminRecoveryInitiate posts adminEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await adminRecoveryInitiate('a@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/recovery/admin/initiate', {
      method: 'POST', body: { adminEmail: 'a@b.com' }, auth: false,
    })
  })

  it('adminRecoveryConfirm posts adminEmail and otp, stores the returned token', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ accessToken: 'tok3' })
    await adminRecoveryConfirm('a@b.com', '654321')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/auth/recovery/admin/confirm', {
      method: 'POST', body: { adminEmail: 'a@b.com', otp: '654321' }, auth: false,
    })
    expect(getAdminAccessToken()).toBe('tok3')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/api/admin/endpoints`
Expected: FAIL, cannot resolve `./endpoints`

- [ ] **Step 3: Create `lib/api/admin/types.ts`**

```ts
// lib/api/admin/types.ts
export interface AdminProfile {
  id: number
  name: string
  email: string
  createdAt: string
}
export interface AdminRegisterPayload {
  name: string
  email: string
  password: string
}
export type UpdateAdminProfilePayload = Pick<AdminProfile, 'name'>
```

- [ ] **Step 4: Create `lib/api/admin/endpoints.ts`**

```ts
// lib/api/admin/endpoints.ts
import { adminApiFetch } from './client'
import { setAdminAccessToken, clearAdminAccessToken } from './token'
import type { AdminProfile, AdminRegisterPayload, UpdateAdminProfilePayload } from './types'

export async function adminLogin(email: string, password: string): Promise<void> {
  const r = await adminApiFetch<{ accessToken: string }>('/api/v1/auth/admin-login', {
    method: 'POST', body: { adminEmail: email, password }, auth: false,
  })
  setAdminAccessToken(r.accessToken)
}

export async function adminLogout(): Promise<void> {
  await adminApiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined)
  clearAdminAccessToken()
}

export const registerAdmin = (p: AdminRegisterPayload) =>
  adminApiFetch('/api/v1/admins/register-admin', { method: 'POST', body: p, auth: false })

export async function verifyAdmin(email: string, otp: string): Promise<void> {
  const r = await adminApiFetch<{ accessToken?: string; token?: string }>('/api/v1/admins/verify-admin', {
    method: 'POST', body: { email, otp }, auth: false,
  })
  const token = r?.accessToken ?? r?.token
  if (token) setAdminAccessToken(token)
}

export const resendAdminRegistrationOtp = (email: string) =>
  adminApiFetch('/api/v1/admins/resend-registration-otp', { method: 'POST', body: { adminEmail: email }, auth: false })

export const forgotAdminPassword = (email: string) =>
  adminApiFetch('/api/v1/auth/forgot-admin-password', { method: 'POST', body: { adminEmail: email }, auth: false })

export const resendAdminForgottenPasswordOtp = (email: string) =>
  adminApiFetch('/api/v1/auth/resend-admin-forgotten-password-otp', { method: 'POST', body: { adminEmail: email }, auth: false })

export const resetAdminPassword = (email: string, otp: string, newPassword: string) =>
  adminApiFetch('/api/v1/auth/reset-admin-password', {
    method: 'POST', body: { adminEmail: email, otp, newPassword }, auth: false,
  })

export const adminRecoveryInitiate = (email: string) =>
  adminApiFetch('/api/v1/auth/recovery/admin/initiate', { method: 'POST', body: { adminEmail: email }, auth: false })

export async function adminRecoveryConfirm(email: string, otp: string): Promise<void> {
  const r = await adminApiFetch<{ accessToken?: string; token?: string }>('/api/v1/auth/recovery/admin/confirm', {
    method: 'POST', body: { adminEmail: email, otp }, auth: false,
  })
  const token = r?.accessToken ?? r?.token
  if (token) setAdminAccessToken(token)
}

export const getAdminProfile = () => adminApiFetch<AdminProfile>('/api/v1/admins/me')
export const updateAdminProfile = (p: UpdateAdminProfilePayload) =>
  adminApiFetch('/api/v1/admins/me', { method: 'PUT', body: p })
export const deleteAdminAccount = () => adminApiFetch('/api/v1/admins/me', { method: 'DELETE' })
```

`getAdminProfile`/`updateAdminProfile`/`deleteAdminAccount` are added now (rather than deferred to Task 8) because they share this file and are trivial one-liners once `adminApiFetch` exists; Task 8 adds the remaining, more involved credential-change functions to this same file.

- [ ] **Step 5: Create `lib/api/admin/mock-store.ts`**

```ts
// lib/api/admin/mock-store.ts
import type { AdminProfile } from './types'

let profile: AdminProfile = {
  id: 1,
  name: 'Ada Admin',
  email: 'admin@earsforyou.test',
  createdAt: '2026-01-01T00:00:00Z',
}

export const adminMockStore = {
  getProfile(): AdminProfile {
    return profile
  },
  updateProfile(patch: Partial<AdminProfile>): AdminProfile {
    profile = { ...profile, ...patch }
    return profile
  },
}
```

- [ ] **Step 6: Replace `lib/api/admin/mock-fetch.ts` with the real implementation**

```ts
// lib/api/admin/mock-fetch.ts
import { adminMockStore } from './mock-store'
import type { UpdateAdminProfilePayload } from './types'

const DELAY_MS = 350

function delay<T>(value: T, ms = DELAY_MS): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

type Opts = { method?: string; body?: unknown }

export async function adminMockFetch<T>(path: string, opts: Opts = {}): Promise<T> {
  const method = (opts.method ?? 'GET').toUpperCase()
  const pathname = path.split('?')[0]!

  if (pathname === '/api/v1/auth/admin-login' && method === 'POST') {
    return delay({ accessToken: 'mock-admin-access-token' } as T)
  }
  if (pathname === '/api/v1/auth/logout' && method === 'POST') {
    return delay(undefined as T)
  }
  if (pathname === '/api/v1/admins/register-admin' && method === 'POST') {
    return delay({ message: 'Registration started' } as T)
  }
  if (pathname === '/api/v1/admins/verify-admin' && method === 'POST') {
    return delay({ accessToken: 'mock-admin-access-token' } as T)
  }
  if (
    method === 'POST' &&
    (pathname === '/api/v1/admins/resend-registration-otp' ||
      pathname === '/api/v1/auth/forgot-admin-password' ||
      pathname === '/api/v1/auth/resend-admin-forgotten-password-otp' ||
      pathname === '/api/v1/auth/reset-admin-password' ||
      pathname === '/api/v1/auth/recovery/admin/initiate')
  ) {
    return delay({ message: 'ok' } as T)
  }
  if (pathname === '/api/v1/auth/recovery/admin/confirm' && method === 'POST') {
    return delay({ accessToken: 'mock-admin-access-token' } as T)
  }

  if (pathname === '/api/v1/admins/me' && method === 'GET') {
    return delay(adminMockStore.getProfile() as T)
  }
  if (pathname === '/api/v1/admins/me' && method === 'PUT') {
    return delay(adminMockStore.updateProfile(opts.body as UpdateAdminProfilePayload) as T)
  }
  if (pathname === '/api/v1/admins/me' && method === 'DELETE') {
    return delay(undefined as T)
  }

  throw new Error(`adminMockFetch: no mock route for ${method} ${pathname}`)
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- lib/api/admin/endpoints`
Expected: PASS, 10/10

- [ ] **Step 8: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean. This is the first point where the whole suite (Task 1's client tests plus this task's) should be fully green.

- [ ] **Step 9: Commit**

```bash
git add lib/api/admin/types.ts lib/api/admin/mock-store.ts lib/api/admin/endpoints.ts \
  lib/api/admin/endpoints.test.ts lib/api/admin/mock-fetch.ts
git commit -m "feat: add admin auth endpoints and mock backend"
```

---

### Task 3: Shared admin auth card and query keys

**Files:**
- Create: `components/admin/auth-card.tsx`, `components/admin/auth-card.test.tsx`, `lib/query/admin-keys.ts`

**Interfaces:**
- Produces: `AdminAuthCard({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }): JSX.Element` from `components/admin/auth-card.tsx`. `adminQk` object from `lib/query/admin-keys.ts`, with at least `adminQk.profile: ['admin-profile'] as const`. Tasks 4-6 (login/register/verify/forgot-password/recovery) and Task 9 (account) both consume `AdminAuthCard`; Task 9 consumes `adminQk`.

This is the shared visual shell for every admin auth screen: a quiet, static `fir-deep` panel carrying the wordmark, stacked above a centered form card on mobile, side-by-side on desktop. No breathing rings, no animated SVG, no waveform, per the Global Constraints. Structurally similar to the user app's `CompactHero` (a dark panel above a light sheet) but deliberately without any of its decorative art, since this is a control panel, not a companion.

- [ ] **Step 1: Write the failing test**

```tsx
// components/admin/auth-card.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminAuthCard } from './auth-card'

describe('AdminAuthCard', () => {
  it('renders the title, optional subtitle, and children', () => {
    render(
      <AdminAuthCard title="Admin sign in" subtitle="Manage the platform.">
        <p>form goes here</p>
      </AdminAuthCard>
    )
    expect(screen.getByText('Admin sign in')).toBeInTheDocument()
    expect(screen.getByText('Manage the platform.')).toBeInTheDocument()
    expect(screen.getByText('form goes here')).toBeInTheDocument()
  })

  it('renders without a subtitle', () => {
    render(<AdminAuthCard title="Reset password"><p>content</p></AdminAuthCard>)
    expect(screen.getByText('Reset password')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- auth-card`
Expected: FAIL, cannot resolve `./auth-card`

- [ ] **Step 3: Create `components/admin/auth-card.tsx`**

```tsx
// components/admin/auth-card.tsx
import type { ReactNode } from 'react'

export function AdminAuthCard({ title, subtitle, children }: {
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <section className="flex h-[180px] flex-none items-center justify-center bg-fir-deep px-8 text-center
        text-oat lg:h-auto lg:w-[38%] lg:px-10">
        <div>
          <p className="font-display text-2xl font-semibold lg:text-3xl">
            Ears for you. <span className="opacity-60">Admin</span>
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-oat px-6 py-10">
        <div className="flex w-full max-w-[360px] flex-col gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-sm opacity-65">{subtitle}</p> : null}
          </div>
          {children}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- auth-card`
Expected: PASS, 2/2

- [ ] **Step 5: Create `lib/query/admin-keys.ts`**

```ts
// lib/query/admin-keys.ts
export const adminQk = {
  profile: ['admin-profile'] as const,
}
```

- [ ] **Step 6: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean

- [ ] **Step 7: Commit**

```bash
git add components/admin/auth-card.tsx components/admin/auth-card.test.tsx lib/query/admin-keys.ts
git commit -m "feat: add the shared admin auth card and admin query keys"
```

---

### Task 4: Admin login and the admin auth layout

**Files:**
- Create: `app/admin/(auth)/layout.tsx`, `app/admin/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `AdminAuthCard` from `components/admin/auth-card.tsx` (Task 3), `adminLogin` from `lib/api/admin/endpoints.ts` (Task 2), `ApiError` from `lib/api/errors.ts` (existing), `Button`/`Field` from `components/ui/*` (existing), `MOCKS_ENABLED` from `lib/mocks.ts` (existing).

The `(auth)` layout renders the same cold-start banner pattern as the user app's `app/(auth)/layout.tsx` (an independent, freshly written implementation per the Global Constraints, not a shared import), gated by `MOCKS_ENABLED` and pinging `/backend/actuator/health`. It does not render `AdminShell` (Task 7); auth screens have no persistent nav.

- [ ] **Step 1: Create `app/admin/(auth)/layout.tsx`**

```tsx
// app/admin/(auth)/layout.tsx
'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { MOCKS_ENABLED } from '@/lib/mocks'

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  const [waking, setWaking] = useState(false)
  useEffect(() => {
    if (MOCKS_ENABLED) return
    const t = setTimeout(() => setWaking(true), 8000)
    fetch('/backend/actuator/health').catch(() => undefined).finally(() => {
      clearTimeout(t); setWaking(false)
    })
    return () => clearTimeout(t)
  }, [])
  return (
    <>
      {waking ? (
        <p className="fixed inset-x-0 top-0 z-50 bg-fir px-4 py-2.5 text-center text-sm text-oat">
          Connecting. The server is waking up, this can take about a minute.
        </p>
      ) : null}
      {children}
    </>
  )
}
```

- [ ] **Step 2: Create `app/admin/(auth)/login/page.tsx`**

```tsx
// app/admin/(auth)/login/page.tsx
'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { adminLogin } from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { AdminAuthCard } from '@/components/admin/auth-card'

function AdminLoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function safeNext(): string {
    const next = params.get('next')
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) return next
    return '/admin/dashboard'
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await adminLogin(email, password)
      router.replace(safeNext())
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <AdminAuthCard title="Admin sign in" subtitle="Manage the EARS FOR YOU platform.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Email" type="email" autoComplete="email" required
          value={email} onChange={e => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required
          value={password} onChange={e => setPassword(e.target.value)} error={error ?? undefined} />
        <Button type="submit" busy={busy}>Sign in</Button>
        <Link
          className="self-center rounded text-sm underline underline-offset-4 opacity-70
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
          href="/admin/forgot-password"
        >
          Forgot password?
        </Link>
        <Link
          className="self-center rounded text-xs underline underline-offset-4 opacity-50
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
          href="/admin/register"
        >
          Need an admin account?
        </Link>
      </form>
    </AdminAuthCard>
  )
}

export default function AdminLoginPage() {
  return <Suspense><AdminLoginForm /></Suspense>
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean

- [ ] **Step 4: Manual verification**

Start the dev server (`NEXT_PUBLIC_USE_MOCKS=true npm run dev`), visit `/admin/login`, confirm the quiet dark panel and form render correctly at phone width and desktop width, confirm a submit with any credentials (mock mode always succeeds) redirects to `/admin/dashboard` (which will 404 or error until Task 7; that is expected at this point, do not fix it here). Kill the dev server when done. Screenshot both breakpoints per the Global Constraints' screenshot-verification requirement.

- [ ] **Step 5: Commit**

```bash
git add "app/admin/(auth)/layout.tsx" "app/admin/(auth)/login/page.tsx"
git commit -m "feat: add the admin auth layout and login screen"
```

---

### Task 5: Admin register and verify

**Files:**
- Create: `app/admin/(auth)/register/page.tsx`, `app/admin/(auth)/verify/page.tsx`

**Interfaces:**
- Consumes: `AdminAuthCard` (Task 3), `registerAdmin`/`verifyAdmin`/`resendAdminRegistrationOtp` (Task 2), `OtpInput`/`ResendButton` from `components/otp-input.tsx` (existing), `passwordIssue` from `lib/password.ts` (existing).

Register is a single-step form (name, email, password, confirm password) rather than the user app's three-step wizard: an admin account needs far fewer fields than a wellness-app user profile (no gender/country/date-of-birth/marital/employment status), so a multi-step `StepShell` wizard would be manufacturing steps that do not exist. On success it redirects to `/admin/verify?email=...`, matching the user app's registration-to-verification handoff.

- [ ] **Step 1: Create `app/admin/(auth)/register/page.tsx`**

```tsx
// app/admin/(auth)/register/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerAdmin } from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'
import { passwordIssue } from '@/lib/password'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { AdminAuthCard } from '@/components/admin/auth-card'

export default function AdminRegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pwIssue = passwordIssue(password)
  const valid = name.trim().length > 0 && /.+@.+\..+/.test(email) && !pwIssue && password === confirmPassword

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true); setError(null)
    try {
      await registerAdmin({ name, email, password })
      router.push(`/admin/verify?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <AdminAuthCard title="Create an admin account" subtitle="A short setup, then a code to confirm it's you.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
        <Field label="Name" required value={name} onChange={e => setName(e.target.value)} />
        <Field label="Email" type="email" autoComplete="email" required
          value={email} onChange={e => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="new-password" required
          value={password} onChange={e => setPassword(e.target.value)}
          error={password.length > 0 ? pwIssue ?? undefined : undefined} />
        <Field label="Confirm password" type="password" autoComplete="new-password" required
          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        <Button type="submit" busy={busy} disabled={!valid}>Continue</Button>
      </form>
    </AdminAuthCard>
  )
}
```

- [ ] **Step 2: Create `app/admin/(auth)/verify/page.tsx`**

```tsx
// app/admin/(auth)/verify/page.tsx
'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyAdmin, resendAdminRegistrationOtp } from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'
import { OtpInput, ResendButton } from '@/components/otp-input'
import { AdminAuthCard } from '@/components/admin/auth-card'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 1)
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`
}

function AdminVerifyForm() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!email) router.replace('/admin/register')
  }, [email, router])

  async function handleComplete(otp: string) {
    setError(null)
    try {
      await verifyAdmin(email, otp)
      router.replace('/admin/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'That code did not work. Try again.')
      setAttempt(a => a + 1)
    }
  }

  if (!email) return null

  return (
    <AdminAuthCard title="Check your email" subtitle={`We sent a 6-digit code to ${maskEmail(email)}.`}>
      <div className="flex flex-col gap-4">
        <OtpInput key={attempt} length={6} onComplete={handleComplete} />
        {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
        <ResendButton cooldownSeconds={60} onResend={() => resendAdminRegistrationOtp(email)} />
      </div>
    </AdminAuthCard>
  )
}

export default function AdminVerifyPage() {
  return <Suspense><AdminVerifyForm /></Suspense>
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean

- [ ] **Step 4: Manual verification**

On the dev server (`NEXT_PUBLIC_USE_MOCKS=true npm run dev`), walk `/admin/register` end to end: fill the form, submit, confirm you land on `/admin/verify?email=...` with the email masked correctly, enter any 6-digit code (mock mode accepts any complete code), confirm redirect to `/admin/dashboard`. Kill the dev server when done. Screenshot both screens at phone and desktop width.

- [ ] **Step 5: Commit**

```bash
git add "app/admin/(auth)/register/page.tsx" "app/admin/(auth)/verify/page.tsx"
git commit -m "feat: add admin registration and verification"
```

---

### Task 6: Admin forgot password and recovery

**Files:**
- Create: `app/admin/(auth)/forgot-password/page.tsx`, `app/admin/(auth)/recovery/page.tsx`

**Interfaces:**
- Consumes: `AdminAuthCard` (Task 3), `forgotAdminPassword`/`resendAdminForgottenPasswordOtp`/`resetAdminPassword`/`adminRecoveryInitiate`/`adminRecoveryConfirm`/`resendAdminRegistrationOtp` (Task 2, the last reused as recovery's own resend has no distinct backend endpoint documented beyond `resend-recovery-otp`, added in this task, see Step 3), `passwordIssue` (existing).

Both flows follow the same email-then-OTP-then-(new password, for forgot-password only) shape already established on the user side, retargeted at the admin endpoints. Recovery uses its own dedicated `resend-recovery-otp` endpoint, added to `lib/api/admin/endpoints.ts` in this task (it belongs with the other auth endpoints Task 2 built but was not needed until this task's recovery flow).

- [ ] **Step 1: Add `resendAdminRecoveryOtp` to `lib/api/admin/endpoints.ts`**

```ts
// lib/api/admin/endpoints.ts: add near the other resend/recovery functions
export const resendAdminRecoveryOtp = (email: string) =>
  adminApiFetch('/api/v1/admins/resend-recovery-otp', { method: 'POST', body: { adminEmail: email }, auth: false })
```

Also add the matching mock route to `lib/api/admin/mock-fetch.ts`, in the same `if` block as the other no-return-value POSTs:

```ts
// lib/api/admin/mock-fetch.ts: extend the existing method === 'POST' && (...) condition
  if (
    method === 'POST' &&
    (pathname === '/api/v1/admins/resend-registration-otp' ||
      pathname === '/api/v1/admins/resend-recovery-otp' ||
      pathname === '/api/v1/auth/forgot-admin-password' ||
      pathname === '/api/v1/auth/resend-admin-forgotten-password-otp' ||
      pathname === '/api/v1/auth/reset-admin-password' ||
      pathname === '/api/v1/auth/recovery/admin/initiate')
  ) {
    return delay({ message: 'ok' } as T)
  }
```

- [ ] **Step 2: Create `app/admin/(auth)/forgot-password/page.tsx`**

```tsx
// app/admin/(auth)/forgot-password/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  forgotAdminPassword, resendAdminForgottenPasswordOtp, resetAdminPassword,
} from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'
import { passwordIssue } from '@/lib/password'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { OtpInput, ResendButton } from '@/components/otp-input'
import { AdminAuthCard } from '@/components/admin/auth-card'

type Stage = 'email' | 'otp' | 'password' | 'done'

export default function AdminForgotPasswordPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await forgotAdminPassword(email)
      setStage('otp')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleOtpComplete(code: string) {
    setOtp(code)
    setStage('password')
  }

  const pwIssue = passwordIssue(password)
  const passwordValid = !pwIssue && password === confirmPassword

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordValid) return
    setBusy(true); setError(null)
    try {
      await resetAdminPassword(email, otp, password)
      setStage('done')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminAuthCard
      title="Forgot your password?"
      subtitle={stage === 'email' ? "Tell us your admin email and we'll send a code to get you back in." : undefined}
    >
      {stage === 'email' ? (
        <form onSubmit={submitEmail} className="flex flex-col gap-4">
          {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
          <Field label="Email" type="email" autoComplete="email" required
            value={email} onChange={e => setEmail(e.target.value)} />
          <Button type="submit" busy={busy}>Send code</Button>
          <Link
            className="self-center rounded text-sm underline underline-offset-4 opacity-70
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
            href="/admin/recovery"
          >
            Lost access to this email too? Recover your account a different way.
          </Link>
        </form>
      ) : null}

      {stage === 'otp' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm opacity-70">Enter the 6-digit code we sent to {email}.</p>
          <OtpInput length={6} onComplete={handleOtpComplete} />
          {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
          <ResendButton cooldownSeconds={60} onResend={() => resendAdminForgottenPasswordOtp(email)} />
        </div>
      ) : null}

      {stage === 'password' ? (
        <form onSubmit={submitPassword} className="flex flex-col gap-4">
          {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
          <Field label="New password" type="password" autoComplete="new-password" required
            value={password} onChange={e => setPassword(e.target.value)}
            error={password.length > 0 ? pwIssue ?? undefined : undefined} />
          <Field label="Confirm new password" type="password" autoComplete="new-password" required
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          <Button type="submit" busy={busy} disabled={!passwordValid}>Reset password</Button>
        </form>
      ) : null}

      {stage === 'done' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm opacity-70">Your password has been reset. Sign in with your new password.</p>
          <Button type="button" onClick={() => router.push('/admin/login')}>Sign in</Button>
        </div>
      ) : null}
    </AdminAuthCard>
  )
}
```

- [ ] **Step 3: Create `app/admin/(auth)/recovery/page.tsx`**

```tsx
// app/admin/(auth)/recovery/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminRecoveryInitiate, adminRecoveryConfirm, resendAdminRecoveryOtp } from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { OtpInput, ResendButton } from '@/components/otp-input'
import { AdminAuthCard } from '@/components/admin/auth-card'

type Stage = 'email' | 'otp'

export default function AdminRecoveryPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await adminRecoveryInitiate(email)
      setStage('otp')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleOtpComplete(code: string) {
    setError(null)
    try {
      await adminRecoveryConfirm(email, code)
      router.replace('/admin/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'That code did not work. Try again.')
    }
  }

  return (
    <AdminAuthCard
      title="Recover your account"
      subtitle={stage === 'email' ? 'Enter your admin email and we will send you a code to sign you back in.' : undefined}
    >
      {stage === 'email' ? (
        <form onSubmit={submitEmail} className="flex flex-col gap-4">
          {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
          <Field label="Email" type="email" autoComplete="email" required
            value={email} onChange={e => setEmail(e.target.value)} />
          <Button type="submit" busy={busy}>Send code</Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm opacity-70">Enter the 6-digit code we sent to {email}.</p>
          <OtpInput length={6} onComplete={handleOtpComplete} />
          {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
          <ResendButton cooldownSeconds={60} onResend={() => resendAdminRecoveryOtp(email)} />
        </div>
      )}
    </AdminAuthCard>
  )
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean

- [ ] **Step 5: Manual verification**

On the dev server, walk both flows to completion in mock mode: forgot-password through to the "done" stage and back to login; recovery's email-then-code path through to a redirect. Confirm the "Lost access to this email too?" link on forgot-password reaches recovery. Kill the dev server when done. Screenshot both flows at phone and desktop width.

- [ ] **Step 6: Commit**

```bash
git add "app/admin/(auth)/forgot-password/page.tsx" "app/admin/(auth)/recovery/page.tsx" \
  lib/api/admin/endpoints.ts lib/api/admin/mock-fetch.ts
git commit -m "feat: add admin forgot password and account recovery"
```

---

### Task 7: The admin shell (sidebar, drawer, top bar) and six stub sections

**Files:**
- Create: `components/admin/shell.tsx`, `components/admin/shell.test.tsx`, `components/admin/stub-page.tsx`, `app/admin/(dashboard)/layout.tsx`, `app/admin/(dashboard)/dashboard/page.tsx`, `app/admin/(dashboard)/analytics/page.tsx`, `app/admin/(dashboard)/users/page.tsx`, `app/admin/(dashboard)/emergency/page.tsx`, `app/admin/(dashboard)/settings/page.tsx`, `app/admin/(dashboard)/telemetry/page.tsx`, `app/admin/(dashboard)/broadcasts/page.tsx`, `app/admin/page.tsx`

**Interfaces:**
- Consumes: `onAdminAuthExpired` from `lib/api/admin/client.ts` (Task 1).
- Produces: `AdminShell({ children }: { children: ReactNode }): JSX.Element` from `components/admin/shell.tsx`, rendered by `app/admin/(dashboard)/layout.tsx`. `StubPage({ title }: { title: string }): JSX.Element` from `components/admin/stub-page.tsx`, consumed by all six stub pages in this task. Task 9 (Account) replaces the eventual `/admin/account` route with real content instead of a stub; this task does not create `account/page.tsx`.

`AdminShell` lists eight items: the seven eventual sections (Dashboard, Analytics, Users, Emergency Resources, Settings, Telemetry, Broadcasts) plus Account. On `lg:` and up it renders as a persistent left sidebar; below `lg:` it renders as a top bar with a hamburger button that opens a slide-out drawer (not a bottom tab bar, since eight items does not fit one comfortably, a genuine breakpoint-specific pattern change per the Global Constraints).

- [ ] **Step 1: Write the failing test**

```tsx
// components/admin/shell.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminShell } from './shell'

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/dashboard' }))

describe('AdminShell', () => {
  it('renders all eight nav items with correct hrefs', () => {
    render(<AdminShell><p>content</p></AdminShell>)
    const expected: [string, string][] = [
      ['Dashboard', '/admin/dashboard'],
      ['Analytics', '/admin/analytics'],
      ['Users', '/admin/users'],
      ['Emergency Resources', '/admin/emergency'],
      ['Settings', '/admin/settings'],
      ['Telemetry', '/admin/telemetry'],
      ['Broadcasts', '/admin/broadcasts'],
      ['Account', '/admin/account'],
    ]
    for (const [label, href] of expected) {
      const links = screen.getAllByRole('link', { name: label })
      expect(links.length).toBeGreaterThan(0)
      links.forEach(link => expect(link).toHaveAttribute('href', href))
    }
  })

  it('marks the current route active', () => {
    render(<AdminShell><p>content</p></AdminShell>)
    const current = screen.getAllByRole('link', { current: 'page' })
    expect(current.length).toBeGreaterThan(0)
  })

  it('renders the page content', () => {
    render(<AdminShell><p>unique marker content</p></AdminShell>)
    expect(screen.getByText('unique marker content')).toBeInTheDocument()
  })

  it('opens and closes the mobile drawer', async () => {
    const user = userEvent.setup()
    render(<AdminShell><p>content</p></AdminShell>)
    const openButton = screen.getByRole('button', { name: /open menu/i })
    await user.click(openButton)
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /close menu/i }))
    expect(screen.queryByRole('button', { name: /close menu/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- components/admin/shell`
Expected: FAIL, cannot resolve `./shell`

- [ ] **Step 3: Create `components/admin/shell.tsx`**

```tsx
// components/admin/shell.tsx
'use client'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV: { href: string; label: string }[] = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/emergency', label: 'Emergency Resources' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/telemetry', label: 'Telemetry' },
  { href: '/admin/broadcasts', label: 'Broadcasts' },
]
const ACCOUNT = { href: '/admin/account', label: 'Account' }

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir'

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  return (
    <>
      {NAV.map(item => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive(item.href) ? 'page' : undefined}
          className={`flex items-center rounded-lg px-3 py-2.5 text-[14px] ${FOCUS_RING}
            ${isActive(item.href) ? 'bg-fir text-oat font-semibold' : 'font-medium opacity-70 hover:opacity-100'}`}
        >
          {item.label}
        </Link>
      ))}
      <Link
        href={ACCOUNT.href}
        onClick={onNavigate}
        aria-current={isActive(ACCOUNT.href) ? 'page' : undefined}
        className={`mt-2 flex items-center rounded-lg border-t border-fir/10 px-3 pb-0.5 pt-3.5 text-[14px] ${FOCUS_RING}
          ${isActive(ACCOUNT.href) ? 'font-semibold opacity-100' : 'font-medium opacity-70 hover:opacity-100'}`}
      >
        {ACCOUNT.label}
      </Link>
    </>
  )
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-dvh lg:flex">
      <nav
        aria-label="Admin"
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[240px] lg:flex-none lg:flex-col lg:gap-1
          lg:border-r lg:border-fir/10 lg:px-4 lg:py-8"
      >
        <p className="mb-8 px-3 font-display text-base font-semibold">
          Ears for you. <span className="opacity-50">Admin</span>
        </p>
        <NavLinks pathname={pathname} />
      </nav>

      <div className="flex flex-1 flex-col lg:min-w-0">
        <div className="flex items-center justify-between border-b border-fir/10 px-4 py-3 lg:hidden">
          <p className="font-display text-[15px] font-semibold">
            Ears for you. <span className="opacity-50">Admin</span>
          </p>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${FOCUS_RING}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
              strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-night/50" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="relative flex h-full w-[78%] max-w-[300px] flex-col gap-1 bg-oat px-4 py-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between px-3">
              <p className="font-display text-[15px] font-semibold">Menu</p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${FOCUS_RING}`}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                  strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- components/admin/shell`
Expected: PASS, 4/4

- [ ] **Step 5: Create `components/admin/stub-page.tsx`**

```tsx
// components/admin/stub-page.tsx
export function StubPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-[15px] opacity-65">
        {title} is coming in a later phase of the admin dashboard build.
      </p>
    </div>
  )
}
```

- [ ] **Step 6: Create the six stub pages**

```tsx
// app/admin/(dashboard)/dashboard/page.tsx
import { StubPage } from '@/components/admin/stub-page'
export default function AdminDashboardPage() {
  return <StubPage title="Dashboard" />
}
```

```tsx
// app/admin/(dashboard)/analytics/page.tsx
import { StubPage } from '@/components/admin/stub-page'
export default function AdminAnalyticsPage() {
  return <StubPage title="Analytics" />
}
```

```tsx
// app/admin/(dashboard)/users/page.tsx
import { StubPage } from '@/components/admin/stub-page'
export default function AdminUsersPage() {
  return <StubPage title="Users" />
}
```

```tsx
// app/admin/(dashboard)/emergency/page.tsx
import { StubPage } from '@/components/admin/stub-page'
export default function AdminEmergencyPage() {
  return <StubPage title="Emergency Resources" />
}
```

```tsx
// app/admin/(dashboard)/settings/page.tsx
import { StubPage } from '@/components/admin/stub-page'
export default function AdminSettingsPage() {
  return <StubPage title="Settings" />
}
```

```tsx
// app/admin/(dashboard)/telemetry/page.tsx
import { StubPage } from '@/components/admin/stub-page'
export default function AdminTelemetryPage() {
  return <StubPage title="Telemetry" />
}
```

```tsx
// app/admin/(dashboard)/broadcasts/page.tsx
import { StubPage } from '@/components/admin/stub-page'
export default function AdminBroadcastsPage() {
  return <StubPage title="Broadcasts" />
}
```

- [ ] **Step 7: Create `app/admin/(dashboard)/layout.tsx`**

```tsx
// app/admin/(dashboard)/layout.tsx
'use client'
import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { QueryProvider } from '@/lib/query/provider'
import { onAdminAuthExpired } from '@/lib/api/admin/client'
import { AdminShell } from '@/components/admin/shell'

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    onAdminAuthExpired(() => router.replace('/admin/login'))
  }, [router])
  return (
    <QueryProvider>
      <AdminShell>{children}</AdminShell>
    </QueryProvider>
  )
}
```

- [ ] **Step 8: Create `app/admin/page.tsx`**

```tsx
// app/admin/page.tsx
import { redirect } from 'next/navigation'

export default function AdminIndex() {
  redirect('/admin/dashboard')
}
```

This mirrors the existing `app/page.tsx`'s unconditional-redirect pattern exactly: `/admin/dashboard` reactively bounces an unauthenticated visitor to `/admin/login` via `onAdminAuthExpired` once its first authenticated request fails, the same reactive (not proactive) guard already proven on the user side.

- [ ] **Step 9: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean

- [ ] **Step 10: Manual verification**

On the dev server (`NEXT_PUBLIC_USE_MOCKS=true npm run dev`), sign in at `/admin/login`, land on `/admin/dashboard`, confirm all eight nav items are present and Dashboard is marked current. Click through all seven stub sections, confirm each renders its own title with no console errors and no broken links. At phone width, confirm the sidebar is replaced by the top bar and hamburger, confirm the drawer opens/closes and closes automatically on navigation. At desktop width, confirm the sidebar is persistent and does not shift position between sections (the exact bug class already fixed once on the user app's shell: verify the sidebar's horizontal position is identical across at least three different stub pages). Kill the dev server when done. Screenshot both breakpoints.

- [ ] **Step 11: Commit**

```bash
git add components/admin/shell.tsx components/admin/shell.test.tsx components/admin/stub-page.tsx \
  "app/admin/(dashboard)/layout.tsx" "app/admin/(dashboard)/dashboard/page.tsx" \
  "app/admin/(dashboard)/analytics/page.tsx" "app/admin/(dashboard)/users/page.tsx" \
  "app/admin/(dashboard)/emergency/page.tsx" "app/admin/(dashboard)/settings/page.tsx" \
  "app/admin/(dashboard)/telemetry/page.tsx" "app/admin/(dashboard)/broadcasts/page.tsx" \
  app/admin/page.tsx
git commit -m "feat: add the admin shell, responsive nav, and six stub sections"
```

---

### Task 8: Admin account endpoints (credential changes)

**Files:**
- Modify: `lib/api/admin/endpoints.ts`, `lib/api/admin/mock-fetch.ts`, `lib/api/admin/mock-store.ts`
- Modify: `lib/api/admin/endpoints.test.ts` (append new tests)

**Interfaces:**
- Produces (added to the existing `lib/api/admin/endpoints.ts`): `changeAdminPasswordInitiate(email: string, oldPassword: string): Promise<unknown>`, `changeAdminPasswordVerify(email: string, oldPassword: string, newPassword: string, otp: string): Promise<unknown>`, `resendAdminPasswordChangeOtp(): Promise<unknown>`, `changeAdminEmailInitiate(oldEmail: string, newEmail: string): Promise<unknown>`, `changeAdminEmailVerify(oldEmail: string, newEmail: string, otp: string): Promise<unknown>`, `resendAdminEmailChangeOtp(): Promise<unknown>`. Task 9 (Account page) imports exactly these names, plus `getAdminProfile`/`updateAdminProfile`/`deleteAdminAccount`/`adminLogout` already produced by Task 2.

Best-guess request shapes mirror the equivalent user-side functions in `lib/api/endpoints.ts` (`changePasswordInitiate`, `changePasswordVerify`, `changeEmailInitiate`, `changeEmailVerify`), since the Admin API doc names these endpoints without full body schemas. These cannot be curl-verified without a live admin session (per the Global Constraints); build to this shape and flag for live verification once real admin credentials are available.

- [ ] **Step 1: Write the failing tests (append to the existing file)**

```ts
// lib/api/admin/endpoints.test.ts: add inside the existing describe block, or a new one
import {
  changeAdminPasswordInitiate, changeAdminPasswordVerify, resendAdminPasswordChangeOtp,
  changeAdminEmailInitiate, changeAdminEmailVerify, resendAdminEmailChangeOtp,
} from './endpoints'

describe('admin account credential changes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('changeAdminPasswordInitiate posts email and oldPassword', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminPasswordInitiate('a@b.com', 'oldpw')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/change-admin-password/initiate', {
      method: 'POST', body: { email: 'a@b.com', oldPassword: 'oldpw' },
    })
  })

  it('changeAdminPasswordVerify posts email, oldPassword, newPassword, and otp', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminPasswordVerify('a@b.com', 'oldpw', 'newpw', '123456')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/change-admin-password/verify', {
      method: 'POST', body: { email: 'a@b.com', oldPassword: 'oldpw', newPassword: 'newpw', otp: '123456' },
    })
  })

  it('resendAdminPasswordChangeOtp posts with no body', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resendAdminPasswordChangeOtp()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/resend-password-change-otp', { method: 'POST' })
  })

  it('changeAdminEmailInitiate posts oldEmail and newEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminEmailInitiate('old@b.com', 'new@b.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/change-admin-email/initiate', {
      method: 'POST', body: { oldEmail: 'old@b.com', newEmail: 'new@b.com' },
    })
  })

  it('changeAdminEmailVerify posts oldEmail, newEmail, and otp', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminEmailVerify('old@b.com', 'new@b.com', '654321')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/change-admin-email/verify', {
      method: 'POST', body: { oldEmail: 'old@b.com', newEmail: 'new@b.com', otp: '654321' },
    })
  })

  it('resendAdminEmailChangeOtp posts with no body', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await resendAdminEmailChangeOtp()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/resend-email-change-otp', { method: 'POST' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/api/admin/endpoints`
Expected: FAIL, the six new functions are not exported

- [ ] **Step 3: Append the new functions to `lib/api/admin/endpoints.ts`**

```ts
// lib/api/admin/endpoints.ts: add after deleteAdminAccount
export const changeAdminPasswordInitiate = (email: string, oldPassword: string) =>
  adminApiFetch('/api/v1/admins/change-admin-password/initiate', { method: 'POST', body: { email, oldPassword } })
export const changeAdminPasswordVerify = (email: string, oldPassword: string, newPassword: string, otp: string) =>
  adminApiFetch('/api/v1/admins/change-admin-password/verify', {
    method: 'POST', body: { email, oldPassword, newPassword, otp },
  })
export const resendAdminPasswordChangeOtp = () =>
  adminApiFetch('/api/v1/admins/resend-password-change-otp', { method: 'POST' })
export const changeAdminEmailInitiate = (oldEmail: string, newEmail: string) =>
  adminApiFetch('/api/v1/admins/change-admin-email/initiate', { method: 'POST', body: { oldEmail, newEmail } })
export const changeAdminEmailVerify = (oldEmail: string, newEmail: string, otp: string) =>
  adminApiFetch('/api/v1/admins/change-admin-email/verify', { method: 'POST', body: { oldEmail, newEmail, otp } })
export const resendAdminEmailChangeOtp = () =>
  adminApiFetch('/api/v1/admins/resend-email-change-otp', { method: 'POST' })
```

- [ ] **Step 4: Extend `lib/api/admin/mock-store.ts` to track email changes**

```ts
// lib/api/admin/mock-store.ts: replace the whole file
import type { AdminProfile } from './types'

let profile: AdminProfile = {
  id: 1,
  name: 'Ada Admin',
  email: 'admin@earsforyou.test',
  createdAt: '2026-01-01T00:00:00Z',
}

export const adminMockStore = {
  getProfile(): AdminProfile {
    return profile
  },
  updateProfile(patch: Partial<AdminProfile>): AdminProfile {
    profile = { ...profile, ...patch }
    return profile
  },
  confirmEmailChange(newEmail: string): AdminProfile {
    profile = { ...profile, email: newEmail }
    return profile
  },
}
```

- [ ] **Step 5: Add the matching mock routes to `lib/api/admin/mock-fetch.ts`**

```ts
// lib/api/admin/mock-fetch.ts: add before the final throw
  if (
    method === 'POST' &&
    (pathname === '/api/v1/admins/change-admin-password/initiate' ||
      pathname === '/api/v1/admins/change-admin-password/verify' ||
      pathname === '/api/v1/admins/resend-password-change-otp')
  ) {
    return delay({ message: 'ok' } as T)
  }
  if (pathname === '/api/v1/admins/change-admin-email/initiate' && method === 'POST') {
    return delay({ message: 'ok' } as T)
  }
  if (pathname === '/api/v1/admins/change-admin-email/verify' && method === 'POST') {
    const { newEmail } = (opts.body ?? {}) as { newEmail?: string }
    return delay(adminMockStore.confirmEmailChange(newEmail ?? '') as T)
  }
  if (pathname === '/api/v1/admins/resend-email-change-otp' && method === 'POST') {
    return delay({ message: 'ok' } as T)
  }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- lib/api/admin/endpoints`
Expected: PASS, 16/16

- [ ] **Step 7: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean

- [ ] **Step 8: Commit**

```bash
git add lib/api/admin/endpoints.ts lib/api/admin/endpoints.test.ts lib/api/admin/mock-fetch.ts lib/api/admin/mock-store.ts
git commit -m "feat: add admin credential change endpoints"
```

---

### Task 9: The admin Account page

**Files:**
- Create: `app/admin/(dashboard)/account/page.tsx`

**Interfaces:**
- Consumes: `AdminProfile` from `lib/api/admin/types.ts` (Task 2); `getAdminProfile`, `updateAdminProfile`, `deleteAdminAccount`, `adminLogout` (Task 2); `changeAdminPasswordInitiate`, `changeAdminPasswordVerify`, `resendAdminPasswordChangeOtp`, `changeAdminEmailInitiate`, `changeAdminEmailVerify`, `resendAdminEmailChangeOtp` (Task 8); `adminQk` from `lib/query/admin-keys.ts` (Task 3); `Sheet`, `Skeleton`, `ErrorState`, `Button`, `Field`, `OtpInput`, `ResendButton`, `passwordIssue`, `ApiError` (all existing, unmodified).

This is a smaller version of the user app's `app/(app)/you/page.tsx`, dropping the notification-settings section (no equivalent admin endpoint exists) and the wellness-specific profile fields (no gender/country/date-of-birth/marital/employment status for an admin), otherwise reusing the exact same section/sheet/flow structure since it is already a proven, well-built pattern.

- [ ] **Step 1: Create `app/admin/(dashboard)/account/page.tsx`**

```tsx
// app/admin/(dashboard)/account/page.tsx
'use client'
import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminLogout, changeAdminEmailInitiate, changeAdminEmailVerify, changeAdminPasswordInitiate,
  changeAdminPasswordVerify, deleteAdminAccount, getAdminProfile, resendAdminEmailChangeOtp,
  resendAdminPasswordChangeOtp, updateAdminProfile,
} from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { ApiError } from '@/lib/api/errors'
import { passwordIssue } from '@/lib/password'
import type { AdminProfile } from '@/lib/api/admin/types'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { OtpInput, ResendButton } from '@/components/otp-input'

const EMAIL_RE = /.+@.+\..+/

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.'
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card px-5 py-4">
      <p className="text-sm font-medium opacity-60">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function RowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center justify-between text-left text-[15px]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
    >
      {label}
      <span aria-hidden className="opacity-40">{'>'}</span>
    </button>
  )
}

function Header({ profile }: { profile: AdminProfile }) {
  const initial = profile.name.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="flex items-center gap-4 px-1">
      <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-fir
        font-display text-xl font-semibold text-oat">
        {initial}
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-lg font-semibold">{profile.name}</p>
        <p className="truncate text-sm opacity-70">{profile.email}</p>
      </div>
    </div>
  )
}

function ProfileEditor({ profile, onDone }: { profile: AdminProfile; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(profile.name)

  const save = useMutation({
    mutationFn: () => updateAdminProfile({ name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.profile })
      onDone()
    },
  })

  const valid = name.trim().length > 0

  return (
    <form
      onSubmit={e => { e.preventDefault(); if (valid) save.mutate() }}
      className="flex flex-col gap-4"
    >
      {save.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(save.error)}</p> : null}
      <Field label="Name" required value={name} onChange={e => setName(e.target.value)} />
      <Button type="submit" busy={save.isPending} disabled={!valid}>Save changes</Button>
    </form>
  )
}

function ChangePasswordFlow({ email, onDone }: { email: string; onDone: () => void }) {
  const [step, setStep] = useState<'current' | 'verify' | 'done'>('current')
  const [oldPassword, setOldPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const initiate = useMutation({
    mutationFn: () => changeAdminPasswordInitiate(email, oldPassword),
    onSuccess: () => setStep('verify'),
  })
  const verify = useMutation({
    mutationFn: () => changeAdminPasswordVerify(email, oldPassword, newPassword, otp),
    onSuccess: () => setStep('done'),
  })

  if (step === 'done') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px]">Password updated.</p>
        <Button type="button" onClick={onDone}>Done</Button>
      </div>
    )
  }

  if (step === 'verify') {
    const pwIssue = passwordIssue(newPassword)
    const newPasswordValid = !pwIssue && newPassword === confirmPassword
    return (
      <form onSubmit={e => { e.preventDefault(); if (otp.length === 6 && newPasswordValid) verify.mutate() }}
        className="flex flex-col gap-4">
        {verify.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(verify.error)}</p> : null}
        <OtpInput length={6} onComplete={setOtp} />
        <Field label="New password" type="password" autoComplete="new-password" required
          value={newPassword} onChange={e => setNewPassword(e.target.value)}
          error={newPassword.length > 0 ? pwIssue ?? undefined : undefined} />
        <Field label="Confirm new password" type="password" autoComplete="new-password" required
          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        <ResendButton cooldownSeconds={60} onResend={resendAdminPasswordChangeOtp} />
        <Button type="submit" busy={verify.isPending} disabled={otp.length !== 6 || !newPasswordValid}>
          Update password
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={e => { e.preventDefault(); if (oldPassword) initiate.mutate() }} className="flex flex-col gap-4">
      {initiate.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(initiate.error)}</p> : null}
      <Field label="Current password" type="password" autoComplete="current-password" required
        value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
      <Button type="submit" busy={initiate.isPending} disabled={!oldPassword}>Continue</Button>
    </form>
  )
}

function ChangeEmailFlow({ email, onDone }: { email: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'new' | 'verify' | 'done'>('new')
  const [newEmail, setNewEmail] = useState('')
  const [otp, setOtp] = useState('')

  const initiate = useMutation({
    mutationFn: () => changeAdminEmailInitiate(email, newEmail),
    onSuccess: () => setStep('verify'),
  })
  const verify = useMutation({
    mutationFn: () => changeAdminEmailVerify(email, newEmail, otp),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.profile })
      setStep('done')
    },
  })

  if (step === 'done') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px]">Email updated.</p>
        <Button type="button" onClick={onDone}>Done</Button>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <form onSubmit={e => { e.preventDefault(); if (otp.length === 6) verify.mutate() }} className="flex flex-col gap-4">
        {verify.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(verify.error)}</p> : null}
        <p className="text-sm opacity-70">Enter the code sent to {newEmail}.</p>
        <OtpInput length={6} onComplete={setOtp} />
        <ResendButton cooldownSeconds={60} onResend={resendAdminEmailChangeOtp} />
        <Button type="submit" busy={verify.isPending} disabled={otp.length !== 6}>Confirm new email</Button>
      </form>
    )
  }

  const valid = EMAIL_RE.test(newEmail) && newEmail !== email

  return (
    <form onSubmit={e => { e.preventDefault(); if (valid) initiate.mutate() }} className="flex flex-col gap-4">
      {initiate.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(initiate.error)}</p> : null}
      <Field label="New email" type="email" autoComplete="email" required
        value={newEmail} onChange={e => setNewEmail(e.target.value)} />
      <Button type="submit" busy={initiate.isPending} disabled={!valid}>Send code</Button>
    </form>
  )
}

function DeleteAccountFlow() {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')

  const del = useMutation({
    mutationFn: () => deleteAdminAccount(),
    onSuccess: async () => {
      await adminLogout()
      router.replace('/admin/login')
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px]">This removes your admin access. It cannot be undone.</p>
      {del.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(del.error)}</p> : null}
      <Field label='Type "DELETE" to confirm' value={confirmText} onChange={e => setConfirmText(e.target.value)} />
      <Button
        type="button"
        variant="destructive"
        busy={del.isPending}
        disabled={confirmText !== 'DELETE'}
        onClick={() => del.mutate()}
      >
        Delete my account
      </Button>
    </div>
  )
}

type SheetKind = 'profile' | 'password' | 'email' | 'delete' | null

function AccountSkeleton() {
  return (
    <div className="max-w-xl space-y-4">
      <Skeleton lines={2} />
      <div className="rounded-2xl bg-card px-5 py-4"><Skeleton lines={3} /></div>
    </div>
  )
}

export default function AdminAccountPage() {
  const router = useRouter()
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [signingOut, setSigningOut] = useState(false)

  const profile = useQuery({ queryKey: adminQk.profile, queryFn: getAdminProfile })

  async function handleSignOut() {
    setSigningOut(true)
    await adminLogout()
    router.replace('/admin/login')
  }

  if (profile.isError) {
    return <ErrorState error={profile.error} retry={() => void profile.refetch()} />
  }
  if (profile.isLoading || !profile.data) return <AccountSkeleton />

  const data = profile.data

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Header profile={data} />

      <Section title="Profile">
        <RowButton label="Edit profile" onClick={() => setSheet('profile')} />
      </Section>

      <Section title="Security">
        <div className="flex flex-col divide-y divide-fir/10">
          <RowButton label="Change password" onClick={() => setSheet('password')} />
          <RowButton label="Change email" onClick={() => setSheet('email')} />
        </div>
      </Section>

      <div className="mt-2 flex flex-col gap-3">
        <Button type="button" variant="ghost" busy={signingOut} onClick={handleSignOut}>
          Sign out
        </Button>
        <button
          type="button"
          onClick={() => setSheet('delete')}
          className="inline-flex min-h-11 items-center justify-center self-center text-sm
            text-fir/60 underline underline-offset-4
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
        >
          Delete account
        </button>
      </div>

      <Sheet open={sheet === 'profile'} onClose={() => setSheet(null)} title="Edit profile">
        <ProfileEditor profile={data} onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'password'} onClose={() => setSheet(null)} title="Change password">
        <ChangePasswordFlow email={data.email} onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'email'} onClose={() => setSheet(null)} title="Change email">
        <ChangeEmailFlow email={data.email} onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'delete'} onClose={() => setSheet(null)} title="Delete your admin account?">
        <DeleteAccountFlow />
      </Sheet>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean

- [ ] **Step 3: Manual verification**

On the dev server, sign in, go to `/admin/account`, confirm the profile loads (mock data), walk edit-profile, change-password, and change-email through their sheets to completion, confirm delete-account (with the "DELETE" confirmation typed) signs out and redirects to `/admin/login`. Confirm Account is reachable and marked current in both the desktop sidebar and the mobile drawer. Kill the dev server when done. Screenshot both breakpoints.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/account/page.tsx"
git commit -m "feat: add the admin account page"
```

---

### Task 10: Final audit

**Files:** none new; this task only verifies and, if needed, fixes issues found across the whole admin surface.

- [ ] **Step 1: Full gate suite**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass, production build succeeds

- [ ] **Step 2: All-states audit**

For Login and Account specifically (the two screens with live data or the most complex state machines), confirm loading, error, and success states are all reachable and legible: temporarily point `API_URL` at an unreachable host to force error states on Account's profile load, confirm `ErrorState` renders correctly, then restore `API_URL`. Confirm Login's inline error renders on a forced failure (mock mode always succeeds; use a temporarily broken `API_URL` or a unit-test-level check instead of trying to force this through mock mode).

- [ ] **Step 3: Copy and token audit**

```bash
grep -rn $'—' app/admin components/admin lib/api/admin lib/query/admin-keys.ts || echo clean
```

Should report clean. If it finds anything, fix it in place.

- [ ] **Step 4: Breakpoint audit**

At 375px, 768px, and 1900px: confirm no horizontal scroll on any of the thirteen admin routes (`/admin/login`, `/admin/register`, `/admin/verify`, `/admin/forgot-password`, `/admin/recovery`, `/admin/dashboard`, `/admin/analytics`, `/admin/users`, `/admin/emergency`, `/admin/settings`, `/admin/telemetry`, `/admin/broadcasts`, `/admin/account`), the sidebar/drawer swap happens cleanly at `lg:`, and the sidebar's horizontal position is identical across every authenticated route (not just the three checked in Task 7).

- [ ] **Step 5: Commit and hand over**

```bash
git add -A
git commit -m "chore: final audit for the admin shell and auth phase"
```

Start `npm run dev` from the main session (it must survive between turns), hand the client the URL, and wait for explicit approval before calling this phase complete, per the project's standing definition of done.

---

## Self-Review Notes

- Spec coverage: shared visual identity and no-hero-art rule (`AdminAuthCard`, Task 3), full auth lifecycle (login Task 4, register/verify Task 5, forgot-password/recovery Task 6), the persistent nav shell with responsive sidebar/drawer collapse and all seven future sections stubbed (Task 7), the Account page covering profile/password/email/deletion (Tasks 8-9), architecture requirements (separate token/client/mock modules Task 1-2, no proxy changes, reused shared components throughout), and the field-shape verification risk called out in the Global Constraints and acted on in Task 2.
- Placeholder scan: no TBD/TODO markers. The one deliberate, explicitly-explained temporary gap (Task 1 Step 7-8, `adminMockFetch` stubbed until Task 2) mirrors the same accepted pattern used in the prior Listening-identity redesign plan's Task 1.
- Type consistency checked: `AdminProfile`/`AdminRegisterPayload`/`UpdateAdminProfilePayload` (Task 2) match their usage in Task 5 (register), Task 8 (credential changes), and Task 9 (account page) exactly. `AdminAuthCard`'s props (`title`, `subtitle`, `children`) match between Task 3's definition and every consumer in Tasks 4-6. `AdminShell`'s single prop (`children`) matches between Task 7's definition and its one consumer, `app/admin/(dashboard)/layout.tsx`. `adminQk.profile` matches between Task 3's definition and Task 9's usage.
