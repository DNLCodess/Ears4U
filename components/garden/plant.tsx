'use client'
import { motion, useReducedMotion } from 'motion/react'
import { plantShape } from '@/lib/garden'

/**
 * The plant is drawn in the coordinate space of the approved mockup's
 * `<g transform="translate(236 176)">` group, framed by a 200x150 viewBox.
 * Colours come from CSS custom properties so a scene can tint the plant for a
 * light or a dark sky without changing the component's props.
 */

const STEMS = [
  { d: 'M52 132 C 50 96 48 74 40 56', width: 4.4 },
  { d: 'M52 132 C 56 100 62 80 74 66', width: 3.6 },
]

const SPROUT = 'M40 56 C 36 44 38 34 46 28 C 54 34 54 46 48 56 C 46 59 42 59 40 56 Z'

// The four base leaves are the mockup's own paths. Leaves five to eight reuse
// those shapes mirrored, flipped and rotated onto the free stem positions, so
// the plant thickens outward instead of stacking on itself.
const LEAF_A = 'M44 80 C 26 76 16 62 18 46 C 34 48 44 62 44 80 Z'
const LEAF_B = 'M42 102 C 24 100 12 88 12 72 C 30 74 42 86 42 102 Z'
const LEAF_C = 'M60 88 C 76 82 92 84 100 96 C 88 106 70 102 60 88 Z'
const LEAF_D = 'M72 112 C 88 106 104 108 112 120 C 100 130 82 126 72 112 Z'

type Leaf = { d: string; transform?: string; tone: 'bright' | 'deep' }

const LEAVES: Leaf[] = [
  { d: LEAF_A, tone: 'bright' },
  { d: LEAF_B, tone: 'deep' },
  { d: LEAF_C, tone: 'deep' },
  { d: LEAF_D, tone: 'bright' },
  // 5: mirror of the low right leaf, filling the empty ground on the left.
  { d: LEAF_D, transform: 'translate(111.2 20.8) scale(-0.85 0.85)', tone: 'deep' },
  // 6: the upper right leaf flipped upward, fanning above its twin.
  { d: LEAF_C, transform: 'rotate(-10 66 78) translate(15 152.8) scale(0.85 -0.85)', tone: 'bright' },
  // 7: a wider left leaf reaching out between the first two.
  { d: LEAF_B, transform: 'rotate(-28 49 93) translate(9.9 -0.8) scale(0.93)', tone: 'bright' },
  // 8: newest growth, a small leaf low on the right stem.
  { d: LEAF_C, transform: 'rotate(20 57 103) translate(9 32.6) scale(0.8)', tone: 'deep' },
]

const TONE = {
  bright: 'var(--plant-leaf-bright, #47A566)',
  deep: 'var(--plant-leaf-deep, #2E7D49)',
} as const

export function Plant({ streak, size = 200 }: { streak: number; size?: number }) {
  const { leaves, hasBloom } = plantShape(streak)
  const reduceMotion = useReducedMotion()
  const draw = !reduceMotion

  return (
    <svg
      viewBox="0 0 200 150"
      width={size}
      height={size * 0.75}
      fill="none"
      aria-hidden
      overflow="visible"
    >
      {/* Centres the mockup's group inside the 200x150 frame. */}
      <g transform="translate(35 8)">
        {STEMS.map((stem, i) => (
          <motion.path
            key={`stem-${i}`}
            d={stem.d}
            stroke="var(--plant-stem, #4E9E68)"
            strokeWidth={stem.width}
            strokeLinecap="round"
            initial={draw ? { pathLength: 0, opacity: 0 } : { opacity: 0 }}
            animate={draw ? { pathLength: 1, opacity: 1 } : { opacity: 1 }}
            transition={{ duration: draw ? 0.6 : 0.3, delay: draw ? i * 0.08 : 0, ease: 'easeOut' }}
          />
        ))}

        {LEAVES.slice(0, leaves).map((leaf, i) => (
          <motion.path
            key={`leaf-${i}`}
            d={leaf.d}
            transform={leaf.transform}
            fill={TONE[leaf.tone]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: draw ? 0.35 + i * 0.06 : 0 }}
          />
        ))}

        {leaves >= 1 ? (
          <>
            <motion.path
              d={SPROUT}
              fill="var(--plant-sprout, #7BC48F)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: draw ? 0.3 : 0 }}
            />
            <circle cx="46" cy="30" r="3" fill="var(--plant-dew, transparent)" opacity=".9" />
          </>
        ) : null}

        {hasBloom ? (
          <motion.g
            style={{ transformOrigin: '74px 62px' }}
            initial={draw ? { opacity: 0, scale: 0.4 } : { opacity: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: draw ? 0.45 : 0.3, delay: draw ? 0.75 : 0, ease: 'backOut' }}
          >
            <circle cx="74" cy="62" r="7.5" fill="#F2BE45" />
            <circle cx="74" cy="62" r="3.2" fill="#D99B21" />
          </motion.g>
        ) : null}
      </g>
    </svg>
  )
}
