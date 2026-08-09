# Admin Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Users stub with the real user management screen: a searchable, filterable, paginated user list, a suspend/reactivate/change-email/support-failover management sheet per user, and a recent audit log panel, covering `docs/Admin_Endpoints.pdf` section 5 in full.

**Architecture:** Extends the existing `lib/api/admin/` module with six new endpoint functions (one list, four actions, one log fetch) and a parameterized OTP-generation function covering all four failover kinds. A new dedicated `UserManageSheet` component keeps the per-user action flows out of the main page file.

**Tech Stack:** Next.js 16.3, React 19, Tailwind v4, TanStack Query, Vitest + Testing Library (already in place, no new dependencies).

## Global Constraints

- Design spec of record: `docs/superpowers/specs/2026-08-09-earsforyou-admin-users-design.md`. Every task's requirements implicitly include it.
- Every `PUT`/`POST` action endpoint in this phase sends a JSON body, never a query string, matching the established convention for every admin endpoint so far (the Admin API doc's `Params:` annotations are query-style hints, not literal query-string requirements). `GET /api/v1/admins/users` is the one exception: it is a genuine `GET` and its filters go in the URL's query string.
- Same visual identity/conventions as Phases 1-2: `oat`/`fir`/`card`/`marigold`/`clay`/`leaf` tokens, no new tokens, reuse `Skeleton`/`ErrorState`/`Button`/`Field`/`Sheet` as-is.
- No AI attribution in any commit. No em dashes anywhere.
- Field shapes for all six endpoints are best-guesses (none reachable without a valid admin session, so none can be curl-verified pre-auth). Build to the shapes given in this plan; live verification is a follow-up once real admin credentials are available.
- Verification per task: `npm test && npx tsc --noEmit && npm run lint` at minimum; `npm run build` on the final task. Screenshot-verify any task that changes visible layout with real Playwright renders, not curl or reasoning from source, per this project's established and repeatedly-necessary practice.
- Commit after every task, conventional message, verify with `git log -1 --format=%B` before moving on.

## File Structure

```
lib/api/admin/types.ts                       modify: add AdminUserSummary, AdminUsersPage, AdminAuditLogItem
lib/api/admin/endpoints.ts                   modify: add getAdminUsers, getAdminAuditLogs
lib/api/admin/endpoints.test.ts              modify: add coverage for the two new functions
lib/api/admin/mock-store.ts                  modify: add fake users list, audit logs, getUsers/getAuditLogs
lib/api/admin/mock-fetch.ts                  modify: add matching mock routes (with query-string parsing for /users)
lib/query/admin-keys.ts                      modify: add users, auditLogs query keys
lib/api/admin/endpoints.ts                   modify (Task 2): add suspendAdminUser, reactivateAdminUser, changeAdminUserEmail, generateAdminUserOtp
lib/api/admin/mock-store.ts                  modify (Task 2): add setUserStatus, setUserEmail, generateOtp
lib/api/admin/mock-fetch.ts                  modify (Task 2): add matching mock routes
components/admin/user-manage-sheet.tsx       create: UserManageSheet
components/admin/user-manage-sheet.test.tsx  create
app/admin/(dashboard)/users/page.tsx         modify: replace the stub with the real screen
app/admin/(dashboard)/users/page.test.tsx    create
```

Interfaces named here are binding across tasks; later tasks import exactly these names.

---

### Task 1: Types, query keys, and the read endpoints (list users, audit logs)

**Files:**
- Modify: `lib/api/admin/types.ts`, `lib/api/admin/endpoints.ts`, `lib/api/admin/endpoints.test.ts`, `lib/api/admin/mock-store.ts`, `lib/api/admin/mock-fetch.ts`, `lib/query/admin-keys.ts`

**Interfaces:**
- Consumes: `adminApiFetch` from `./client` (existing).
- Produces: `AdminUserSummary`, `AdminUsersPage`, `AdminAuditLogItem` from `lib/api/admin/types.ts`. `getAdminUsers(params?: { search?: string; status?: 'active' | 'suspended'; page?: number }): Promise<AdminUsersPage>`, `getAdminAuditLogs(): Promise<AdminAuditLogItem[]>` from `lib/api/admin/endpoints.ts`. `adminQk.users`, `adminQk.auditLogs` from `lib/query/admin-keys.ts`. Task 2 extends the same mock user list this task creates (via `setUserStatus`/`setUserEmail`, mutating the array in place). Task 4 (the page) is the consumer of everything in this task.

- [ ] **Step 1: Write the failing test**

```ts
// lib/api/admin/endpoints.test.ts: append to the existing file
import { getAdminUsers, getAdminAuditLogs } from './endpoints'

describe('admin users read endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getAdminUsers builds a query string from the provided filters', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ users: [], page: 1, totalPages: 1 })
    await getAdminUsers({ search: 'ada', status: 'active', page: 2 })
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users?search=ada&status=active&page=2')
  })

  it('getAdminUsers omits unset filters from the query string', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ users: [], page: 1, totalPages: 1 })
    await getAdminUsers()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users')
  })

  it('getAdminAuditLogs fetches the audit-logs path with no body', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue([])
    await getAdminAuditLogs()
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/audit-logs')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/api/admin/endpoints`
Expected: FAIL, the two new functions are not exported

- [ ] **Step 3: Add the new types to `lib/api/admin/types.ts`**

```ts
// lib/api/admin/types.ts: append
export interface AdminUserSummary {
  id: number
  name: string
  email: string
  status: 'active' | 'suspended'
  joinedAt: string
}
export interface AdminUsersPage {
  users: AdminUserSummary[]
  page: number
  totalPages: number
}
export interface AdminAuditLogItem {
  id: number
  action: string
  actor: string
  createdAt: string
}
```

- [ ] **Step 4: Add the two functions to `lib/api/admin/endpoints.ts`**

Update the existing type-import line to include the three new types, and append the two functions:

```ts
// lib/api/admin/endpoints.ts: extend the existing type import
import type {
  AdminProfile, AdminRegisterPayload, UpdateAdminProfilePayload,
  AdminDashboardMetrics, AdminBroadcastHistoryItem, AdminAnalytics,
  AdminUserSummary, AdminUsersPage, AdminAuditLogItem,
} from './types'

// lib/api/admin/endpoints.ts: append at the end of the file
export function getAdminUsers(params: { search?: string; status?: 'active' | 'suspended'; page?: number } = {}) {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.status) qs.set('status', params.status)
  if (params.page) qs.set('page', String(params.page))
  const query = qs.toString()
  return adminApiFetch<AdminUsersPage>(`/api/v1/admins/users${query ? `?${query}` : ''}`)
}
export const getAdminAuditLogs = () => adminApiFetch<AdminAuditLogItem[]>('/api/v1/admins/audit-logs')
```

`AdminUserSummary` is imported here even though this task's functions only return it nested inside `AdminUsersPage`; Task 2's functions will use `AdminUserSummary` directly, and importing it now avoids a second edit to this same import line in Task 2.

- [ ] **Step 5: Extend `lib/api/admin/mock-store.ts`**

Add these imports and definitions, keeping every existing definition (profile, dashboard metrics, broadcast history, analytics, and the existing `adminMockStore` methods) exactly as they are:

```ts
// lib/api/admin/mock-store.ts: extend the existing type import
import type {
  AdminProfile, AdminDashboardMetrics, AdminBroadcastHistoryItem, AdminAnalytics, AdminAnalyticsPoint,
  AdminUserSummary, AdminUsersPage, AdminAuditLogItem,
} from './types'

// lib/api/admin/mock-store.ts: add near the other module-level fake data
let users: AdminUserSummary[] = [
  { id: 1, name: 'Grace Okafor', email: 'grace.okafor@example.com', status: 'active', joinedAt: '2026-02-14T00:00:00Z' },
  { id: 2, name: 'Daniel Osei', email: 'daniel.osei@example.com', status: 'active', joinedAt: '2026-03-01T00:00:00Z' },
  { id: 3, name: 'Amara Chukwu', email: 'amara.chukwu@example.com', status: 'suspended', joinedAt: '2026-01-20T00:00:00Z' },
  { id: 4, name: 'Tomiwa Bello', email: 'tomiwa.bello@example.com', status: 'active', joinedAt: '2026-04-10T00:00:00Z' },
  { id: 5, name: 'Chiamaka Eze', email: 'chiamaka.eze@example.com', status: 'active', joinedAt: '2026-05-02T00:00:00Z' },
  { id: 6, name: 'Femi Adeyemi', email: 'femi.adeyemi@example.com', status: 'suspended', joinedAt: '2026-02-28T00:00:00Z' },
]

const auditLogs: AdminAuditLogItem[] = [
  { id: 1, action: 'Suspended user amara.chukwu@example.com', actor: 'Ada Admin', createdAt: '2026-08-06T10:00:00Z' },
  { id: 2, action: 'Sent broadcast to All users', actor: 'Ada Admin', createdAt: '2026-08-05T14:00:00Z' },
]

const USERS_PAGE_SIZE = 5
```

Add these methods inside the existing `adminMockStore` object literal, alongside the existing methods (do not replace the object):

```ts
// lib/api/admin/mock-store.ts: add inside the existing adminMockStore object
  getUsers(params: { search?: string; status?: 'active' | 'suspended'; page?: number }): AdminUsersPage {
    const page = params.page ?? 1
    let filtered = users
    if (params.status) filtered = filtered.filter(u => u.status === params.status)
    if (params.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    const totalPages = Math.max(1, Math.ceil(filtered.length / USERS_PAGE_SIZE))
    const start = (page - 1) * USERS_PAGE_SIZE
    return { users: filtered.slice(start, start + USERS_PAGE_SIZE), page, totalPages }
  },
  getAuditLogs(): AdminAuditLogItem[] {
    return auditLogs
  },
```

- [ ] **Step 6: Add matching mock routes to `lib/api/admin/mock-fetch.ts`**

The `/users` route needs to parse the query string, not just the pathname, since `adminMockFetch` currently only splits it off to get `pathname`. Add before the final `throw`:

```ts
// lib/api/admin/mock-fetch.ts: add before the final throw
  if (pathname === '/api/v1/admins/users' && method === 'GET') {
    const queryString = path.split('?')[1] ?? ''
    const params = new URLSearchParams(queryString)
    const status = params.get('status')
    return delay(adminMockStore.getUsers({
      search: params.get('search') ?? undefined,
      status: status === 'active' || status === 'suspended' ? status : undefined,
      page: params.get('page') ? Number(params.get('page')) : undefined,
    }) as T)
  }
  if (pathname === '/api/v1/admins/audit-logs' && method === 'GET') {
    return delay(adminMockStore.getAuditLogs() as T)
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
  users: ['admin-users'] as const,
  auditLogs: ['admin-audit-logs'] as const,
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- lib/api/admin/endpoints`
Expected: PASS, 3 new tests passing alongside the existing ones

- [ ] **Step 9: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean

- [ ] **Step 10: Commit**

```bash
git add lib/api/admin/types.ts lib/api/admin/endpoints.ts lib/api/admin/endpoints.test.ts \
  lib/api/admin/mock-store.ts lib/api/admin/mock-fetch.ts lib/query/admin-keys.ts
git commit -m "feat: add the user list and audit log read endpoints"
```

---

### Task 2: The write/action endpoints (suspend, reactivate, change email, support failover)

**Files:**
- Modify: `lib/api/admin/endpoints.ts`, `lib/api/admin/endpoints.test.ts`, `lib/api/admin/mock-store.ts`, `lib/api/admin/mock-fetch.ts`

**Interfaces:**
- Consumes: `adminApiFetch` from `./client` (existing), `AdminUserSummary` type (Task 1).
- Produces: `suspendAdminUser(userEmail: string): Promise<unknown>`, `reactivateAdminUser(userEmail: string): Promise<unknown>`, `changeAdminUserEmail(currentEmail: string, newEmail: string): Promise<unknown>`, `generateAdminUserOtp(userEmail: string, kind: 'registration' | 'password' | 'email' | 'password-change'): Promise<{ otp: string }>` from `lib/api/admin/endpoints.ts`. Task 3 (`UserManageSheet`) is the only consumer of all four.

- [ ] **Step 1: Write the failing test**

```ts
// lib/api/admin/endpoints.test.ts: append to the existing file
import { suspendAdminUser, reactivateAdminUser, changeAdminUserEmail, generateAdminUserOtp } from './endpoints'

describe('admin user action endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('suspendAdminUser sends a JSON body, never a query string', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await suspendAdminUser('grace.okafor@example.com')
    const [path, opts] = (client.adminApiFetch as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(path).not.toContain('?')
    expect(opts).toEqual({ method: 'PUT', body: { userEmail: 'grace.okafor@example.com' } })
  })

  it('reactivateAdminUser sends a JSON body with userEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await reactivateAdminUser('amara.chukwu@example.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users/reactivate', {
      method: 'PUT', body: { userEmail: 'amara.chukwu@example.com' },
    })
  })

  it('changeAdminUserEmail sends currentEmail and newEmail', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ message: 'ok' })
    await changeAdminUserEmail('old@example.com', 'new@example.com')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users/change-email', {
      method: 'PUT', body: { currentEmail: 'old@example.com', newEmail: 'new@example.com' },
    })
  })

  it('generateAdminUserOtp dispatches to the correct failover path per kind', async () => {
    vi.spyOn(client, 'adminApiFetch').mockResolvedValue({ otp: '482913' })
    await generateAdminUserOtp('grace.okafor@example.com', 'registration')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users/failover/registration-otp', {
      method: 'POST', body: { userEmail: 'grace.okafor@example.com' },
    })

    await generateAdminUserOtp('grace.okafor@example.com', 'password-change')
    expect(client.adminApiFetch).toHaveBeenCalledWith('/api/v1/admins/users/failover/password-change-otp', {
      method: 'POST', body: { userEmail: 'grace.okafor@example.com' },
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/api/admin/endpoints`
Expected: FAIL, the four new functions are not exported

- [ ] **Step 3: Add the four functions to `lib/api/admin/endpoints.ts`**

```ts
// lib/api/admin/endpoints.ts: append at the end of the file
export const suspendAdminUser = (userEmail: string) =>
  adminApiFetch('/api/v1/admins/users/suspend', { method: 'PUT', body: { userEmail } })
export const reactivateAdminUser = (userEmail: string) =>
  adminApiFetch('/api/v1/admins/users/reactivate', { method: 'PUT', body: { userEmail } })
export const changeAdminUserEmail = (currentEmail: string, newEmail: string) =>
  adminApiFetch('/api/v1/admins/users/change-email', { method: 'PUT', body: { currentEmail, newEmail } })

const FAILOVER_OTP_PATHS: Record<'registration' | 'password' | 'email' | 'password-change', string> = {
  registration: '/api/v1/admins/users/failover/registration-otp',
  password: '/api/v1/admins/users/failover/password-otp',
  email: '/api/v1/admins/users/failover/email-otp',
  'password-change': '/api/v1/admins/users/failover/password-change-otp',
}
export const generateAdminUserOtp = (userEmail: string, kind: keyof typeof FAILOVER_OTP_PATHS) =>
  adminApiFetch<{ otp: string }>(FAILOVER_OTP_PATHS[kind], { method: 'POST', body: { userEmail } })
```

- [ ] **Step 4: Extend `lib/api/admin/mock-store.ts`**

Add these methods inside the existing `adminMockStore` object literal, alongside every method added so far:

```ts
// lib/api/admin/mock-store.ts: add inside the existing adminMockStore object
  setUserStatus(email: string, status: 'active' | 'suspended'): AdminUserSummary | undefined {
    const u = users.find(u => u.email === email)
    if (u) u.status = status
    return u
  },
  setUserEmail(currentEmail: string, newEmail: string): AdminUserSummary | undefined {
    const u = users.find(u => u.email === currentEmail)
    if (u) u.email = newEmail
    return u
  },
  generateOtp(): { otp: string } {
    return { otp: '482913' }
  },
```

The mock OTP is a fixed value rather than a random one, so screenshots and tests taken against mock mode are reproducible.

- [ ] **Step 5: Add matching mock routes to `lib/api/admin/mock-fetch.ts`**

```ts
// lib/api/admin/mock-fetch.ts: add before the final throw
  if (pathname === '/api/v1/admins/users/suspend' && method === 'PUT') {
    const { userEmail } = (opts.body ?? {}) as { userEmail?: string }
    adminMockStore.setUserStatus(userEmail ?? '', 'suspended')
    return delay({ message: 'ok' } as T)
  }
  if (pathname === '/api/v1/admins/users/reactivate' && method === 'PUT') {
    const { userEmail } = (opts.body ?? {}) as { userEmail?: string }
    adminMockStore.setUserStatus(userEmail ?? '', 'active')
    return delay({ message: 'ok' } as T)
  }
  if (pathname === '/api/v1/admins/users/change-email' && method === 'PUT') {
    const { currentEmail, newEmail } = (opts.body ?? {}) as { currentEmail?: string; newEmail?: string }
    adminMockStore.setUserEmail(currentEmail ?? '', newEmail ?? '')
    return delay({ message: 'ok' } as T)
  }
  if (
    method === 'POST' &&
    (pathname === '/api/v1/admins/users/failover/registration-otp' ||
      pathname === '/api/v1/admins/users/failover/password-otp' ||
      pathname === '/api/v1/admins/users/failover/email-otp' ||
      pathname === '/api/v1/admins/users/failover/password-change-otp')
  ) {
    return delay(adminMockStore.generateOtp() as T)
  }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- lib/api/admin/endpoints`
Expected: PASS, 4 new tests passing alongside the existing ones

- [ ] **Step 7: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean

- [ ] **Step 8: Commit**

```bash
git add lib/api/admin/endpoints.ts lib/api/admin/endpoints.test.ts lib/api/admin/mock-store.ts lib/api/admin/mock-fetch.ts
git commit -m "feat: add user suspend, reactivate, email override, and support failover endpoints"
```

---

### Task 3: The user management sheet

**Files:**
- Create: `components/admin/user-manage-sheet.tsx`, `components/admin/user-manage-sheet.test.tsx`

**Interfaces:**
- Consumes: `suspendAdminUser`, `reactivateAdminUser`, `changeAdminUserEmail`, `generateAdminUserOtp` (Task 2), `adminQk` (Task 1), `AdminUserSummary` type (Task 1), `Sheet`/`Button`/`Field` (existing, unmodified), `ApiError` from `lib/api/errors.ts` (existing).
- Produces: `UserManageSheet({ user, open, onClose }: { user: AdminUserSummary | null; open: boolean; onClose: () => void }): JSX.Element | null` from `components/admin/user-manage-sheet.tsx`. Task 4 (the Users page) is the only consumer.

`UserManageSheet` returns `null` immediately if `user` is `null`, before touching `Sheet` at all, since JSX children (including a `Sheet` whose own `open` prop happens to be `false`) are still evaluated by React before `Sheet` gets a chance to return `null` internally, and this component would otherwise crash reading `user.name`/`user.email` on a closed sheet with no user selected yet.

- [ ] **Step 1: Write the failing test**

```tsx
// components/admin/user-manage-sheet.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserManageSheet } from './user-manage-sheet'
import * as endpoints from '@/lib/api/admin/endpoints'

const USER = { id: 1, name: 'Grace Okafor', email: 'grace.okafor@example.com', status: 'active' as const, joinedAt: '2026-02-14T00:00:00Z' }

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('UserManageSheet', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when there is no selected user', () => {
    const { container } = renderWithClient(<UserManageSheet user={null} open={false} onClose={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a two-step confirm before suspending an active user', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'suspendAdminUser').mockResolvedValue(undefined)
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /suspend user/i }))
    expect(screen.getByRole('button', { name: /confirm suspend/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm suspend/i }))
    expect(endpoints.suspendAdminUser).toHaveBeenCalledWith('grace.okafor@example.com')
  })

  it('calls changeAdminUserEmail with the current and new email on submit', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'changeAdminUserEmail').mockResolvedValue(undefined)
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.type(screen.getByLabelText(/new email/i), 'grace.new@example.com')
    await user.click(screen.getByRole('button', { name: /update email/i }))

    expect(endpoints.changeAdminUserEmail).toHaveBeenCalledWith('grace.okafor@example.com', 'grace.new@example.com')
  })

  it('shows the generated code after a successful failover request', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'generateAdminUserOtp').mockResolvedValue({ otp: '482913' })
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /generate registration code/i }))

    expect(await screen.findByText('482913')).toBeInTheDocument()
    expect(endpoints.generateAdminUserOtp).toHaveBeenCalledWith('grace.okafor@example.com', 'registration')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- user-manage-sheet`
Expected: FAIL, cannot resolve `./user-manage-sheet`

- [ ] **Step 3: Create `components/admin/user-manage-sheet.tsx`**

```tsx
// components/admin/user-manage-sheet.tsx
'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  suspendAdminUser, reactivateAdminUser, changeAdminUserEmail, generateAdminUserOtp,
} from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { ApiError } from '@/lib/api/errors'
import type { AdminUserSummary } from '@/lib/api/admin/types'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

const EMAIL_RE = /.+@.+\..+/

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.'
}

type OtpKind = 'registration' | 'password' | 'email' | 'password-change'

const OTP_KINDS: { kind: OtpKind; label: string }[] = [
  { kind: 'registration', label: 'Generate registration code' },
  { kind: 'password', label: 'Generate password reset code' },
  { kind: 'email', label: 'Generate email change code' },
  { kind: 'password-change', label: 'Generate password change code' },
]

function StatusAction({ user }: { user: AdminUserSummary }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const isActive = user.status === 'active'

  const mutation = useMutation({
    mutationFn: () => (isActive ? suspendAdminUser(user.email) : reactivateAdminUser(user.email)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.users })
      setConfirming(false)
    },
  })

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        {mutation.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(mutation.error)}</p> : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isActive ? 'destructive' : 'primary'}
            busy={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {isActive ? 'Confirm suspend' : 'Confirm reactivate'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
        </div>
      </div>
    )
  }

  return (
    <Button type="button" variant={isActive ? 'destructive' : 'primary'} onClick={() => setConfirming(true)}>
      {isActive ? 'Suspend user' : 'Reactivate user'}
    </Button>
  )
}

function ChangeEmailForm({ user }: { user: AdminUserSummary }) {
  const queryClient = useQueryClient()
  const [newEmail, setNewEmail] = useState('')

  const mutation = useMutation({
    mutationFn: () => changeAdminUserEmail(user.email, newEmail),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.users })
      setNewEmail('')
    },
  })

  const valid = EMAIL_RE.test(newEmail) && newEmail !== user.email

  return (
    <form
      onSubmit={e => { e.preventDefault(); if (valid) mutation.mutate() }}
      className="flex flex-col gap-3"
    >
      {mutation.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(mutation.error)}</p> : null}
      {mutation.isSuccess ? <p className="text-sm text-leaf">Email updated.</p> : null}
      <Field label="New email" type="email" autoComplete="email" required
        value={newEmail} onChange={e => setNewEmail(e.target.value)} />
      <Button type="submit" busy={mutation.isPending} disabled={!valid}>Update email</Button>
    </form>
  )
}

function FailoverOtp({ user }: { user: AdminUserSummary }) {
  const [activeKind, setActiveKind] = useState<OtpKind | null>(null)
  const mutation = useMutation({
    mutationFn: (kind: OtpKind) => generateAdminUserOtp(user.email, kind),
    onMutate: (kind: OtpKind) => setActiveKind(kind),
  })

  return (
    <div className="flex flex-col gap-3">
      {OTP_KINDS.map(({ kind, label }) => (
        <div key={kind} className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="ghost"
            busy={mutation.isPending && activeKind === kind}
            onClick={() => mutation.mutate(kind)}
          >
            {label}
          </Button>
          {mutation.isSuccess && activeKind === kind ? (
            <p className="text-sm text-leaf">
              Code: <span className="font-display font-semibold">{mutation.data?.otp}</span>
            </p>
          ) : null}
          {mutation.isError && activeKind === kind ? (
            <p role="alert" className="text-sm text-clay">{errorMessage(mutation.error)}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function UserManageSheet({ user, open, onClose }: {
  user: AdminUserSummary | null
  open: boolean
  onClose: () => void
}) {
  if (!user) return null
  return (
    <Sheet open={open} onClose={onClose} title={user.name}>
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-sm font-semibold opacity-70">Status</p>
          <StatusAction user={user} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold opacity-70">Change email</p>
          <ChangeEmailForm user={user} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold opacity-70">Support failover</p>
          <FailoverOtp user={user} />
        </div>
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- user-manage-sheet`
Expected: PASS, 4/4

- [ ] **Step 5: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean

- [ ] **Step 6: Commit**

```bash
git add components/admin/user-manage-sheet.tsx components/admin/user-manage-sheet.test.tsx
git commit -m "feat: add the user management sheet"
```

---

### Task 4: The Users page

**Files:**
- Modify: `app/admin/(dashboard)/users/page.tsx`
- Create: `app/admin/(dashboard)/users/page.test.tsx`

**Interfaces:**
- Consumes: `getAdminUsers`, `getAdminAuditLogs` (Task 1), `adminQk` (Task 1), `UserManageSheet` (Task 3), `Skeleton`/`ErrorState`/`Field`/`Button` (existing), `AdminUserSummary` type (Task 1).
- Produces: `formatJoinedAt(iso: string): string`, `formatLogTime(iso: string): string`, exported for testability. Nothing else for other tasks to consume; this is a leaf page.

This replaces the `StubPage`-based stub entirely; the file no longer imports `StubPage`.

- [ ] **Step 1: Write the failing test**

```tsx
// app/admin/(dashboard)/users/page.test.tsx
import { describe, it, expect } from 'vitest'
import { formatJoinedAt, formatLogTime } from './page'

describe('formatJoinedAt', () => {
  it('formats a valid ISO date with the year', () => {
    expect(formatJoinedAt('2026-02-14T00:00:00Z')).toMatch(/Feb\s+14,\s+2026/)
  })
  it('returns an empty string for an invalid date', () => {
    expect(formatJoinedAt('not-a-date')).toBe('')
  })
})

describe('formatLogTime', () => {
  it('formats a valid ISO date as a short month/day string', () => {
    expect(formatLogTime('2026-08-06T10:00:00Z')).toMatch(/Aug\s+6/)
  })
  it('returns an empty string for an invalid date', () => {
    expect(formatLogTime('not-a-date')).toBe('')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- users/page`
Expected: FAIL, `formatJoinedAt`/`formatLogTime` are not exported (or the file fails to compile because it still renders `StubPage`)

- [ ] **Step 3: Rewrite `app/admin/(dashboard)/users/page.tsx`**

```tsx
// app/admin/(dashboard)/users/page.tsx
'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminUsers, getAdminAuditLogs } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import type { AdminUserSummary } from '@/lib/api/admin/types'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { UserManageSheet } from '@/components/admin/user-manage-sheet'

const STATUS_OPTIONS: { value: '' | 'active' | 'suspended'; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

export function formatJoinedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatLogTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | 'active' | 'suspended'>('')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null)

  const users = useQuery({
    queryKey: [...adminQk.users, { search, status, page }],
    queryFn: () => getAdminUsers({ search: search || undefined, status: status || undefined, page }),
  })
  const auditLogs = useQuery({ queryKey: adminQk.auditLogs, queryFn: getAdminAuditLogs })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Users</h1>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <Field label="Search" placeholder="Name or email"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setStatus(opt.value); setPage(1) }}
              className={`rounded-full px-3.5 py-2 text-sm font-medium
                ${status === opt.value ? 'bg-fir text-oat' : 'bg-card opacity-70'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {users.isError ? (
        <ErrorState error={users.error} retry={() => void users.refetch()} />
      ) : users.isLoading || !users.data ? (
        <div className="rounded-2xl bg-card px-4 py-3.5">
          <Skeleton lines={5} />
        </div>
      ) : users.data.users.length === 0 ? (
        <div className="rounded-2xl bg-card px-4 py-6 text-center text-sm opacity-55">
          No users match that search.
        </div>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-fir/10 rounded-2xl bg-card px-4">
            {users.data.users.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{u.name}</p>
                  <p className="truncate text-xs opacity-55">{u.email}</p>
                </div>
                <div className="flex flex-none items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold
                    ${u.status === 'active' ? 'bg-leaf/15 text-leaf' : 'bg-clay/15 text-clay'}`}>
                    {u.status === 'active' ? 'Active' : 'Suspended'}
                  </span>
                  <span className="hidden text-xs opacity-50 lg:inline">{formatJoinedAt(u.joinedAt)}</span>
                  <Button type="button" variant="ghost" onClick={() => setSelectedUser(u)}>Manage</Button>
                </div>
              </div>
            ))}
          </div>
          {users.data.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <span className="opacity-60">Page {users.data.page} of {users.data.totalPages}</span>
              <Button type="button" variant="ghost" disabled={page >= users.data.totalPages}
                onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold opacity-70">Recent audit logs</p>
        {auditLogs.isError ? (
          <ErrorState error={auditLogs.error} retry={() => void auditLogs.refetch()} />
        ) : auditLogs.isLoading || !auditLogs.data ? (
          <div className="rounded-2xl bg-card px-4 py-3.5">
            <Skeleton lines={3} />
          </div>
        ) : auditLogs.data.length === 0 ? (
          <div className="rounded-2xl bg-card px-4 py-6 text-center text-sm opacity-55">
            No audit activity yet.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-fir/10 rounded-2xl bg-card px-4">
            {auditLogs.data.map(log => (
              <div key={log.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px]">{log.action}</p>
                  <p className="text-xs opacity-55">{log.actor}</p>
                </div>
                <span className="flex-none text-xs opacity-50">{formatLogTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <UserManageSheet user={selectedUser} open={selectedUser !== null} onClose={() => setSelectedUser(null)} />
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- users/page`
Expected: PASS, 4/4

- [ ] **Step 5: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean. This is the point where the whole suite should be green again.

- [ ] **Step 6: Manual verification**

Start the dev server (`NEXT_PUBLIC_USE_MOCKS=true npm run dev`), sign in, visit `/admin/users`, confirm: the six mock users render, searching by name or email filters the list live, the status filter pills work, opening "Manage" on an active user shows "Suspend user" and on a suspended user shows "Reactivate user," the two-step confirm works and the list updates after confirming, the change-email form updates the row's email after submit, each of the four failover buttons shows the code "482913" after clicking, and the audit log panel shows its two mock entries. Check at phone and desktop width. Screenshot both. Kill the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add "app/admin/(dashboard)/users/page.tsx" "app/admin/(dashboard)/users/page.test.tsx"
git commit -m "feat: replace the users stub with the real user management screen"
```

---

### Task 5: Final audit

**Files:** none new; this task only verifies and, if needed, fixes issues found across this phase's screen.

- [ ] **Step 1: Full gate suite**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass, production build succeeds

- [ ] **Step 2: All-states audit**

Temporarily point `API_URL` at an unreachable host, confirm `ErrorState` renders correctly on both the user list and the audit log panel independently (one can error while the other loads), then restore `API_URL`. Confirm the manage sheet's three inline error states (status action, change email, failover OTP) each render correctly under the same forced failure.

- [ ] **Step 3: Copy and token audit**

```bash
grep -rn $'—' app/admin components/admin lib/api/admin lib/query/admin-keys.ts || echo clean
```

Should report clean. Fix in place if not.

- [ ] **Step 4: Breakpoint audit**

At 375px, 768px, and 1900px: confirm no horizontal scroll on `/admin/users`, the search/filter row reflows correctly (stacked on phone, inline on desktop per the given classes), the manage sheet opens as a bottom sheet on phone and a centered dialog on desktop (the existing `Sheet` component's own established behavior), and pagination controls remain usable at phone width. Use real Playwright screenshots.

- [ ] **Step 5: Commit and hand over**

```bash
git add -A
git commit -m "chore: final audit for the admin users phase"
```

Start `npm run dev` from the main session (it must survive between turns), hand the client the URL, and wait for explicit approval before calling this phase complete, per the project's standing definition of done.

---

## Self-Review Notes

- Spec coverage: the user list with search/filter/pagination (Task 1, Task 4), suspend/reactivate/change-email/support-failover actions (Task 2, Task 3), the recent audit log panel (Task 1, Task 4), and the project's standing testing/screenshot/definition-of-done rules (Task 5, Global Constraints) are all covered.
- Placeholder scan: no TBD/TODO markers. Best-guess field shapes and pagination behavior are explicitly marked as such with a stated verification plan.
- Type consistency checked: `AdminUserSummary`/`AdminUsersPage`/`AdminAuditLogItem` (Task 1) match their usage in Task 3 (`UserManageSheet`'s `user: AdminUserSummary`) and Task 4 (`users.data.users`, `auditLogs.data`) exactly. `UserManageSheet`'s props (`user`, `open`, `onClose`) match between Task 3's definition and Task 4's one call site. The four action functions' signatures (Task 2) match their usage inside `UserManageSheet` (Task 3) exactly, including the `OtpKind` union appearing identically in both the endpoint's parameter type and the component's local type alias.
