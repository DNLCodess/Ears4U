import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { bounds } from './page'
import AdminAnalyticsPage from './page'
import { adminQk } from '@/lib/query/admin-keys'
import { ApiError } from '@/lib/api/errors'
import type { AdminAnalytics } from '@/lib/api/admin/types'

describe('bounds', () => {
  it('returns the min and max of the values padded by 5%', () => {
    // range = 9 - 1 = 8, pad = 0.4
    expect(bounds([{ value: 3 }, { value: 9 }, { value: 1 }])).toEqual([0.6, 9.4])
  })
  it('pads a flat series so min and max differ', () => {
    expect(bounds([{ value: 5 }, { value: 5 }])).toEqual([4, 6])
  })
  it('returns a default range for an empty series', () => {
    expect(bounds([])).toEqual([0, 1])
  })
  it('applies headroom padding for a varied series so the curve does not clip', () => {
    const [min, max] = bounds([{ value: 2 }, { value: 40 }, { value: 5 }, { value: 38 }])
    expect(min).toBeLessThan(2)
    expect(max).toBeGreaterThan(40)
  })
})

const useQueryMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryKey: readonly unknown[] }) => useQueryMock(opts),
}))

type QueryState<T> = {
  data?: T
  isLoading?: boolean
  isError?: boolean
  error?: unknown
  refetch?: () => void
}

function mockAnalyticsQuery(state: QueryState<AdminAnalytics>) {
  useQueryMock.mockImplementation((opts: { queryKey: readonly unknown[] }) => {
    const base: QueryState<AdminAnalytics> = { data: undefined, isLoading: false, isError: false, error: undefined, refetch: vi.fn() }
    if (opts.queryKey === adminQk.analytics) return { ...base, ...state }
    return base
  })
}

const ANALYTICS: AdminAnalytics = {
  userGrowth: [{ date: '2026-08-01', value: 10 }, { date: '2026-08-02', value: 20 }],
  // Moods carries mood category names in the date-label slot (see AdminAnalyticsPoint's doc
  // comment in types.ts) rather than real dates - this is the mapped, chart-ready shape.
  moods: [{ date: 'Happy', value: 5 }, { date: 'Anxious', value: 7 }],
  aiUsage: [{ date: '2026-08-01', value: 1 }, { date: '2026-08-02', value: 3 }],
}

describe('AdminAnalyticsPage', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
  })

  it('renders skeletons while loading', () => {
    mockAnalyticsQuery({ isLoading: true })
    const { container } = render(<AdminAnalyticsPage />)
    expect(screen.queryByText('User growth')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders an ErrorState with a retry affordance on error', async () => {
    const refetch = vi.fn()
    mockAnalyticsQuery({ isError: true, error: new ApiError(500, 'The server had a problem. Try again.'), refetch })
    const user = userEvent.setup()
    render(<AdminAnalyticsPage />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The server had a problem. Try again.')
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders all three charts with data on success', () => {
    mockAnalyticsQuery({ data: ANALYTICS })
    render(<AdminAnalyticsPage />)
    expect(screen.getByText('User growth')).toBeInTheDocument()
    expect(screen.getByText('Moods')).toBeInTheDocument()
    expect(screen.getByText('AI usage')).toBeInTheDocument()
    expect(screen.getByText(/latest: 20/i)).toBeInTheDocument()
  })

  it('degrades to the charts\' empty state instead of throwing when a series is missing from the response', () => {
    const partial = { userGrowth: ANALYTICS.userGrowth } as unknown as AdminAnalytics
    mockAnalyticsQuery({ data: partial })
    expect(() => render(<AdminAnalyticsPage />)).not.toThrow()
    expect(screen.getAllByText(/no data yet/i).length).toBe(2)
  })
})
