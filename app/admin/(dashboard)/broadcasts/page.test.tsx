import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminBroadcastsPage from './page'
import * as endpoints from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { ApiError } from '@/lib/api/errors'
import type { AdminNotificationDashboardResponse } from '@/lib/api/admin/types'

const useQueryMock = vi.fn()
const useMutationMock = vi.fn()
const useQueryClientMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryKey: readonly unknown[] }) => useQueryMock(opts),
  useMutation: (opts: { mutationFn: () => unknown }) => useMutationMock(opts),
  useQueryClient: () => useQueryClientMock(),
}))

type MutationOpts = {
  mutationFn: () => Promise<unknown>
  onSuccess?: (data: unknown) => unknown
  onError?: (error: unknown) => unknown
}

// A small stand-in for react-query's real useMutation: it uses React's own useState internally
// (this function runs inside the component's render, so calling a real hook here is legal) and
// actually calls through to the `onSuccess`/`onError` passed to `useMutation`, so the form's
// clear-on-success and keep-on-error behavior can be exercised for real, not just asserted via
// mock call arguments.
function useFakeMutation(opts: MutationOpts) {
  const [state, setState] = useState<{ isPending: boolean; isError: boolean; isSuccess: boolean; error: unknown }>({
    isPending: false, isError: false, isSuccess: false, error: undefined,
  })
  return {
    ...state,
    mutate: () => {
      setState({ isPending: true, isError: false, isSuccess: false, error: undefined })
      void opts.mutationFn().then(
        data => {
          setState({ isPending: false, isError: false, isSuccess: true, error: undefined })
          opts.onSuccess?.(data)
        },
        error => {
          setState({ isPending: false, isError: true, isSuccess: false, error })
          opts.onError?.(error)
        },
      )
    },
    reset: () => setState({ isPending: false, isError: false, isSuccess: false, error: undefined }),
  }
}

type QueryState<T> = {
  data?: T
  isLoading?: boolean
  isError?: boolean
  error?: unknown
  refetch?: () => void
}

function mockQueries(state: QueryState<AdminNotificationDashboardResponse>) {
  useQueryMock.mockImplementation((opts: { queryKey: readonly unknown[] }) => {
    const base: QueryState<unknown> = { data: undefined, isLoading: false, isError: false, error: undefined, refetch: vi.fn() }
    if (opts.queryKey[0] === adminQk.broadcastHistory[0]) return { ...base, ...state }
    return base
  })
}

const HISTORY: AdminNotificationDashboardResponse = {
  totalSent: 128,
  toAllUsers: 96,
  reEngagement: 32,
  notifications: [
    {
      formattedId: 'NTF-0001',
      title: 'Service disruption notice',
      message: 'We are aware of the recent slow load times and are working on a fix.',
      segment: 'ALL_USERS',
      sentAt: '2026-08-05T14:00:00Z',
    },
    {
      formattedId: 'NTF-0002',
      title: 'New breathing exercise',
      message: 'New breathing exercise added to the check-in flow.',
      segment: 'RE_ENGAGEMENT',
      sentAt: '2026-07-28T09:30:00Z',
    },
  ],
}

let invalidateQueries: ReturnType<typeof vi.fn>

describe('AdminBroadcastsPage', () => {
  beforeEach(() => {
    // Restores any per-test `vi.spyOn(endpoints, 'sendAdminBroadcast')` spy (and clears its call
    // history) before the next test re-spies it, so call-count assertions in one test can't pick
    // up calls left over from a previous test.
    vi.restoreAllMocks()
    useQueryMock.mockReset()
    useMutationMock.mockReset()
    useQueryClientMock.mockReset()
    useMutationMock.mockImplementation(useFakeMutation)
    invalidateQueries = vi.fn().mockResolvedValue(undefined)
    useQueryClientMock.mockReturnValue({ invalidateQueries })
  })

  it('renders skeleton cards and a skeleton history list while loading', () => {
    mockQueries({ isLoading: true })
    const { container } = render(<AdminBroadcastsPage />)
    expect(screen.queryByText('Total sent')).not.toBeInTheDocument()
    expect(screen.queryByText('Service disruption notice')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders an ErrorState with a working retry when the history query errors', async () => {
    const refetch = vi.fn()
    mockQueries({ isError: true, error: new ApiError(500, 'The server had a problem. Try again.'), refetch })
    const user = userEvent.setup()
    render(<AdminBroadcastsPage />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The server had a problem. Try again.')
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders "No broadcasts sent yet." when there are no notifications', () => {
    mockQueries({ data: { totalSent: 0, toAllUsers: 0, reEngagement: 0, notifications: [] } })
    render(<AdminBroadcastsPage />)
    expect(screen.getByText('No broadcasts sent yet.')).toBeInTheDocument()
  })

  it('renders summary cards with correct counts and history rows with title/message/segment/sentAt on success', () => {
    mockQueries({ data: HISTORY })
    render(<AdminBroadcastsPage />)

    expect(screen.getByText('Total sent')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
    expect(screen.getByText('To all users')).toBeInTheDocument()
    expect(screen.getByText('96')).toBeInTheDocument()
    expect(screen.getAllByText('Re-engagement').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('32')).toBeInTheDocument()

    expect(screen.getByText('Service disruption notice')).toBeInTheDocument()
    expect(screen.getByText(/aware of the recent slow load times/)).toBeInTheDocument()
    expect(screen.getByText('New breathing exercise')).toBeInTheDocument()

    expect(screen.getByText('All users', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Re-engagement', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Aug 5')).toBeInTheDocument()
    expect(screen.getByText('Jul 28')).toBeInTheDocument()
  })

  it('sorts the history list by sentAt descending, even when the data arrives oldest-first', () => {
    mockQueries({ data: { ...HISTORY, notifications: [...HISTORY.notifications].reverse() } })
    render(<AdminBroadcastsPage />)

    const newer = screen.getByText('Service disruption notice') // sentAt 2026-08-05
    const older = screen.getByText('New breathing exercise') // sentAt 2026-07-28
    expect(newer.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('hides the "Broadcast history" heading when the history query errors, instead of leaving it orphaned', () => {
    mockQueries({ isError: true, error: new ApiError(500, 'The server had a problem. Try again.') })
    render(<AdminBroadcastsPage />)
    expect(screen.queryByText('Broadcast history')).not.toBeInTheDocument()
  })

  describe('compose form validation', () => {
    it('disables Send until both Title and Message are non-empty', async () => {
      mockQueries({ data: HISTORY })
      const user = userEvent.setup()
      render(<AdminBroadcastsPage />)

      const sendButton = screen.getByRole('button', { name: /send broadcast/i })
      expect(sendButton).toBeDisabled()

      await user.type(screen.getByLabelText(/title/i), 'Heads up')
      expect(sendButton).toBeDisabled()

      await user.type(screen.getByLabelText(/message/i), 'Something happened')
      expect(sendButton).toBeEnabled()

      await user.clear(screen.getByLabelText(/title/i))
      expect(sendButton).toBeDisabled()
    })

    it('caps Title and Message with a maxLength, matching the required-field validation posture', () => {
      mockQueries({ data: HISTORY })
      render(<AdminBroadcastsPage />)
      expect(screen.getByLabelText(/title/i)).toHaveAttribute('maxLength', '120')
      expect(screen.getByLabelText(/message/i)).toHaveAttribute('maxLength', '500')
    })
  })

  describe('ALL_USERS confirmation', () => {
    it('reveals a confirm step instead of sending immediately when segment is ALL_USERS (the default)', async () => {
      vi.spyOn(endpoints, 'sendAdminBroadcast').mockResolvedValue({ message: 'Broadcast event successfully queued for delivery.' })
      mockQueries({ data: HISTORY })
      const user = userEvent.setup()
      render(<AdminBroadcastsPage />)

      await user.type(screen.getByLabelText(/title/i), 'Heads up')
      await user.type(screen.getByLabelText(/message/i), 'Something happened')
      await user.click(screen.getByRole('button', { name: /send broadcast/i }))

      expect(endpoints.sendAdminBroadcast).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /confirm send to all users/i })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /confirm send to all users/i }))
      expect(endpoints.sendAdminBroadcast).toHaveBeenCalledTimes(1)
    })

    it('lets the admin cancel out of the confirm step without sending anything', async () => {
      vi.spyOn(endpoints, 'sendAdminBroadcast').mockResolvedValue({ message: 'Broadcast event successfully queued for delivery.' })
      mockQueries({ data: HISTORY })
      const user = userEvent.setup()
      render(<AdminBroadcastsPage />)

      await user.type(screen.getByLabelText(/title/i), 'Heads up')
      await user.type(screen.getByLabelText(/message/i), 'Something happened')
      await user.click(screen.getByRole('button', { name: /send broadcast/i }))
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByRole('button', { name: /confirm send to all users/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send broadcast/i })).toBeInTheDocument()
      expect(endpoints.sendAdminBroadcast).not.toHaveBeenCalled()
    })

    it('sends immediately with a single click for the lower-blast-radius segments', async () => {
      vi.spyOn(endpoints, 'sendAdminBroadcast').mockResolvedValue({ message: 'Broadcast event successfully queued for delivery.' })
      mockQueries({ data: HISTORY })
      const user = userEvent.setup()
      render(<AdminBroadcastsPage />)

      await user.type(screen.getByLabelText(/title/i), 'Heads up')
      await user.type(screen.getByLabelText(/message/i), 'Something happened')
      await user.click(screen.getByRole('button', { name: /re-engagement/i }))
      await user.click(screen.getByRole('button', { name: /send broadcast/i }))

      expect(endpoints.sendAdminBroadcast).toHaveBeenCalledTimes(1)
    })
  })

  describe('sending a broadcast', () => {
    it('calls sendAdminBroadcast with the right payload, clears the form, shows a confirmation, and invalidates broadcastHistory', async () => {
      vi.spyOn(endpoints, 'sendAdminBroadcast').mockResolvedValue({ message: 'Broadcast event successfully queued for delivery.' })
      mockQueries({ data: HISTORY })
      const user = userEvent.setup()
      render(<AdminBroadcastsPage />)

      await user.type(screen.getByLabelText(/title/i), 'Heads up')
      await user.type(screen.getByLabelText(/message/i), 'Something happened')
      await user.click(screen.getByRole('button', { name: /re-engagement/i }))
      await user.click(screen.getByRole('button', { name: /send broadcast/i }))

      expect(endpoints.sendAdminBroadcast).toHaveBeenCalledWith({
        title: 'Heads up',
        message: 'Something happened',
        segment: 'RE_ENGAGEMENT',
      })

      expect(await screen.findByRole('status')).toHaveTextContent('Broadcast queued for delivery.')
      expect(screen.getByLabelText(/title/i)).toHaveValue('')
      expect(screen.getByLabelText(/message/i)).toHaveValue('')

      await vi.waitFor(() => {
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminQk.broadcastHistory })
      })
    })

    it('shows an inline error and does not clear the form when the send fails', async () => {
      let rejectSend: (err: unknown) => void = () => {}
      const pending = new Promise<unknown>((_resolve, reject) => { rejectSend = reject })
      vi.spyOn(endpoints, 'sendAdminBroadcast').mockReturnValue(pending)
      mockQueries({ data: HISTORY })
      const user = userEvent.setup()
      render(<AdminBroadcastsPage />)

      await user.type(screen.getByLabelText(/title/i), 'Heads up')
      await user.type(screen.getByLabelText(/message/i), 'Something happened')
      await user.click(screen.getByRole('button', { name: /re-engagement/i }))
      await user.click(screen.getByRole('button', { name: /send broadcast/i }))

      rejectSend(new ApiError(500, 'The server had a problem. Try again.'))

      expect(await screen.findByRole('alert')).toHaveTextContent('The server had a problem. Try again.')
      expect(screen.getByLabelText(/title/i)).toHaveValue('Heads up')
      expect(screen.getByLabelText(/message/i)).toHaveValue('Something happened')
      expect(invalidateQueries).not.toHaveBeenCalled()
    })

    it('does not drop the in-flight send when a field is edited while it is still pending', async () => {
      let resolveSend: (value: unknown) => void = () => {}
      const pending = new Promise(resolve => { resolveSend = resolve })
      vi.spyOn(endpoints, 'sendAdminBroadcast').mockReturnValue(pending)
      mockQueries({ data: HISTORY })
      const user = userEvent.setup()
      render(<AdminBroadcastsPage />)

      await user.type(screen.getByLabelText(/title/i), 'Heads up')
      await user.type(screen.getByLabelText(/message/i), 'Something happened')
      await user.click(screen.getByRole('button', { name: /re-engagement/i }))
      await user.click(screen.getByRole('button', { name: /send broadcast/i }))

      // The send is still in flight (the mocked promise hasn't resolved yet). The submit button
      // shows its busy state and is disabled, so a second click can't queue a duplicate broadcast.
      expect(screen.getByRole('button', { name: /one moment/i })).toBeDisabled()

      // Edit a field mid-flight - this must not detach from the in-flight mutation.
      await user.type(screen.getByLabelText(/title/i), '!')

      resolveSend({ message: 'Broadcast event successfully queued for delivery.' })

      expect(await screen.findByRole('status')).toHaveTextContent('Broadcast queued for delivery.')
      expect(screen.getByLabelText(/title/i)).toHaveValue('')
      expect(screen.getByLabelText(/message/i)).toHaveValue('')
      expect(endpoints.sendAdminBroadcast).toHaveBeenCalledTimes(1)
      await vi.waitFor(() => {
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminQk.broadcastHistory })
      })
    })
  })
})
