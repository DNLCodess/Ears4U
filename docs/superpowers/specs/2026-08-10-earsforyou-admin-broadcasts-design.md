# EARS FOR YOU Admin Dashboard, Phase 6: Broadcasts

## Context

Phases 1-5 shipped (shell/auth, dashboard/analytics, users, emergency resources, settings/
telemetry), plus a full backend-alignment pass. This document specs Phase 6, the final phase:
replacing the `Broadcasts` stub with a real screen. Most of the read-side plumbing already exists
from Phase 2 — `getAdminBroadcastHistory()` and `adminQk.broadcastHistory` already fetch
`NotificationDashboardResponse` (`{ totalSent, toAllUsers, reEngagement, notifications }`) for the
Dashboard page's "Recent broadcasts" panel. This phase reuses that exact same data as its primary
content (not a duplicate fetch) and adds the one missing piece: a compose form to send a new
broadcast.

## Goals

- An admin can see broadcast volume at a glance (total sent, sent to all users, sent for
  re-engagement).
- An admin can see the full broadcast history (same data already shown compactly on Dashboard, now
  as this screen's primary list).
- An admin can compose and send a new broadcast to a target segment.

## Out of Scope (this phase)

- Scheduling a broadcast for a future time — not supported by the API (fire-and-forget only).
- Broadcast delivery confirmation/read receipts — the backend explicitly only confirms the message
  was queued (via Kafka), not delivered; the UI must not imply otherwise.
- Any backend or Kafka change.

## Endpoints (verified from `backend/controllers/AdminBroadcastController.java` and
`AdminDashboardController.java`)

- `POST /api/v1/admins/broadcast`: body `{ title: string, message: string, segment: 'ALL_USERS' |
  'RE_ENGAGEMENT' | 'SYSTEM_MAINTENANCE' }` (no backend validation on any field — the frontend
  must enforce required fields itself). Response: `{ message: "Broadcast event successfully
  queued for delivery." }`. **This is fire-and-forget** — the actual send happens asynchronously
  via Kafka; a 200 response confirms the request was queued, not that it was delivered. UI copy
  must say "queued," not "sent," to avoid overclaiming.
- `GET /api/v1/admins/dashboard/notifications` (already implemented, Phase 2): reused as-is for
  both the summary counts and the full history list on this screen.

## Screen

### Broadcasts (`/admin/broadcasts`, replacing the stub)

**Summary cards:** three cards (Total sent, To all users, Re-engagement), same visual pattern as
Dashboard/Emergency Resources' metric cards, sourced from `totalSent`/`toAllUsers`/`reEngagement`
on the existing `getAdminBroadcastHistory()` response.

**Compose form:** Title (`Field`), Message (a multi-line text area — check whether a `Textarea`
component already exists under `components/ui/`, use it if so, otherwise a plain `<textarea>`
styled consistently with `Field`'s input), and a Segment picker (a pill-group matching the pattern
already used for Emergency Resources' type selector and Settings' delivery-channel picker — three
options: "All users," "Re-engagement," "System maintenance," mapping to `ALL_USERS`/
`RE_ENGAGEMENT`/`SYSTEM_MAINTENANCE`). Client-side required-field validation on Title and Message
(both non-empty) before allowing Send, since the backend enforces nothing. On success: clear the
form, show a transient confirmation using the backend's own wording ("Broadcast queued for
delivery"), and invalidate `adminQk.broadcastHistory` so the history list below refreshes with the
new entry once it's actually recorded server-side (the entry itself is written to the audit log
synchronously even though delivery is async, per the confirmed backend behavior from the earlier
contract extraction — the history list should pick it up on the next fetch without a manual
refresh).

**History list:** below the compose form, the full broadcast history (reusing the exact same
`getAdminBroadcastHistory()` query already used by Dashboard's panel — same query key, so sending a
new broadcast and dashboard both stay in sync automatically). Each row: title, message, segment
badge, sent-at timestamp. Loading: skeleton rows. Error: `ErrorState` with retry. Empty: "No
broadcasts sent yet."

## Architecture

**API layer:** extend `lib/api/admin/endpoints.ts` with:
- `sendAdminBroadcast(payload: AdminBroadcastPayload): Promise<unknown>` — `POST
  /api/v1/admins/broadcast`, body is the payload as-is.

**Types:** new `AdminBroadcastPayload = { title: string, message: string, segment: 'ALL_USERS' |
'RE_ENGAGEMENT' | 'SYSTEM_MAINTENANCE' }` added to `lib/api/admin/types.ts`. No other new types —
`AdminBroadcastHistoryItem`/`AdminNotificationDashboardResponse` (or whatever Phase 2 named them)
already exist and are reused verbatim.

**Mock data:** `lib/api/admin/mock-store.ts`'s existing broadcast-history fixture (from Phase 2)
gains a stateful `sendBroadcast(payload)` method that appends a new history entry (with a
generated `formattedId`, the submitted title/message/segment, and a current-ish timestamp) and
increments the relevant summary counters (`totalSent` always, plus `toAllUsers` or `reEngagement`
depending on the segment — `SYSTEM_MAINTENANCE` increments only `totalSent`, matching the real
`NotificationDashboardResponse`'s three-counter shape, which has no explicit
system-maintenance-specific counter). Matching route in `lib/api/admin/mock-fetch.ts`.

## Testing and Definition of Done

Same standing rules as every prior phase: Vitest + Testing Library coverage per new component
covering all states (loading, error, empty, success) for the history list, plus the compose form's
validation and submit flow, `npm test && npx tsc --noEmit && npm run lint` clean per task, `npm run
build` clean at the end, no em dashes, no AI attribution, screenshot-verify all layout and
interaction work with real Playwright renders. This is the final phase of the admin dashboard —
after this phase's final review, confirm the dev server serves all seven admin sections correctly
before considering the whole 6-phase admin dashboard project complete.

## Self-Review Notes

- Scope check: this document covers exactly Phase 6 (Broadcasts), the final phase.
- Placeholder scan: no TBD/TODO. Every field shape is confirmed from real backend source, and this
  phase deliberately reuses Phase 2's already-verified read-side plumbing rather than duplicating
  it.
- Consistency check: the fire-and-forget/"queued not sent" framing is stated once here and must
  survive into the actual UI copy, matching how the `/anaytics` misspelling and other backend
  quirks have been preserved verbatim through every prior phase's implementation.
