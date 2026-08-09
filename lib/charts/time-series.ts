/**
 * Generic sibling of terrainPath (lib/charts/terrain.ts): same smooth
 * Catmull-Rom-to-bezier curve, but min/max are caller-supplied instead of
 * a fixed 1-10 scale, since admin metrics vary in range far more than a
 * single user's mood score does.
 */
export function timeSeriesPath(values: number[], width: number, height: number, min: number, max: number): string {
  if (values.length === 0) return ''
  const pad = 4
  const usable = height - pad * 2
  const range = max - min || 1
  const x = (i: number) => values.length === 1 ? 0 : (i / (values.length - 1)) * width
  const y = (v: number) => pad + usable * (1 - (v - min) / range)
  const pts = values.map((v, i) => [x(i), y(v)] as const)
  if (pts.length === 1) return `M 0 ${pts[0]![1].toFixed(1)} L ${width} ${pts[0]![1].toFixed(1)}`

  let d = `M ${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}
