# EARS FOR YOU Admin Dashboard, Phase 3: Users

## Context

Phases 1 (shell and auth) and 2 (dashboard and analytics) shipped. This document specs Phase 3: replacing the `Users` stub with the real user management screen, covering `docs/Admin_Endpoints.pdf` section 5 ("User Management & Support Overrides") in full, including its "Support Failover" subsection and the standalone audit-logs endpoint from the same section.

## Goals

- An admin can search and filter the platform's user list, suspend or reactivate any account, correct a user's email directly (no OTP), and generate a manual OTP for a user who cannot receive email, for any of the four flows that normally send one (registration, password reset, email change, password change).
- An admin can see a recent history of admin actions (audit log) without leaving the Users screen.
- Same visual identity, responsive approach, and component reuse conventions as Phases 1-2. No new design system decisions.

## Out of Scope (this phase)

- Emergency Resources, Settings, Telemetry, Broadcasts screens (later phases).
- Bulk actions (suspend multiple users at once, bulk export). Nothing in the API doc supports this; YAGNI.
- A dedicated full-page audit log view with its own filtering. This phase's audit log is a compact recent-activity panel, matching Dashboard's "Recent broadcasts" pattern; a richer audit log view is not requested by the doc and would be speculative.
- Any backend or database change.

## Endpoints (verbatim from the Admin API doc)

- `GET /api/v1/admins/users`: paginated, filterable list of all platform users.
- `PUT /api/v1/admins/users/suspend` (param: `userEmail`): suspends a user account.
- `PUT /api/v1/admins/users/reactivate` (param: `userEmail`): lifts a suspension.
- `PUT /api/v1/admins/users/change-email` (params: `currentEmail`, `newEmail`): direct override to fix a user's email typo, no OTP.
- `GET /api/v1/admins/audit-logs`: recent system audit logs of admin actions.
- `POST /api/v1/admins/users/failover/registration-otp` (param: `userEmail`)
- `POST /api/v1/admins/users/failover/password-otp` (param: `userEmail`)
- `POST /api/v1/admins/users/failover/email-otp` (param: `userEmail`)
- `POST /api/v1/admins/users/failover/password-change-otp` (param: `userEmail`)

None of these are reachable without a valid admin session, so none can be curl-verified pre-auth. Build to the best-guess shapes below; live verification is a follow-up once real admin credentials are available, the same accepted gap as every prior phase. The doc's `Params:` annotations are query-style hints; per the established lesson from Phase 1 (`docs/BACKEND-NOTES.md` item 6, and the recovered convention already used for every admin endpoint so far), send these as JSON bodies, never query strings, for every `PUT`/`POST` in this list.

## Screen

### Users (`/admin/users`, replacing the stub)

**List:** a search field (matches name or email) and a status filter (all / active / suspended), backing a paginated table/list. Each row: name, email, a status badge (active in `leaf`, suspended in `clay`), joined date, and a "Manage" button. Loading: skeleton rows. Error: `ErrorState` with retry. Empty (no results for the current search/filter): "No users match that search."

**Manage sheet** (opens via the existing `Sheet` component, same pattern as Account): for the selected user,
- **Suspend / Reactivate**: a single button whose label and action depend on the user's current status. Reversible, so a lightweight inline two-step confirm (click reveals "Confirm suspend"/"Confirm reactivate" in place of the original label) rather than a full modal or typed confirmation, matching this phase's lower stakes relative to the irreversible account-deletion pattern used elsewhere.
- **Change email**: a small form (new email, `Field` + `Button`), calling the direct-override endpoint, no OTP step, since the doc is explicit this endpoint exists specifically to skip verification for typo fixes.
- **Support failover**: four buttons, one per OTP type ("Generate registration code," "Generate password reset code," "Generate email change code," "Generate password change code"), each an independent action showing the returned code inline on success (a copyable text, since the whole point of this feature is handing the code to someone through a channel other than email) and an inline error on failure.

**Recent audit logs panel**: below the list, a compact panel (same visual pattern as Dashboard's "Recent broadcasts"): each row shows the admin action, the actor, and a timestamp. Empty state: "No audit activity yet." Loading/error states independent of the user list's own states (separate query, same pattern as Dashboard's two independent panels).

## Architecture

**API layer:** extend `lib/api/admin/endpoints.ts` with:
- `getAdminUsers(params: { search?: string; status?: 'active' | 'suspended'; page?: number }): Promise<AdminUsersPage>`: `GET /api/v1/admins/users` with query parameters (this one genuinely is a query-string request, since it's a `GET`; only the `PUT`/`POST` actions below use JSON bodies).
- `suspendAdminUser(userEmail: string): Promise<unknown>`: `PUT /api/v1/admins/users/suspend`.
- `reactivateAdminUser(userEmail: string): Promise<unknown>`: `PUT /api/v1/admins/users/reactivate`.
- `changeAdminUserEmail(currentEmail: string, newEmail: string): Promise<unknown>`: `PUT /api/v1/admins/users/change-email`.
- `getAdminAuditLogs(): Promise<AdminAuditLogItem[]>`: `GET /api/v1/admins/audit-logs`.
- `generateAdminUserOtp(userEmail: string, kind: 'registration' | 'password' | 'email' | 'password-change'): Promise<{ otp: string }>`: dispatches to the correct one of the four failover paths based on `kind`, since all four share the same request/response shape and differ only by path suffix; a single parameterized function avoids four near-identical exported functions.

**Types:** new `AdminUserSummary`, `AdminUsersPage`, `AdminAuditLogItem` added to `lib/api/admin/types.ts`.

**Mock data:** `lib/api/admin/mock-store.ts` gains a small fake user list (6-8 entries, mixed active/suspended), fake audit log entries, and stateful suspend/reactivate/change-email handling (mutating the fake list in place, the same pattern already used for `confirmEmailChange` on the admin's own profile), with matching routes in `lib/api/admin/mock-fetch.ts`. The mock `GET /users` route respects the `search`/`status`/`page` query parameters against the fake list, so the search and filter UI is genuinely testable locally, not just a static render.

## Testing and Definition of Done

Same standing rules as every prior phase: Vitest + Testing Library coverage per new component covering all states (loading, error, empty, success) for both the user list and the audit log panel, plus the manage sheet's suspend/reactivate/change-email/failover-OTP flows, `npm test && npx tsc --noEmit && npm run lint` clean per task, `npm run build` clean at the end, no em dashes, no AI attribution, screenshot-verify all layout and interaction work with real Playwright renders. End the phase by serving the dev URL for client approval.

## Self-Review Notes

- Scope check: this document covers exactly Phase 3 (Users, including its Support Failover subsection and the audit-logs endpoint). The remaining three phases are unspecified here.
- Placeholder scan: no TBD/TODO. Best-guess field shapes (pagination params, audit log fields) are explicitly marked as such with a stated verification plan.
- Consistency check: the JSON-body-not-query-string rule for `PUT`/`POST` actions is stated once here and will be restated in the plan's Global Constraints, matching how the `/anaytics` misspelling was called out multiple times in Phase 2 to survive independent task reviews without being "corrected."
