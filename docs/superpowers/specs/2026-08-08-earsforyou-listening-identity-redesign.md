# EARS FOR YOU: Listening Identity Redesign

Date: 2026-08-08
Status: Approved, ready for implementation planning
Supersedes: sections of `docs/superpowers/specs/2026-08-06-earsforyou-user-app-design.md` covering brand signature, navigation, Home, auth screens, and Chat. Everything else in that spec (architecture, data flow, error handling, testing, the rest of the screens) still stands.

## 1. Why this redesign happened

The user app was fully built against the original "Good Soil" spec (garden and plant metaphor, check-in as the primary raised action) and reviewed live against the real backend. Direct feedback on the running app:

1. The garden and plant metaphor was confusing, especially for a first-time user, and did not communicate "Ears For You." Users had to learn "watering equals checking in" before anything on Home made sense.
2. The navigation quietly treated mood check-in as a daily habit loop to protect (a streak), when the actual product is on-demand: talk whenever you need it, no obligation.
3. Chat, the AI companion, is the main feature. The original navigation buried it as one of five equal tabs while the raised, always-reachable action opened the mood check-in instead.
4. This is a final year project that will be demoed, most likely on a laptop or projector. Desktop and tablet need to be presentation-quality, not just "doesn't break."

This document is the result of iterating on all four points directly against rendered mockups, verified with real screenshots at every step (not just CSS reasoning), until the user approved each screen.

## 2. What's kept from Good Soil, and what's new

**Kept, unchanged:** the type pairing (Chillax display, General Sans body), the core palette (fir `#22372B`, fir-deep `#16301F`, leaf `#2E7D49`, leaf-bright `#47A566`, marigold `#F2BE45`, marigold-deep `#D99B21`, clay `#D9822B`, card `#FDFBF4`), the five-slot navigation shape (four regular destinations plus one raised, always-reachable action), the rule that gradients are reserved for living/warm elements only, and every backend contract, endpoint, and data shape. Nothing about the API integration changes.

**Changed:**
- **oat** moves from `#F4F1E7` to a slightly warmer `#F6F1E5`, used consistently across every redesigned screen. This is a deliberate small warm shift, not a typo; keep `#F6F1E5` as the new oat value going forward.
- **New warm-scene tokens**, used only in the full-bleed dark hero scenes (Home, Sign-in, and the compact auth heroes): `night-warm-top` `#170F07`, `night-warm-bottom` `#2A1B0C`, `warm-cream-text` `#FBEEDD`. These replace the old cool green-black night gradient (`#08150D`→`#21432C`) everywhere a hero scene appears in a redesigned screen. The rationale, confirmed against 2026 mental-health UI research: warmth reads as safety in a way cool tones don't, regardless of how calm the cool tones are.
- **The signature element** changes from the garden and plant to **the Listening Field**: slow-breathing concentric rings around a warm amber glow, with a waveform drawn from the user's own real mood data ("your week, as sound") standing in for the plant. The waveform is not decoration, it visualizes real `weeklyTrends` data, the same information Insights already charts.
- **Marigold's meaning narrows further**: it is now also the literal color of "talk / listening" actions (the raised nav button, the Chat send button, the presence dot), in addition to its existing role marking warmth, celebration, and milestones. It is still never used for large surfaces or errors.

## 3. Navigation: Chat is the primary action

The raised, always-reachable tab button now opens **Chat**, not Check-in. Order, phone tab bar: Home, Check-in, **Talk** (raised, marigold gradient, chat-bubble icon), Insights, Journal. This is a straight swap of Check-in and Chat's roles from the original spec; the other three destinations and their positions are unchanged. Desktop left rail: same four destinations as plain nav links, plus **Talk to me** rendered as a full-width standing marigold button (not just an icon), with the user's avatar and name pinned to the bottom of the rail.

Check-in is still a fully real feature, wired to the same backend endpoints, but is deliberately de-emphasized:
- No streak-as-count-to-protect language anywhere ("12 days in a row" is gone).
- Where a summary is needed, state a plain fact: "You've checked in {n} times this week · {relative day}, {mood}."
- It is reachable from its own regular tab item, not a special raised button.

## 4. The two-zone hero pattern (applies everywhere a dark scene sits behind text)

This pattern is the fix for a real contrast bug found during this redesign (text sitting directly on art that shifted from near-black to warm-lit depending on what decorative element happened to be behind it) and must be followed on every hero scene:

- **Text zone**: a flat, deliberately dark gradient (`night-warm-top` to `night-warm-bottom`) with no rings, glow, or waveform art allowed inside it. Verified to clear WCAG 2.2's 4.5:1 minimum by a wide margin (headline measured at 17.9:1, sub-line at 13.4:1 against the worst-case point).
- **Art zone**: rings, glow, and the waveform live here, positioned clear of every word. On Home this is the lower portion of the hero; on the compact auth heroes the art is a subtle background wash since there's less vertical room, but text still never sits inside a glow or ring stroke above ~10% opacity.
- Any element that visually overlaps the hero from below (a rising "sheet") **must** have its own opaque background (`oat`) and its own rounded top corners. A transparent sheet was a real bug this session: it let the dark hero bleed through and cut a streak numeral in half.

## 5. Home

### Mobile
- Full-bleed warm hero, two-zone pattern. Greeting: "Good evening, {name}." in Chillax, 32-34px, full white. Sub-line directly below at 14-19px, `warm-cream-text` at ~90%+ opacity, weight 500 (not the original's fainter 72%-opacity caption treatment, that was part of the original legibility bug): a caring, direct line, not a status report. Example locked copy: "Whatever today was, you don't have to carry it alone."
- Primary CTA in the hero: a white pill button, "Talk to me", opening Chat. This is the same destination as the raised tab button; Home never presents two different calls to action.
- Presence line directly below the CTA, on its own row (`display: flex`, not `inline-flex`, a real stacking bug found this session): a small glowing marigold dot plus "Here, listening", the same instinct as an "online now" indicator reframed as reassurance.
- Sheet rises over the hero with its own opaque `oat` background and rounded top corners (see §4).
- Affirmation card: relabeled "Just for you, right now" (not "Today's affirmation") with a small heart-outline icon, and a clean two-stroke SVG quote mark as a low-opacity (~10%) corner watermark, not a font glyph at large size and low opacity (that rendered as broken bars, a real bug this session).
- Below the affirmation: the quiet check-in summary line described in §3, small waveform-style level bars plus the plain-fact sentence, visually much quieter than the affirmation card.
- Streak/mood data underneath all of this is unchanged at the API level; only its presentation and copy changed.

### Desktop (>=1024px)
- Left rail replaces the tab bar (see §3).
- Hero goes wide and short (~300px tall) instead of tall and narrow. Greeting block sits left at a larger size (38px heading; the original 32px reads like a stretched mobile heading on a wide screen, not something composed for it). The right side of the hero is never empty: it carries a labeled "Your week, as sound" waveform panel, drawn from the same real weekly mood data, so the extra width has real content instead of dead air. The two breathing rings anchor left (behind the greeting) and a second, smaller ring cluster anchors right (behind the waveform label) so the whole band reads as one atmosphere.
- Body content is capped at `max-width: 1180px` and centered; it does not stretch edge-to-edge on an ultra-wide monitor.
- Three cards in a row, equal height (`align-items: stretch`, each card holding genuinely comparable content, not just height-matched decoratively): affirmation; "This week" (the quiet summary line plus a real small terrain-style mood/stress chart, not just one line of text); "Recent journal" (the two most recent real entries, each with a small leaf-colored left accent bar for rhythm).
- A very faint (3-6% opacity) echo of the hero's rings and glow bleeds down from the hero through the card row and into the space below it. This is the fix for a real "the page looks like it ran out of content" problem: the empty space below three cards on a tall monitor now reads as continued atmosphere, not a dead void the design gave up on.

## 6. Sign-in

### Mobile
Same two-zone hero-plus-sheet structure as Home. Hero: centered wordmark "Ears\nfor *you.*" (the "you" in marigold) with the halo/rings behind it, and one reassuring line before any form field: "A safe space to talk, whenever you need it. No agenda, no judgment." Sheet: email field, password field, primary Sign in button (standard leaf-gradient, not marigold, see §2 on marigold's narrow meaning), ghost "Create an account" button, "Forgot password?" link.

### Desktop
Split screen, not a stacked sheet: left ~46% is the warm hero/wordmark panel at full height, right is the form at a fixed, comfortable width (~320px), vertically centered, on a plain `oat` background. This is a deliberate, standard desktop auth pattern chosen specifically so the brand identity gets real presence in front of a demo audience instead of being squeezed into a corner.

## 7. Register, verify, forgot password, recovery

All four share one **compact hero** pattern, distinct from Sign-in's full hero: ~220px tall (not full-height), same warm two-zone treatment, a back arrow (top-left, `rgba(oat, .14)` circular button) that is always present so nobody gets stuck partway through a flow they didn't mean to start, and a titlebox anchored from a fixed `top` offset (not `bottom`, which was a real clipping bug this session when content length varied between screens).

- **Register, step 1**: "Step 1 of 3" stated plainly as small text (not a progress-bar graphic), heading "Let's start with you.", name and email fields, helper line: "Three short steps, then you're in. Nothing here is shared, and you can change any of it later." Steps 2 and 3 keep their existing field sets from the original spec (about-you fields, then password) inside this same hero-plus-sheet shell.
- **Verify**: heading "Check your email.", sub-line naming the masked email address, the existing 6-digit OTP box row and resend-cooldown pattern, unchanged in behavior from the original spec, restyled into this shell. This is the one screen shape reused for every OTP entry point (registration, recovery, password change, email change).
- **Forgot password**: heading "Forgot your password?", reassuring opener "It happens.", email field, and a quiet path to full account recovery offered inline ("Lost access to this email too? Recover your account a different way.") rather than leaving someone with no way forward.
- **Recovery** reuses this exact shell and the email-then-code pattern; it does not need its own separate mockup.

No desktop-specific treatment beyond what the shared compact-hero-plus-sheet pattern already provides at a comfortable centered width; these are secondary screens, not demo centerpieces.

## 8. Chat

Chat gets a real visual identity for the first time; the original build treated it as a plain thread.

### Mobile
- Compact warm header (not full hero height, the conversation stays the visual focus): the companion's mark (a chat-bubble glyph in a dark circle) carries a small live marigold presence dot, next to "Your companion" / "Here, listening" as the header title and status, replacing a generic chat title.
- Thinking indicator changed from generic bouncing dots to a small breathing ring pulse labeled "Listening...", the same visual language as Home's halo, so waiting for a reply reads as "listening" specifically, not a generic spinner.
- User bubbles: fir background, right-aligned. Assistant bubbles: card background with a subtle amber border, left-aligned.
- Lifeline row (emergency resources) keeps its existing amber-bordered treatment and behavior from the original spec, unchanged.
- Composer: rounded pill input plus a marigold send button (marigold is correct here specifically, see §2).
- **The tab bar must always be visible at the bottom of Chat.** A real bug this session: an early mockup dropped it, which would have trapped a user inside Chat with no way back to Home, Insights, Journal, or Check-in. The raised "Talk" button still renders (as the active/current item) even while already on Chat.
- The composer needs enough bottom clearance (~48px padding under the input row) so the raised tab button, which rises above the tab bar, does not overlap the composer, another real bug found and fixed this session.

### Desktop
Same left rail as Home, with "Talk to me" shown as the current/active item. The conversation itself is a fixed-width centered column (~480px), not a full-width sprawl; a wall-to-wall chat thread on a wide monitor is harder to read, not easier. The lifeline row and composer sit centered at the same column width, directly beneath the thread.

## 9. Engineering notes carried forward from this session (apply broadly, not just to these screens)

- Never let an inline-flex element sit where a sibling is meant to stack below it; use `display: flex` (block-level) for anything that must force its own line.
- Always give SVG icons an explicit `width`/`height`; never rely on inherited or default sizing.
- Verify any nontrivial layout by actually rendering and screenshotting it (Playwright is already set up in this project's tooling) before calling it fixed. CSS reasoning alone missed two real bugs in a row this session.
- Test desktop compositions at a realistic wide viewport (1900px class), not an arbitrary narrower one; a layout that looks fine at 1500px can have large unintended dead zones at real laptop/demo widths.
- When a card grid needs equal-height cards, use `align-items: stretch` and make sure each card's content actually earns that height; stretching a card with too little content just moves the empty space inside the box instead of removing it.

## 10. Explicitly out of scope for this redesign

Not touched, and not part of this spec: Check-in's own screen (mood word picker and sliders), Insights, Journal (beyond the Home desktop preview card, which reads real data but does not change the Journal screen itself), and You. They keep their existing Good Soil-era visual treatment. One follow-up worth tracking separately: Insights' existing copy ("your week, as ground") uses garden vocabulary that is now inconsistent with the Listening identity and should get a small copy-only pass, but that was not designed or reviewed in this session and needs its own quick round before it ships.

## 11. Definition of done (unchanged from the original spec)

Same standing rules apply: all four states (loading, empty, error, success) per async surface, per-breakpoint composition decisions rather than fluid stretching, no AI attribution anywhere, no em dashes in UI copy or docs, and the work is not complete until the client has reviewed it rendered on a live URL.
