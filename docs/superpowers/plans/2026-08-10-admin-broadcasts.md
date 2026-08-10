# Admin Broadcasts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/admin/broadcasts` stub with a real screen: summary cards, a compose form, and the full broadcast history — reusing Phase 2's already-shipped read plumbing rather than duplicating it.

**Architecture:** One new endpoint function (`sendAdminBroadcast`) plus a small, precise change to an existing one (`getAdminBroadcastHistory` currently discards the summary counts by unwrapping straight to `.notifications` — this phase needs those counts too, so the function changes to return the full wrapped response, with the one existing consumer, Dashboard's "Recent broadcasts" panel, updated to match). This keeps exactly one query key (`adminQk.broadcastHistory`) and one cached dataset shared by both screens, so sending a broadcast from this new page and viewing the Dashboard panel always agree.

**Tech Stack:** Next.js 16.3 App Router, React 19, TanStack Query, Tailwind v4 tokens, Vitest + Testing Library.

## Global Constraints

- Design spec of record: `docs/superpowers/specs/2026-08-10-earsforyou-admin-broadcasts-design.md`.
- `POST /api/v1/admins/broadcast` is fire-and-forget (Kafka-queued) — UI copy must say "queued for delivery," matching the backend's own response message verbatim, never implying confirmed delivery.
- The backend enforces zero validation on the broadcast body — the frontend must require non-empty Title and Message before allowing Send.
- `segment` values on send are `'ALL_USERS' | 'RE_ENGAGEMENT' | 'SYSTEM_MAINTENANCE'` (confirmed round-tripping enum constant names). `segment` on the READ side (`AdminBroadcastHistoryItem.segment`) is a plain `string`, not this union — do not conflate the two, they are genuinely different types on two different backend DTOs.
- Same visual identity/conventions as Phases 1-5: `oat`/`fir`/`card`/`marigold`/`clay`/`leaf` tokens, no new tokens, reuse `Skeleton`/`ErrorState`/`Button`/`Field` as-is.
- No AI attribution in any commit. No em dashes anywhere.
- Verification per task: `npm test && npx tsc --noEmit && npm run lint` at minimum; `npm run build` on the final task. Screenshot-verify any task that changes visible layout with real Playwright renders.
- Commit after every task, conventional message, verify with `git log -1 --format=%B` before moving on.
- Before staging any commit, run `git status` and confirm nothing outside this phase's file list is included — the repo has an unrelated pre-existing untracked `backend/` Java source tree at the root, and `next dev` has previously produced a spurious `app/layout.tsx` rewrite that must be reverted, never committed.

## File Structure

```
lib/api/admin/types.ts                          modify: add AdminBroadcastPayload
lib/api/admin/endpoints.ts                       modify: add sendAdminBroadcast; change getAdminBroadcastHistory to return the full AdminNotificationDashboardResponse instead of unwrapping to .notifications
lib/api/admin/endpoints.test.ts                  modify: update the existing getAdminBroadcastHistory test for the new return shape, add coverage for sendAdminBroadcast
lib/api/admin/mock-store.ts                      modify: add stateful sendBroadcast(payload)
lib/api/admin/mock-fetch.ts                      modify: add matching POST route
app/admin/(dashboard)/dashboard/page.tsx         modify: update broadcasts.data usage for the new wrapped shape (broadcasts.data.notifications, not broadcasts.data directly)
app/admin/(dashboard)/dashboard/page.test.tsx    modify: update fixtures/assertions for the new wrapped shape
app/admin/(dashboard)/broadcasts/page.tsx        modify: replace the stub with the real screen
app/admin/(dashboard)/broadcasts/page.test.tsx   create
```

Interfaces named here are binding across tasks; later tasks import exactly these names.

---

### Task 1: The send endpoint, and un-flattening the broadcast-history read

**Files:**
- Modify: `lib/api/admin/types.ts`, `lib/api/admin/endpoints.ts`, `lib/api/admin/endpoints.test.ts`, `lib/api/admin/mock-store.ts`, `lib/api/admin/mock-fetch.ts`, `app/admin/(dashboard)/dashboard/page.tsx`, `app/admin/(dashboard)/dashboard/page.test.tsx`

**Interfaces:**
- Produces: `AdminBroadcastPayload = { title: string, message: string, segment: 'ALL_USERS' | 'RE_ENGAGEMENT' | 'SYSTEM_MAINTENANCE' }`, `sendAdminBroadcast(payload: AdminBroadcastPayload): Promise<unknown>`, `getAdminBroadcastHistory(): Promise<AdminNotificationDashboardResponse>` (CHANGED return type — was `Promise<AdminBroadcastHistoryItem[]>`).

- [ ] **Step 1: Add the payload type**

In `lib/api/admin/types.ts`:

```ts
export interface AdminBroadcastPayload {
  title: string
  message: string
  segment: 'ALL_USERS' | 'RE_ENGAGEMENT' | 'SYSTEM_MAINTENANCE'
}
```

- [ ] **Step 2: Change `getAdminBroadcastHistory` to stop unwrapping, add `sendAdminBroadcast`**

Current code (read it first, exact line numbers may have shifted):

```ts
export async function getAdminBroadcastHistory(): Promise<AdminBroadcastHistoryItem[]> {
  const r = await adminApiFetch<AdminNotificationDashboardResponse>('/api/v1/admins/dashboard/notifications')
  return r.notifications
}
```

Change to:

```ts
export const getAdminBroadcastHistory = () =>
  adminApiFetch<AdminNotificationDashboardResponse>('/api/v1/admins/dashboard/notifications')

export const sendAdminBroadcast = (payload: AdminBroadcastPayload) =>
  adminApiFetch('/api/v1/admins/broadcast', { method: 'POST', body: payload })
```

Add `AdminBroadcastPayload` to the type-only import block.

- [ ] **Step 3: Update the existing test, add a new one**

In `endpoints.test.ts`, update `getAdminBroadcastHistory`'s existing test to assert the function
returns the full mocked response object (not just `.notifications`). Add a new test for
`sendAdminBroadcast` asserting method/path/body.

Run: `npx vitest run lib/api/admin/endpoints.test.ts` — expected: the pre-existing test now fails
until Step 3 above is applied to it, then passes; the new test passes.

- [ ] **Step 4: Update Dashboard's consumer**

In `app/admin/(dashboard)/dashboard/page.tsx`, every read of `broadcasts.data` that treats it as an
array (`.length`, `.map(...)`) must become `broadcasts.data.notifications.length` /
`.notifications.map(...)`. Read the file first to find every such site — there are a small number,
all within the "Recent broadcasts" panel's render logic. Do not change the panel's visible output
or copy, only the data-access path.

- [ ] **Step 5: Update Dashboard's test fixtures**

In `app/admin/(dashboard)/dashboard/page.test.tsx`, wherever the mocked `getAdminBroadcastHistory`
return value is currently a bare array, wrap it in `{ totalSent: 0, toAllUsers: 0, reEngagement: 0,
notifications: [...] }` (or realistic non-zero values if the existing test already checks specific
numbers elsewhere — match whatever the existing fixture's intent was). Run `npx vitest run
"app/admin/(dashboard)/dashboard/page.test.tsx"` and fix every resulting failure — do not leave any
red.

- [ ] **Step 6: Mock store and mock fetch**

In `mock-store.ts`, find the existing broadcast-history fixture/getter (from Phase 2) and add a
`sendBroadcast(payload: AdminBroadcastPayload)` method that: generates a new `formattedId` (follow
whatever ID-generation convention the existing fixture already uses, e.g. a counter or timestamp-
based string), appends a new entry to the notifications list using the submitted
title/message/segment and a current-ish `sentAt` value, increments `totalSent` always, and
increments `toAllUsers` if `segment === 'ALL_USERS'` or `reEngagement` if `segment ===
'RE_ENGAGEMENT'` (no counter increments for `SYSTEM_MAINTENANCE` beyond `totalSent` — the real
response has no segment-specific counter for it). In `mock-fetch.ts`, add a `POST
/api/v1/admins/broadcast` route calling this method and returning `{ message: 'Broadcast event
successfully queued for delivery.' }` (matching the real backend's message verbatim).

- [ ] **Step 7: Verify and commit**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all clean, including Dashboard's full suite.

```bash
git add lib/api/admin/types.ts lib/api/admin/endpoints.ts lib/api/admin/endpoints.test.ts lib/api/admin/mock-store.ts lib/api/admin/mock-fetch.ts app/admin/\(dashboard\)/dashboard/page.tsx app/admin/\(dashboard\)/dashboard/page.test.tsx
git commit -m "feat: add the broadcast send endpoint and un-flatten broadcast history"
```

---

### Task 2: The Broadcasts page

**Files:**
- Modify: `app/admin/(dashboard)/broadcasts/page.tsx`
- Create: `app/admin/(dashboard)/broadcasts/page.test.tsx`

**Interfaces:**
- Consumes: `getAdminBroadcastHistory` (now returning the wrapped object), `sendAdminBroadcast`, `AdminBroadcastPayload` (Task 1), `adminQk.broadcastHistory`, `Skeleton`, `ErrorState`, `Field`, `Button`.

- [ ] **Step 1: Write the page**

Three summary cards (Total sent, To all users, Re-engagement) sourced from
`totalSent`/`toAllUsers`/`reEngagement` on the single `useQuery({ queryKey: adminQk.broadcastHistory,
queryFn: getAdminBroadcastHistory })` call — the same query Dashboard uses, so both screens always
agree. A compose form above or beside the history list: Title (`Field`, required), Message (check
for an existing `Textarea` component under `components/ui/` before falling back to a plain styled
`<textarea>`, required), a segment pill-group (three options, values `ALL_USERS`/
`RE_ENGAGEMENT`/`SYSTEM_MAINTENANCE`, matching the type-selector pattern already established in
Emergency Resources' add/edit sheet and Settings' delivery-channel picker — read one of those for
the exact interaction shape before reimplementing it differently). Send button disabled until
Title and Message are both non-empty; on submit, calls `sendAdminBroadcast`, and on success clears
the form, shows a transient confirmation using the backend's own wording ("Broadcast queued for
delivery"), and invalidates `adminQk.broadcastHistory` (updating both this page's list/counts and
Dashboard's panel, since they share the same key).

History list below: `notifications` array, each row showing title/message/segment
badge/`sentAt` (format however this codebase's existing date-formatting helpers already do it —
check the Users or Emergency Resources pages for the established pattern rather than inventing a
new one). Loading: skeleton rows. Error: `ErrorState` with retry. Empty: "No broadcasts sent yet."

- [ ] **Step 2: Write tests**

Cover: loading, error, empty, success (cards show correct counts, history rows render), compose
form validation (Send disabled until both required fields are non-empty), a successful send calls
`sendAdminBroadcast` with the right payload and clears the form, a failed send shows an inline
error and does NOT clear the form.

Run: `npx vitest run "app/admin/(dashboard)/broadcasts/page.test.tsx"`
Expected: all pass.

- [ ] **Step 3: Verify, screenshot, and commit**

Run: `npm test && npx tsc --noEmit && npm run lint`. Screenshot-verify at desktop (1440px) and
mobile (375px) widths (mock mode), showing the cards, the compose form, and the history list.
Actually view every screenshot file yourself.

```bash
git add app/admin/\(dashboard\)/broadcasts/page.tsx app/admin/\(dashboard\)/broadcasts/page.test.tsx
git commit -m "feat: replace the broadcasts stub with the real screen"
```

---

### Task 3: Final audit — and whole-project completion check

**Files:** none new; this task verifies and, if needed, fixes issues found across this phase's screen, then does a light final pass confirming all seven admin sections work together as one finished dashboard.

- [ ] **Step 1: Full gate suite**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`

- [ ] **Step 2: All-states audit**

Temporarily point `API_URL` at an unreachable host, confirm `ErrorState` renders correctly on the
Broadcasts page (and re-confirm Dashboard's panel, since Task 1 touched its data path), then
restore `API_URL`.

- [ ] **Step 3: Copy and token audit**

```bash
grep -rn $'—' app/admin/\(dashboard\)/broadcasts app/admin/\(dashboard\)/dashboard lib/api/admin lib/query/admin-keys.ts || echo clean
```

- [ ] **Step 4: Breakpoint audit**

At 375px, 768px, and 1900px: confirm no horizontal scroll on `/admin/broadcasts`, the cards/compose
form/history list all reflow correctly and remain usable at phone width. Use real Playwright
screenshots, actually view them.

- [ ] **Step 5: Whole-project sanity pass**

With the dev server running in mock mode, click through all seven admin nav sections (Dashboard,
Analytics, Users, Emergency Resources, Settings, Telemetry, Broadcasts) and confirm each renders
without a console error or a broken layout — this is the last task of the last phase, so this is
the first point at which the complete 6-phase admin dashboard can be verified as a whole rather
than section by section. Note anything found, even if fixing it is out of this task's narrow
scope (flag for the final whole-branch review instead of silently patching something well outside
Broadcasts' own files).

- [ ] **Step 6: Commit**

Run `git status` first; stage only files genuinely part of this phase's actual changes (never
blind `git add -A`).

```bash
git add -A   # only after confirming via git status that this is safe
git commit -m "chore: final audit for the admin broadcasts phase"
```

---

## Self-Review Notes

- Spec coverage: summary cards, compose form with validation and fire-and-forget-honest copy, and
  the reused history list are all covered across Tasks 1-3.
- Placeholder scan: no TBD/TODO. Every field shape is confirmed from real backend source.
- Type consistency: `AdminBroadcastPayload` (Task 1) matches its usage in Task 2's compose form
  exactly. `getAdminBroadcastHistory`'s changed return type is threaded through both its Task 1
  consumer (Dashboard, updated in the same task) and its Task 2 consumer (Broadcasts), so no task
  is left holding a stale assumption about the function's shape.
