import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatJoinedAt, formatLogTime } from './page'
import AdminUsersPage from './page'
import { adminQk } from '@/lib/query/admin-keys'
import { ApiError } from '@/lib/api/errors'
import type { AdminUsersPage as AdminUsersPageData, AdminAuditLogItem } from '@/lib/api/admin/types'

describe('formatJoinedAt', () => {
  it('formats a valid ISO date with the year', () => {
    expect(formatJoinedAt('2026-02-14T14:00:00Z')).toMatch(/Feb\s+14,\s+2026/)
  })
  it('returns an empty string for an invalid date', () => {
    expect(formatJoinedAt('not-a-date')).toBe('')
  })
})

describe('formatLogTime', () => {
  it('formats a valid ISO date as a short month/day string', () => {
    expect(formatLogTime('2026-08-06T10:00:00Z')).toMatch(/Aug\s+6/)
  })
  it('returns an empty string for an invalid date', () => {
    expect(formatLogTime('not-a-date')).toBe('')
  })
})

const useQueryMock = vi.fn()
const useMutationMock = vi.fn()
const useQueryClientMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryKey: readonly unknown[] }) => useQueryMock(opts),
  useMutation: (opts: unknown) => useMutationMock(opts),
  useQueryClient: () => useQueryClientMock(),
  keepPreviousData: Symbol('keepPreviousData'),
}))

type QueryState<T> = {
  data?: T
  isLoading?: boolean
  isError?: boolean
  error?: unknown
  refetch?: () => void
}

function mockQueries(states: {
  users?: QueryState<AdminUsersPageData>
  auditLogs?: QueryState<AdminAuditLogItem[]>
}) {
  useQueryMock.mockImplementation((opts: { queryKey: readonly unknown[] }) => {
    const base: QueryState<unknown> = { data: undefined, isLoading: false, isError: false, error: undefined, refetch: vi.fn() }
    if (opts.queryKey[0] === adminQk.users[0]) return { ...base, ...(states.users ?? {}) }
    if (opts.queryKey[0] === adminQk.auditLogs[0]) return { ...base, ...(states.auditLogs ?? {}) }
    return base
  })
}

const USERS_PAGE: AdminUsersPageData = {
  totalUsers: 2,
  activeUsers: 1,
  suspendedUsers: 1,
  users: [
    { id: '1', name: 'Grace Okafor', email: 'grace.okafor@example.com', status: 'Active', createdAt: '2026-02-14' },
    { id: '2', name: 'Amara Chukwu', email: 'amara.chukwu@example.com', status: 'Suspended', createdAt: '2026-01-20' },
  ],
  currentPage: 0,
  totalPages: 1,
  totalItems: 2,
}

const AUDIT_LOGS: AdminAuditLogItem[] = [
  { id: 1, action: 'Suspended user amara.chukwu@example.com', adminEmail: 'ada@earsforyou.test', timestamp: '2026-08-06T10:00:00Z' },
]

describe('AdminUsersPage', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
    useMutationMock.mockReset()
    useQueryClientMock.mockReset()
    useMutationMock.mockReturnValue({ isPending: false, isError: false, error: undefined, mutate: vi.fn() })
    useQueryClientMock.mockReturnValue({ invalidateQueries: vi.fn() })
  })

  describe('user list panel', () => {
    it('renders skeleton rows while loading', () => {
      mockQueries({ users: { isLoading: true }, auditLogs: { data: AUDIT_LOGS } })
      const { container } = render(<AdminUsersPage />)
      expect(screen.queryByText('Grace Okafor')).not.toBeInTheDocument()
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })

    it('renders an ErrorState with a working retry when the users query errors', async () => {
      const refetch = vi.fn()
      mockQueries({
        users: { isError: true, error: new ApiError(500, 'The server had a problem. Try again.'), refetch },
        auditLogs: { data: AUDIT_LOGS },
      })
      const user = userEvent.setup()
      render(<AdminUsersPage />)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('The server had a problem. Try again.')
      await user.click(screen.getByRole('button', { name: /try again/i }))
      expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('renders "No users match that search." when the result set is empty', () => {
      mockQueries({
        users: { data: { totalUsers: 0, activeUsers: 0, suspendedUsers: 0, users: [], currentPage: 0, totalPages: 1, totalItems: 0 } },
        auditLogs: { data: AUDIT_LOGS },
      })
      render(<AdminUsersPage />)
      expect(screen.getByText('No users match that search.')).toBeInTheDocument()
    })

    it('renders user rows with name, email, status badge, joined date, and a Manage button on success', () => {
      mockQueries({ users: { data: USERS_PAGE }, auditLogs: { data: AUDIT_LOGS } })
      render(<AdminUsersPage />)
      expect(screen.getByText('Grace Okafor')).toBeInTheDocument()
      expect(screen.getByText('grace.okafor@example.com')).toBeInTheDocument()
      // "Active" and "Suspended" also label the filter pills, so a status badge
      // adds one more match rather than being the only one.
      expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('Amara Chukwu')).toBeInTheDocument()
      expect(screen.getByText('amara.chukwu@example.com')).toBeInTheDocument()
      expect(screen.getAllByText('Suspended').length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('Feb 14, 2026')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Manage' })).toHaveLength(2)
    })
  })

  describe('audit log panel', () => {
    it('renders a skeleton while loading', () => {
      mockQueries({ users: { data: USERS_PAGE }, auditLogs: { isLoading: true } })
      const { container } = render(<AdminUsersPage />)
      expect(screen.queryByText('Suspended user amara.chukwu@example.com')).not.toBeInTheDocument()
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })

    it('renders an ErrorState with a working retry when the audit log query errors', async () => {
      const refetch = vi.fn()
      mockQueries({
        users: { data: USERS_PAGE },
        auditLogs: { isError: true, error: new ApiError(500, 'The server had a problem. Try again.'), refetch },
      })
      const user = userEvent.setup()
      render(<AdminUsersPage />)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('The server had a problem. Try again.')
      await user.click(screen.getByRole('button', { name: /try again/i }))
      expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('renders "No audit activity yet." when there are no log entries', () => {
      mockQueries({ users: { data: USERS_PAGE }, auditLogs: { data: [] } })
      render(<AdminUsersPage />)
      expect(screen.getByText('No audit activity yet.')).toBeInTheDocument()
    })

    it('renders action, actor, and timestamp rows on success', () => {
      mockQueries({ users: { data: USERS_PAGE }, auditLogs: { data: AUDIT_LOGS } })
      render(<AdminUsersPage />)
      expect(screen.getByText('Suspended user amara.chukwu@example.com')).toBeInTheDocument()
      expect(screen.getByText('ada@earsforyou.test')).toBeInTheDocument()
      expect(screen.getByText(/Aug\s+6/)).toBeInTheDocument()
    })
  })

  it('renders the two panels independently: user list succeeds while the audit log panel is still loading', () => {
    mockQueries({ users: { data: USERS_PAGE }, auditLogs: { isLoading: true } })
    const { container } = render(<AdminUsersPage />)
    expect(screen.getByText('Grace Okafor')).toBeInTheDocument()
    expect(screen.getByText('Amara Chukwu')).toBeInTheDocument()
    expect(screen.queryByText('Suspended user amara.chukwu@example.com')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  describe('search, filters, and pagination', () => {
    const USERS_PAGE_MULTI: AdminUsersPageData = { ...USERS_PAGE, currentPage: 0, totalPages: 3 }

    function lastUsersQueryParams() {
      const calls = (useQueryMock.mock.calls as [{ queryKey: readonly unknown[] }][])
        .map(call => call[0])
        .filter(opts => opts.queryKey[0] === adminQk.users[0])
      return calls.at(-1)?.queryKey[1] as { search: string; status: string; page: number } | undefined
    }

    it('puts typed search text into the users query key and resets page to 1', async () => {
      mockQueries({ users: { data: USERS_PAGE_MULTI }, auditLogs: { data: AUDIT_LOGS } })
      const user = userEvent.setup()
      render(<AdminUsersPage />)

      // Advance to page 2 first so we can prove the search resets it back to 1.
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(lastUsersQueryParams()).toMatchObject({ page: 2 })

      await user.type(screen.getByLabelText('Search'), 'grace')

      expect(lastUsersQueryParams()).toMatchObject({ search: 'grace', page: 1 })
    })

    it('puts the clicked status filter into the users query key and resets page to 1', async () => {
      mockQueries({ users: { data: USERS_PAGE_MULTI }, auditLogs: { data: AUDIT_LOGS } })
      const user = userEvent.setup()
      render(<AdminUsersPage />)

      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(lastUsersQueryParams()).toMatchObject({ page: 2 })

      await user.click(screen.getByRole('button', { name: 'Active' }))

      expect(lastUsersQueryParams()).toMatchObject({ status: 'ACTIVE', page: 1 })
    })

    it('increments page in the users query key when Next is clicked', async () => {
      mockQueries({ users: { data: USERS_PAGE_MULTI }, auditLogs: { data: AUDIT_LOGS } })
      const user = userEvent.setup()
      render(<AdminUsersPage />)

      expect(lastUsersQueryParams()).toMatchObject({ page: 1 })
      await user.click(screen.getByRole('button', { name: 'Next' }))

      expect(lastUsersQueryParams()).toMatchObject({ page: 2 })
    })

    it('renders pagination controls even when the current page has no users, so an admin can still click Previous', async () => {
      mockQueries({
        users: { data: { totalUsers: 0, activeUsers: 0, suspendedUsers: 0, users: [], currentPage: 1, totalPages: 2, totalItems: 0 } },
        auditLogs: { data: AUDIT_LOGS },
      })
      const user = userEvent.setup()
      render(<AdminUsersPage />)

      expect(screen.getByText('No users match that search.')).toBeInTheDocument()
      // Local page state starts at 1; advance it so Previous becomes enabled,
      // mirroring an admin already on page 2 whose list just emptied out
      // after an action (e.g. suspending the only remaining active user).
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    })
  })

  describe('opening the manage sheet', () => {
    it('opens UserManageSheet with the clicked row\'s user when Manage is clicked', async () => {
      mockQueries({ users: { data: USERS_PAGE }, auditLogs: { data: AUDIT_LOGS } })
      const user = userEvent.setup()
      render(<AdminUsersPage />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      const manageButtons = screen.getAllByRole('button', { name: 'Manage' })
      await user.click(manageButtons[1])

      const dialog = screen.getByRole('dialog', { name: 'Amara Chukwu' })
      expect(dialog).toBeInTheDocument()
      // Amara is suspended in USERS_PAGE, so the sheet should offer reactivation,
      // confirming it received the correct user rather than a stale/wrong one.
      expect(screen.getByRole('button', { name: /reactivate user/i })).toBeInTheDocument()
    })
  })
})
