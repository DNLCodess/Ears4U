# EARS FOR YOU Admin Dashboard, Phase 4: Emergency Resources

## Context

Phases 1-3 shipped (shell/auth, dashboard/analytics, users), plus a full backend-alignment pass
that replaced every guessed field shape across those three phases with contracts read directly
from the real Spring Boot source (`.superpowers/admin-backend-contract.md`). This document specs
Phase 4: replacing the `Emergency Resources` stub with the real screen, covering
`docs/Admin_Endpoints.pdf`'s emergency-resources area, built directly against the verified
backend contract from the start (no best-guess framing needed for this phase — every field below
is confirmed from Java source, not the PDF doc).

## Goals

- An admin can see, at a glance, how many hotlines/websites/clinics exist and how many countries
  have at least one active resource.
- An admin can view, add, edit, and delete individual emergency resources (crisis hotlines,
  support websites, clinics), each tagged with a country and a type.
- Same visual identity, responsive approach, and component reuse conventions as Phases 1-3. No new
  design system decisions.

## Out of Scope (this phase)

- Settings, Telemetry, Broadcasts screens (later phases).
- Bulk import/export of resources. Nothing in the contract supports it; YAGNI.
- Any backend or database change.

## Endpoints (verified from `backend/controllers/AdminController.java`, not guessed)

- `GET /api/v1/admins/emergency/dashboard`: `EmergencyDashboardResponse` — `{ totalHotlines: number,
  totalWebsites: number, totalClinics: number, activeCountriesCount: number, resources:
  ResourceDTO[] }` where `ResourceDTO = { id: number, name: string, country: string, resourceType:
  'HOTLINE' | 'WEBSITE' | 'CLINIC', contactInfo: string, active: boolean }`. This single call
  supplies both the summary counts and the full resource list — no second fetch is needed for the
  main screen.
- `POST /api/v1/admins/resources`: body is a `ResourceDTO` (the `id` field is ignored/overwritten
  server-side on create — do not send a client-generated id). Returns the saved `ResourceDTO` with
  its real id.
- `PUT /api/v1/admins/resources/{id}`: path variable `id`, body a `ResourceDTO` (same fields).
  Returns the updated `ResourceDTO`.
- `DELETE /api/v1/admins/resources/{id}`: path variable `id`. Returns `{ message: string }`.
- `GET /api/v1/admins/resources` exists but is redundant with the dashboard endpoint's own
  `resources` field for this screen's purposes (confirmed identical field shape between the raw
  entity and `ResourceDTO` from service-layer usage) — not used here, since fetching the dashboard
  once already provides the list. Documented for completeness, not wired into this phase.
- None of the four write endpoints' request DTOs carry backend validation annotations (confirmed
  from source) — the frontend must do its own required-field checks (name, country, contactInfo
  all non-empty) since a blank string will sail through to the service layer untouched.

## Screen

### Emergency Resources (`/admin/emergency`, replacing the stub)

**Summary cards:** four cards (Hotlines, Websites, Clinics, Active countries), same visual pattern
as Dashboard's metric cards, sourced directly from `totalHotlines`/`totalWebsites`/`totalClinics`/
`activeCountriesCount`.

**Resource list:** a table/list below the cards. Each row: name, country, a type badge (Hotline /
Website / Clinic, using existing token colors — `marigold` for Hotline, `fir` for Website, `leaf`
for Clinic, chosen for visual distinction, no new tokens), contact info, an active/inactive badge
(`leaf` active, a muted/neutral style inactive, since "inactive" is not an error state like
"suspended" — it is a deliberate content-management flag), and Edit/Delete actions. Loading:
skeleton rows (reuse `Skeleton`). Error: `ErrorState` with retry. Empty (zero resources exist):
"No emergency resources yet. Add one to get started."

**Add/Edit form:** a `Sheet` (same component as Users' manage sheet), opened by a "+ Add resource"
button (create) or an Edit action on a row (update, pre-filled). Fields: Name (`Field`), Country
(`Field`), Type (a simple select/segmented control among Hotline/Website/Clinic — reuse the same
pill-button pattern already used for the Users page's status filter, not a new component), Contact
info (`Field`), Active (a toggle/checkbox). Client-side required-field validation on Name, Country,
Contact info before submit (per the "no backend validation" note above). Submit calls
`POST /resources` (create) or `PUT /resources/{id}` (edit); both invalidate the dashboard query so
the list and counts refresh together in one place.

**Delete:** a lightweight inline two-step confirm on each row's Delete action (click reveals
"Confirm delete" in place of the label), matching the Users phase's suspend/reactivate pattern —
this is an admin content-management action, not the destructive account-deletion flow elsewhere in
the app, so the same lower-ceremony confirm pattern applies. Calls `DELETE /resources/{id}`,
invalidates the dashboard query on success.

## Architecture

**API layer:** extend `lib/api/admin/endpoints.ts` with:
- `getAdminEmergencyDashboard(): Promise<AdminEmergencyDashboard>` — `GET
  /api/v1/admins/emergency/dashboard`.
- `createAdminEmergencyResource(input: AdminEmergencyResourceInput): Promise<AdminEmergencyResource>`
  — `POST /api/v1/admins/resources`.
- `updateAdminEmergencyResource(id: number, input: AdminEmergencyResourceInput):
  Promise<AdminEmergencyResource>` — `PUT /api/v1/admins/resources/{id}`.
- `deleteAdminEmergencyResource(id: number): Promise<unknown>` — `DELETE
  /api/v1/admins/resources/{id}`.

**Types:** new `AdminEmergencyResource` (`{ id: number, name: string, country: string,
resourceType: 'HOTLINE' | 'WEBSITE' | 'CLINIC', contactInfo: string, active: boolean }`),
`AdminEmergencyResourceInput = Omit<AdminEmergencyResource, 'id'>`, `AdminEmergencyDashboard`
(`{ totalHotlines: number, totalWebsites: number, totalClinics: number, activeCountriesCount:
number, resources: AdminEmergencyResource[] }`) added to `lib/api/admin/types.ts`.

**Mock data:** `lib/api/admin/mock-store.ts` gains a small fake resource list (5-7 entries, mixed
types/countries/active-inactive) and stateful add/update/delete handling (mutating the fake list
in place), with the summary counts derived live from the fake list (not hardcoded, so add/delete
actually move the numbers in mock mode), plus matching routes in `lib/api/admin/mock-fetch.ts`
(including the `PUT`/`DELETE .../resources/{id}` path-parameter routes, a new pattern for this
mock layer — check how, if at all, path-parameter routes are already handled elsewhere before
inventing a new dispatch mechanism).

## Testing and Definition of Done

Same standing rules as every prior phase: Vitest + Testing Library coverage per new component
covering all states (loading, error, empty, success) for the resource list, plus the add/edit
form's validation and submit flows and the delete confirm flow, `npm test && npx tsc --noEmit &&
npm run lint` clean per task, `npm run build` clean at the end, no em dashes, no AI attribution,
screenshot-verify all layout and interaction work with real Playwright renders. End the phase by
confirming the dev server still serves the finished screen.

## Self-Review Notes

- Scope check: this document covers exactly Phase 4 (Emergency Resources). The remaining two
  phases (Settings+Telemetry, Broadcasts) are unspecified here.
- Placeholder scan: no TBD/TODO. Every field shape is confirmed from real backend source, not a
  best-guess — a first for this project's admin phases.
- Consistency check: the redundant `GET /resources` endpoint is explicitly noted as unused by
  design, not an oversight, so a future reviewer doesn't "helpfully" wire it in unprompted.
