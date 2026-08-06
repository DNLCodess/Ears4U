'use client'
import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'

/**
 * The one loud moment in the app. The marigold unfolds petal by petal, seeds
 * drift, and the screen hands itself back to Home before anyone has to tap.
 */

const PETALS = [0, 45, 90, 135, 180, 225, 270, 315]
const PETAL_STAGGER = 0.04

// left / top / size / colour, lifted from the mockup's seed field.
const SEEDS = [
  { left: '14%', top: '20%', size: 5, color: '#F2BE45', opacity: 0.9, drift: -22, duration: 5.5 },
  { left: '78%', top: '14%', size: 4, color: '#7BC48F', opacity: 0.7, drift: -16, duration: 6.5 },
  { left: '64%', top: '30%', size: 6, color: '#F2BE45', opacity: 0.5, drift: -26, duration: 7.5 },
  { left: '24%', top: '38%', size: 4, color: '#7BC48F', opacity: 0.8, drift: -18, duration: 6 },
  { left: '86%', top: '46%', size: 5, color: '#F2BE45', opacity: 0.65, drift: -24, duration: 7 },
]

const HOLD_MS = 2500
const HOLD_REDUCED_MS = 1500

export function Celebration({ streak }: { streak: number }) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const bloom = !reduceMotion
  const dismissed = useRef(false)

  const dismiss = useCallback(() => {
    if (dismissed.current) return
    dismissed.current = true
    router.replace('/home')
  }, [router])

  useEffect(() => {
    const timer = setTimeout(dismiss, bloom ? HOLD_MS : HOLD_REDUCED_MS)
    return () => clearTimeout(timer)
  }, [dismiss, bloom])

  return (
    <motion.button
      type="button"
      autoFocus
      onClick={dismiss}
      initial={bloom ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-60 flex w-full flex-col items-center justify-center overflow-hidden px-8
        text-center text-oat
        bg-[radial-gradient(120%_90%_at_50%_108%,#2E5B3E_0%,#16301F_55%,#102417_100%)]"
    >
      {SEEDS.map((seed, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full"
          style={{
            left: seed.left, top: seed.top,
            width: seed.size, height: seed.size,
            background: seed.color, opacity: seed.opacity,
          }}
          animate={bloom ? { y: [0, seed.drift, 0] } : undefined}
          transition={{ duration: seed.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <svg width="150" height="150" viewBox="0 0 150 150" fill="none" aria-hidden>
        {PETALS.map((angle, i) => (
          <motion.g
            key={angle}
            style={{ transformOrigin: '75px 75px' }}
            initial={bloom ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 15, delay: i * PETAL_STAGGER }}
          >
            <ellipse
              rx="14" ry="34"
              fill={i % 2 === 0 ? '#F2BE45' : '#EFB33A'}
              transform={`translate(75 75) rotate(${angle}) translate(0 -30)`}
            />
          </motion.g>
        ))}
        <motion.g
          style={{ transformOrigin: '75px 75px' }}
          initial={bloom ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: PETALS.length * PETAL_STAGGER }}
        >
          <circle cx="75" cy="75" r="17" fill="#D99B21" />
          <circle cx="75" cy="75" r="17" fill="none" stroke="#B77E14" strokeWidth="2" strokeDasharray="2 4" />
        </motion.g>
      </svg>

      <motion.span
        className="mb-2 mt-4.5 block font-display text-[44px] font-bold leading-none tracking-[-0.02em]"
        initial={bloom ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: bloom ? 0.42 : 0 }}
      >
        Day {streak}.
        <span className="block text-marigold">Still growing.</span>
      </motion.span>

      <motion.span
        className="block max-w-[30ch] text-sm opacity-75"
        initial={bloom ? { opacity: 0 } : false}
        animate={{ opacity: 0.75 }}
        transition={{ duration: 0.35, delay: bloom ? 0.55 : 0 }}
      >
        {streak} check-in{streak === 1 ? '' : 's'} in a row. The marigold only blooms for you.
      </motion.span>
    </motion.button>
  )
}
