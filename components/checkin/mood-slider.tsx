'use client'
import { useId, type KeyboardEvent, type ReactNode } from 'react'

export const MIN = 1
export const MAX = 10

/**
 * Each dimension owns a colour and a knob glyph, the same vocabulary the
 * insights terrain chart speaks: leaf for mood strength, ring for stress,
 * sun for energy. Glyphs inherit `currentColor` from the knob.
 */
function LeafGlyph() {
  return (
    <>
      <path d="M12 20 C 11.4 14 11.4 8 12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 11 C 8 10 6 7.5 6.4 4.8 C 9.8 5.2 11.8 7.6 12 11 Z" fill="currentColor" />
    </>
  )
}

function RingGlyph() {
  return <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2.4" />
}

function SunGlyph() {
  return (
    <path
      d="M12 4v3M12 17v3M4 12h3M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    />
  )
}

const DIMENSION: Record<'leaf' | 'clay' | 'marigold', {
  text: string; fill: string; border: string; glyph: ReactNode
}> = {
  leaf: { text: 'text-leaf', fill: 'bg-leaf', border: 'border-leaf', glyph: <LeafGlyph /> },
  clay: { text: 'text-clay', fill: 'bg-clay', border: 'border-clay', glyph: <RingGlyph /> },
  // The knob rim keeps the marigold token; the glyph drops a shade so it stays
  // legible on the cream knob.
  marigold: { text: 'text-marigold-deep', fill: 'bg-marigold', border: 'border-marigold', glyph: <SunGlyph /> },
}

const KNOB = 30
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v))

/** Positions the knob centre along the same travel the native thumb uses. */
function travel(value: number) {
  const fraction = (clamp(value) - MIN) / (MAX - MIN)
  return `calc(${KNOB / 2}px + ${fraction} * (100% - ${KNOB}px))`
}

const TICKS = Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i)
/** Every slider opens here, so the notch under it is drawn a little taller. */
const REST = 5

export function MoodSlider({ label, color, value, onChange }: {
  label: string
  color: 'leaf' | 'clay' | 'marigold'
  value: number
  onChange: (v: number) => void
}) {
  const id = useId()
  const dimension = DIMENSION[color]
  const position = travel(value)

  // The arrow keys are handled here rather than left to the browser so the step
  // is applied exactly once: the default action is cancelled, which also keeps
  // the native control from double-stepping.
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key]
    if (step !== undefined) {
      event.preventDefault()
      const next = clamp(value + step)
      if (next !== value) onChange(next)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const next = event.key === 'Home' ? MIN : MAX
      if (next !== value) onChange(next)
    }
  }

  return (
    <div className="rounded-[18px] bg-card px-[18px] pb-4 pt-3.5 shadow-[0_1px_0_rgba(34,55,43,.06),0_8px_20px_rgba(34,55,43,.05)]">
      <div className="mb-2.5 flex items-baseline justify-between text-[13.5px] font-medium">
        <label htmlFor={id}>{label}</label>
        <b aria-hidden className={`font-display text-[17px] font-medium ${dimension.text}`}>{value}</b>
      </div>

      <div className="relative h-[30px]">
        {/* The native range sits transparent on top: real keyboard, touch and
            pointer behaviour, with the visuals painted underneath it. Its thumb
            is sized to the drawn knob so a tap lands on the value shown there. */}
        <input
          id={id}
          type="range"
          min={MIN}
          max={MAX}
          step={1}
          value={value}
          onChange={e => onChange(clamp(Number(e.target.value)))}
          onKeyDown={onKeyDown}
          className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0
            [&::-moz-range-thumb]:h-[30px] [&::-moz-range-thumb]:w-[30px] [&::-moz-range-thumb]:border-0
            [&::-webkit-slider-thumb]:h-[30px] [&::-webkit-slider-thumb]:w-[30px] [&::-webkit-slider-thumb]:appearance-none"
        />

        <span className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-fir/15" />
        <span
          className={`pointer-events-none absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full ${dimension.fill}`}
          style={{ width: position }}
        />
        {/* Notches sit above the rail, as in the mockup, with the resting value
            marked a little taller. */}
        {TICKS.map(tick => (
          <span
            key={tick}
            className={`pointer-events-none absolute bottom-[calc(50%+3px)] w-px -translate-x-1/2 bg-fir/30
              ${tick === REST ? 'h-2.25' : 'h-1.5'}`}
            style={{ left: travel(tick) }}
          />
        ))}
        <span
          className={`pointer-events-none absolute top-1/2 flex h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2
            items-center justify-center rounded-full border-[2.5px] bg-card
            shadow-[0_3px_10px_rgba(34,55,43,.25)] transition-shadow
            peer-focus-visible:ring-2 peer-focus-visible:ring-fir/45 peer-focus-visible:ring-offset-2
            peer-focus-visible:ring-offset-card ${dimension.border} ${dimension.text}`}
          style={{ left: position }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
            {dimension.glyph}
          </svg>
        </span>
      </div>
    </div>
  )
}
