/**
 * The insights endpoint formats point dates with Java's "MMM d" pattern (see
 * backend/service/USER/UserInsightsService.java), so a point arrives as "Aug 6"
 * with no year at all. `new Date('Aug 6')` resolves to the year 2001 in V8, so
 * every such date has to be rebuilt against the reader's own calendar.
 */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/
const SHORT_DATE = /^([a-zA-Z]{3,9})\.?\s+(\d{1,2})$/

// A point more than half a year ahead of today belongs to the previous year:
// a December reading opened in January is six months old, not six months away.
const MAX_AHEAD_MS = 180 * 24 * 60 * 60 * 1000

function localDay(year: number, month: number, day: number): Date | null {
  const d = new Date(year, month, day)
  d.setHours(0, 0, 0, 0)
  return d.getMonth() === month && d.getDate() === day ? d : null
}

/**
 * Turns an insights point date into a local calendar day.
 * Returns null when the string is not a date we recognise.
 */
export function parseInsightDate(raw: string, today: Date = new Date()): Date | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()

  const iso = ISO_DATE.exec(value)
  if (iso) return localDay(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))

  const short = SHORT_DATE.exec(value)
  if (!short) return null
  const month = MONTHS.indexOf(short[1].slice(0, 3).toLowerCase())
  if (month === -1) return null

  const candidate = localDay(today.getFullYear(), month, Number(short[2]))
  if (!candidate) return null

  const reference = new Date(today)
  reference.setHours(0, 0, 0, 0)
  if (candidate.getTime() - reference.getTime() > MAX_AHEAD_MS) {
    candidate.setFullYear(candidate.getFullYear() - 1)
  }
  return candidate
}
