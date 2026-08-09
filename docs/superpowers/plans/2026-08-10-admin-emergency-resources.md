# Admin Emergency Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/admin/emergency` stub with a real screen: summary cards, a resource list, and add/edit/delete for individual emergency resources, built against the verified backend contract.

**Architecture:** New types + endpoint functions in the existing `lib/api/admin/*` modules, a new `AdminEmergencyResourceForm`-driving `Sheet` component, and the page itself — following the exact same layering as Phases 1-3 (TanStack Query, mock store/mock-fetch parity, Skeleton/ErrorState/Sheet/Button/Field reuse).

**Tech Stack:** Next.js 16.3 App Router, React 19, TanStack Query, Tailwind v4 tokens, Vitest + Testing Library.

## Global Constraints

- Design spec of record: `docs/superpowers/specs/2026-08-10-earsforyou-admin-emergency-resources-design.md`. Every task's requirements implicitly include it.
- Every field shape in this phase is confirmed from real backend Java source (`.superpowers/admin-backend-contract.md`), not a guess — do not second-guess field names against the older `docs/Admin_Endpoints.pdf`, which is superseded by the contract doc for this phase.
- `POST /api/v1/admins/resources` and `PUT /api/v1/admins/resources/{id}` send a JSON body (`ResourceDTO` shape) — these are genuinely body-based, unlike the Users phase's query-param mutations. Do not apply that phase's "query params" pattern here; this phase's write endpoints are real `@RequestBody`s.
- `DELETE /api/v1/admins/resources/{id}` takes the id as a path variable, no body, no query params.
- Same visual identity/conventions as Phases 1-3: `oat`/`fir`/`card`/`marigold`/`clay`/`leaf` tokens, no new tokens, reuse `Skeleton`/`ErrorState`/`Button`/`Field`/`Sheet` as-is.
- No AI attribution in any commit. No em dashes anywhere.
- Backend does not validate any field on the write DTOs — the frontend must reject blank Name/Country/Contact info client-side before submitting.
- Verification per task: `npm test && npx tsc --noEmit && npm run lint` at minimum; `npm run build` on the final task. Screenshot-verify any task that changes visible layout with real Playwright renders, not curl or reasoning from source.
- Commit after every task, conventional message, verify with `git log -1 --format=%B` before moving on.

## File Structure

```
lib/api/admin/types.ts                        modify: add AdminEmergencyResource, AdminEmergencyResourceInput, AdminEmergencyDashboard
lib/api/admin/endpoints.ts                     modify: add getAdminEmergencyDashboard, createAdminEmergencyResource, updateAdminEmergencyResource, deleteAdminEmergencyResource
lib/api/admin/endpoints.test.ts                modify: coverage for the four new functions
lib/api/admin/mock-store.ts                    modify: add fake resource list + add/update/delete/derived-counts logic
lib/api/admin/mock-fetch.ts                    modify: add matching mock routes, including PUT/DELETE .../resources/{id} path-parameter routes
lib/query/admin-keys.ts                        modify: add emergencyDashboard query key
components/admin/emergency-resource-sheet.tsx  create: AdminEmergencyResourceSheet (add/edit form)
components/admin/emergency-resource-sheet.test.tsx  create
app/admin/(dashboard)/emergency/page.tsx       modify: replace the stub with the real screen
app/admin/(dashboard)/emergency/page.test.tsx  create
```

Interfaces named here are binding across tasks; later tasks import exactly these names.

---

### Task 1: Types, query key, and the read endpoint

**Files:**
- Modify: `lib/api/admin/types.ts`
- Modify: `lib/api/admin/endpoints.ts`
- Modify: `lib/api/admin/endpoints.test.ts`
- Modify: `lib/api/admin/mock-store.ts`
- Modify: `lib/api/admin/mock-fetch.ts`
- Modify: `lib/query/admin-keys.ts`

**Interfaces:**
- Produces: `AdminEmergencyResource = { id: number, name: string, country: string, resourceType: 'HOTLINE' | 'WEBSITE' | 'CLINIC', contactInfo: string, active: boolean }`, `AdminEmergencyResourceInput = Omit<AdminEmergencyResource, 'id'>`, `AdminEmergencyDashboard = { totalHotlines: number, totalWebsites: number, totalClinics: number, activeCountriesCount: number, resources: AdminEmergencyResource[] }`, `getAdminEmergencyDashboard(): Promise<AdminEmergencyDashboard>`, `adminQk.emergencyDashboard`.

- [ ] **Step 1: Add the types**

In `lib/api/admin/types.ts`, add:

```ts
export interface AdminEmergencyResource {
  id: number
  name: string
  country: string
  resourceType: 'HOTLINE' | 'WEBSITE' | 'CLINIC'
  contactInfo: string
  active: boolean
}
export type AdminEmergencyResourceInput = Omit<AdminEmergencyResource, 'id'>
export interface AdminEmergencyDashboard {
  totalHotlines: number
  totalWebsites: number
  totalClinics: number
  activeCountriesCount: number
  resources: AdminEmergencyResource[]
}
```

- [ ] **Step 2: Add the query key**

In `lib/query/admin-keys.ts`, add `emergencyDashboard: ['admin-emergency-dashboard']` to the `adminQk` object (follow the existing key-naming convention in that file exactly).

- [ ] **Step 3: Add the read endpoint**

In `lib/api/admin/endpoints.ts`:

```ts
export const getAdminEmergencyDashboard = () =>
  adminApiFetch<AdminEmergencyDashboard>('/api/v1/admins/emergency/dashboard')
```

Add `AdminEmergencyDashboard` to the type-only import block at the top of the file.

- [ ] **Step 4: Add a failing test, then make it pass**

In `endpoints.test.ts`, add a test that mocks the underlying fetch and asserts `getAdminEmergencyDashboard()` calls `GET /api/v1/admins/emergency/dashboard` and returns the parsed body. Follow this file's existing test structure for another no-argument GET (e.g. `getAdminDashboard`'s test) exactly.

Run: `npx vitest run lib/api/admin/endpoints.test.ts`
Expected: new test passes.

- [ ] **Step 5: Add the mock store fixture and route**

In `lib/api/admin/mock-store.ts`, add a fake resource list (5-7 entries spanning all three `resourceType` values, at least 4 distinct countries, at least one `active: false` entry), e.g.:

```ts
const emergencyResources: AdminEmergencyResource[] = [
  { id: 1, name: 'National Crisis Line', country: 'United States', resourceType: 'HOTLINE', contactInfo: '988', active: true },
  { id: 2, name: 'Samaritans', country: 'United Kingdom', resourceType: 'HOTLINE', contactInfo: '116 123', active: true },
  { id: 3, name: 'BetterHelp', country: 'United States', resourceType: 'WEBSITE', contactInfo: 'betterhelp.com', active: true },
  { id: 4, name: 'Mind', country: 'United Kingdom', resourceType: 'WEBSITE', contactInfo: 'mind.org.uk', active: true },
  { id: 5, name: 'Lagos University Teaching Hospital', country: 'Nigeria', resourceType: 'CLINIC', contactInfo: '+234 1 545 0000', active: true },
  { id: 6, name: 'Old Community Line (retired)', country: 'Canada', resourceType: 'HOTLINE', contactInfo: '1-800-000-0000', active: false },
]
let nextResourceId = 7
```

Add a store method that derives the dashboard object live from the current list (counts and
`activeCountriesCount` computed from the array on every call, not cached, so later add/edit/delete
tasks correctly move these numbers):

```ts
getEmergencyDashboard(): AdminEmergencyDashboard {
  return {
    totalHotlines: emergencyResources.filter(r => r.resourceType === 'HOTLINE').length,
    totalWebsites: emergencyResources.filter(r => r.resourceType === 'WEBSITE').length,
    totalClinics: emergencyResources.filter(r => r.resourceType === 'CLINIC').length,
    activeCountriesCount: new Set(emergencyResources.filter(r => r.active).map(r => r.country)).size,
    resources: emergencyResources,
  }
},
```

In `lib/api/admin/mock-fetch.ts`, add a route: `pathname === '/api/v1/admins/emergency/dashboard' && method === 'GET'` returning `delay(adminMockStore.getEmergencyDashboard() as T)`.

- [ ] **Step 6: Run full verification and commit**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all clean.

```bash
git add lib/api/admin/types.ts lib/api/admin/endpoints.ts lib/api/admin/endpoints.test.ts lib/api/admin/mock-store.ts lib/api/admin/mock-fetch.ts lib/query/admin-keys.ts
git commit -m "feat: add the emergency resources dashboard read endpoint"
```

---

### Task 2: The write/delete endpoints

**Files:**
- Modify: `lib/api/admin/endpoints.ts`
- Modify: `lib/api/admin/endpoints.test.ts`
- Modify: `lib/api/admin/mock-store.ts`
- Modify: `lib/api/admin/mock-fetch.ts`

**Interfaces:**
- Consumes: `AdminEmergencyResource`, `AdminEmergencyResourceInput` (Task 1).
- Produces: `createAdminEmergencyResource(input: AdminEmergencyResourceInput): Promise<AdminEmergencyResource>`, `updateAdminEmergencyResource(id: number, input: AdminEmergencyResourceInput): Promise<AdminEmergencyResource>`, `deleteAdminEmergencyResource(id: number): Promise<unknown>`.

- [ ] **Step 1: Add the three functions**

```ts
export const createAdminEmergencyResource = (input: AdminEmergencyResourceInput) =>
  adminApiFetch<AdminEmergencyResource>('/api/v1/admins/resources', { method: 'POST', body: input })
export const updateAdminEmergencyResource = (id: number, input: AdminEmergencyResourceInput) =>
  adminApiFetch<AdminEmergencyResource>(`/api/v1/admins/resources/${id}`, { method: 'PUT', body: input })
export const deleteAdminEmergencyResource = (id: number) =>
  adminApiFetch(`/api/v1/admins/resources/${id}`, { method: 'DELETE' })
```

- [ ] **Step 2: Failing tests, then pass**

Add tests in `endpoints.test.ts` for all three: assert method, path (including the id in the URL for update/delete), and body (for create/update). Run `npx vitest run lib/api/admin/endpoints.test.ts`; expected: pass.

- [ ] **Step 3: Mock store add/update/delete**

In `mock-store.ts`, add methods that mutate `emergencyResources` in place:

```ts
addResource(input: AdminEmergencyResourceInput): AdminEmergencyResource {
  const resource: AdminEmergencyResource = { id: nextResourceId++, ...input }
  emergencyResources.push(resource)
  return resource
},
updateResource(id: number, input: AdminEmergencyResourceInput): AdminEmergencyResource | null {
  const existing = emergencyResources.find(r => r.id === id)
  if (!existing) return null
  Object.assign(existing, input)
  return existing
},
deleteResource(id: number): void {
  const index = emergencyResources.findIndex(r => r.id === id)
  if (index !== -1) emergencyResources.splice(index, 1)
},
```

- [ ] **Step 4: Mock fetch routes, including path-parameter matching**

`mock-fetch.ts` has no existing path-parameter routing (every route so far is an exact `pathname === '...'` string match). Add a regex match for the two `/resources/{id}` routes:

```ts
const resourceIdMatch = pathname.match(/^\/api\/v1\/admins\/resources\/(\d+)$/)
if (pathname === '/api/v1/admins/resources' && method === 'POST') {
  const body = opts.body as AdminEmergencyResourceInput
  return delay(adminMockStore.addResource(body) as T)
}
if (resourceIdMatch && method === 'PUT') {
  const id = Number(resourceIdMatch[1])
  const body = opts.body as AdminEmergencyResourceInput
  const updated = adminMockStore.updateResource(id, body)
  return delay(updated as T)
}
if (resourceIdMatch && method === 'DELETE') {
  const id = Number(resourceIdMatch[1])
  adminMockStore.deleteResource(id)
  return delay({ message: 'Emergency resource deleted successfully.' } as T)
}
```

Place this block wherever fits the file's existing route-ordering convention (check whether routes
are grouped by feature area or just appended in build order, and follow whichever pattern already
exists — do not invent a third organizational scheme).

- [ ] **Step 5: Verify and commit**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all clean.

```bash
git add lib/api/admin/endpoints.ts lib/api/admin/endpoints.test.ts lib/api/admin/mock-store.ts lib/api/admin/mock-fetch.ts
git commit -m "feat: add emergency resource create, update, and delete endpoints"
```

---

### Task 3: The add/edit resource sheet

**Files:**
- Create: `components/admin/emergency-resource-sheet.tsx`
- Create: `components/admin/emergency-resource-sheet.test.tsx`

**Interfaces:**
- Consumes: `AdminEmergencyResource`, `AdminEmergencyResourceInput`, `createAdminEmergencyResource`, `updateAdminEmergencyResource` (Tasks 1-2), `adminQk.emergencyDashboard` (Task 1), `Sheet` (`{open, onClose, title, children}`), `Field` (spreads `InputHTMLAttributes` + `{label, error?}`), `Button` (`variant: 'primary'|'ghost'|'quiet'|'destructive'`).
- Produces: `AdminEmergencyResourceSheet({ resource, open, onClose }: { resource: AdminEmergencyResource | null, open: boolean, onClose: () => void })`. `resource === null` means "create mode" (empty form); a non-null `resource` means "edit mode" (pre-filled form, calls update instead of create). This differs from the Users phase's `UserManageSheet`, where `user === null` meant "render nothing" — here, `resource === null` is a valid, meaningful state (creating something new), so the component must NOT early-return null when `resource` is null. Only fail to render when `open` is false (let `Sheet` itself handle that, matching its established behavior from Phases 1-3).

- [ ] **Step 1: Write the component**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAdminEmergencyResource, updateAdminEmergencyResource } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { ApiError } from '@/lib/api/errors'
import type { AdminEmergencyResource, AdminEmergencyResourceInput } from '@/lib/api/admin/types'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

const TYPE_OPTIONS: { value: AdminEmergencyResourceInput['resourceType']; label: string }[] = [
  { value: 'HOTLINE', label: 'Hotline' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'CLINIC', label: 'Clinic' },
]

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.'
}

const EMPTY_FORM: AdminEmergencyResourceInput = {
  name: '', country: '', resourceType: 'HOTLINE', contactInfo: '', active: true,
}

export function AdminEmergencyResourceSheet({ resource, open, onClose }: {
  resource: AdminEmergencyResource | null
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<AdminEmergencyResourceInput>(resource ?? EMPTY_FORM)

  useEffect(() => {
    setForm(resource ?? EMPTY_FORM)
  }, [resource])

  const mutation = useMutation({
    mutationFn: () =>
      resource
        ? updateAdminEmergencyResource(resource.id, form)
        : createAdminEmergencyResource(form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.emergencyDashboard })
      onClose()
    },
  })

  const valid = form.name.trim() !== '' && form.country.trim() !== '' && form.contactInfo.trim() !== ''

  return (
    <Sheet open={open} onClose={onClose} title={resource ? 'Edit resource' : 'Add resource'}>
      <form
        onSubmit={e => { e.preventDefault(); if (valid) mutation.mutate() }}
        className="flex flex-col gap-4"
      >
        {mutation.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(mutation.error)}</p> : null}
        <Field label="Name" required value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <Field label="Country" required value={form.country}
          onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
        <div>
          <p className="mb-2 text-sm font-semibold opacity-70">Type</p>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, resourceType: opt.value }))}
                className={`rounded-full px-3 py-1.5 text-sm ${form.resourceType === opt.value ? 'bg-fir text-oat' : 'bg-card'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Contact info" required value={form.contactInfo}
          onChange={e => setForm(f => ({ ...f, contactInfo: e.target.value }))} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active}
            onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
          Active
        </label>
        <Button type="submit" busy={mutation.isPending} disabled={!valid}>
          {resource ? 'Save changes' : 'Add resource'}
        </Button>
      </form>
    </Sheet>
  )
}
```

Before using this verbatim, read the actual `Field`, `Button`, and `Sheet` components' real prop
signatures (`components/ui/field.tsx`, `components/ui/button.tsx`, `components/ui/sheet.tsx`) —
this code assumes `Field` accepts a plain `required` boolean and standard input props, and that a
native checkbox is an acceptable pattern given there's no dedicated `Checkbox`/`Toggle` component
elsewhere in this codebase (check for one before falling back to a native checkbox; if one exists,
use it instead for consistency).

- [ ] **Step 2: Write tests**

Cover: (a) create mode renders an empty form and calls `createAdminEmergencyResource` with the
entered values on submit; (b) edit mode pre-fills every field from the passed `resource` and calls
`updateAdminEmergencyResource(resource.id, ...)` on submit; (c) submit is blocked (button
disabled) when Name/Country/Contact info is blank; (d) a failed mutation shows the error message.
Follow the exact mocking pattern already used in `components/admin/user-manage-sheet.test.tsx`
(fresh `QueryClient` per test, `vi.spyOn(endpoints, '<fn>')`).

Run: `npx vitest run components/admin/emergency-resource-sheet.test.tsx`
Expected: all pass.

- [ ] **Step 3: Verify and commit**

Run: `npm test && npx tsc --noEmit && npm run lint`

```bash
git add components/admin/emergency-resource-sheet.tsx components/admin/emergency-resource-sheet.test.tsx
git commit -m "feat: add the emergency resource add/edit sheet"
```

---

### Task 4: The Emergency Resources page

**Files:**
- Modify: `app/admin/(dashboard)/emergency/page.tsx`
- Create: `app/admin/(dashboard)/emergency/page.test.tsx`

**Interfaces:**
- Consumes: `getAdminEmergencyDashboard`, `deleteAdminEmergencyResource` (Tasks 1-2), `AdminEmergencyResourceSheet` (Task 3), `adminQk.emergencyDashboard`, `Skeleton`, `ErrorState`.

- [ ] **Step 1: Write the page**

Structure: four summary cards (reuse the Dashboard page's card markup pattern) sourced from
`totalHotlines`/`totalWebsites`/`totalClinics`/`activeCountriesCount`; a resource list below,
each row showing name/country/type badge/contact info/active badge/Edit+Delete actions; a
"+ Add resource" button that opens `AdminEmergencyResourceSheet` with `resource={null}`; clicking
Edit opens the same sheet with `resource={theRow}`; Delete uses an inline two-step confirm
(mirroring `StatusAction`'s pattern from `user-manage-sheet.tsx` — read that component for the
exact interaction shape before reimplementing it, since this plan will not repeat that code here:
the pattern is "click reveals Confirm + Cancel buttons in place of the original label", state held
per-row). Type badge colors: `bg-marigold/15 text-marigold` (contrast check this against the
project's established minimum-contrast precedent from `terrain-chart.tsx`/`MARIGOLD_DEEP` before
shipping — if plain marigold text fails a 3:1 contrast check against the card background, use the
same darker `MARIGOLD_DEEP` token or fallback approach already established, do not ship a
low-contrast label) for Hotline, `bg-fir/15 text-fir` for Website, `bg-leaf/15 text-leaf` for
Clinic. Active/inactive badge: `bg-leaf/15 text-leaf` active, a neutral/muted style (not `clay`,
since inactive is not an error state) for inactive — e.g. `bg-card text-fir/60` or similar existing
muted-text convention, check the codebase for one before inventing a new style. Loading: skeleton
rows for both the cards and the list. Error: `ErrorState` with retry (one query, one error state —
this phase has no independent-panel-states requirement like the Users phase's two separate
queries, since the dashboard endpoint returns everything in one call). Empty: "No emergency
resources yet. Add one to get started." Delete's `onSuccess` invalidates
`adminQk.emergencyDashboard`.

- [ ] **Step 2: Write tests**

Cover: loading (skeleton), error (`ErrorState` + retry), empty state, success (cards show correct
counts, rows render), Add opens the sheet in create mode, Edit opens it pre-filled, Delete's
two-step confirm calls `deleteAdminEmergencyResource` with the right id. Follow the exact mocking
pattern already used in `app/admin/(dashboard)/users/page.test.tsx` (mock `useQuery`/`useMutation`,
render the real component, assert on real DOM output).

Run: `npx vitest run "app/admin/(dashboard)/emergency/page.test.tsx"`
Expected: all pass.

- [ ] **Step 3: Verify, screenshot, and commit**

Run: `npm test && npx tsc --noEmit && npm run lint`. Start the dev server in mock mode, log in as
admin, navigate to `/admin/emergency`, and capture real Playwright screenshots at desktop
(1440px) and mobile (375px) widths showing: the four summary cards, the resource list with visible
type/active badges, the add sheet open, and the edit sheet open pre-filled. View every screenshot
file yourself before claiming the layout is correct — do not infer correctness from the code alone.

```bash
git add app/admin/(dashboard)/emergency/page.tsx app/admin/(dashboard)/emergency/page.test.tsx
git commit -m "feat: replace the emergency resources stub with the real screen"
```

---

### Task 5: Final audit

**Files:** none new; this task only verifies and, if needed, fixes issues found across this phase's screen.

- [ ] **Step 1: Full gate suite**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass, production build succeeds.

- [ ] **Step 2: All-states audit**

Temporarily point `API_URL` at an unreachable host, confirm `ErrorState` renders correctly on the
Emergency Resources page, confirm the add/edit sheet's inline error state renders correctly under
the same forced failure, then restore `API_URL`.

- [ ] **Step 3: Copy and token audit**

```bash
grep -rn $'—' app/admin/\(dashboard\)/emergency components/admin/emergency-resource-sheet.tsx lib/api/admin lib/query/admin-keys.ts || echo clean
```

Should report clean (note: `lib/api/admin`/`admin-keys.ts` were already audited clean in the Users
phase's own final audit and by the backend-alignment pass — re-checking here only catches
anything this phase's own new code introduced). Fix in place if not.

- [ ] **Step 4: Breakpoint audit**

At 375px, 768px, and 1900px: confirm no horizontal scroll on `/admin/emergency`, the summary cards
reflow correctly, the resource list is usable at phone width (no clipped badges/actions), and the
add/edit sheet opens as a bottom sheet on phone / centered dialog on desktop. Use real Playwright
screenshots, actually view them.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final audit for the admin emergency resources phase"
```

**Important:** before staging, run `git status` and confirm only files under `app/admin`,
`components/admin`, `lib/api/admin`, `lib/query/admin-keys.ts`, and this phase's docs are staged —
if `git add -A` picks up anything else (the repo has an unrelated pre-existing untracked `backend/`
Java source tree at the root, and possibly other stray uncommitted files from unrelated work),
unstage it before committing. Do not commit anything outside this phase's scope.

---

## Self-Review Notes

- Spec coverage: summary cards, resource list with all states, add/edit sheet with validation,
  delete confirm, and the standing testing/screenshot/definition-of-done rules are all covered
  across Tasks 1-5.
- Placeholder scan: no TBD/TODO. Every field shape is confirmed from real backend source.
- Type consistency: `AdminEmergencyResource`/`AdminEmergencyResourceInput`/`AdminEmergencyDashboard`
  (Task 1) match their usage in Task 2 (endpoint signatures), Task 3 (sheet props), and Task 4
  (page's data reads) exactly. `AdminEmergencyResourceSheet`'s props (`resource`, `open`, `onClose`)
  match between Task 3's definition and Task 4's call site.
