# EARS FOR YOU Admin Dashboard, Phase 5: Settings + Telemetry

## Context

Phases 1-4 shipped (shell/auth, dashboard/analytics, users, emergency resources), plus a full
backend-alignment pass. This document specs Phase 5, combining two smaller admin areas into one
phase per the original decomposition: system Settings (`AdminSettingController`) and AI Telemetry
(`AiTelemetryController`). Built directly against the verified backend contract
(`.superpowers/admin-backend-contract.md`), extended here with the exact Redis flat-key mapping
read directly from `SystemConfigurationService.java` — the original contract doc only knew the
reset endpoint took a `key: String` path variable without knowing valid values; this document
closes that gap with the real key list.

## Goals

- An admin can view and edit every system setting (API config, email config, OTP config, security
  settings, AI config) and reset any individual setting back to its system default.
- An admin can see AI provider health and usage telemetry (request volume, success/failure split,
  average latency, live provider status, and a request timeline).
- Same visual identity, responsive approach, and component reuse conventions as Phases 1-4.

## Out of Scope (this phase)

- Broadcasts screen (Phase 6).
- Any backend or Redis change.
- A generic "reset all settings" bulk action — not supported by the API (per-key only).

## Endpoints (verified from `backend/controllers/AdminSettingController.java`,
`backend/controllers/AiTelemetryController.java`, and `backend/service/SYSTEMCONFIGURATION/SystemConfigurationService.java`)

- `GET /api/v1/admins/settings`: `SystemSettingsDTO` (five nested sections — see Architecture).
- `PATCH /api/v1/admins/settings`: body `SystemSettingsDTO`, all five nested sections
  individually optional/nullable (a partial payload is valid), but this phase always sends every
  section on save (simpler, and sending an unchanged section back is harmless — the backend just
  rewrites the same values, except the masked API key, which has special handling below).
- `DELETE /api/v1/admins/settings/{key}`: resets one flat setting key to its hardcoded default.
  **The exact valid `key` values, confirmed from `SystemConfigurationService.getSettings()`'s
  Redis key names** (frontend must use these exact strings, not the nested DTO field names):

  | DTO field | Reset key | Default |
  |---|---|---|
  | `apiConfiguration.baseUrl` | `api_base_url` | `https://api.earsfor.you` |
  | `apiConfiguration.apiVersion` | `api_version` | `v1` |
  | `apiConfiguration.rateLimitPerMinute` | `api_rate_limit_per_minute` | `120` |
  | `apiConfiguration.timeoutMs` | `api_timeout_ms` | `5000` |
  | `emailConfiguration.apiKey` | `email_api_key` | (env-sourced, no literal default) |
  | `emailConfiguration.senderEmail` | `email_sender_email` | `badejoiseoluwa@gmail.com` |
  | `emailConfiguration.senderName` | `email_sender_name` | `EarsForYou` |
  | `otpConfiguration.otpLength` | `otp_length` | `6` |
  | `otpConfiguration.otpExpiryMinutes` | `otp_expiry_minutes` | `10` |
  | `otpConfiguration.maxAttempts` | `otp_max_attempts` | `3` |
  | `otpConfiguration.deliveryChannel` | `otp_delivery_channel` | `EMAIL` |
  | `securitySettings.jwtExpiryMinutes` | `jwt_expiry_minutes` | `60` |
  | `securitySettings.refreshTokenExpiryDays` | `jwt_refresh_expiry_days` | `7` |
  | `securitySettings.maxLoginAttempts` | `security_max_login_attempts` | `5` |
  | `securitySettings.sessionTimeoutMinutes` | `session_timeout_minutes` | `30` |
  | `securitySettings.mfaEnabled` | `security_mfa_enabled` | `true` |
  | `securitySettings.ipWhitelistEnabled` | `security_ip_whitelist_enabled` | `false` |
  | `aiConfiguration.enableAiChat` | `enable_ai_chat` | `true` |
  | `aiConfiguration.aiSystemPrompt` | `ai_system_prompt` | (long default prompt string) |

  Response: `{ message: "Setting '<key>' has been reset to system default." }`.
- `GET /api/v1/admins/telemetry`: `AiTelemetryDashboardResponse` — `{ totalRequests: number,
  successfulRequests: number, failedRequests: number, averageLatencyMs: number, providerStatus:
  'OPERATIONAL' | 'OFFLINE', requestTimeline: { date: string, totalRequests: number,
  successfulRequests: number, failedRequests: number }[] }`. **This endpoint performs a real
  synchronous outbound health check to the AI provider on every call** — expect materially higher
  latency than any other admin GET, and expect it to be slow or fail outright if the provider is
  down. The loading state must communicate this explicitly (see Screen section), not just show a
  generic skeleton indistinguishable from a fast call.

## Screen

### Settings (`/admin/settings`, replacing the stub)

Five collapsible/grouped sections matching the DTO structure exactly (API Configuration, Email
Configuration, OTP Configuration, Security Settings, AI Configuration). Each field: a label, an
editable input matching its type (text for strings, number input for integers, a toggle for
booleans, a small select/pill-group for `otpConfiguration.deliveryChannel`'s three values
`EMAIL`/`SMS`/`BOTH`), and a small inline "Reset to default" action next to it using the exact
flat key from the table above.

**Email API key field, specifically:** the backend always returns this field masked (first 4 +
16 literal `*` + last 4 chars, or empty string if the underlying key is short). Resending the
masked value verbatim is safe (the backend detects the mask and skips the write), but the backend
also silently drops any value that merely *contains* an 8+ run of `*` — so a naive "let the admin
edit the masked text in place" UI risks a silent no-op edit that looks successful. Sidestep this
entirely: render the masked value as read-only text with a "Change API key" button that reveals a
fresh, empty input for typing a brand new key. If the admin never clicks it, the original masked
string is sent back unmodified on save (safe no-op). If they do, a genuinely new value is sent, and
the previously-masked field is not touched/re-rendered as masked until the next fetch.

Save button submits the whole form as one `PATCH` (all five sections, simpler than tracking
per-section dirty state, and harmless per the backend's own tolerance for resending unchanged
values). Client-side: no required-field validation is meaningfully enforceable here (every field
has a sensible existing value already loaded, this is an edit-existing-config screen, not a
create-from-blank form) — numeric fields should still be constrained to actually-numeric input
(`type="number"`), and boolean fields to a toggle, so malformed values can't be typed in the first
place.

Loading: skeleton form. Error: `ErrorState` with retry. No empty state (settings always exist,
this call cannot return "nothing").

### Telemetry (`/admin/telemetry`, replacing the stub)

Four metric cards (Total requests, Successful requests, Failed requests, Average latency in ms),
a provider status indicator (`OPERATIONAL` in `leaf`, `OFFLINE` in `clay` — unlike the Emergency
Resources phase's deliberate avoidance of `clay` for a neutral content flag, an offline AI provider
genuinely is an error/problem state worth the error-toned color), and a request-timeline chart
below (reuse `TimeSeriesChart`, `totalRequests` as the charted value per point, matching the
established "pick the single most informative field, note the others as available-but-unused"
precedent from the Analytics/Dashboard phases' `aiUsageStatistics` handling).

Because this endpoint does a real synchronous health check and can be materially slower than every
other admin GET, the loading state must say so explicitly — e.g. "Checking AI provider status…"
text alongside the skeleton, not a bare generic skeleton indistinguishable from a fast call. Error:
`ErrorState` with retry (a failure here plausibly means the AI provider itself is unreachable, not
just a network blip — the existing `ErrorState`/`ApiError.friendly` messaging already handles this
generically, no special-casing needed).

## Architecture

**API layer:** extend `lib/api/admin/endpoints.ts` with:
- `getAdminSettings(): Promise<AdminSystemSettings>` — `GET /api/v1/admins/settings`.
- `updateAdminSettings(settings: AdminSystemSettings): Promise<unknown>` — `PATCH
  /api/v1/admins/settings`, body is the full settings object.
- `resetAdminSetting(key: string): Promise<unknown>` — `DELETE /api/v1/admins/settings/{key}`,
  `key` URL-encoded.
- `getAdminTelemetry(): Promise<AdminTelemetry>` — `GET /api/v1/admins/telemetry`.

**Types:** new `AdminSystemSettings` (the five nested sections, field-for-field per the contract),
`AdminSettingResetKey` (a string-literal union of the 19 valid keys from the table above, so the
"Reset to default" action can only ever send a value that type-checks against a real key — this is
worth the extra type because the whole point of Phase 5's contract work was closing exactly this
kind of gap), and `AdminTelemetry` (`{ totalRequests, successfulRequests, failedRequests,
averageLatencyMs, providerStatus: 'OPERATIONAL' | 'OFFLINE', requestTimeline:
AdminTelemetryPoint[] }`, `AdminTelemetryPoint = { date: string, totalRequests: number,
successfulRequests: number, failedRequests: number }`) added to `lib/api/admin/types.ts`.

**Mock data:** `lib/api/admin/mock-store.ts` gains a fake settings object (matching the real
defaults from the table above, including a plausibly-masked fake API key string) with stateful
update/reset handling, and a fake telemetry object (with a short `requestTimeline`, 7-14 points).
Matching routes in `lib/api/admin/mock-fetch.ts`, including a path-parameter route for `DELETE
/api/v1/admins/settings/{key}` (reuse the regex-route pattern already established in Phase 4 for
`/resources/{id}`, do not invent a third routing mechanism).

## Testing and Definition of Done

Same standing rules as every prior phase: Vitest + Testing Library coverage per new component
covering all states (loading, error, success) for both the Settings form and the Telemetry screen,
plus the settings save flow, the per-field reset flow, and the API-key change flow, `npm test &&
npx tsc --noEmit && npm run lint` clean per task, `npm run build` clean at the end, no em dashes,
no AI attribution, screenshot-verify all layout and interaction work with real Playwright renders.
End the phase by confirming the dev server still serves the finished screens.

## Self-Review Notes

- Scope check: this document covers exactly Phase 5 (Settings, Telemetry). Broadcasts is
  unspecified here.
- Placeholder scan: no TBD/TODO. Every field shape and every reset-key value is confirmed from real
  backend source, including the Redis key names, which required reading past the controller into
  the service layer — not available anywhere in the original PDF doc or the first-pass contract
  extraction.
- Consistency check: the masked-API-key handling explicitly documents and designs around a real,
  confirmed backend footgun (the `contains("********")` guard silently dropping a partially-edited
  masked value) rather than leaving it to be rediscovered mid-implementation.
