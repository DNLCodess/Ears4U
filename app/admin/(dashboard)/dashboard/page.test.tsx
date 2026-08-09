import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatSentAt } from './page'
import AdminDashboardPage from './page'
import { adminQk } from '@/lib/query/admin-keys'
import { ApiError } from '@/lib/api/errors'
import type { AdminDashboardMetrics, AdminBroadcastHistoryItem } from '@/lib/api/admin/types'

describe('formatSentAt', () => {
  it('formats a valid ISO date as a short month/day string', () => {
    expect(formatSentAt('2026-08-05T14:00:00Z')).toMatch(/Aug\s+5/)
  })
  it('returns an empty string for an invalid date', () => {
    expect(formatSentAt('not-a-date')).toBe('')
  })
})

const useQueryMock = vi.fn()
const useMutationMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryKey: readonly unknown[] }) => useQueryMock(opts),
  useMutation: (opts: unknown) => useMutationMock(opts),
}))

type QueryState<T> = {
  data?: T
  isLoading?: boolean
  isError?: boolean
  error?: unknown
  refetch?: () => void
}

function mockQueries(states: {
  dashboard?: QueryState<AdminDashboardMetrics>
  broadcasts?: QueryState<AdminBroadcastHistoryItem[]>
}) {
  useQueryMock.mockImplementation((opts: { queryKey: readonly unknown[] }) => {
    const base: QueryState<unknown> = { data: undefined, isLoading: false, isError: false, error: undefined, refetch: vi.fn() }
    if (opts.queryKey === adminQk.dashboard) return { ...base, ...(states.dashboard ?? {}) }
    if (opts.queryKey === adminQk.broadcastHistory) return { ...base, ...(states.broadcasts ?? {}) }
    return base
  })
}

function mockMutation(state: Partial<{ isPending: boolean; isError: boolean; error: unknown; mutate: () => void }> = {}) {
  useMutationMock.mockReturnValue({
    isPending: false,
    isError: false,
    error: undefined,
    mutate: vi.fn(),
    ...state,
  })
}

const METRICS: AdminDashboardMetrics = {
  totalUsers: 1200,
  activeUsers: 800,
  newSignups: 45,
  checkInsLogged: 2300,
  emergencyResourceViews: 12,
  suspendedAccounts: 3,
}

const BROADCASTS: AdminBroadcastHistoryItem[] = [
  { id: 1, message: 'We shipped a new feature', segment: 'All users', sentAt: '2026-08-05T14:00:00Z' },
]

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
    useMutationMock.mockReset()
    mockMutation()
  })

  it('renders skeletons while loading', () => {
    mockQueries({ dashboard: { isLoading: true }, broadcasts: { isLoading: true } })
    const { container } = render(<AdminDashboardPage />)
    expect(screen.queryByText('Total users')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders an ErrorState with a retry affordance when the dashboard query errors', async () => {
    const refetch = vi.fn()
    mockQueries({
      dashboard: { isError: true, error: new ApiError(500, 'The server had a problem. Try again.'), refetch },
      broadcasts: { data: BROADCASTS },
    })
    const user = userEvent.setup()
    render(<AdminDashboardPage />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The server had a problem. Try again.')
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders an ErrorState with a retry affordance when the broadcast query errors', async () => {
    const refetch = vi.fn()
    mockQueries({
      dashboard: { data: METRICS },
      broadcasts: { isError: true, error: new ApiError(500, 'The server had a problem. Try again.'), refetch },
    })
    const user = userEvent.setup()
    render(<AdminDashboardPage />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The server had a problem. Try again.')
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders metric cards and broadcasts on success', () => {
    mockQueries({ dashboard: { data: METRICS }, broadcasts: { data: BROADCASTS } })
    render(<AdminDashboardPage />)
    expect(screen.getByText('1,200')).toBeInTheDocument()
    expect(screen.getByText('800')).toBeInTheDocument()
    expect(screen.getByText('We shipped a new feature')).toBeInTheDocument()
    expect(screen.getByText('All users')).toBeInTheDocument()
  })

  it('renders "No broadcasts sent yet." when the broadcast list is empty', () => {
    mockQueries({ dashboard: { data: METRICS }, broadcasts: { data: [] } })
    render(<AdminDashboardPage />)
    expect(screen.getByText('No broadcasts sent yet.')).toBeInTheDocument()
  })

  it('falls back to "0" for a metric field that is missing or not a number', () => {
    const badMetrics = { ...METRICS, activeUsers: null } as unknown as AdminDashboardMetrics
    mockQueries({ dashboard: { data: badMetrics }, broadcasts: { data: BROADCASTS } })
    render(<AdminDashboardPage />)
    expect(screen.getByText('Active users')).toBeInTheDocument()
    const card = screen.getByText('Active users').closest('div')
    expect(within(card!).getByText('0')).toBeInTheDocument()
  })

  it('shows the real error message when the CSV export fails', () => {
    mockQueries({ dashboard: { data: METRICS }, broadcasts: { data: BROADCASTS } })
    mockMutation({ isError: true, error: new ApiError(500, 'The server had a problem. Try again.') })
    render(<AdminDashboardPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('The server had a problem. Try again.')
  })
})
