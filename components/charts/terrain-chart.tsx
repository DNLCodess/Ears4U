'use client'
import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { InsightPoint } from '@/lib/api/types'
import { parseInsightDate } from '@/lib/insight-dates'
import { terrainPath } from '@/lib/charts/terrain'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function weekdayShort(raw: string): string {
  const d = parseInsightDate(raw)
  return d ? WEEKDAYS[d.getDay()]! : ''
}

/** Mirrors terrainPath's own y mapping so gridlines and dots land on the same scale. */
function valueY(v: number, height: number, min = 1, max = 10) {
  const pad = 6
  const usable = height - pad * 2
  return pad + usable * (1 - (v - min) / (max - min))
}

const FULL_W = 320
const FULL_H = 150
const PLOT_H = 122
const MINI_W = 328
const MINI_H = 64

const LEAF = '#2E7D49'
const MARIGOLD_DEEP = '#D99B21'
const CLAY = '#D9822B'
const MARIGOLD = '#F2BE45'
const FIR = '#22372B'

function latestSummary(points: InsightPoint[]) {
  const latest = points[points.length - 1]
  if (!latest) return 'No check-ins yet'
  return `Mood ${latest.mood}, energy ${latest.energy}, stress ${latest.stress} on the latest day`
}

export function TerrainChart({ points, mini = false }: { points: InsightPoint[]; mini?: boolean }) {
  const uid = useId()
  const reduceMotion = useReducedMotion()
  const draw = !reduceMotion
  const ariaLabel = latestSummary(points)

  if (mini) {
    const moods = points.map(p => p.mood)
    const linePath = terrainPath(moods, MINI_W, MINI_H)
    const baseline = MINI_H - 6
    const fillPath = linePath ? `${linePath} L ${MINI_W} ${baseline} L 0 ${baseline} Z` : ''
    const lastX = moods.length <= 1 ? 0 : MINI_W
    const lastY = moods.length ? valueY(moods[moods.length - 1]!, MINI_H) : baseline

    return (
      <svg viewBox={`0 0 ${MINI_W} ${MINI_H}`} role="img" aria-label={ariaLabel} className="w-full">
        <defs>
          <linearGradient id={`terrain-mini-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={LEAF} stopOpacity="0.5" />
            <stop offset="1" stopColor={LEAF} stopOpacity="0.06" />
          </linearGradient>
        </defs>
        {fillPath ? <path d={fillPath} fill={`url(#terrain-mini-${uid})`} stroke="none" /> : null}
        {linePath ? (
          <motion.path
            d={linePath}
            fill="none"
            stroke={LEAF}
            strokeWidth={2.8}
            strokeLinecap="round"
            initial={draw ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: draw ? 0.7 : 0, ease: 'easeOut' }}
          />
        ) : null}
        {moods.length ? <circle cx={lastX} cy={lastY} r={3.2} fill={MARIGOLD} /> : null}
      </svg>
    )
  }

  const moods = points.map(p => p.mood)
  const energies = points.map(p => p.energy)
  const stresses = points.map(p => p.stress)

  const moodPath = terrainPath(moods, FULL_W, PLOT_H)
  const energyPath = terrainPath(energies, FULL_W, PLOT_H)
  const stressPath = terrainPath(stresses, FULL_W, PLOT_H)
  const baseline = PLOT_H - 6
  const moodFillPath = moodPath ? `${moodPath} L ${FULL_W} ${baseline} L 0 ${baseline} Z` : ''

  const first = points[0]
  const last = points[points.length - 1]
  const firstLabel = first ? weekdayShort(first.date) : ''
  const lastLabel = last ? weekdayShort(last.date) : ''

  return (
    <div>
      <svg viewBox={`0 0 ${FULL_W} ${FULL_H}`} role="img" aria-label={ariaLabel} className="w-full">
        <defs>
          <linearGradient id={`terrain-full-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={LEAF} stopOpacity="0.5" />
            <stop offset="1" stopColor={LEAF} stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {[3, 6, 9].map(v => (
          <line
            key={v}
            x1={0} x2={FULL_W}
            y1={valueY(v, PLOT_H)} y2={valueY(v, PLOT_H)}
            stroke={FIR}
            strokeWidth={1}
            opacity={0.07 + (v / 9) * 0.03}
          />
        ))}

        {moodFillPath ? <path d={moodFillPath} fill={`url(#terrain-full-${uid})`} stroke="none" /> : null}

        {stressPath ? (
          <motion.path
            d={stressPath}
            fill="none"
            stroke={CLAY}
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeLinecap="round"
            initial={draw ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: draw ? 0.7 : 0, delay: draw ? 0.24 : 0, ease: 'easeOut' }}
          />
        ) : null}

        {energyPath ? (
          <motion.path
            d={energyPath}
            fill="none"
            stroke={MARIGOLD_DEEP}
            strokeWidth={2.2}
            strokeLinecap="round"
            initial={draw ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: draw ? 0.7 : 0, delay: draw ? 0.12 : 0, ease: 'easeOut' }}
          />
        ) : null}

        {moodPath ? (
          <motion.path
            d={moodPath}
            fill="none"
            stroke={LEAF}
            strokeWidth={2.8}
            strokeLinecap="round"
            initial={draw ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: draw ? 0.7 : 0, ease: 'easeOut' }}
          />
        ) : null}

        {firstLabel ? (
          <text x={0} y={FULL_H - 6} fontSize="10" fill={FIR} opacity={0.55} textAnchor="start">
            {firstLabel}
          </text>
        ) : null}
        {lastLabel ? (
          <text x={FULL_W} y={FULL_H - 6} fontSize="10" fill={FIR} opacity={0.55} textAnchor="end">
            {lastLabel}
          </text>
        ) : null}
      </svg>

      <div className="mt-2 flex items-center gap-4 text-[11.5px] opacity-70">
        <span className="flex items-center gap-1.5">
          <span className="h-[2.8px] w-3.5 rounded-full" style={{ backgroundColor: LEAF }} />
          Mood
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[2.2px] w-3.5 rounded-full" style={{ backgroundColor: MARIGOLD_DEEP }} />
          Energy
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="14" height="4" aria-hidden>
            <line x1="0" y1="2" x2="14" y2="2" stroke={CLAY} strokeWidth="2" strokeDasharray="3 3" />
          </svg>
          Stress dashed
        </span>
      </div>
    </div>
  )
}
