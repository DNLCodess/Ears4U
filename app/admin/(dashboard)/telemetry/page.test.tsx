import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminTelemetryPage from './page'
import { adminQk } from '@/lib/query/admin-keys'
import { ApiError } from '@/lib/api/errors'
import type { AdminTelemetry } from '@/lib/api/admin/types'

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

function mockTelemetryQuery(state: QueryState<AdminTelemetry>) {
  useQueryMock.mockImplementation((opts: { queryKey: readonly unknown[] }) => {
    const base: QueryState<AdminTelemetry> = { data: undefined, isLoading: false, isError: false, error: undefined, refetch: vi.fn() }
    if (opts.queryKey === adminQk.telemetry) return { ...base, ...state }
    return base
  })
}

const TELEMETRY: AdminTelemetry = {
  totalRequests: 5800,
  successfulRequests: 5400,
  failedRequests: 400,
  averageLatencyMs: 145,
  providerStatus: 'OPERATIONAL',
  requestTimeline: [
    { date: '2026-07-24', totalRequests: 300, successfulRequests: 280, failedRequests: 20 },
    { date: '2026-07-25', totalRequests: 420, successfulRequests: 400, failedRequests: 20 },
  ],
}

describe('AdminTelemetryPage', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
  })

  it('renders skeletons and an explicit "checking" message while loading', () => {
    mockTelemetryQuery({ isLoading: true })
    const { container } = render(<AdminTelemetryPage />)
    expect(screen.getByText(/checking ai provider status/i)).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText('Total requests')).not.toBeInTheDocument()
  })

  it('renders an ErrorState with a retry affordance on error', async () => {
    const refetch = vi.fn()
    mockTelemetryQuery({ isError: true, error: new ApiError(500, 'The server had a problem. Try again.'), refetch })
    const user = userEvent.setup()
    render(<AdminTelemetryPage />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The server had a problem. Try again.')
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders the four metric cards with correctly formatted numbers on success', () => {
    mockTelemetryQuery({ data: TELEMETRY })
    render(<AdminTelemetryPage />)
    expect(screen.getByText('Total requests')).toBeInTheDocument()
    expect(screen.getByText('5,800')).toBeInTheDocument()
    expect(screen.getByText('Successful requests')).toBeInTheDocument()
    expect(screen.getByText('5,400')).toBeInTheDocument()
    expect(screen.getByText('Failed requests')).toBeInTheDocument()
    expect(screen.getByText('400')).toBeInTheDocument()
    expect(screen.getByText('Average latency')).toBeInTheDocument()
    expect(screen.getByText('145 ms')).toBeInTheDocument()
  })

  it('renders the request timeline chart fed from requestTimeline', () => {
    mockTelemetryQuery({ data: TELEMETRY })
    render(<AdminTelemetryPage />)
    expect(screen.getByText('Request timeline')).toBeInTheDocument()
    // TimeSeriesChart shows the latest point's value - the last requestTimeline point's
    // totalRequests (420), proving the { date, value } mapping used totalRequests not another field.
    expect(screen.getByText(/latest: 420/i)).toBeInTheDocument()
  })

  it('shows an operational badge in leaf tokens when the provider is up', () => {
    mockTelemetryQuery({ data: TELEMETRY })
    render(<AdminTelemetryPage />)
    const badge = screen.getByText('Operational')
    expect(badge.className).toContain('bg-leaf/15')
    expect(badge.className).toContain('text-leaf')
  })

  it('shows an offline badge in clay tokens when the provider is down', () => {
    mockTelemetryQuery({ data: { ...TELEMETRY, providerStatus: 'OFFLINE' } })
    render(<AdminTelemetryPage />)
    const badge = screen.getByText('Offline')
    expect(badge.className).toContain('bg-clay/15')
    expect(badge.className).toContain('text-clay')
    expect(screen.queryByText('Operational')).not.toBeInTheDocument()
  })
})
