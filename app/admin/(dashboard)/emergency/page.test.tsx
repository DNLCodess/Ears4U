import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminEmergencyPage from './page'
import * as endpoints from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { ApiError } from '@/lib/api/errors'
import type { AdminEmergencyDashboard } from '@/lib/api/admin/types'

const useQueryMock = vi.fn()
const useMutationMock = vi.fn()
const useQueryClientMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryKey: readonly unknown[] }) => useQueryMock(opts),
  useMutation: (opts: { mutationFn: () => unknown }) => useMutationMock(opts),
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

function mockQueries(state: QueryState<AdminEmergencyDashboard>) {
  useQueryMock.mockImplementation((opts: { queryKey: readonly unknown[] }) => {
    const base: QueryState<unknown> = { data: undefined, isLoading: false, isError: false, error: undefined, refetch: vi.fn() }
    if (opts.queryKey[0] === adminQk.emergencyDashboard[0]) return { ...base, ...state }
    return base
  })
}

const DASHBOARD: AdminEmergencyDashboard = {
  totalHotlines: 2,
  totalWebsites: 1,
  totalClinics: 1,
  activeCountriesCount: 3,
  resources: [
    { id: 1, name: 'National Crisis Line', country: 'United States', resourceType: 'HOTLINE', contactInfo: '988', active: true },
    { id: 2, name: 'Old Community Line', country: 'Canada', resourceType: 'HOTLINE', contactInfo: '1-800-000-0000', active: false },
    { id: 3, name: 'BetterHelp', country: 'United States', resourceType: 'WEBSITE', contactInfo: 'betterhelp.com', active: true },
    { id: 4, name: 'LUTH', country: 'Nigeria', resourceType: 'CLINIC', contactInfo: '+234 1 545 0000', active: true },
  ],
}

describe('AdminEmergencyPage', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
    useMutationMock.mockReset()
    useQueryClientMock.mockReset()
    // Mimics real react-query behaviour just enough for these tests: calling `mutate()` invokes
    // the `mutationFn` passed to `useMutation`, so clicking through the UI actually reaches the
    // real endpoint function (which tests spy on), without depending on react-query internals.
    useMutationMock.mockImplementation((opts: { mutationFn: () => unknown }) => ({
      isPending: false,
      isError: false,
      error: undefined,
      mutate: () => { void opts.mutationFn() },
      reset: vi.fn(),
    }))
    useQueryClientMock.mockReturnValue({ invalidateQueries: vi.fn() })
  })

  it('renders skeleton cards and a skeleton list while loading', () => {
    mockQueries({ isLoading: true })
    const { container } = render(<AdminEmergencyPage />)
    expect(screen.queryByText('National Crisis Line')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders an ErrorState with a working retry when the dashboard query errors', async () => {
    const refetch = vi.fn()
    mockQueries({ isError: true, error: new ApiError(500, 'The server had a problem. Try again.'), refetch })
    const user = userEvent.setup()
    render(<AdminEmergencyPage />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The server had a problem. Try again.')
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders "No emergency resources yet. Add one to get started." when there are no resources', () => {
    mockQueries({
      data: { totalHotlines: 0, totalWebsites: 0, totalClinics: 0, activeCountriesCount: 0, resources: [] },
    })
    render(<AdminEmergencyPage />)
    expect(screen.getByText('No emergency resources yet. Add one to get started.')).toBeInTheDocument()
  })

  it('renders summary cards with correct counts and rows with name/type badge/active badge/contact info on success', () => {
    mockQueries({ data: DASHBOARD })
    render(<AdminEmergencyPage />)

    expect(screen.getByText('Hotlines')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Websites')).toBeInTheDocument()
    expect(screen.getByText('Clinics')).toBeInTheDocument()
    expect(screen.getByText('Active countries')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    expect(screen.getByText('National Crisis Line')).toBeInTheDocument()
    expect(screen.getByText('Old Community Line')).toBeInTheDocument()
    expect(screen.getByText('BetterHelp')).toBeInTheDocument()
    expect(screen.getByText('LUTH')).toBeInTheDocument()

    expect(screen.getAllByText('Hotline')).toHaveLength(2)
    expect(screen.getByText('Website')).toBeInTheDocument()
    expect(screen.getByText('Clinic')).toBeInTheDocument()

    expect(screen.getAllByText('Active')).toHaveLength(3)
    expect(screen.getByText('Inactive')).toBeInTheDocument()

    expect(screen.getByText(/988/)).toBeInTheDocument()
  })

  describe('opening the sheet', () => {
    it('opens AdminEmergencyResourceSheet in create mode (empty form) when "+ Add resource" is clicked', async () => {
      mockQueries({ data: DASHBOARD })
      const user = userEvent.setup()
      render(<AdminEmergencyPage />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '+ Add resource' }))

      const dialog = screen.getByRole('dialog', { name: /add resource/i })
      expect(dialog).toBeInTheDocument()
      expect(screen.getByLabelText(/name/i)).toHaveValue('')
      expect(screen.getByLabelText(/country/i)).toHaveValue('')
      expect(screen.getByLabelText(/contact info/i)).toHaveValue('')
    })

    it('opens AdminEmergencyResourceSheet pre-filled with the clicked row when Edit is clicked', async () => {
      mockQueries({ data: DASHBOARD })
      const user = userEvent.setup()
      render(<AdminEmergencyPage />)

      const editButtons = screen.getAllByRole('button', { name: 'Edit' })
      // Row index 1 is "Old Community Line" (id 2): inactive, HOTLINE, Canada.
      await user.click(editButtons[1])

      const dialog = screen.getByRole('dialog', { name: /edit resource/i })
      expect(dialog).toBeInTheDocument()
      expect(screen.getByLabelText(/name/i)).toHaveValue('Old Community Line')
      expect(screen.getByLabelText(/country/i)).toHaveValue('Canada')
      expect(screen.getByLabelText(/contact info/i)).toHaveValue('1-800-000-0000')
      expect(screen.getByRole('radio', { name: /hotline/i })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('switch', { name: /active/i })).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('deleting a resource', () => {
    it('reveals Confirm/Cancel in place of Delete, and Cancel returns to the Delete label without deleting', async () => {
      vi.spyOn(endpoints, 'deleteAdminEmergencyResource').mockResolvedValue({ message: 'Emergency resource deleted successfully.' })
      mockQueries({ data: DASHBOARD })
      const user = userEvent.setup()
      render(<AdminEmergencyPage />)

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      await user.click(deleteButtons[2])

      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(4)
      expect(endpoints.deleteAdminEmergencyResource).not.toHaveBeenCalled()
    })

    it('calls deleteAdminEmergencyResource with the clicked row\'s id when Confirm is clicked', async () => {
      vi.spyOn(endpoints, 'deleteAdminEmergencyResource').mockResolvedValue({ message: 'Emergency resource deleted successfully.' })
      mockQueries({ data: DASHBOARD })
      const user = userEvent.setup()
      render(<AdminEmergencyPage />)

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      // Row index 2 is "BetterHelp" (id 3).
      await user.click(deleteButtons[2])
      await user.click(screen.getByRole('button', { name: 'Confirm' }))

      expect(endpoints.deleteAdminEmergencyResource).toHaveBeenCalledWith(3)
    })
  })
})
