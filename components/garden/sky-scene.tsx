'use client'
import { useId, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { SkyState } from '@/lib/sky'
import type { MoodEntry } from '@/lib/api/types'
import { Plant } from './plant'

/**
 * The scene is authored on a 900x348 canvas. A phone crops it to the centre
 * 392 columns, which is exactly the approved mockup's frame; wider viewports
 * simply reveal more of the same landscape instead of zooming into it.
 */
const CANVAS = { w: 900, h: 348 }
const OFFSET = 254 // mockup x = canvas x - 254

export function isDarkSky(state: SkyState): boolean {
  return state === 'evening' || state === 'night'
}

const HILLS = [
  'M0 282 C 80 262 170 276 254 268 C 324 246 394 258 454 250 C 522 241 584 250 646 240 C 700 234 760 246 820 238 C 860 233 880 236 900 232 L 900 348 L 0 348 Z',
  'M0 306 C 70 292 170 304 254 296 C 334 278 404 292 478 284 C 550 276 598 286 646 278 C 700 272 760 284 820 276 C 860 271 880 274 900 270 L 900 348 L 0 348 Z',
  'M0 330 C 80 320 170 328 254 322 C 344 306 434 318 522 310 C 576 306 614 312 646 306 C 700 302 760 310 820 304 C 860 300 880 302 900 300 L 900 348 L 0 348 Z',
]
const GROUND =
  'M0 346 C 90 340 180 342 254 340 C 344 328 454 336 646 326 C 720 322 800 326 900 320 L 900 348 L 0 348 Z'

const HILL_FILLS = {
  dark: ['#1E4630', '#173826', '#10281A'],
  light: ['#9BBB7E', '#7BA466', '#5C8A50'],
} as const

const SKY_STOPS: Record<SkyState, { offset: string; color: string }[]> = {
  evening: [
    { offset: '0', color: '#0E2416' }, { offset: '.55', color: '#1B4029' },
    { offset: '.85', color: '#3A6B44' }, { offset: '1', color: '#C89A3F' },
  ],
  night: [
    { offset: '0', color: '#08150D' }, { offset: '.55', color: '#0E2416' },
    { offset: '.85', color: '#16301F' }, { offset: '1', color: '#21432C' },
  ],
  morning: [
    { offset: '0', color: '#EAF0DC' }, { offset: '.6', color: '#F4EFD3' },
    { offset: '1', color: '#F6DFA6' },
  ],
  day: [
    { offset: '0', color: '#DCE9DC' }, { offset: '.6', color: '#F1F1DC' },
    { offset: '1', color: '#F6E8BE' },
  ],
}

type Dot = { cx: number; cy: number; r: number; o: number }

// The mockup's five stars, in canvas coordinates.
const STARS: Dot[] = [
  { cx: 320, cy: 52, r: 1.4, o: 0.8 }, { cx: 382, cy: 34, r: 1, o: 0.55 },
  { cx: 466, cy: 60, r: 1.2, o: 0.65 }, { cx: 296, cy: 112, r: 1, o: 0.4 },
  { cx: 500, cy: 30, r: 1.5, o: 0.7 },
]
const NIGHT_STARS: Dot[] = [
  { cx: 268, cy: 78, r: 1.1, o: 0.5 }, { cx: 350, cy: 96, r: 1, o: 0.45 },
  { cx: 414, cy: 128, r: 1.3, o: 0.5 }, { cx: 452, cy: 20, r: 1, o: 0.5 },
  { cx: 528, cy: 92, r: 1.2, o: 0.6 }, { cx: 604, cy: 44, r: 1.1, o: 0.5 },
  { cx: 630, cy: 118, r: 1, o: 0.4 }, { cx: 96, cy: 64, r: 1.4, o: 0.6 },
  { cx: 168, cy: 130, r: 1, o: 0.4 }, { cx: 208, cy: 40, r: 1.2, o: 0.5 },
  { cx: 704, cy: 70, r: 1.3, o: 0.55 }, { cx: 772, cy: 34, r: 1, o: 0.45 },
  { cx: 828, cy: 116, r: 1.2, o: 0.5 }, { cx: 60, cy: 168, r: 1, o: 0.3 },
]
// The mockup's three fireflies, plus two that only the wide canvas reveals.
const FIREFLIES: Dot[] = [
  { cx: 350, cy: 242, r: 2.6, o: 0.85 }, { cx: 404, cy: 266, r: 1.8, o: 0.55 },
  { cx: 542, cy: 252, r: 2.2, o: 0.7 }, { cx: 132, cy: 256, r: 2, o: 0.6 },
  { cx: 774, cy: 244, r: 2.4, o: 0.65 },
]
const BIRDS = [
  'M284 96 Q 298 88 312 96 Q 326 104 342 96',
  'M544 70 Q 558 62 572 70 Q 586 78 602 70',
  'M108 128 Q 122 120 136 128 Q 150 136 166 128',
  'M736 104 Q 750 96 764 104 Q 778 112 794 104',
]

const DARK_PALETTE = {
  '--plant-stem': '#4E9E68', '--plant-leaf-bright': '#47A566',
  '--plant-leaf-deep': '#2E7D49', '--plant-sprout': '#7BC48F',
  '--flag-pole': '#F4F1E7',
} as React.CSSProperties
const LIGHT_PALETTE = {
  '--plant-stem': '#2E7D49', '--plant-leaf-bright': '#3F9C5C',
  '--plant-leaf-deep': '#256B3E', '--plant-sprout': '#7BC48F',
  '--flag-pole': '#22372B',
} as React.CSSProperties

function splitGreeting(greeting: string) {
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

export function SkyScene({
  state, streak, latestMood, greeting, sub, cta,
}: {
  state: SkyState
  streak: number
  latestMood: MoodEntry | null
  greeting: string
  sub: string
  cta?: ReactNode
}) {
  const uid = useId().replace(/:/g, '')
  const reduceMotion = useReducedMotion()
  const dark = isDarkSky(state)
  const hills = dark ? HILL_FILLS.dark : HILL_FILLS.light
  const stars = state === 'night' ? [...STARS, ...NIGHT_STARS] : STARS
  const { head, glow } = splitGreeting(greeting)

  return (
    <section
      className={`relative h-[348px] overflow-hidden lg:h-[300px] ${dark ? 'text-oat' : 'text-fir'}`}
      style={dark ? DARK_PALETTE : LIGHT_PALETTE}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            {SKY_STOPS[state].map(s => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
          <radialGradient id={`glow-${uid}`} cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor={dark ? '#F6E7B8' : '#F2BE45'} stopOpacity={dark ? '.5' : '.65'} />
            <stop offset="1" stopColor={dark ? '#F6E7B8' : '#F2BE45'} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={CANVAS.w} height={CANVAS.h} fill={`url(#sky-${uid})`} />

        {dark ? (
          <>
            <circle cx={318 + OFFSET} cy="84" r="52" fill={`url(#glow-${uid})`} />
            <g transform={`translate(${OFFSET} 0)`}>
              <path d="M330 62 a22 22 0 1 0 10 42 a17 17 0 1 1 -10 -42 Z" fill="#F6E7B8" />
            </g>
          </>
        ) : null}

        {state === 'morning' ? (
          <>
            <circle cx={94 + OFFSET} cy="150" r="86" fill={`url(#glow-${uid})`} />
            <circle cx={94 + OFFSET} cy="150" r="30" fill="#F2BE45" />
          </>
        ) : null}
        {/* Midday: smaller, higher, no low glow, and clear of the greeting block. */}
        {state === 'day' ? <circle cx={320 + OFFSET} cy="108" r="21" fill="#F2BE45" /> : null}

        {dark
          ? stars.map(s => (
            <circle key={`${s.cx}-${s.cy}`} cx={s.cx} cy={s.cy} r={s.r} fill="#F6E7B8" opacity={s.o} />
          ))
          : BIRDS.map((d, i) => (
            <path key={d} d={d} stroke="#22372B" strokeWidth="1.6" strokeLinecap="round" opacity={i % 2 ? 0.28 : 0.35} />
          ))}

        {dark
          ? FIREFLIES.map((f, i) => (
            <motion.circle
              key={`${f.cx}-${f.cy}`}
              cx={f.cx} cy={f.cy} r={f.r} fill="#F2BE45"
              initial={{ opacity: f.o }}
              animate={reduceMotion ? { opacity: f.o } : { opacity: [f.o, f.o * 0.35, f.o], y: [0, -7, 0] }}
              transition={{ duration: 5.5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}
            />
          ))
          : null}

        {HILLS.map((d, i) => (
          <path key={d} d={d} fill={hills[i]} opacity={i === 0 ? (dark ? 0.85 : 0.75) : 1} />
        ))}

        <g transform="translate(452.9 167.5) scale(1.06)" style={state === 'morning' ? { '--plant-dew': '#CDE7F5' } as React.CSSProperties : undefined}>
          <Plant streak={streak} size={200} />
        </g>

        {latestMood ? (
          <motion.g
            transform={`translate(${64 + OFFSET} 260)`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <title>{`Latest mood: ${latestMood.primaryMood}`}</title>
            <path d="M0 24 V 2" stroke="var(--flag-pole)" strokeWidth="2" strokeLinecap="round" opacity=".9" />
            <path d="M0 2 L 26 7 L 0 13 Z" fill="#D9822B" />
          </motion.g>
        ) : null}

        <path d={GROUND} fill="var(--color-oat)" />
      </svg>

      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[.05] mix-blend-multiply" aria-hidden>
        <filter id={`grain-${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${uid})`} />
      </svg>

      <motion.div
        className="absolute left-6 right-6 top-[72px] z-[3] lg:top-16"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <h1 className="font-display text-[38px] font-semibold leading-none tracking-[-0.022em]">
          {head}
          {glow ? (
            <>
              <br />
              <span className={dark ? 'text-marigold' : 'text-leaf'}>{glow}</span>
            </>
          ) : null}
        </h1>
        <p className={`mt-2.5 max-w-[30ch] text-[13.5px] leading-[1.5] ${dark ? 'text-oat/70' : 'text-fir/65'}`}>
          {sub}
        </p>
        {cta}
      </motion.div>
    </section>
  )
}
