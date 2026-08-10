# Admin Settings + Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/admin/settings` and `/admin/telemetry` stubs with real screens: a full system-settings editor with per-field reset-to-default, and an AI telemetry dashboard with provider health.

**Architecture:** New types + endpoint functions in the existing `lib/api/admin/*` modules, following the exact same layering as Phases 1-4 (TanStack Query, mock store/mock-fetch parity, Skeleton/ErrorState/Button/Field/Toggle reuse, the Phase-4-established regex path-parameter mock-route pattern for the settings reset endpoint).

**Tech Stack:** Next.js 16.3 App Router, React 19, TanStack Query, Tailwind v4 tokens, Vitest + Testing Library.

## Global Constraints

- Design spec of record: `docs/superpowers/specs/2026-08-10-earsforyou-admin-settings-telemetry-design.md`. Every task's requirements implicitly include it, especially its reset-key table — those 19 strings are the only valid values for `DELETE /api/v1/admins/settings/{key}` and must be used verbatim (they are Redis key names, not derived from the DTO field names).
- `PATCH /api/v1/admins/settings` sends the full `SystemSettingsDTO` shape as a JSON body on every save (not a partial diff) — simpler and confirmed harmless per the backend's own tolerance for resending unchanged values.
- The masked email API key must never be edited in place — a "Change API key" affordance reveals a fresh empty input; an untouched field resends the masked string verbatim.
- `GET /api/v1/admins/telemetry` is measurably slower than other admin GETs (real synchronous provider health check) — its loading state must say so, not just show a generic skeleton.
- Same visual identity/conventions as Phases 1-4: `oat`/`fir`/`card`/`marigold`/`clay`/`leaf` tokens, no new tokens, reuse `Skeleton`/`ErrorState`/`Button`/`Field`/`Toggle` as-is. `clay` IS appropriate for `providerStatus: 'OFFLINE'` (a real error state, unlike Phase 4's deliberate non-use of `clay` for "inactive").
- No AI attribution in any commit. No em dashes anywhere.
- Verification per task: `npm test && npx tsc --noEmit && npm run lint` at minimum; `npm run build` on the final task. Screenshot-verify any task that changes visible layout with real Playwright renders.
- Commit after every task, conventional message, verify with `git log -1 --format=%B` before moving on.
- Before staging any commit, run `git status` and confirm nothing outside this phase's file list is included — this repo has an unrelated pre-existing untracked `backend/` Java source tree at the root, and `next dev` has previously produced a spurious `app/layout.tsx` rewrite that must be reverted, never committed.

## File Structure

```
lib/api/admin/types.ts                          modify: add AdminSystemSettings, AdminSettingResetKey, AdminTelemetry, AdminTelemetryPoint
lib/api/admin/endpoints.ts                       modify: add getAdminSettings, updateAdminSettings, resetAdminSetting, getAdminTelemetry
lib/api/admin/endpoints.test.ts                  modify: coverage for the four new functions
lib/api/admin/mock-store.ts                      modify: add fake settings object + fake telemetry object, stateful update/reset
lib/api/admin/mock-fetch.ts                      modify: add matching mock routes, including the settings reset path-parameter route
lib/query/admin-keys.ts                          modify: add settings, telemetry query keys
app/admin/(dashboard)/settings/page.tsx          modify: replace the stub with the real screen
app/admin/(dashboard)/settings/page.test.tsx     create
app/admin/(dashboard)/telemetry/page.tsx         modify: replace the stub with the real screen
app/admin/(dashboard)/telemetry/page.test.tsx    create
```

Interfaces named here are binding across tasks; later tasks import exactly these names.

---

### Task 1: Types, query keys, and both read endpoints

**Files:**
- Modify: `lib/api/admin/types.ts`, `lib/api/admin/endpoints.ts`, `lib/api/admin/endpoints.test.ts`, `lib/api/admin/mock-store.ts`, `lib/api/admin/mock-fetch.ts`, `lib/query/admin-keys.ts`

**Interfaces:**
- Produces: `AdminSystemSettings`, `AdminSettingResetKey`, `AdminTelemetry`, `AdminTelemetryPoint`, `getAdminSettings()`, `getAdminTelemetry()`, `adminQk.settings`, `adminQk.telemetry`.

- [ ] **Step 1: Add the types**

In `lib/api/admin/types.ts`:

```ts
export interface AdminSystemSettings {
  apiConfiguration: { baseUrl: string; apiVersion: string; rateLimitPerMinute: number; timeoutMs: number }
  emailConfiguration: { apiKey: string; senderEmail: string; senderName: string }
  otpConfiguration: { otpLength: number; otpExpiryMinutes: number; maxAttempts: number; deliveryChannel: 'EMAIL' | 'SMS' | 'BOTH' }
  securitySettings: { jwtExpiryMinutes: number; refreshTokenExpiryDays: number; maxLoginAttempts: number; sessionTimeoutMinutes: number; mfaEnabled: boolean; ipWhitelistEnabled: boolean }
  aiConfiguration: { enableAiChat: boolean; aiSystemPrompt: string }
}
export type AdminSettingResetKey =
  | 'api_base_url' | 'api_version' | 'api_rate_limit_per_minute' | 'api_timeout_ms'
  | 'email_api_key' | 'email_sender_email' | 'email_sender_name'
  | 'otp_length' | 'otp_expiry_minutes' | 'otp_max_attempts' | 'otp_delivery_channel'
  | 'jwt_expiry_minutes' | 'jwt_refresh_expiry_days' | 'security_max_login_attempts'
  | 'session_timeout_minutes' | 'security_mfa_enabled' | 'security_ip_whitelist_enabled'
  | 'enable_ai_chat' | 'ai_system_prompt'
export interface AdminTelemetryPoint {
  date: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
}
export interface AdminTelemetry {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageLatencyMs: number
  providerStatus: 'OPERATIONAL' | 'OFFLINE'
  requestTimeline: AdminTelemetryPoint[]
}
```

Double-check the 19-entry `AdminSettingResetKey` union against the design spec's table verbatim —
these are Redis key names, easy to typo (e.g. `jwt_refresh_expiry_days`, not
`jwt_refresh_token_expiry_days`).

- [ ] **Step 2: Add the query keys**

In `lib/query/admin-keys.ts`, add `settings: ['admin-settings']` and `telemetry: ['admin-telemetry']` following the file's existing convention.

- [ ] **Step 3: Add the two read endpoints**

```ts
export const getAdminSettings = () => adminApiFetch<AdminSystemSettings>('/api/v1/admins/settings')
export const getAdminTelemetry = () => adminApiFetch<AdminTelemetry>('/api/v1/admins/telemetry')
```

- [ ] **Step 4: Failing tests, then pass**

Add tests asserting each calls the right method/path with no body, following the existing pattern for another no-argument GET. Run `npx vitest run lib/api/admin/endpoints.test.ts`.

- [ ] **Step 5: Mock store fixtures and routes**

In `mock-store.ts`, add a fake settings object using the exact defaults from the design spec's
table (including a plausible masked API key string like `'sk-x****************3f2a'`, 16 literal
`*` characters matching the real masking format), and a fake telemetry object with 7-14
`requestTimeline` points. Add `getSettings()`/`getTelemetry()` read methods. In `mock-fetch.ts`,
add matching `GET` routes.

- [ ] **Step 6: Verify and commit**

Run: `npm test && npx tsc --noEmit && npm run lint`

```bash
git add lib/api/admin/types.ts lib/api/admin/endpoints.ts lib/api/admin/endpoints.test.ts lib/api/admin/mock-store.ts lib/api/admin/mock-fetch.ts lib/query/admin-keys.ts
git commit -m "feat: add the settings and telemetry read endpoints"
```

---

### Task 2: The write endpoints (update settings, reset a setting)

**Files:**
- Modify: `lib/api/admin/endpoints.ts`, `lib/api/admin/endpoints.test.ts`, `lib/api/admin/mock-store.ts`, `lib/api/admin/mock-fetch.ts`

**Interfaces:**
- Consumes: `AdminSystemSettings`, `AdminSettingResetKey` (Task 1).
- Produces: `updateAdminSettings(settings: AdminSystemSettings): Promise<unknown>`, `resetAdminSetting(key: AdminSettingResetKey): Promise<unknown>`.

- [ ] **Step 1: Add the two functions**

```ts
export const updateAdminSettings = (settings: AdminSystemSettings) =>
  adminApiFetch('/api/v1/admins/settings', { method: 'PATCH', body: settings })
export const resetAdminSetting = (key: AdminSettingResetKey) =>
  adminApiFetch(`/api/v1/admins/settings/${encodeURIComponent(key)}`, { method: 'DELETE' })
```

- [ ] **Step 2: Failing tests, then pass**

Test `updateAdminSettings` sends `PATCH` with the full settings object as body. Test
`resetAdminSetting` sends `DELETE` with the key in the URL path (not a query string, not a body) —
test at least two different key values to guard against a hardcoded single-key assumption.

- [ ] **Step 3: Mock store update/reset**

Add `updateSettings(settings: AdminSystemSettings)` (replaces the stored fake settings object,
mirroring the api-key masking guard: if the incoming `emailConfiguration.apiKey` contains the
literal 16-`*` mask substring, do not overwrite the stored real key — keep it as-is, matching the
real backend's documented behavior exactly, so mock mode exercises the same footgun-avoidance path
production does) and `resetSetting(key: AdminSettingResetKey)` (writes that one field back to its
hardcoded default from the design spec's table — you will need a small key-to-setter mapping,
since the flat key doesn't structurally match the nested object shape).

- [ ] **Step 4: Mock fetch routes**

`PATCH /api/v1/admins/settings` route reading the body and calling `updateSettings`. `DELETE
/api/v1/admins/settings/{key}` using the same regex path-parameter pattern already established in
Phase 4 for `/resources/{id}` (`pathname.match(/^\/api\/v1\/admins\/settings\/([a-z_]+)$/)` or
similar — adjust the character class to match the real key format, all lowercase with
underscores) calling `resetSetting`.

- [ ] **Step 5: Verify and commit**

Run: `npm test && npx tsc --noEmit && npm run lint`

```bash
git add lib/api/admin/endpoints.ts lib/api/admin/endpoints.test.ts lib/api/admin/mock-store.ts lib/api/admin/mock-fetch.ts
git commit -m "feat: add settings update and reset-to-default endpoints"
```

---

### Task 3: The Settings page

**Files:**
- Modify: `app/admin/(dashboard)/settings/page.tsx`
- Create: `app/admin/(dashboard)/settings/page.test.tsx`

**Interfaces:**
- Consumes: `getAdminSettings`, `updateAdminSettings`, `resetAdminSetting` (Tasks 1-2), `adminQk.settings`, `Skeleton`, `ErrorState`, `Field`, `Button`, `Toggle` (check the real component from Phase 4's usage before assuming its prop shape).

- [ ] **Step 1: Write the page**

Five sections (API Configuration, Email Configuration, OTP Configuration, Security Settings, AI
Configuration), each rendering its fields with the type-appropriate input (text/`Field`, number/
`Field type="number"`, boolean/`Toggle`, `otpConfiguration.deliveryChannel`/a small pill-group
matching the type-selector pattern from Phase 4's emergency resource sheet, values
`EMAIL`/`SMS`/`BOTH`). Local form state initialized from the fetched settings on load (a `useState`
seeded from the query's data once loaded, not a live-bound-to-query-data controlled form, so edits
don't get clobbered by background refetches — check how, if at all, a similar "editable form seeded
from query data" pattern exists elsewhere in this codebase first, and follow it if one does, rather
than inventing a new pattern).

Email API key field: render the fetched masked value as static text plus a "Change API key" button;
clicking it swaps in an empty `Field` for a fresh value, tracked in its own local state slot
separate from the rest of the form, merged into the submitted `emailConfiguration.apiKey` only if
the button was clicked (otherwise resend the original masked string unmodified).

Each field has an inline "Reset to default" small button/link next to it, calling
`resetAdminSetting` with the exact key from the design spec's table for that field, and on success
invalidating `adminQk.settings` so the form reloads the new (default) value — decide whether to
also clear any in-progress local edit for that one field, or let the refetch simply overwrite it
once the query resolves (simpler; prefer this unless it visibly breaks the interaction).

One "Save changes" button submits the whole form via `updateAdminSettings`, invalidates
`adminQk.settings` on success.

Loading: skeleton form. Error: `ErrorState` with retry. No empty state.

- [ ] **Step 2: Write tests**

Cover: loading, error, success (all five sections render with correct values), Save calls
`updateAdminSettings` with the full current form state, Reset-to-default on one field calls
`resetAdminSetting` with the correct key, the API key field starts masked/read-only and "Change API
key" reveals an editable empty input whose value flows into the next Save call.

- [ ] **Step 3: Verify, screenshot, and commit**

Run: `npm test && npx tsc --noEmit && npm run lint`. Screenshot-verify at desktop and mobile widths
(mock mode), actually viewing the files.

```bash
git add app/admin/\(dashboard\)/settings/page.tsx app/admin/\(dashboard\)/settings/page.test.tsx
git commit -m "feat: replace the settings stub with the real screen"
```

---

### Task 4: The Telemetry page

**Files:**
- Modify: `app/admin/(dashboard)/telemetry/page.tsx`
- Create: `app/admin/(dashboard)/telemetry/page.test.tsx`

**Interfaces:**
- Consumes: `getAdminTelemetry` (Task 1), `adminQk.telemetry`, `TimeSeriesChart`, `Skeleton`, `ErrorState`.

- [ ] **Step 1: Write the page**

Four metric cards (Total requests, Successful requests, Failed requests, Average latency —
formatted as `"<n> ms"`), a provider status badge (`OPERATIONAL` → `bg-leaf/15 text-leaf`,
`OFFLINE` → `bg-clay/15 text-clay`), and a `TimeSeriesChart` below fed by `requestTimeline`,
mapping `{ date: p.date, value: p.totalRequests }` (matching the established
map-at-the-API-boundary-or-page pattern from prior phases' analytics charts — your call on which
layer does the mapping, consistent with wherever similar mapping already lives for other charts in
this codebase).

Loading state must be visually distinct from a generic fast-load skeleton: include explicit text
("Checking AI provider status…") alongside the skeleton, since this call is confirmed to run a
real synchronous health check and can take materially longer than other admin GETs. Error:
`ErrorState` with retry.

- [ ] **Step 2: Write tests**

Cover: loading (skeleton + the explicit "checking" text), error, success (cards show correct
numbers, status badge shows correct color/text for both `OPERATIONAL` and `OFFLINE`, chart
renders).

- [ ] **Step 3: Verify, screenshot, and commit**

Run: `npm test && npx tsc --noEmit && npm run lint`. Screenshot-verify at desktop and mobile
widths (mock mode) — capture at least one screenshot with `providerStatus: 'OFFLINE'` in the mock
fixture temporarily flipped, to confirm the error-toned badge actually renders correctly, then
confirm the fixture is restored to its normal value before committing.

```bash
git add app/admin/\(dashboard\)/telemetry/page.tsx app/admin/\(dashboard\)/telemetry/page.test.tsx
git commit -m "feat: replace the telemetry stub with the real screen"
```

---

### Task 5: Final audit

**Files:** none new; this task only verifies and, if needed, fixes issues found across this phase's two screens.

- [ ] **Step 1: Full gate suite**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`

- [ ] **Step 2: All-states audit**

Temporarily point `API_URL` at an unreachable host, confirm `ErrorState` renders correctly on both
the Settings and Telemetry pages, then restore `API_URL`.

- [ ] **Step 3: Copy and token audit**

```bash
grep -rn $'—' app/admin/\(dashboard\)/settings app/admin/\(dashboard\)/telemetry lib/api/admin lib/query/admin-keys.ts || echo clean
```

- [ ] **Step 4: Breakpoint audit**

At 375px, 768px, and 1900px: confirm no horizontal scroll on `/admin/settings` and
`/admin/telemetry`, all five settings sections reflow correctly and remain usable at phone width
(this is the densest form in the whole admin surface — check nothing clips or overlaps), and the
telemetry cards/chart reflow correctly. Use real Playwright screenshots, actually view them.

- [ ] **Step 5: Commit**

Run `git status` first; stage only files genuinely part of this phase (never `git add -A` blindly —
this repo has an unrelated untracked `backend/` directory, and `next dev` has previously caused a
spurious `app/layout.tsx` rewrite that must be reverted, not committed, if it recurs).

```bash
git add -A   # only after confirming via git status that this is safe, per the note above
git commit -m "chore: final audit for the admin settings and telemetry phase"
```

---

## Self-Review Notes

- Spec coverage: full settings editor with per-field reset and masked-API-key handling, telemetry
  dashboard with provider health and a request timeline, and the standing
  testing/screenshot/definition-of-done rules are all covered across Tasks 1-5.
- Placeholder scan: no TBD/TODO. Every field shape and every reset-key value is confirmed from real
  backend source down to the Redis key names.
- Type consistency: `AdminSystemSettings`/`AdminSettingResetKey`/`AdminTelemetry`/
  `AdminTelemetryPoint` (Task 1) match their usage in Task 2 (endpoint signatures) and Tasks 3-4
  (page data reads) exactly.
