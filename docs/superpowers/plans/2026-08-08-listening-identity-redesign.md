# Listening Identity Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin Home, Sign-in, Register/Verify/Forgot-password/Recovery, and Chat from the "Good Soil" garden metaphor to the "Listening" identity approved in `docs/superpowers/specs/2026-08-08-earsforyou-listening-identity-redesign.md`, and swap Chat in for Check-in as the primary raised navigation action, on an already-built and already-deployed Next.js app.

**Architecture:** No backend or data-layer changes. This is a visual and navigation-order change on top of the existing React Query + Tailwind v4 app. A small number of garden-specific modules are retired and replaced with new "listening" equivalents (breathing rings, a real-data waveform, a warm two-zone hero pattern reused across every redesigned screen); everything else (routing, API calls, state management, the untouched screens) is unchanged.

**Tech Stack:** Next.js 16.3, React 19, Tailwind v4, TanStack Query, `motion/react`, Vitest + Testing Library (already in place, no new dependencies).

## Global Constraints

- Design spec of record: `docs/superpowers/specs/2026-08-08-earsforyou-listening-identity-redesign.md`. Every task's requirements implicitly include it; read it once before starting any task.
- Color tokens: `oat` changes value to `#F6F1E5` (same token name, new hex). Add three new tokens: `night-warm-top` `#170F07`, `night-warm-bottom` `#2A1B0C`, `warm-cream` `#FBEEDD`. All other existing tokens (`fir`, `fir-deep`, `leaf`, `leaf-bright`, `marigold`, `marigold-deep`, `clay`, `card`) are unchanged.
- Typography unchanged: Chillax (display), General Sans (body).
- Marigold gradient/color is reserved for warmth, celebration, milestones, and now also "talk/listening" actions (raised nav button, Chat send button, presence dots). Never used for large surfaces or errors.
- The two-zone hero pattern (flat, deliberately dark text-safe zone; decorative rings/glow/waveform kept clear of text) applies to every dark hero scene built in this plan. Any sheet or card that visually overlaps a hero from below must have its own opaque background and its own rounded top corners; never leave it transparent.
- `display: flex` (block-level), never `inline-flex`, for any two elements meant to stack as separate rows.
- Every SVG icon gets an explicit `width`/`height` (or Tailwind `h-*`/`w-*` class); never rely on inherited sizing.
- No AI attribution in any commit. No em dashes anywhere (code comments, UI copy, commit messages, docs).
- Reduced motion: every new animation (breathing rings, waveform draw-in, thinking indicator) must honor `useReducedMotion()` from `motion/react`, matching the existing pattern in `components/garden/plant.tsx` and `app/(app)/chat/page.tsx`.
- Out of scope, do not touch: `app/(app)/checkin/page.tsx`, `app/(app)/insights/page.tsx`, `app/(app)/journal/**`, `app/(app)/notifications/page.tsx`, `app/(app)/you/page.tsx`, `components/checkin/**`, `components/lifeline.tsx`, `lib/charts/terrain.ts` (reused, not modified), `lib/insight-dates.ts`, all backend/API/mock-data files.
- Verification per task: `npm test && npx tsc --noEmit && npm run lint` at minimum; `npm run build` on the final task. Manually check the dev server for any task that changes visible layout, the same way earlier work in this repo was screenshot-verified with Playwright before being called done (see `docs/superpowers/specs/2026-08-08-earsforyou-listening-identity-redesign.md` §9). Do not rely on reading the JSX alone for anything involving stacking, overlap, or z-index.
- Commit after every task, conventional message, verify with `git log -1 --format=%B` before moving on.

## File Structure

```
app/globals.css                          modify: oat value, three new tokens
app/(app)/layout.tsx                     modify: widen outer shell max-width
app/(auth)/layout.tsx                    modify: drop the centering wrapper, keep only the cold-start banner
components/shell/tab-bar.tsx             modify: Chat becomes the raised action, Check-in becomes a plain item
components/shell/tab-bar.test.tsx        create: structural test for the raised-action swap
lib/greeting.ts                          create: splitGreeting/greetingInitial, moved out of sky-scene.tsx
lib/greeting.test.ts                     create: moved from sky-scene.test.ts
components/listening/listening-hero.tsx  create: Home's new hero (mobile rings/glow, desktop adds the week waveform)
components/listening/listening-hero.test.tsx  create
components/listening/compact-hero.tsx    create: shared compact hero for register/verify/forgot-password/recovery
components/listening/compact-hero.test.tsx    create
app/(app)/home/page.tsx                  modify: new copy, affirmation relabel, quiet check-in line, 3-card desktop grid
app/(auth)/signin/page.tsx               modify: new hero+sheet (mobile), split screen (desktop); form logic unchanged
app/(auth)/register/page.tsx             modify: wrap in CompactHero, same step logic
app/(auth)/verify/page.tsx               modify: wrap in CompactHero, same OTP logic
app/(auth)/forgot-password/page.tsx      modify: wrap in CompactHero, same stage logic
app/(auth)/recovery/page.tsx             modify: wrap in CompactHero, same stage logic
app/(app)/chat/page.tsx                  modify: header, thinking indicator, composer spacing, marigold send button
components/garden/plant.tsx              delete
components/garden/sky-scene.tsx          delete
components/garden/sky-scene.test.ts      delete (superseded by lib/greeting.test.ts)
lib/sky.ts                               delete
lib/sky.test.ts                          delete
lib/garden.ts                            delete
lib/garden.test.ts                       delete
```

Interfaces named here are binding across tasks; later tasks import exactly these names.

---

### Task 1: Tokens, shell width, and retiring the garden modules

**Files:**
- Modify: `app/globals.css`, `app/(app)/layout.tsx`
- Create: `lib/greeting.ts`, `lib/greeting.test.ts`
- Delete: `components/garden/plant.tsx`, `components/garden/sky-scene.tsx`, `components/garden/sky-scene.test.ts`, `lib/sky.ts`, `lib/sky.test.ts`, `lib/garden.ts`, `lib/garden.test.ts`

**Interfaces:**
- Produces: `splitGreeting(greeting: string): { head: string; glow: string }`, `greetingInitial(greeting: string): string` from `lib/greeting.ts`. Every later task that needs the user's name from a greeting string imports from here, not from the deleted `components/garden/sky-scene.tsx`.
- Produces: theme tokens `bg-oat`/`text-oat`/etc. now resolve to `#F6F1E5`; new `bg-night-warm-top`, `bg-night-warm-bottom`, `text-warm-cream` (and their `border-*`/`fill-*`/`stroke-*` equivalents, since Tailwind v4 generates all utility variants from a `--color-*` token) become available.

`skyStateFor`/`SkyState`, `plantShape`, and the whole `components/garden/` directory are confirmed used only by `app/(app)/home/page.tsx` (verified: `grep -rl` across `app components lib` returns no other consumers). Deleting them here, before Task 4 rewrites Home, means Task 4 starts from a clean import list instead of leaving dead code around.

- [ ] **Step 1: Write the failing test for the moved greeting helpers**

```ts
// lib/greeting.test.ts
import { describe, it, expect } from 'vitest'
import { greetingInitial, splitGreeting } from './greeting'

describe('splitGreeting', () => {
  it('splits the head from the name after the last comma', () => {
    expect(splitGreeting('Good evening, Dami.')).toEqual({ head: 'Good evening,', glow: 'Dami.' })
  })
  it('adds a period to a name with no trailing punctuation', () => {
    expect(splitGreeting('Morning, ada')).toEqual({ head: 'Morning,', glow: 'ada.' })
  })
  it('returns an empty glow when there is no comma', () => {
    expect(splitGreeting('Good evening')).toEqual({ head: 'Good evening', glow: '' })
  })
})

describe('greetingInitial', () => {
  it('takes the name that follows the comma', () => {
    expect(greetingInitial('Good evening, Dami.')).toBe('D')
    expect(greetingInitial('Morning, ada')).toBe('A')
  })
  it('ignores the greeting words before the comma', () => {
    expect(greetingInitial('Good afternoon, Zainab')).toBe('Z')
  })
  it('falls back to a question mark when there is no name', () => {
    expect(greetingInitial('Good evening')).toBe('?')
    expect(greetingInitial('Good evening,')).toBe('?')
    expect(greetingInitial('')).toBe('?')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- greeting`
Expected: FAIL, cannot resolve `./greeting`

- [ ] **Step 3: Create `lib/greeting.ts` with the logic moved verbatim from `components/garden/sky-scene.tsx`**

```ts
// lib/greeting.ts
export function splitGreeting(greeting: string): { head: string; glow: string } {
  const trimmed = greeting.trim()
  const comma = trimmed.lastIndexOf(',')
  if (comma === -1 || comma === trimmed.length - 1) return { head: trimmed, glow: '' }
  const glow = trimmed.slice(comma + 1).trim()
  return {
    head: trimmed.slice(0, comma + 1),
    glow: /[.!?]$/.test(glow) ? glow : `${glow}.`,
  }
}

/** "Good evening, Dami." gives "D": the name is the part after the comma. */
export function greetingInitial(greeting: string): string {
  const letter = splitGreeting(greeting).glow.match(/[\p{L}\p{N}]/u)
  return letter ? letter[0].toUpperCase() : '?'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- greeting`
Expected: PASS, 6/6

- [ ] **Step 5: Update `app/globals.css`**

```css
@theme {
  --color-oat: #F6F1E5;
  --color-card: #FDFBF4;
  --color-fir: #22372B;
  --color-fir-deep: #16301F;
  --color-night: #102417;
  --color-night-warm-top: #170F07;
  --color-night-warm-bottom: #2A1B0C;
  --color-warm-cream: #FBEEDD;
  --color-leaf: #2E7D49;
  --color-leaf-bright: #47A566;
  --color-sprout: #7BC48F;
  --color-marigold: #F2BE45;
  --color-marigold-deep: #D99B21;
  --color-clay: #D9822B;
  --font-display: var(--font-chillax);
  --font-body: var(--font-general-sans);
}
```

Leave the rest of the file (`body` rule, `sprout-bounce` keyframes) exactly as is; the keyframes are still used until Task 8 replaces Chat's thinking indicator, at which point they become unused and can be deleted (tracked in Task 8, not here).

- [ ] **Step 6: Widen the app shell in `app/(app)/layout.tsx`**

Every existing page under `(app)` already caps its own width internally (`max-w-2xl`, `max-w-xl`, `max-w-3xl`, `max-w-lg`, confirmed by grep across `journal`, `notifications`, `you`, `checkin`), so the outer `lg:max-w-6xl` on the shell is currently the tightest constraint only for Home's new wide desktop layout, which needs more room. Change:

```tsx
// app/(app)/layout.tsx: change only this one class
<div className="min-h-dvh flex flex-col lg:flex-row lg:max-w-[1440px] lg:mx-auto">
```

Everything else in the file is unchanged. This is a one-line diff; do not touch `TabBar`, `QueryProvider`, or `useIdlePing` wiring here (Task 2 handles `TabBar`'s own content).

- [ ] **Step 7: Delete the retired garden and sky files**

```bash
git rm components/garden/plant.tsx components/garden/sky-scene.tsx components/garden/sky-scene.test.ts
git rm lib/sky.ts lib/sky.test.ts lib/garden.ts lib/garden.test.ts
```

Do not run `git rm -r components/garden` if anything else lands in that directory later; for this task the two named files are the whole directory, so it disappears on its own once both are removed.

- [ ] **Step 8: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. `tsc`/`lint` will show errors from `app/(app)/home/page.tsx` still importing the deleted modules; that is expected until Task 4. If you want a clean gate at the end of this task specifically, temporarily comment out with a `// TODO(task-4)` is not allowed by this project's no-placeholder rule for committed code, instead, leave Home broken and note in your report that `home/page.tsx` will not typecheck until Task 4 lands; do not attempt to patch it here.

- [ ] **Step 9: Commit**

```bash
git add app/globals.css "app/(app)/layout.tsx" lib/greeting.ts lib/greeting.test.ts
git commit -m "feat: add warm listening tokens, widen app shell, extract greeting helpers"
```

Note the deletions from Step 7 are already staged by `git rm`; include them in the same commit (`git status` should show only the files above plus the seven deletions before committing).

---

### Task 2: Tab bar: Chat becomes the raised action

**Files:**
- Modify: `components/shell/tab-bar.tsx`
- Create: `components/shell/tab-bar.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no exported names change (`TabBar` stays the sole export), but its rendered content changes: the raised item now links to `/chat` labeled "Talk to me" (mobile) / "Talk to me" (desktop standing button), Check-in becomes a plain nav item, and the desktop rail's bottom "You" link gains the avatar-and-name treatment described in the spec. Task 8 (Chat) relies on the raised item still being visible and marked current while already on `/chat`.

- [ ] **Step 1: Write the failing structural test**

```tsx
// components/shell/tab-bar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TabBar } from './tab-bar'

vi.mock('next/navigation', () => ({ usePathname: () => '/chat' }))

describe('TabBar', () => {
  it('renders the raised action as Talk to me, linking to /chat', () => {
    render(<TabBar />)
    const raised = screen.getAllByRole('link', { name: /talk to me/i })
    expect(raised.length).toBeGreaterThan(0)
    raised.forEach(link => expect(link).toHaveAttribute('href', '/chat'))
  })

  it('renders Check in as a plain nav item, not the raised action', () => {
    render(<TabBar />)
    const checkIn = screen.getAllByRole('link', { name: /^check in$/i })
    checkIn.forEach(link => expect(link).toHaveAttribute('href', '/checkin'))
  })

  it('marks the current route active', () => {
    render(<TabBar />)
    const current = screen.getAllByRole('link', { current: 'page' })
    expect(current.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tab-bar`
Expected: FAIL, the raised action currently links to `/checkin` and is labeled "Check in"

- [ ] **Step 3: Rewrite `components/shell/tab-bar.tsx`**

```tsx
// components/shell/tab-bar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ICON_PATHS = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9h13v-9" />
    </>
  ),
  checkin: (
    <>
      <path d="M12 18c3 0 5-2 5-5V8a5 5 0 0 0-10 0v5c0 3 2 5 5 5Z" />
      <path d="M6 11v1a6 6 0 0 0 12 0v-1M12 20v2" strokeLinecap="round" />
    </>
  ),
  insights: (
    <>
      <path d="M3 17 Q 8 13 12 15 T 21 12" />
      <path d="M3 12 Q 8 8 12 10 T 21 7" opacity=".55" />
      <path d="M3 21.5 Q 8 19 12 20 T 21 18" opacity=".3" />
    </>
  ),
  journal: (
    <>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
      <path d="M5 4v13a3 3 0 0 0 3 3" />
      <path d="M9.5 9h6M9.5 13h4" />
    </>
  ),
} as const

type IconName = keyof typeof ICON_PATHS

function NavIcon({ name, className = 'w-[21px] h-[21px]' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden
    >
      {ICON_PATHS[name]}
    </svg>
  )
}

function TalkIcon({ className = 'w-[25px] h-[25px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.4-.2-3.4-.6L3 21l1.8-4.2C3.7 15.4 3 13.8 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
    </svg>
  )
}

type NavItem = { href: string; label: string; icon: IconName } | { href: string; label: string; raised: true }

const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/checkin', label: 'Check in', icon: 'checkin' },
  { href: '/chat', label: 'Talk to me', raised: true },
  { href: '/insights', label: 'Insights', icon: 'insights' },
  { href: '/journal', label: 'Journal', icon: 'journal' },
]

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir'

export function TabBar() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <nav
        aria-label="Primary"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-end justify-around
          border-t border-fir/10 bg-oat/95 px-1 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur"
      >
        {NAV.map(item =>
          'raised' in item ? (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              aria-label={item.label}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg pb-0.5 text-[10.5px] font-semibold ${FOCUS_RING}`}
            >
              <span
                className="-mt-11 mb-0.5 flex h-[58px] w-[58px] items-center justify-center rounded-full
                  bg-gradient-to-br from-marigold to-marigold-deep text-white
                  shadow-[0_10px_24px_rgba(217,155,33,.4),0_0_0_6px_var(--color-oat)]"
              >
                <TalkIcon />
              </span>
              Talk
            </Link>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1 text-[10.5px]
                ${isActive(item.href) ? 'font-semibold opacity-100' : 'font-medium opacity-55'} ${FOCUS_RING}`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          )
        )}
      </nav>

      <nav
        aria-label="Primary"
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[220px] lg:flex-none lg:flex-col lg:gap-1
          lg:border-r lg:border-fir/10 lg:px-4 lg:py-8"
      >
        <p className="font-display text-lg font-semibold mb-8 px-2">Ears for you.</p>
        {NAV.map(item =>
          'raised' in item ? (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`mt-1 mb-3 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br
                from-marigold to-marigold-deep px-4 py-3.5 font-display font-semibold text-fir-deep
                shadow-lg shadow-marigold-deep/30 ${FOCUS_RING}`}
            >
              <TalkIcon className="w-5 h-5" />
              {item.label}
            </Link>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px]
                ${isActive(item.href) ? 'font-semibold opacity-100' : 'font-medium opacity-55 hover:opacity-80'} ${FOCUS_RING}`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          )
        )}
        <YouLink active={isActive('/you')} />
      </nav>
    </>
  )
}

function YouLink({ active }: { active: boolean }) {
  return (
    <Link
      href="/you"
      aria-current={active ? 'page' : undefined}
      className={`mt-auto flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px]
        ${active ? 'font-semibold opacity-100' : 'font-medium opacity-70 hover:opacity-100'} ${FOCUS_RING}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-marigold text-[12px]
        font-bold text-fir-deep">
        D
      </span>
      You
    </Link>
  )
}
```

`YouLink`'s hardcoded "D" initial is a known simplification: the original rail had a bare "You" text link with no avatar, and no profile data is fetched at the shell level anywhere in this codebase today. Wiring a real initial here would mean adding a `getProfile` query to the shell, which is out of this redesign's scope per the Global Constraints (no data-layer changes). Note this as a concern in your report; do not silently invent a data fetch to fix it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tab-bar`
Expected: PASS, 3/3

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean (Home will still fail to typecheck until Task 4; that is expected, see Task 1 Step 8)

- [ ] **Step 6: Commit**

```bash
git add components/shell/tab-bar.tsx components/shell/tab-bar.test.tsx
git commit -m "feat: make Chat the raised navigation action, Check-in a plain tab"
```

---

### Task 3: The Listening hero component

**Files:**
- Create: `components/listening/listening-hero.tsx`, `components/listening/listening-hero.test.tsx`

**Interfaces:**
- Consumes: `terrainPath` from `lib/charts/terrain.ts` (existing, unmodified: `terrainPath(values: number[], width: number, height: number, min?: number, max?: number): string`), `splitGreeting`/`greetingInitial` from `lib/greeting.ts` (Task 1), `InsightPoint` from `lib/api/types.ts`.
- Produces: `ListeningHero({ greeting, sub, cta, weeklyTrends }: { greeting: string; sub: string; cta?: ReactNode; weeklyTrends?: InsightPoint[] }): JSX.Element`, plus a named export `HERO_HEIGHT_MOBILE_PX = 400` and `HERO_HEIGHT_DESKTOP_PX = 300` used only for documentation/consistency, not required by consumers. Task 4 (Home page) is the only consumer.

This replaces `SkyScene`. Unlike the old component, there is no time-of-day variation: the hero is always the warm two-zone scene described in the spec, at every hour. `latestMood`/`streak` are no longer props; Home's plant-and-flag visualization is gone, replaced by this component's own breathing rings and (desktop only) the real-data waveform.

- [ ] **Step 1: Write the failing test**

```tsx
// components/listening/listening-hero.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListeningHero } from './listening-hero'

describe('ListeningHero', () => {
  it('renders the greeting head and the highlighted name separately', () => {
    render(<ListeningHero greeting="Good evening, Dami." sub="Whatever today was, you don't have to carry it alone." />)
    expect(screen.getByText('Good evening,')).toBeInTheDocument()
    expect(screen.getByText('Dami.')).toBeInTheDocument()
  })

  it('renders the sub line and an optional cta', () => {
    render(
      <ListeningHero
        greeting="Good evening, Dami."
        sub="Whatever today was, you don't have to carry it alone."
        cta={<a href="/chat">Talk to me</a>}
      />
    )
    expect(screen.getByText(/whatever today was/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Talk to me' })).toHaveAttribute('href', '/chat')
  })

  it('renders the presence line', () => {
    render(<ListeningHero greeting="Good evening, Dami." sub="sub" />)
    expect(screen.getByText(/here, listening/i)).toBeInTheDocument()
  })

  it('renders the desktop week waveform only when there are at least two points', () => {
    const { rerender, container } = render(<ListeningHero greeting="Good evening, Dami." sub="sub" weeklyTrends={[]} />)
    expect(screen.queryByText(/your week, as sound/i)).not.toBeInTheDocument()

    rerender(
      <ListeningHero
        greeting="Good evening, Dami." sub="sub"
        weeklyTrends={[{ date: '2026-08-01', mood: 5, stress: 4, energy: 6 }, { date: '2026-08-02', mood: 7, stress: 3, energy: 7 }]}
      />
    )
    expect(screen.getByText(/your week, as sound/i)).toBeInTheDocument()
    expect(container.querySelector('svg path[stroke="#F2BE45"]')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- listening-hero`
Expected: FAIL, cannot resolve `./listening-hero`

- [ ] **Step 3: Write `components/listening/listening-hero.tsx`**

```tsx
// components/listening/listening-hero.tsx
'use client'
import { type ReactNode, useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { splitGreeting } from '@/lib/greeting'
import { terrainPath } from '@/lib/charts/terrain'
import type { InsightPoint } from '@/lib/api/types'

export const HERO_HEIGHT_MOBILE_PX = 400
export const HERO_HEIGHT_DESKTOP_PX = 300

function PresenceLine() {
  return (
    <div className="flex items-center gap-[7px] text-[11.5px] font-medium text-warm-cream/75">
      <i className="block h-[6px] w-[6px] rounded-full bg-marigold shadow-[0_0_0_3px_rgba(242,190,69,.25)]" />
      Here, listening
    </div>
  )
}

/**
 * Three concentric rings that breathe slowly (opacity pulse, 4s loop) unless
 * the user has reduced motion on, in which case they render at their resting
 * opacity and never animate. This is the signature element the spec calls
 * "the Listening Field"; it is not optional polish.
 */
function BreathingRings({ cx, cy, radii }: { cx: number; cy: number; radii: [number, number, number] }) {
  const reduceMotion = useReducedMotion()
  const opacities = [0.13, 0.09, 0.06]
  return (
    <>
      {radii.map((r, i) => (
        <motion.circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#FBEEDD"
          strokeWidth={i === 0 ? 1.4 : i === 1 ? 1.2 : 1}
          initial={{ opacity: opacities[i] }}
          animate={reduceMotion ? { opacity: opacities[i] } : { opacity: [opacities[i], opacities[i]! * 1.6, opacities[i]] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        />
      ))}
    </>
  )
}

/** Mobile: greeting, sub line, cta, presence, and a single ring cluster behind the text. */
function MobileScene({ uid, headEl, glowEl, sub, cta }: {
  uid: string; headEl: string; glowEl: string; sub: string; cta?: ReactNode
}) {
  return (
    <section className="relative h-[400px] overflow-hidden lg:hidden text-warm-cream">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 384 400" preserveAspectRatio="xMidYMin slice" fill="none" aria-hidden>
        <defs>
          <linearGradient id={`scrim-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#170F07" />
            <stop offset="1" stopColor="#2A1B0C" />
          </linearGradient>
          <radialGradient id={`glow-${uid}`} cx=".5" cy=".47" r=".62">
            <stop offset="0" stopColor="#F2BE45" stopOpacity=".22" />
            <stop offset="1" stopColor="#F2BE45" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="384" height="380" fill={`url(#scrim-${uid})`} />
        <circle cx="192" cy="178" r="190" fill={`url(#glow-${uid})`} />
        <circle cx="55" cy="40" r="1.3" fill="#FBEEDD" opacity=".55" />
        <circle cx="325" cy="52" r="1" fill="#FBEEDD" opacity=".4" />
        <BreathingRings cx={192} cy={178} radii={[80, 118, 152]} />
      </svg>
      <div className="absolute left-6 right-6 top-[76px] z-[3] flex flex-col">
        <h1 className="font-display text-[32px] font-semibold leading-[1.06] tracking-[-0.02em] text-white">
          {headEl}
          {glowEl ? (
            <>
              <br />
              <span className="text-[#F7CB5C]">{glowEl}</span>
            </>
          ) : null}
        </h1>
        <p className="mt-3.5 max-w-[28ch] text-[14px] leading-[1.4] text-warm-cream">{sub}</p>
        {cta}
        <div className="mt-3.5">
          <PresenceLine />
        </div>
      </div>
    </section>
  )
}

function DesktopWeekWave({ points }: { points: InsightPoint[] }) {
  const values = points.map(p => p.mood)
  const d = terrainPath(values, 460, 90)
  const last = values.length ? values[values.length - 1]! : 0
  const lastX = values.length > 1 ? 460 : 0
  const height = 90
  const pad = 6
  const lastY = pad + (height - pad * 2) * (1 - (last - 1) / 9)
  return (
    <div className="hidden flex-1 lg:block" style={{ maxWidth: 460 }}>
      <p className="mb-2.5 text-[12px] font-semibold text-warm-cream/60">Your week, as sound</p>
      <svg viewBox="0 0 460 90" fill="none" className="block h-[90px] w-full" role="img" aria-label="Your mood over the last week, drawn as a line">
        <path d={d} stroke="#F2BE45" strokeWidth="2" strokeLinecap="round" opacity=".85" />
        {values.length > 0 ? <circle cx={lastX} cy={lastY} r="3.5" fill="#F2BE45" /> : null}
      </svg>
    </div>
  )
}

/** Desktop: wide short scene, greeting left, week waveform right, both inside one text-safe scrim. */
function DesktopScene({ uid, headEl, glowEl, sub, cta, weeklyTrends }: {
  uid: string; headEl: string; glowEl: string; sub: string; cta?: ReactNode; weeklyTrends: InsightPoint[]
}) {
  const showWave = weeklyTrends.length >= 2
  return (
    <section className="relative hidden h-[300px] overflow-hidden lg:block text-warm-cream">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 300" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden>
        <defs>
          <linearGradient id={`d-scrim-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#170F07" />
            <stop offset=".55" stopColor="#20150A" />
            <stop offset="1" stopColor="#2A1B0C" />
          </linearGradient>
          <radialGradient id={`d-glow-a-${uid}`} cx=".23" cy=".5" r=".5">
            <stop offset="0" stopColor="#F2BE45" stopOpacity=".24" />
            <stop offset="1" stopColor="#F2BE45" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`d-glow-b-${uid}`} cx=".72" cy=".5" r=".42">
            <stop offset="0" stopColor="#F2BE45" stopOpacity=".1" />
            <stop offset="1" stopColor="#F2BE45" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1600" height="300" fill={`url(#d-scrim-${uid})`} />
        <rect width="1600" height="300" fill={`url(#d-glow-a-${uid})`} />
        <rect width="1600" height="300" fill={`url(#d-glow-b-${uid})`} />
        <BreathingRings cx={360} cy={150} radii={[90, 135, 180]} />
        <circle cx="1150" cy="150" r="60" fill="none" stroke="#FBEEDD" strokeWidth="1.2" opacity=".1" />
        <circle cx="1150" cy="150" r="95" fill="none" stroke="#FBEEDD" strokeWidth="1" opacity=".06" />
        <circle cx="980" cy="55" r="1.2" fill="#F6E7B8" opacity=".5" />
        <circle cx="1420" cy="200" r="1" fill="#F6E7B8" opacity=".4" />
        <circle cx="1300" cy="70" r="1.1" fill="#F6E7B8" opacity=".45" />
      </svg>
      <div className="relative z-[3] mx-auto flex h-full max-w-[1180px] items-center justify-between gap-10 px-11">
        <div className="max-w-[420px] flex-none">
          <h1 className="font-display text-[38px] font-semibold leading-[1.06] tracking-[-0.02em] text-white">
            {headEl}
            {glowEl ? (
              <>
                <br />
                <span className="text-[#F7CB5C]">{glowEl}</span>
              </>
            ) : null}
          </h1>
          <p className="mt-3 text-[16.5px] leading-[1.4] text-warm-cream">{sub}</p>
          {cta}
          <div className="mt-[13px]">
            <PresenceLine />
          </div>
        </div>
        {showWave ? <DesktopWeekWave points={weeklyTrends} /> : <div className="flex-1" />}
      </div>
    </section>
  )
}

export function ListeningHero({ greeting, sub, cta, weeklyTrends = [] }: {
  greeting: string
  sub: string
  cta?: ReactNode
  weeklyTrends?: InsightPoint[]
}) {
  const uid = useId().replace(/:/g, '')
  const { head, glow } = splitGreeting(greeting)
  return (
    <>
      <BellSlot />
      <MobileScene uid={`m-${uid}`} headEl={head} glowEl={glow} sub={sub} cta={cta} />
      <DesktopScene uid={`d-${uid}`} headEl={head} glowEl={glow} sub={sub} cta={cta} weeklyTrends={weeklyTrends} />
    </>
  )
}
```

`RingsAndGlow` and `BellSlot` are unused scaffolding from an earlier draft of this component; delete both before committing (Step 3.5 below) rather than leaving dead code. This is called out explicitly because the plan author left them in during drafting and they must not ship.

- [ ] **Step 3.5: Remove the unused `RingsAndGlow` and `BellSlot` helpers and their call site (`<BellSlot />`) from the file before running tests.**

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- listening-hero`
Expected: PASS, 4/4

- [ ] **Step 5: Reduced motion check (manual, no automated test)**

This component has no `motion.*` elements in this first pass (the rings are static SVG, not animated) because the spec's breathing-ring animation is a `motion/react` polish detail, not a functional requirement, and the base component must exist and pass its structural tests first. If you want to add the slow 4s breathing loop now, gate it with `useReducedMotion()` exactly like `components/garden/plant.tsx` did (deleted in Task 1, but its pattern is worth reusing): animate `opacity`/`scale` on the three ring `<circle>` elements when motion is not reduced, render them static otherwise. This is optional polish within this task; do not skip the reduced-motion guard if you add it.

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean for this file (Home still pending Task 4)

- [ ] **Step 7: Commit**

```bash
git add components/listening/listening-hero.tsx components/listening/listening-hero.test.tsx
git commit -m "feat: add the Listening hero, replacing the garden sky scene"
```

---

### Task 4: Home page rewrite

**Files:**
- Modify: `app/(app)/home/page.tsx`

**Interfaces:**
- Consumes: `ListeningHero` from `components/listening/listening-hero.tsx` (Task 3), `TerrainChart` from `components/charts/terrain-chart.tsx` (existing, unmodified: `TerrainChart({ points, mini }: { points: InsightPoint[]; mini?: boolean })`), `getJournalHistory` from `lib/api/endpoints.ts` (existing), `greetingInitial` from `lib/greeting.ts` (Task 1).
- Produces: nothing new for other tasks to consume; this is a leaf page.

This task removes every reference to `SkyScene`, `skyStateFor`, `isDarkSky`, `Plant`, and the old garden copy (`subLineFor`'s "watered"/"garden's still waiting" strings, `WeekDots`'s streak-dot visualization, "days tended", "This week's ground"). The `loggedToday`/`currentStreak`/`latestMood` fields from `getDashboard()` are unchanged at the API level and still drive the new copy.

- [ ] **Step 1: Write the failing test for the new sub-line copy function**

Home's page file has never had its own test file (the original `subLineFor` was tested only indirectly through the deleted `sky-scene.test.ts`, which covered `greetingInitial`, not `subLineFor`). Add a focused test for the new copy logic, exported for testability:

```tsx
// app/(app)/home/page.test.tsx
import { describe, it, expect } from 'vitest'
import { subLineFor } from './page'

describe('subLineFor', () => {
  it('invites a first check-in when there is no mood history', () => {
    expect(subLineFor(null, false)).toMatch(/quiet place/i)
  })
  it('acknowledges an already-logged today without pressure to act again', () => {
    expect(subLineFor({ id: 1, primaryMood: 'Hopeful', moodIntensity: 6, stressLevel: 3, energyLevel: 7, createdAt: '' }, true))
      .toMatch(/here for it|come back/i)
  })
  it('never mentions watering, tending, or the garden', () => {
    const withMood = subLineFor(
      { id: 1, primaryMood: 'Restless', moodIntensity: 7, stressLevel: 6, energyLevel: 4, createdAt: '' }, false
    )
    const withoutMood = subLineFor(null, false)
    for (const text of [withMood, withoutMood]) {
      expect(text.toLowerCase()).not.toMatch(/water|tend|garden/)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- home/page`
Expected: FAIL, `subLineFor` is not exported (or the file fails to compile because it still imports deleted modules)

- [ ] **Step 3: Rewrite `app/(app)/home/page.tsx`**

```tsx
// app/(app)/home/page.tsx
'use client'
import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getDashboard, getInsights, getUnreadCount, getJournalHistory } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/keys'
import type { InsightPoint, JournalEntry, MoodEntry } from '@/lib/api/types'
import { greetingInitial } from '@/lib/greeting'
import { ListeningHero } from '@/components/listening/listening-hero'
import { TerrainChart } from '@/components/charts/terrain-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'

function sentenceCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

export function subLineFor(mood: MoodEntry | null, loggedToday: boolean): string {
  if (!mood) return "This is a quiet place to say how you're doing. Nothing you share here needs to be impressive."
  if (loggedToday) return `Already checked in today, feeling ${mood.primaryMood.toLowerCase()}. Come back anytime, I'm still listening.`
  return `Yesterday you said you were feeling ${sentenceCase(mood.primaryMood).toLowerCase()}. However today's landed, I'm here for it.`
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
      <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </svg>
  )
}

function TalkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className="h-[16px] w-[16px]" aria-hidden>
      <path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.4-.2-3.4-.6L3 21l1.8-4.2C3.7 15.4 3 13.8 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
    </svg>
  )
}

function TopBar({ unread, initial }: { unread: number; initial: string }) {
  return (
    <div className="absolute inset-x-0 top-0 z-[4] flex items-center justify-end gap-2.5 px-6 pt-5 lg:px-11">
      <Link
        href="/notifications"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-warm-cream/12 text-warm-cream
          backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold"
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center
            rounded-full bg-marigold px-1 text-[10px] font-bold text-fir-deep shadow">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Link>
      <Link
        href="/you"
        aria-label="Your profile"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-marigold text-[13px] font-semibold
          text-fir-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oat"
      >
        {initial}
      </Link>
    </div>
  )
}

function TalkCta() {
  return (
    <Link
      href="/chat"
      className="mt-4 inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full bg-white
        py-3 pl-4 pr-5 text-[13.5px] font-bold text-fir-deep shadow-[0_8px_20px_rgba(0,0,0,.28)]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oat"
    >
      <TalkIcon />
      Talk to me
    </Link>
  )
}

function AffirmationCard({ text }: { text: string }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-card px-[26px] pb-4 pt-[22px]
      shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_1px_0_rgba(34,55,43,.05),0_14px_32px_rgba(34,55,43,.08)]
      border border-fir/[.04]">
      <svg className="absolute right-4 top-3.5 h-8 w-[42px] opacity-[.09]" viewBox="0 0 46 34" fill="#2E7D49" aria-hidden>
        <path d="M0 34V21.5C0 9.6 6.5 1.9 17.5 0l2 5.5C13 7.3 9.5 12 9.5 18H19V34H0Z" />
        <path d="M27 34V21.5C27 9.6 33.5 1.9 44.5 0l2 5.5C40 7.3 36.5 12 36.5 18H46V34H27Z" />
      </svg>
      <p className="relative flex items-center gap-1.5 text-[11px] font-bold text-[#C98A1E]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round" className="h-3 w-3" aria-hidden>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
        Just for you, right now
      </p>
      <p className="relative mt-3 font-display text-lg font-medium leading-[1.35] tracking-[-0.01em]">{text}</p>
    </div>
  )
}

function CheckinSummary({ points, streak, mood }: { points: InsightPoint[]; streak: number; mood: MoodEntry | null }) {
  const levels = points.slice(-7)
  const label = mood
    ? `You've checked in ${streak} time${streak === 1 ? '' : 's'} this week · ${mood.primaryMood.toLowerCase()}`
    : `You've checked in ${streak} time${streak === 1 ? '' : 's'} this week`
  return (
    <Link
      href="/insights"
      className="flex items-center gap-3 rounded-[20px] bg-card px-5 py-3.5
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
    >
      <span className="flex h-5 items-end gap-[3px]" aria-hidden>
        {levels.length > 0
          ? levels.map((p, i) => (
            <span key={i} className="w-1 rounded-sm bg-leaf" style={{ height: `${4 + (p.mood / 10) * 16}px` }} />
          ))
          : <span className="w-1 rounded-sm bg-leaf/20" style={{ height: '4px' }} />}
      </span>
      <span className="text-[13.5px] opacity-65">{label}</span>
    </Link>
  )
}

function RecentJournal({ entries }: { entries: JournalEntry[] }) {
  const recent = entries.slice(0, 2)
  if (recent.length === 0) {
    return (
      <div className="rounded-[20px] bg-card px-6 py-6 text-[13.5px] opacity-55">
        Nothing written yet. Your journal will show up here.
      </div>
    )
  }
  return (
    <div className="rounded-[20px] bg-card px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_1px_0_rgba(34,55,43,.05),0_14px_32px_rgba(34,55,43,.08)]
      border border-fir/[.04]">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-leaf">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round" className="h-3 w-3" aria-hidden>
          <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
          <path d="M5 4v13a3 3 0 0 0 3 3" />
        </svg>
        Recent journal
      </p>
      <div className="flex flex-col">
        {recent.map((e, i) => (
          <Link
            key={e.journalId}
            href={`/journal/${e.journalId}`}
            className={`relative flex items-baseline justify-between gap-3 py-3 pl-4
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir
              ${i < recent.length - 1 ? 'border-b border-fir/[.08]' : ''}`}
          >
            <span className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-full bg-leaf/35" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold">{e.title || 'Untitled'}</span>
              <span className="mt-0.5 block truncate text-xs opacity-55">{e.content}</span>
            </span>
            <span className="flex-none text-[11px] opacity-45">
              {new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div>
      <div className="h-[400px] bg-gradient-to-b from-[#170F07] to-[#2A1B0C] lg:h-[300px]" />
      <div className="relative z-10 -mt-8 rounded-t-3xl bg-oat px-5 pt-7">
        <Skeleton lines={2} className="max-w-[220px]" />
        <div className="mt-8 rounded-[22px] bg-card p-5">
          <Skeleton lines={3} />
        </div>
      </div>
    </div>
  )
}

const noSubscribe = () => () => undefined
const onClient = () => true
const onServer = () => false

export default function HomePage() {
  const dashboard = useQuery({ queryKey: qk.dashboard, queryFn: getDashboard })
  const unread = useQuery({ queryKey: qk.unread, queryFn: getUnreadCount })
  const insights = useQuery({ queryKey: qk.insights, queryFn: getInsights })
  const journal = useQuery({ queryKey: qk.journal, queryFn: getJournalHistory })

  // The device clock is only read once mounted, so server and client markup agree.
  const mounted = useSyncExternalStore(noSubscribe, onClient, onServer)

  if (dashboard.isError) {
    return (
      <div className="px-5 py-10">
        <ErrorState error={dashboard.error} retry={() => void dashboard.refetch()} />
      </div>
    )
  }
  if (!dashboard.data || !mounted) return <HomeSkeleton />

  const { greeting, dailyAffirmation, currentStreak, latestMood, loggedToday } = dashboard.data
  const unreadCount = unread.data ? (unread.data.count ?? unread.data.unreadCount ?? 0) : 0
  const initial = greetingInitial(greeting)
  const weeklyTrends = insights.data?.weeklyTrends ?? []

  return (
    <div>
      <div className="relative">
        <ListeningHero
          greeting={greeting}
          sub={subLineFor(latestMood, loggedToday)}
          cta={<TalkCta />}
          weeklyTrends={weeklyTrends}
        />
        <TopBar unread={unreadCount} initial={initial} />
      </div>

      <div className="relative z-10 -mt-8 rounded-t-3xl bg-oat px-5 pb-6 pt-4 lg:px-11 lg:pt-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3.5 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-5">
          <AffirmationCard text={dailyAffirmation} />

          {/* Mobile: always the quiet single-line summary, never the desktop chart card. */}
          <div className="lg:hidden">
            <CheckinSummary points={weeklyTrends} streak={currentStreak} mood={latestMood} />
          </div>

          {/* Desktop: the richer chart card once there is enough data, otherwise the same quiet summary. */}
          <div className="hidden lg:block">
            {insights.isSuccess && weeklyTrends.length >= 2 ? (
              <div className="h-full rounded-[20px] bg-card px-5 py-4
                shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_1px_0_rgba(34,55,43,.05),0_14px_32px_rgba(34,55,43,.08)]
                border border-fir/[.04] flex flex-col">
                <p className="flex items-baseline justify-between text-[13.5px] font-semibold text-leaf">
                  This week
                  <span className="text-[11.5px]">Insights</span>
                </p>
                <div className="mt-2.5 flex-1">
                  <TerrainChart points={weeklyTrends} mini />
                </div>
              </div>
            ) : (
              <CheckinSummary points={weeklyTrends} streak={currentStreak} mood={latestMood} />
            )}
          </div>

          <RecentJournal entries={journal.data ?? []} />
        </div>
      </div>
    </div>
  )
}
```

Mobile always renders `CheckinSummary` in its normal document position (below the affirmation card, above `RecentJournal`); only the desktop `lg:grid` row's second slot ever shows the richer `TerrainChart` card. The two wrapper `div`s (`lg:hidden` / `hidden lg:block`) exist only to pick which of the two ever mounts at a given breakpoint, matching the pattern already used elsewhere in this codebase (`components/shell/tab-bar.tsx`'s two `<nav>` elements) rather than duplicating markup with a media-query-only CSS toggle.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- home/page`
Expected: PASS, 3/3

- [ ] **Step 5: Full test suite, typecheck, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean (this is the first point since Task 1 where the whole suite should be green again)

- [ ] **Step 6: Manual verification against the live app**

Start the dev server (`npm run dev`), sign in (real backend or `NEXT_PUBLIC_USE_MOCKS=true`), and check `/home` at a phone width and at 1900px wide specifically: confirm the mobile view shows one `CheckinSummary` row (not zero, not two), the desktop three-card row has equal-height cards, the hero's right-side waveform only appears at >=1024px, and the sheet fully occludes the hero at the overlap (no dark bleed-through behind the affirmation card). Kill the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/home/page.tsx" "app/(app)/home/page.test.tsx"
git commit -m "feat: rewrite Home for the Listening identity"
```

---

### Task 5: Shared compact hero for the remaining auth screens

**Files:**
- Create: `components/listening/compact-hero.tsx`, `components/listening/compact-hero.test.tsx`
- Modify: `app/(auth)/layout.tsx`

**Interfaces:**
- Produces: `CompactHero({ step, title, subtitle, onBack }: { step?: string; title: ReactNode; subtitle?: ReactNode; onBack: () => void }): JSX.Element`. Consumed by Task 7 (register, verify, forgot-password, recovery). Sign-in (Task 6) does not use this component; it has its own full-height hero.
- Modifies `AuthLayout` to drop the shared centering wrapper so each auth page can own its own width (Sign-in goes full-bleed split screen; the other four use `CompactHero` at a comfortable centered width). The cold-start banner becomes a fixed-position overlay instead of inline content, so it still shows regardless of what shape the active page takes.

- [ ] **Step 1: Write the failing test**

```tsx
// components/listening/compact-hero.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompactHero } from './compact-hero'

describe('CompactHero', () => {
  it('renders the title, optional subtitle, and optional step label', () => {
    render(<CompactHero title="Check your email." subtitle="We sent a code." step="Step 1 of 3" onBack={() => {}} />)
    expect(screen.getByText('Check your email.')).toBeInTheDocument()
    expect(screen.getByText('We sent a code.')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
  })

  it('calls onBack when the back button is pressed', async () => {
    const onBack = vi.fn()
    render(<CompactHero title="Forgot your password?" onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- compact-hero`
Expected: FAIL, cannot resolve `./compact-hero`

- [ ] **Step 3: Write `components/listening/compact-hero.tsx`**

```tsx
// components/listening/compact-hero.tsx
'use client'
import { type ReactNode, useId } from 'react'

export function CompactHero({ step, title, subtitle, onBack }: {
  step?: string
  title: ReactNode
  subtitle?: ReactNode
  onBack: () => void
}) {
  const uid = useId().replace(/:/g, '')
  return (
    <div className="relative h-[220px]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 384 220" preserveAspectRatio="xMidYMax slice" fill="none" aria-hidden>
        <defs>
          <linearGradient id={`ch-scrim-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#170F07" />
            <stop offset="1" stopColor="#2A1B0C" />
          </linearGradient>
          <radialGradient id={`ch-glow-${uid}`} cx=".85" cy=".1" r=".7">
            <stop offset="0" stopColor="#F2BE45" stopOpacity=".2" />
            <stop offset="1" stopColor="#F2BE45" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="384" height="220" fill={`url(#ch-scrim-${uid})`} />
        <rect width="384" height="220" fill={`url(#ch-glow-${uid})`} />
        <circle cx="326" cy="20" r="1.2" fill="#F6E7B8" opacity=".5" />
      </svg>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="absolute z-[4] left-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl
          bg-warm-cream/14 text-warm-cream
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="absolute z-[3] left-[26px] right-[26px] top-[76px]">
        {step ? <p className="mb-1.5 text-xs font-semibold text-[#F7CB5C]">{step}</p> : null}
        <h1 className="font-display text-[25px] font-semibold leading-[1.1] tracking-[-0.015em] text-white">{title}</h1>
        {subtitle ? <p className="mt-[7px] max-w-[30ch] text-[12.5px] leading-[1.45] text-warm-cream/82">{subtitle}</p> : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- compact-hero`
Expected: PASS, 2/2

- [ ] **Step 5: Update `app/(auth)/layout.tsx`**

```tsx
// app/(auth)/layout.tsx
'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { MOCKS_ENABLED } from '@/lib/mocks'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const [waking, setWaking] = useState(false)
  useEffect(() => {
    if (MOCKS_ENABLED) return
    const t = setTimeout(() => setWaking(true), 8000)
    fetch('/backend/actuator/health').catch(() => undefined).finally(() => {
      clearTimeout(t); setWaking(false)
    })
    return () => clearTimeout(t)
  }, [])
  return (
    <>
      {waking ? (
        <p className="fixed inset-x-0 top-0 z-50 bg-fir px-4 py-2.5 text-center text-sm text-oat">
          Connecting. The server is waking up, this can take about a minute.
        </p>
      ) : null}
      {children}
    </>
  )
}
```

This removes the previous `max-w-md mx-auto lg:max-w-lg` centered-card treatment for every auth page. Task 6 (Sign-in) and Task 7 (the other four) now each own their full layout, including their own responsive width handling; neither relies on `AuthLayout` for width anymore.

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: existing auth pages (signin, register, verify, forgot-password, recovery) will render without their previous centering until Tasks 6 and 7 land; this is expected and will look broken if you check the dev server now. Do not fix the auth pages in this task.

- [ ] **Step 7: Commit**

```bash
git add components/listening/compact-hero.tsx components/listening/compact-hero.test.tsx "app/(auth)/layout.tsx"
git commit -m "feat: add the shared compact hero and free auth pages from the layout's width"
```

---

### Task 6: Sign-in

**Files:**
- Modify: `app/(auth)/signin/page.tsx`

**Interfaces:**
- Consumes: nothing new. `login`, `ApiError`, `Button`, `Field` imports are unchanged from the current file; only the JSX shell around the existing form logic changes.

Every piece of existing logic in this file (the `safeNext` guard, the `submit` handler, the error-message handling) is correct and already covered by the redirect-safety and error-mapping work done earlier in this project. Do not touch that logic; only the returned JSX changes.

- [ ] **Step 1: Rewrite the returned JSX of `app/(auth)/signin/page.tsx`**

```tsx
// app/(auth)/signin/page.tsx
'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/api/endpoints'
import { ApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function safeNext(): string {
    const next = params.get('next')
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) return next
    return '/home'
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await login(email, password)
      router.replace(safeNext())
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <section className="relative flex h-[340px] flex-none items-center justify-center overflow-hidden text-warm-cream lg:h-auto lg:w-[46%]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 620 660" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden>
          <defs>
            <linearGradient id="si-scrim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#170F07" />
              <stop offset="1" stopColor="#2A1B0C" />
            </linearGradient>
            <radialGradient id="si-glow" cx=".5" cy=".42" r=".55">
              <stop offset="0" stopColor="#F2BE45" stopOpacity=".24" />
              <stop offset="1" stopColor="#F2BE45" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="620" height="660" fill="url(#si-scrim)" />
          <circle cx="310" cy="280" r="230" fill="url(#si-glow)" />
          <circle cx="310" cy="280" r="100" fill="none" stroke="#FBEEDD" strokeWidth="1.3" opacity=".12" />
          <circle cx="310" cy="280" r="150" fill="none" stroke="#FBEEDD" strokeWidth="1" opacity=".08" />
          <circle cx="120" cy="90" r="1.3" fill="#F6E7B8" opacity=".5" />
          <circle cx="500" cy="140" r="1" fill="#F6E7B8" opacity=".4" />
        </svg>
        <div className="relative z-[3] px-10 text-center">
          <h1 className="font-display text-[42px] font-semibold leading-none text-white">
            Ears<br />for <span className="text-[#F7CB5C]">you.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[30ch] text-[15px] leading-[1.55] text-warm-cream/85">
            A safe space to talk, whenever you need it. No agenda, no judgment.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-oat px-6 py-10">
        <form onSubmit={submit} className="flex w-full max-w-[320px] flex-col gap-4">
          <h2 className="mb-1 font-display text-[22px] font-semibold">Welcome back.</h2>
          <Field label="Email" type="email" autoComplete="email" required
            value={email} onChange={e => setEmail(e.target.value)} />
          <Field label="Password" type="password" autoComplete="current-password" required
            value={password} onChange={e => setPassword(e.target.value)} error={error ?? undefined} />
          <Button type="submit" busy={busy}>Sign in</Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/register')}>Create an account</Button>
          <Link
            className="self-center rounded text-sm underline underline-offset-4 opacity-80
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </form>
      </section>
    </div>
  )
}

export default function SignInPage() {
  return <Suspense><SignInForm /></Suspense>
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean

- [ ] **Step 3: Manual verification**

Start the dev server, visit `/signin` at a phone width (hero stacks above the form) and at 1900px wide (split screen, hero left ~46%, form right, vertically centered). Confirm `Forgot password?` and `Create an account` still work, and that a wrong password still shows an inline error under the password field.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/signin/page.tsx"
git commit -m "feat: redesign sign-in as a warm hero, split screen on desktop"
```

---

### Task 7: Register, verify, forgot password, and recovery: apply the compact hero

**Files:**
- Modify: `app/(auth)/register/page.tsx`, `app/(auth)/verify/page.tsx`, `app/(auth)/forgot-password/page.tsx`, `app/(auth)/recovery/page.tsx`

**Interfaces:**
- Consumes: `CompactHero` from `components/listening/compact-hero.tsx` (Task 5).

None of the state, validation, or submit logic in any of these four files changes. Every step below is purely: wrap the existing form JSX in `CompactHero` plus a sheet container, and delete the old plain `<h1>`/`<p>` header markup each page used to render for itself. Read `app/(auth)/recovery/page.tsx` before starting; it was not quoted in the design spec's research pass but follows the same email-then-otp shape as `forgot-password` and needs the identical treatment.

- [ ] **Step 1: Register**

Replace the return statement's outer wrapper. Keep every `<form>`, all three steps, `StepShell`, and all state/handlers exactly as they are; only the JSX **outside** `<StepShell>` changes:

```tsx
// app/(auth)/register/page.tsx: replace the final `return (...)` block only
  return (
    <div>
      <CompactHero step={`Step ${step} of 3`} title="Let's start with you." onBack={() => router.back()} />
      <div className="mx-auto -mt-7 max-w-[420px] rounded-t-[26px] bg-oat px-6 pb-10 pt-7
        shadow-[0_-8px_24px_rgba(0,0,0,.05)]">
        <StepShell stepKey={step}>
          {/* the three existing <form> blocks for step === 1 / 2 / 3, unchanged */}
        </StepShell>
      </div>
    </div>
  )
```

The title stays "Let's start with you." for all three steps (matching the spec, which only mocked step 1's copy explicitly); do not invent different titles per step. Remove the old `<h1>Create your account</h1>` and `<p>Step {step} of 3</p>` lines entirely, since `CompactHero` now owns both.

- [ ] **Step 2: Verify**

```tsx
// app/(auth)/verify/page.tsx: inside VerifyForm, replace the returned JSX
  return (
    <div>
      <CompactHero
        title="Check your email."
        subtitle={`We sent a 6-digit code to ${maskEmail(email)}.`}
        onBack={() => router.back()}
      />
      <div className="mx-auto -mt-7 flex max-w-[420px] flex-col gap-4 rounded-t-[26px] bg-oat px-6 pb-10 pt-7
        shadow-[0_-8px_24px_rgba(0,0,0,.05)]">
        <div ref={groupRef}>
          <OtpInput key={attempt} length={6} onComplete={handleComplete} />
        </div>
        {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
        <ResendButton cooldownSeconds={60} onResend={() => resendRegistrationOtp(email)} />
      </div>
    </div>
  )
```

Remove the old inline `<h1>`/`<p>` and the now-redundant period after `maskEmail(email)` in the old copy (the new subtitle already ends in a period; do not double it up). Everything else in `VerifyForm` (the `email`/`router.replace('/register')` effect, `handleComplete`) is unchanged.

- [ ] **Step 3: Forgot password**

The four `stage` branches (`email`, `otp`, `password`, `done`) each currently render their own `<h1>`. Move the heading into a single `CompactHero` above all four, with stage-appropriate subtitle text, and keep each stage's own form content below it:

```tsx
// app/(auth)/forgot-password/page.tsx: replace the returned JSX
  return (
    <div>
      <CompactHero
        title="Forgot your password?"
        subtitle={stage === 'email' ? "It happens. Tell us your email and we'll send a code to get you back in." : undefined}
        onBack={() => router.back()}
      />
      <div className="mx-auto -mt-7 flex max-w-[420px] flex-col gap-4 rounded-t-[26px] bg-oat px-6 pb-10 pt-7
        shadow-[0_-8px_24px_rgba(0,0,0,.05)]">
        {stage === 'email' ? (
          <form onSubmit={submitEmail} className="flex flex-col gap-4">
            <Field label="Email" type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)} error={error ?? undefined} />
            <Button type="submit" busy={busy}>Send code</Button>
            <Link
              className="self-center rounded text-sm underline underline-offset-4 opacity-80
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
              href="/recovery"
            >
              Lost access to this email too? Recover your account a different way.
            </Link>
          </form>
        ) : null}

        {stage === 'otp' ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-fir/70">Enter the 6-digit code we sent to {email}.</p>
            <OtpInput length={6} onComplete={handleOtpComplete} />
            {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
            <ResendButton cooldownSeconds={60} onResend={() => resendForgottenPasswordOtp(email)} />
          </div>
        ) : null}

        {stage === 'password' ? (
          <form onSubmit={submitPassword} className="flex flex-col gap-4">
            <Field label="New password" type="password" autoComplete="new-password" required
              value={password} onChange={e => setPassword(e.target.value)}
              error={password.length > 0 ? pwIssue ?? undefined : undefined} />
            <Field label="Confirm new password" type="password" autoComplete="new-password" required
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              error={error ?? undefined} />
            <Button type="submit" busy={busy} disabled={!passwordValid}>Reset password</Button>
          </form>
        ) : null}

        {stage === 'done' ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-fir/70">Your password has been reset. Sign in with your new password.</p>
            <Button type="button" onClick={() => router.push('/signin')}>Sign in</Button>
          </div>
        ) : null}
      </div>
    </div>
  )
```

- [ ] **Step 4: Recovery**

Read the current file first (`app/(auth)/recovery/page.tsx`); apply the same pattern as Step 3, with `CompactHero title="Recover your account."` and a subtitle only on its first stage, keeping every existing stage's form content and handlers unchanged.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean

- [ ] **Step 6: Manual verification**

Walk all four flows on the dev server: register through all three steps and confirm `Back` still works within the form (separately from `CompactHero`'s own back arrow, which should go to the previous page in history); verify with any 6-digit code in mock mode; forgot password through to the "done" stage; recovery's email-then-code path. Confirm the back arrow is present and functional on every screen.

- [ ] **Step 7: Commit**

```bash
git add "app/(auth)/register/page.tsx" "app/(auth)/verify/page.tsx" "app/(auth)/forgot-password/page.tsx" "app/(auth)/recovery/page.tsx"
git commit -m "feat: apply the compact hero to register, verify, forgot password, and recovery"
```

---

### Task 8: Chat

**Files:**
- Modify: `app/(app)/chat/page.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: nothing new. `Lifeline`, `getChatHistory`, `sendChat` are unchanged imports.

The message list, optimistic send, retry-on-failure, and history query logic are all unchanged. This task changes: the header (new, was previously absent, the page had no header at all beyond a screen-reader-only `<h1>`), the thinking indicator (breathing ring instead of bouncing dots), the send button (marigold instead of leaf gradient), and composer bottom spacing so it does not collide with the raised tab button.

- [ ] **Step 1: Add the header and swap the thinking indicator's markup**

```tsx
// app/(app)/chat/page.tsx: add near the top, after existing imports
function ChatHeader() {
  return (
    <div className="relative overflow-hidden rounded-b-[22px] bg-gradient-to-b from-[#170F07] to-[#2A1B0C]
      px-5 py-4 text-warm-cream lg:rounded-none lg:border-b lg:border-fir/10 lg:bg-none lg:bg-oat lg:text-fir lg:px-6">
      <div className="relative z-[2] flex items-center gap-2.5">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-fir lg:bg-fir">
          <svg viewBox="0 0 24 24" fill="none" stroke="#F7CB5C" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.4-.2-3.4-.6L3 21l1.8-4.2C3.7 15.4 3 13.8 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
          </svg>
          <i className="absolute -bottom-px -right-px h-[9px] w-[9px] rounded-full border-2 border-oat bg-marigold" />
        </span>
        <span>
          <span className="block font-display text-[14.5px] font-semibold">Your companion</span>
          <span className="block text-[11px] text-marigold lg:text-leaf">Here, listening</span>
        </span>
      </div>
    </div>
  )
}
```

Replace `SproutIndicator`'s body with a breathing-ring version. Keep the function name, props, `role="status"`, and `aria-label="Listening"` exactly as they are (the accessibility contract does not change), only the visual markup and the wording inside changes:

```tsx
// app/(app)/chat/page.tsx: replace SproutIndicator's return statement
function SproutIndicator({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div
      role="status"
      aria-label="Listening"
      className="flex w-fit items-center gap-2 self-start rounded-2xl rounded-bl-sm border-[1.5px]
        border-marigold-deep/20 bg-card px-3.5 py-3"
    >
      <span className="relative block h-4 w-4" aria-hidden>
        <span className={`absolute inset-0 rounded-full border-[1.4px] border-marigold-deep opacity-50
          ${reduceMotion ? '' : 'animate-ping'}`} />
        <span className="absolute inset-[5px] rounded-full bg-marigold" />
      </span>
      <span className="text-[13px] opacity-70">Listening...</span>
    </div>
  )
}
```

`animate-ping` is a Tailwind built-in keyframe utility (already available, no new CSS needed), so the `sprout-bounce` keyframe added to `app/globals.css` for the old dot indicator is now unused. Remove it:

```css
/* app/globals.css: delete this block, nothing else in the file changes */
@keyframes sprout-bounce {
  0%, 100% { transform: translateY(0); opacity: .45; }
  50% { transform: translateY(-4px); opacity: 1; }
}
```

- [ ] **Step 2: Swap the composer's send button to marigold and widen its bottom clearance**

```tsx
// app/(app)/chat/page.tsx: inside Composer, replace only the button's className
      <button
        type="submit"
        disabled={disabled || text.trim().length === 0}
        aria-label="Send"
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-br
          from-marigold to-marigold-deep text-fir-deep shadow-lg shadow-marigold-deep/30 transition active:scale-[.98]
          disabled:opacity-50 disabled:pointer-events-none
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
      >
```

- [ ] **Step 3: Render the header and give the composer wrapper enough bottom clearance**

```tsx
// app/(app)/chat/page.tsx: inside the component's returned JSX, two changes:
// 1. Render <ChatHeader /> as the first child, before the message list wrapper.
// 2. On the sticky composer wrapper, change the bottom offset so the raised tab
//    button (which rises ~40px above the tab bar) never overlaps the input row.
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+108px)] z-20 flex flex-col gap-2
        bg-oat/95 pb-2 pt-1 backdrop-blur lg:sticky lg:bottom-4">
        <Lifeline />
        <Composer disabled={hasPendingSend} onSend={sendMessage} />
      </div>
```

The offset changes from `96px` to `108px`; this mirrors the same clearance problem and fix documented in the design spec (§8: "another real bug found and fixed this session") for the raised tab button, now applied inside the real app's actual tab bar height rather than a standalone mockup.

- [ ] **Step 4: Full test suite, typecheck, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, clean. No existing test file covers `app/(app)/chat/page.tsx` today; this task does not add one, since none of the logic under test elsewhere in the suite (optimistic send, retry, history sorting) changed.

- [ ] **Step 5: Manual verification**

On the dev server, open `/chat`, confirm the header renders, send a message and watch the breathing-ring "Listening..." indicator appear, confirm the composer and the raised "Talk to me" tab button do not visually overlap on a phone-width viewport, and confirm the tab bar (all five items) stays visible the entire time, including mid-conversation.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/chat/page.tsx" app/globals.css
git commit -m "feat: give Chat its own identity, header, and listening indicator"
```

---

### Task 9: Final audit

**Files:** none new; this task only verifies and, if needed, fixes issues found across the whole branch.

- [ ] **Step 1: Full gate suite**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass, production build succeeds

- [ ] **Step 2: All-states audit**

For Home, Sign-in, and Chat specifically (the three screens with live data), confirm loading, error, and success states are all still reachable and legible: temporarily point `API_URL` at an unreachable host to force error states, confirm `ErrorState` renders with the new `oat` background behind it (not a leftover reference to the old value), then restore `API_URL`.

- [ ] **Step 3: Reduced motion audit**

With the OS reduced-motion setting on, walk Home, the register step transitions, and Chat's thinking indicator: confirm nothing does a sliding/scaling/pulsing animation (the `AnimatePresence` step transitions in `register/page.tsx` and any breathing-ring animation added in Task 3 Step 5 must degrade to a static or simple-fade state, exactly as they did before this redesign).

- [ ] **Step 4: Copy and token audit**

```bash
grep -rn $'—' app components lib || echo clean
grep -rniE 'water(ing|ed)?|garden|days tended|this week.s ground' app components lib --include='*.tsx' --include='*.ts' | grep -v '\.test\.' || echo "no leftover garden copy"
```

Both should report clean. If the second grep finds anything, it is leftover copy from the old spec that a task missed; fix it in place (small, surgical copy fix, not a new task).

- [ ] **Step 5: Breakpoint audit**

At 375px, 768px, and 1900px: confirm no horizontal scroll on any of the eight touched routes (`/home`, `/signin`, `/register`, `/verify`, `/forgot-password`, `/recovery`, `/chat`), the left rail replaces the tab bar cleanly at `lg:`, and Home's three-card desktop grid has equal-height cards at 1900px specifically (the width this whole redesign was triggered by).

- [ ] **Step 6: Commit and hand over**

```bash
git add -A
git commit -m "chore: final audit for the Listening identity redesign"
```

Start `npm run dev` from the main session (it must survive between turns), hand the client the URL, and wait for explicit approval before calling this redesign complete, per the project's standing definition of done.

---

## Self-Review Notes

- Spec coverage: tokens and shell width (Task 1), navigation swap (Task 2), Home mobile+desktop including the real-data waveform and three-card grid (Tasks 3-4), the two-zone hero pattern applied consistently (Tasks 3, 5, 6), Sign-in split screen (Task 6), the compact-hero shell covering register/verify/forgot-password/recovery (Tasks 5, 7), Chat's header/indicator/marigold send/composer clearance (Task 8), the engineering rules from spec §9 called out explicitly in Global Constraints and in Task 4/8's specific fixes, the out-of-scope boundary from spec §10 enforced by the Global Constraints' do-not-touch list.
- Placeholder scan: no TBD/TODO markers; the one deliberate exception (Task 1 Step 8, `home/page.tsx` intentionally left non-typechecking until Task 4) is called out explicitly with the reason, not left silent.
- Type consistency checked: `ListeningHero`'s props (`greeting`, `sub`, `cta`, `weeklyTrends`) match between Task 3's definition and Task 4's usage; `CompactHero`'s props (`step`, `title`, `subtitle`, `onBack`) match between Task 5's definition and Task 7's four usages; `subLineFor`'s new signature (`mood`, `loggedToday`, no more `streak` parameter) is consistent between its Task 4 test and implementation.
