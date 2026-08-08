# EARS FOR YOU Admin Dashboard, Phase 1: Shell and Auth

## Context

The user-facing app (Next.js 16.3, the "Listening" identity) is built and demo-ready. The backend also exposes a full Admin API (`docs/Admin_Endpoints.pdf`), covering nine areas: admin auth and account, the main dashboard and analytics, user management with support overrides, emergency resources, dynamic system settings, AI telemetry, and broadcasts. This is a second, independent application surface, not a single screen, so it is being built in phases, each with its own spec and plan, the same way the user app itself was built in stages.

This document specs **Phase 1 only**: the admin shell (persistent navigation, present but not yet functional for the five sections built in later phases) and the full auth lifecycle (login, registration, verification, password recovery, and the admin's own account). Every other phase is out of scope here and is called out explicitly in the Out of Scope section.

**Why now:** nothing else in the admin dashboard can be built, demoed, or tested without somewhere to sign in and a shell to render inside. This phase unblocks every later one.

## Goals

- An admin can register, verify, sign in, recover a forgotten password, and manage their own account (profile, password, email, deletion), against the real deployed backend.
- The admin shell (persistent nav, top bar, responsive collapse) exists and lists every eventual section, so later phases attach content to an already-designed frame instead of redesigning navigation each time.
- Visually and technically consistent with the user app's established conventions (same token system, same proxy architecture, same testing and definition-of-done standards) while reading as a distinct, denser, less consumer-warm tool.

## Out of Scope (this phase)

- Any real content behind Dashboard, Analytics, Users, Emergency Resources, Settings, Telemetry, or Broadcasts. Each renders a simple, on-brand "coming soon" stub, reachable from the nav, not a blank page or a 404.
- Any backend or database change.
- The user-facing app is untouched by this work; nothing in `app/(app)/**`, `app/(auth)/**`, `components/garden/**` (already deleted), or the existing `lib/api/**` (the user-facing API module) is modified. The admin surface is fully additive.

## Visual Identity

Same token system as the user app (`oat`, `fir`, `fir-deep`, `leaf`, `leaf-bright`, `marigold`, `marigold-deep`, `clay`, `card`, `night-warm-top`, `night-warm-bottom`, `warm-cream`), same type pairing (Chillax display, General Sans body). No new tokens.

Adapted for an admin tool rather than a consumer wellness app:

- **No breathing rings, no waveform art, no warm two-zone hero scenes.** Those are the user app's signature emotional register (a companion that's "here, listening"). An admin control panel earns trust through speed and clarity, not warmth. Auth screens get a quiet, restrained treatment: a solid `fir-deep` panel with the wordmark, no animated decoration.
- **Denser type scale and tighter spacing than the user app.** Admin screens are read, not felt. Body text steps down roughly one size from the user app's equivalents; card padding and vertical rhythm tighten accordingly.
- **Neutral, scannable surfaces.** `card`/`oat` remain the base surfaces; `marigold` stays reserved for the same purpose it has everywhere else in this project (the raised/primary action, active states, never large surfaces or errors, never decorative).
- **Distinct wordmark treatment.** "Ears for you." (the user app's mark) gains a small "Admin" companion mark in the shell, so it is never ambiguous which surface is open, without inventing a second brand.

## Responsive Approach

Full responsive, phone width included, per an explicit decision to build this out completely rather than desktop-only (the more common pattern for admin tools, considered and declined).

- **Desktop/tablet (`lg:` and up):** persistent left sidebar (mirrors the user app's desktop rail structurally, but lists eight items: the seven future sections plus Account), top bar showing the current section name and the admin's identity.
- **Phone (below `lg:`):** sidebar collapses behind a hamburger-triggered slide-out drawer, not a bottom tab bar. Eight nav items is past the point a bottom bar reads well (the user app's bottom bar tops out at five for exactly this reason), so this is a genuine, considered breakpoint-specific pattern change, not a shrink of the desktop layout.
- Auth screens (login/register/etc., not behind the shell) get their own mobile-first single-column layout and a simple centered-card desktop treatment, same structural pattern as the user app's compact-hero auth screens minus the warm hero art.

## Architecture

**Routing:** new route group `app/(admin)/` in the same Next.js app and deployment, at `/admin/*` URLs:

```
/admin              → redirects to /admin/dashboard (if signed in) or /admin/login (if not)
/admin/login
/admin/register
/admin/verify
/admin/forgot-password
/admin/recovery
/admin/dashboard     → stub in this phase
/admin/analytics     → stub
/admin/users         → stub
/admin/emergency     → stub
/admin/settings      → stub
/admin/telemetry     → stub
/admin/broadcasts    → stub
/admin/account       → real, this phase
```

**API module:** new `lib/api/admin/` directory, mirroring the existing `lib/api/` module's shape and conventions (`endpoints.ts`, `client.ts`, `errors.ts`, `types.ts`) rather than extending the user-facing one. An admin session is logically independent of any user session that might exist in the same browser (different cookie name, different refresh endpoint, different token lifetime), so keeping them as separate modules avoids one growing to secretly depend on the other's state. Shared low-level utilities (if any emerge, e.g. a generic `fetchJson` wrapper) get factored into a common file only if real duplication shows up during implementation, not preemptively.

**Session model**, mirroring the user app's established pattern:
- Access token held in memory only (module-level variable, never `localStorage`), scoped separately from the user app's in-memory token.
- Refresh token lives in the `admin_refresh_token` HttpOnly cookie, set by the backend on login; the browser never touches it directly.
- Access tokens are short-lived (15 minutes, per the Admin API doc). On a 401/403, the client attempts one silent refresh against `/admin-refresh` and retries the original request once, the same pattern already proven on the user side (deliberately not narrowed to 401-only, since this deployment returns 403 for some unauthenticated cases too).
- `withCredentials`/`credentials: 'include'` on every admin request, per the Admin API doc's explicit requirement.

**Proxy:** no new proxy code. Confirmed both existing mechanisms already cover every admin path:
- `/api/v1/auth/admin-login`, `/admin-refresh`, `/logout`, and the password-reset/recovery endpoints all fall under `/api/v1/auth/*`, already handled by `app/backend/api/v1/auth/[...path]/route.ts`'s explicit cookie/header passthrough.
- Everything under `/api/v1/admins/*` (registration, profile, and every later phase's endpoints) is covered by the generic `/backend/:path*` rewrite in `next.config.ts`, which proxies cookies and headers transparently as a true rewrite.

**Mock mode:** `NEXT_PUBLIC_USE_MOCKS` gets an admin-flavored extension. A new `lib/api/admin/mock-store.ts` seeds one fake admin account and enough fake shape for this phase's flows (register/verify/login/forgot-password/recovery/account) to be fully testable without the live backend, following the same pattern as the user app's mock store. Later phases extend this store with their own fake data as they land; this phase does not need to fake dashboard metrics, user lists, etc., since those screens are stubs here.

**Field-shape risk:** the Admin API doc documents endpoints and params by name but not full request/response JSON shapes. Before wiring each endpoint in the implementation plan, verify the real shape against the live deployed backend with a differential curl check, the same recovery method already used once on this project when the user app's OTP endpoints turned out to need JSON bodies instead of query strings. Any surprises get folded into the plan's tasks as they're found, not discovered late.

## Screens

### Login (`/admin/login`)
Email + password, submit, inline error on failure (reusing the friendly-error-message convention from `ApiError`). "Forgot password?" link. No "create account" link here by default (admin registration is not something to casually surface next to every login attempt) — a small, low-emphasis "Need an admin account?" link at the bottom serves people who legitimately need it without inviting casual use.

### Register (`/admin/register`)
Name, email, password (matching the user app's step-1 pattern), confirmed against the live backend's actual request shape during planning per the field-shape risk above rather than assumed. OTP verification step reuses the same `OtpInput`/`ResendButton` pattern already built for the user app (these are generic, unopinionated components; reused as-is, not rebuilt).

### Verify (`/admin/verify`)
Same OTP entry pattern as the user app's verify screen, retargeted at the admin verification endpoint.

### Forgot password / Recovery (`/admin/forgot-password`, `/admin/recovery`)
Same email-then-OTP-then-new-password shape as the user app's equivalent flows, retargeted at the admin endpoints. Recovery (full account recovery, distinct from a simple forgotten password) follows the same pattern the user app already established for this exact distinction.

### Account (`/admin/account`)
View and edit profile (`GET`/`PUT /me`), change password (initiate/verify OTP pair), change email (initiate/verify OTP pair), delete account (`DELETE /me`, danger-zone treatment matching the user app's account-deletion pattern: explicit confirmation, no accidental taps).

### Shell (all authenticated `/admin/*` routes)
Sidebar/drawer nav with eight items (seven future sections plus Account), each future section's route rendering a small on-brand stub ("Analytics is coming here." styled consistently, not a placeholder-looking blank page), top bar showing the current section name and a small admin identity affordance (initial-in-circle, matching the user app's `YouLink` pattern) linking to Account.

## Testing and Definition of Done

Same standing project rules as every prior phase of this build:
- Vitest + Testing Library coverage per new component/page: all states (loading, error, empty, success) designed and tested, not just the happy path.
- `npm test && npx tsc --noEmit && npm run lint` clean at every task; `npm run build` clean at the end of the phase.
- No em dashes anywhere (code, copy, commits, docs). No AI attribution in any commit.
- Screenshot-verify any layout/stacking/overlap work before calling it done, the same practice that caught real bugs (missing tab bar, composer overlap, sidebar inconsistency) across every prior round of this project. Not "screenshots only when asked": this project's own track record has shown CSS-only reasoning misses real bugs here.
- End the phase by starting `npm run dev` from the main session (so it survives between turns) and handing the client a URL, same as every previous phase. Nothing in this phase is "done" until approved on the live render.

## Self-Review Notes

- Scope check: this document covers exactly Phase 1 (shell + full auth lifecycle + account). The remaining five phases (Dashboard/Analytics, Users, Emergency Resources, Settings/Telemetry, Broadcasts) are named but not designed here; each gets its own spec when its turn comes.
- Ambiguity flagged and resolved: registration field shapes are unknown from the Admin API doc alone; resolved by specifying differential live-backend verification during planning rather than guessing now.
- Consistency check: the decision to drop breathing rings/waveform art from admin auth screens does not contradict the "same tokens, same type pairing" requirement; token reuse and hero-art reuse are independent decisions, and the spec is explicit that only the latter changes.
