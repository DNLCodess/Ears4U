# EARS FOR YOU Admin Dashboard, Phase 2: Dashboard and Analytics

## Context

Phase 1 (shell and auth) shipped: an independent `/admin/*` surface with its own session handling, a responsive nav shell, and a working Account page. Six sections remain stubbed. This document specs Phase 2: replacing the `Dashboard` and `Analytics` stubs with real screens, covering `docs/Admin_Endpoints.pdf` section 4 ("Main Dashboard & Analytics").

**Why this phase next:** Dashboard is the landing screen every admin sees first; Analytics is the natural companion (both read-only, both driven by the same section of the API doc, both ship together cleanly).

## Goals

- The admin dashboard shows real (or realistically-mocked) platform metrics, recent broadcast history, and a CSV export action.
- The analytics screen shows three time-series charts (User Growth, Moods, AI usage) over the last 30 days.
- Same visual identity, responsive approach, and component-reuse conventions as Phase 1. No new design system decisions.

## Out of Scope (this phase)

- Users, Emergency Resources, Settings, Telemetry, Broadcasts screens (later phases).
- A date-range picker for Analytics (last 30 days, fixed, for this phase; YAGNI until real data shape is confirmed).
- Any backend or database change.

## Endpoints (verbatim from the Admin API doc)

- `GET /api/v1/admins/dashboard`: top-level overview metrics.
- `GET /api/v1/admins/dashboard/exports`: generates and returns a `.csv` file of platform metrics.
- `GET /api/v1/admins/dashboard/notifications`: historical data on sent platform broadcasts (misleadingly named; this is broadcast history, not user-facing notifications).
- `GET /api/v1/admins/anaytics`: **spelled exactly this way in the API doc, missing the "l."** This is very likely the real backend route, not a documentation typo, since the same document spells every other occurrence of "analytics" correctly (e.g., the section header itself), so this specific path is called out once, differently, on purpose or by a real backend bug that shipped anyway. Use this exact string. Flagged again in the plan so it is never silently "corrected" to `/analytics`, which would 404 if the doc is accurate.

None of these are reachable without a valid admin session, so none can be curl-verified pre-auth the way some Phase 1 endpoints were. Build to the best-guess response shapes below; live verification is a follow-up once real admin credentials are available (same accepted gap as Phase 1).

## Screens

### Dashboard (`/admin/dashboard`, replacing the stub)

**Metric cards** (best-guess set, reasonable for a mental-health platform's admin overview, adjustable once the real response shape is known): total users, active users (a defined window, e.g. last 7 days), new signups (last 7 days), check-ins logged (last 7 days), emergency resource views, suspended accounts. Six cards, a responsive grid (matching the density-first admin aesthetic: compact cards, no illustration, a label and a number).

**Recent broadcasts panel:** below the metric grid, a compact list sourced from `/dashboard/notifications`, each row showing a message preview, target segment, and sent timestamp. Empty state: "No broadcasts sent yet." Loading: skeleton rows matching the existing `Skeleton` component. Error: existing `ErrorState` component with retry.

**Export CSV:** a button in the screen's header area, calling `/dashboard/exports` and triggering a browser file download of the response (the endpoint returns a `.csv` file directly, not JSON, so the request must be handled differently from every other admin endpoint, which all expect JSON; see Architecture).

### Analytics (`/admin/analytics`, replacing the stub)

Three stacked time-series charts, each with a small heading and a compact line/area chart: **User Growth** (cumulative user count over time), **Moods** (an aggregate mood metric over time, exact meaning to be confirmed against the real response, e.g. platform-wide average mood score), **AI usage** (a request-volume or similar usage metric over time). Default and only range for this phase: last 30 days. Loading/error/empty states for the whole screen (one query, one set of states, since the doc implies a single `/anaytics` call returns all three series together).

## Architecture

**API layer:** extend the existing `lib/api/admin/endpoints.ts` (no new file; this phase's four functions are a natural continuation of Phase 1's endpoint list) with:
- `getAdminDashboard(): Promise<AdminDashboardMetrics>`: `GET /api/v1/admins/dashboard`.
- `getAdminBroadcastHistory(): Promise<AdminBroadcastHistoryItem[]>`: `GET /api/v1/admins/dashboard/notifications`.
- `getAdminAnalytics(): Promise<AdminAnalytics>`: `GET /api/v1/admins/anaytics` (exact spelling, see above).
- `downloadAdminDashboardExport(): Promise<Blob>`: `GET /api/v1/admins/dashboard/exports`. This one cannot go through the existing `adminApiFetch` wrapper as-is, since that function always parses the response body as JSON; exports needs the raw response blob instead. Add a small variant, `adminApiFetchBlob(path: string): Promise<Blob>`, mirroring `adminApiFetch`'s auth-header/refresh-and-retry logic but returning `res.blob()` on success instead of parsed JSON. The calling code (Dashboard's export button) turns the blob into a downloaded file via a temporary object URL and a synthetic anchor click, a standard browser-only pattern with no new dependency.

**Types:** new `AdminDashboardMetrics`, `AdminBroadcastHistoryItem`, `AdminAnalytics`, `AdminAnalyticsPoint` added to `lib/api/admin/types.ts`.

**Charts:** new `components/admin/time-series-chart.tsx`, a small reusable SVG line/area chart (generic y-axis scale via `min`/`max` props, unlike the user app's `TerrainChart` which is hardcoded to a 1-10 mood scale). No charting library dependency; follows this codebase's established pattern of hand-rolled SVG charts (`lib/charts/terrain.ts`, `components/charts/terrain-chart.tsx` on the user side).

**Mock data:** `lib/api/admin/mock-store.ts` gains fake dashboard metrics, fake broadcast history (2-3 entries), and fake 30-day time-series arrays for all three analytics series, with matching routes added to `lib/api/admin/mock-fetch.ts`, including a mock CSV blob response for the export route.

## Testing and Definition of Done

Same standing rules as every prior phase: Vitest + Testing Library coverage per new component (all states, loading, error, empty, success), `npm test && npx tsc --noEmit && npm run lint` clean per task, `npm run build` clean at the end, no em dashes, no AI attribution, screenshot-verify any layout work with real Playwright renders (not curl or source-reading, since this project's own track record has repeatedly shown that reasoning from source code alone misses real bugs, most recently a screenshot in Phase 1 that was reported as showing a working feature but actually showed the closed/idle state). End the phase by serving the dev URL for client approval.

## Self-Review Notes

- Scope check: this document covers exactly Phase 2 (Dashboard + Analytics). The remaining four phases are unspecified here.
- Placeholder scan: no TBD/TODO. The metric set and analytics field meanings are explicitly marked as best-guesses with a stated verification plan, not vague requirements.
- Consistency check: the `/anaytics` spelling is called out three times in this document (Endpoints, Architecture, this note) deliberately, since a single mention risks being "corrected" during implementation without anyone noticing it was intentional.
