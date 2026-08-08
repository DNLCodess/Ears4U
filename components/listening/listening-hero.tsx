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
      <MobileScene uid={`m-${uid}`} headEl={head} glowEl={glow} sub={sub} cta={cta} />
      <DesktopScene uid={`d-${uid}`} headEl={head} glowEl={glow} sub={sub} cta={cta} weeklyTrends={weeklyTrends} />
    </>
  )
}
