'use client'
import { useId } from 'react'
import { timeSeriesPath } from '@/lib/charts/time-series'

const WIDTH = 600
const HEIGHT = 120

export function TimeSeriesChart({ title, points, min, max, color = '#2E7D49' }: {
  title: string
  points: { date: string; value: number }[]
  min: number
  max: number
  color?: string
}) {
  const uid = useId().replace(/:/g, '')
  const values = points.map(p => p.value)
  const path = timeSeriesPath(values, WIDTH, HEIGHT, min, max)
  const baseline = HEIGHT - 4
  const fillPath = path ? `${path} L ${WIDTH} ${baseline} L 0 ${baseline} Z` : ''
  const first = points[0]
  const last = points[points.length - 1]
  const latest = values[values.length - 1]

  return (
    <div className="rounded-2xl bg-card px-5 py-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">{title}</p>
        {latest !== undefined ? <p className="text-xs opacity-60">Latest: {latest}</p> : null}
      </div>
      {points.length === 0 ? (
        <p className="mt-6 text-sm opacity-55">No data yet.</p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`${title} over time, latest value ${latest}`}
            className="mt-3 w-full"
          >
            <defs>
              <linearGradient id={`ts-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity="0.35" />
                <stop offset="1" stopColor={color} stopOpacity="0.03" />
              </linearGradient>
            </defs>
            {fillPath ? <path d={fillPath} fill={`url(#ts-${uid})`} stroke="none" /> : null}
            {path ? <path d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" /> : null}
          </svg>
          <div className="mt-1.5 flex items-center justify-between text-[11px] opacity-50">
            <span>{first?.date}</span>
            <span>{last?.date}</span>
          </div>
        </>
      )}
    </div>
  )
}
