# EARS FOR YOU: User App Design

Date: 2026-08-06
Status: Approved pending final review
Scope: User-facing web app (v1). The admin dashboard is a separate future sub-project with its own spec.

## 1. What this is

EARS FOR YOU is a mental wellness companion: daily mood check-ins, private journaling, an AI chat companion with background crisis analysis, weekly insights, and country-specific emergency resources. The backend (Spring Boot, deployed at `https://earsforyou-2.onrender.com`) is complete and treated as fixed; its contract is documented in `docs/User Endpoints.pdf` and the DTO/controller sources under `backend/`.

The product tone, chosen by the client: expressive and alive. Bold and warm for a Gen-Z and Millennial audience, with crisis surfaces kept deliberately calm and plain.

Primary context: phone browser. Desktop gets genuinely recomposed layouts, not stretched phone layouts.

## 2. Brand system: Good Soil

Concept: feelings as weather, progress as growth. Check-ins water a streak that visibly grows. Chosen over two alternatives (sound-wave poster energy; editorial serif drama) in the visual companion session on 2026-08-06.

### Typography

- Display: Chillax (weights 400 to 700), Fontshare. Relaxed rounded geometric; warm without being childish. Used for greetings, streak numerals, screen titles, buttons that matter.
- Body: General Sans (weights 400 to 600), Fontshare. Quiet, effortless for long journal reads.
- Both free for commercial use. Self-host the font files in production; no runtime hits to the Fontshare CDN.
- Display type sets tight (letter-spacing about -0.02em at large sizes) and large: greetings around 38px on phones. No small tracked-out uppercase labels anywhere (client standard).

### Color tokens

Provenance: no client brand assets existed; the palette was defined from scratch in this session and approved by the client through rendered mockups. Values were refined once during the high-fidelity pass (the approved versions below supersede the initial swatches).

Ground (interface):

| Token | Value | Role |
|---|---|---|
| oat | #F4F1E7 | app background |
| card | #FDFBF4 | raised surfaces |
| fir | #22372B | ink: text, icons |
| fir-deep | #16301F | dark surfaces (celebration, insight note) |
| night | #102417 | darkest scene tone |
| leaf | #2E7D49 | primary actions, mood line |
| leaf-bright | #47A566 | gradient partner for living elements only |
| sprout | #7BC48F | new growth accents |
| marigold | #F2BE45 | celebration, streak milestones, energy line |
| marigold-deep | #D99B21 | marigold ink pairings |
| clay | #D9822B | stress line, latest-mood flag; never for errors |

Sky (atmosphere scenes only, never interface chrome): evening gradient #0E2416 to #1B4029 to #3A6B44 to #C89A3F; morning gradient #EAF0DC to #F4EFD3 to #F6DFA6 with grass hills #9BBB7E, #7BA466, #5C8A50.

Rules: gradients are reserved for living things (plant button, sky scenes) and never used on text or generic chrome. Marigold carries warmth and only warmth: celebration, streak milestones, the unread badge, and energy in the data vocabulary; never large surfaces, never errors. Errors use plain fir ink, with red reserved for destructive actions (delete account).

### Signature element

The garden. One hand-drawn SVG plant whose leaves are earned by the streak (roughly one leaf per two days, capped, with a marigold bloom at milestones). It lives in the Home hero scene and gains its new leaf in the post-check-in celebration. This is the one loud element; everything else stays disciplined.

### Motion

- Home: greeting settles first, plant draws itself in about 600ms.
- Charts draw left to right on entry.
- Celebration: marigold unfolds petal by petal with spring easing, seeds drift, under 2.5s total, skippable by tap.
- Chat listening state: three-dot sprout pulse.
- All motion honors `prefers-reduced-motion` (fade instead of draw/unfold).

## 3. Architecture

- Next.js 16.3 App Router, TypeScript, Tailwind v4 tokens. IMPORTANT: this Next version has breaking changes; read `node_modules/next/dist/docs/` before writing code (repo AGENTS.md).
- Same-origin proxy: the browser only ever calls `/api/*` on the Next origin, which forwards to Render. Reasons: the backend CORS allowlist (env `FRONTEND_URLS`) does not include our origins; first-party cookies avoid SameSite risk; one place to absorb cold starts. Login/refresh/logout go through a route handler (so Set-Cookie passes through and can be adjusted if needed); everything else uses a rewrite.
- Auth: access token kept in memory only. Fetch wrapper attaches it, and on 401 calls `POST /api/v1/auth/user-refresh` once (cookie-driven) and retries; on refresh failure, redirect to sign-in remembering the intended destination. HttpOnly `user_refresh_token` cookie is set by the backend and never touched by JS.
- Server state: TanStack Query. Query keys per surface (dashboard, insights, streak, journal list, journal entry, chat history, notifications, unread count, notification settings, profile, emergency resources). Mutations invalidate exactly what they affect. Chat send is optimistic.
- Screens are client components; nothing here benefits from SSR (all personalized, behind auth).
- New dependencies: `@tanstack/react-query`, `motion`. Charts and illustrations are hand-rolled SVG.

### Error handling contract

The backend frequently returns empty bodies and uses 403 broadly (see `docs/BACKEND-NOTES.md`). The fetch wrapper therefore:

- never assumes a JSON error body; parses if present, falls back to a central status-to-message map;
- treats 401 and 403 on protected calls as auth-expiry candidates (one refresh attempt) before surfacing "You're signed out";
- flags requests exceeding 8 seconds as probable cold start and switches user messaging to "the server is waking up, about a minute";
- auth screens fire a warm-up request on mount so cold start mostly happens before the user submits anything.

## 4. Structure and navigation

Five-slot bottom tab bar (phone): Home, Insights, raised center leaf button (Check in), Chat, Journal.

- The leaf opens the check-in flow full-screen from anywhere.
- Profile and settings ("You") live behind the avatar, top of Home. Notifications behind the bell beside it, with unread badge.
- Emergency resources are reachable from a pinned lifeline row in Chat and from You. Never more than two taps deep.
- Desktop (>= 1024px): tab bar becomes a left rail; Home is two-column (hero scene and streak left, affirmation and week chart right); Journal is list beside editor; Chat is a centered column; check-in opens as a centered modal. Tablet uses phone composition with wider gutters.

Route map: `/signin`, `/register`, `/verify`, `/forgot-password`, `/recovery`, `/home`, `/insights`, `/checkin` (modal route), `/chat`, `/journal`, `/journal/[id]`, `/you` (profile, security, notification settings), `/notifications` (opened from the Home bell). Unauthenticated visits to protected routes bounce to `/signin?next=...`.

## 5. Screens

Every data surface ships loading (branded skeleton: ground-line shimmer), empty (invitation in product voice), error (what happened plus one retry), and success. States below only note what is specific.

### Auth

- Sign in: wordmark, email, password, sign in, create account, forgot password. Errors as sentences ("Wrong email or password"), never codes. Endpoints: `POST /api/v1/auth/user-login` then token in memory, cookie set.
- Register: three steps. 1 identity (name, email), 2 about you (gender, country, date of birth, marital status, employment status; one line explaining why we ask), 3 password. `POST /api/v1/users/register-user` then OTP screen.
- OTP verify: single reusable screen pattern (6 boxes, auto-advance, paste support, resend with visible cooldown). Used by registration (`/verify-user`), password reset (`/reset-password`), recovery (`/recovery/confirm`), email change, password change. Registration and recovery verifies log the user straight in.
- Forgot password: email, then OTP, then new password. Recovery: email, then OTP, then signed in.

### Home

Hero scene (top ~45%): time-aware sky driven by the device clock, four states (morning, day, evening, night). Below the horizon nothing moves between states. Contains the streak plant on the hill, a small clay flag marking the latest mood entry (word and intensity from the API), greeting text over the sky, a data-aware sub-line, and the single warm CTA chip ("Water day N") when today is unlogged. Content sheet rising from the ground line: streak numeral with week dots (marigold dot = milestone, dashed = today unlogged), affirmation card (oversized quote mark, save and share actions), week teaser chart linking to Insights. Endpoint: `GET /api/v1/dashboard/home` (greeting, dailyAffirmation, currentStreak, latestMood) plus `GET /api/v1/users/notifications/unread-count` for the bell.

### Check-in

Full-screen two-beat flow from the leaf button. Beat 1: mood word from a curated list of plain words (Calm, Restless, Drained, Hopeful, Heavy, Numb, Fine actually; free-text add allowed since the API takes a string). Beat 2: three notched sliders, each owning a color and knob glyph: mood strength (leaf, green), stress (ring, clay), energy (sun, marigold). Submit `POST /api/v1/mood/log`, then celebration: full-screen fir night, marigold unfolds, "Day N. Still growing.", plant gains its leaf, back on Home with streak updated (`GET /api/v1/mood/streak` refetch). Submit disabled while in flight.

### Insights

"Your week, as ground." Terrain chart of the 7-day trends: mood solid green with soft fill, energy marigold, stress thin dashed clay so anxiety never dominates. Lines draw on entry. The personal insight text renders as a pressed-leaf note card (fir surface, ghosted leaf). Longest/current streak stat. Endpoints: `GET /api/v1/mood/analytics` (weeklyTrends: date, mood, stress, energy; personalInsight), `GET /api/v1/mood/streak`. Empty state (under 2 check-ins): the chart area invites the first check-ins instead of rendering a broken line.

### Journal

List grouped by date with title and first-line preview (`GET /api/v1/journal/history`). Editor: clean page, title and body, explicit Save (`POST /entry`, `PUT /update-journal/{id}`); unsaved-changes guard on navigation. Delete asks once, kindly (`DELETE /delete-journal/{id}`). Empty state: "Nothing planted yet. Write the first thing that comes."

### Chat

Message thread (`GET /api/v1/users/chat/history`), composer, send via `POST /api/v1/users/chat`. Optimistic user bubble; sprout pulse while the AI generates (2 to 5s per docs); on failure the bubble gets a retry affordance. Lifeline row pinned above the composer, always visible: "Need support right now?" opens the emergency resources sheet. AI bubbles on card surface, user bubbles fir. History paginates upward if the backend page endpoint proves stable.

### Emergency resources

Sheet over any screen. Country from profile. Grouped hotlines (tel: links, one tap), clinics, websites (`GET /api/v1/users/support/emergency-resources`). Visually plain: no illustration, no cheer, maximum legibility. If the fetch fails here, show cached data when present plus retry; this is the one surface where an error must never dead-end.

### Notifications

List from `GET /api/v1/users/notifications`, tap marks read (`PATCH /{id}/read`) and clears from the unread badge. Empty: "All quiet."

### You

Calm list: profile details (view and edit, `GET/PUT /api/v1/users/me`), change password and change email (both OTP flows via their initiate/verify endpoints, reusing the OTP screen), notification preferences (`GET/PUT /api/v1/users/notifications/settings`), emergency resources, sign out (`POST /api/v1/auth/logout`), delete account (`DELETE /api/v1/users/me`) behind a two-step confirm that requires typing a confirmation word.

### Session keep-alive

After about 12 minutes of inactivity with the app open, a quiet "Still there?" prompt; confirming calls `GET /api/v1/users/ping` to refresh the server session, per the backend's intended design.

## 6. Testing

- Unit: fetch wrapper (401 refresh-retry, empty-body handling, cold-start detection, status-to-message map). Highest-risk code, tested first.
- Component: check-in flow (slider values, submit payload), OTP input (auto-advance, paste, cooldown), auth form validation.
- Gate for everything: `tsc`, ESLint.
- No E2E in v1 (OTP-by-email makes it flaky). Acceptance is the client reviewing the served dev URL, per the client's standing definition of done.

## 7. Definition of done (client standard)

- All four states shipped for every async surface.
- Per-breakpoint composition decisions, not fluid shrinking.
- No AI attribution in any commit or doc. No em dashes in UI copy or docs.
- Work is complete only when rendered UI has been reviewed by the client on a served URL.

## 8. Out of scope for v1

- Admin dashboard (separate spec).
- Marketing or landing pages; sign-in is the front door.
- Push notification delivery (we only expose the preference toggles the API stores).
- Dark mode as a user setting (the time-aware sky covers atmosphere; a full dark theme is a later decision).
- Offline support beyond graceful error states.

## 9. Open items being tracked with the backend

See `docs/BACKEND-NOTES.md` (written for the backend developer): consistent JSON error bodies and status codes, a public health endpoint for warm-up, `FRONTEND_URLS` additions if we ever call the API directly, refresh cookie attributes, and a shared test account. None block the build; the design absorbs current behavior.
