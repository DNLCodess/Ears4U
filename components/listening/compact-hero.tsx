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
