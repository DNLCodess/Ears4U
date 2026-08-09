// components/admin/user-manage-sheet.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserManageSheet } from './user-manage-sheet'
import * as endpoints from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'

const USER = { id: 1, name: 'Grace Okafor', email: 'grace.okafor@example.com', status: 'active' as const, joinedAt: '2026-02-14T00:00:00Z' }
const SUSPENDED_USER = { ...USER, id: 2, status: 'suspended' as const }

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('UserManageSheet', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when there is no selected user', () => {
    const { container } = renderWithClient(<UserManageSheet user={null} open={false} onClose={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a two-step confirm before suspending an active user', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'suspendAdminUser').mockResolvedValue(undefined)
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /suspend user/i }))
    expect(screen.getByRole('button', { name: /confirm suspend/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm suspend/i }))
    expect(endpoints.suspendAdminUser).toHaveBeenCalledWith('grace.okafor@example.com')
  })

  it('shows an error message when suspending fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'suspendAdminUser').mockRejectedValue(new ApiError(500, 'The server had a problem. Try again.'))
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /suspend user/i }))
    await user.click(screen.getByRole('button', { name: /confirm suspend/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The server had a problem. Try again.')
  })

  it('shows a two-step confirm before reactivating a suspended user and calls reactivateAdminUser', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'reactivateAdminUser').mockResolvedValue(undefined)
    renderWithClient(<UserManageSheet user={SUSPENDED_USER} open={true} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /reactivate user/i }))
    expect(screen.getByRole('button', { name: /confirm reactivate/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm reactivate/i }))
    expect(endpoints.reactivateAdminUser).toHaveBeenCalledWith('grace.okafor@example.com')
  })

  it('calls changeAdminUserEmail with the current and new email on submit', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'changeAdminUserEmail').mockResolvedValue(undefined)
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.type(screen.getByLabelText(/new email/i), 'grace.new@example.com')
    await user.click(screen.getByRole('button', { name: /update email/i }))

    expect(endpoints.changeAdminUserEmail).toHaveBeenCalledWith('grace.okafor@example.com', 'grace.new@example.com')
  })

  it('shows an error message when changing email fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'changeAdminUserEmail').mockRejectedValue(new ApiError(409, 'That conflicts with something that already exists.'))
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.type(screen.getByLabelText(/new email/i), 'grace.new@example.com')
    await user.click(screen.getByRole('button', { name: /update email/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That conflicts with something that already exists.')
  })

  it('shows the generated code after a successful failover request', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'generateAdminUserOtp').mockResolvedValue({ otp: '482913' })
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /generate registration code/i }))

    expect(await screen.findByText('482913')).toBeInTheDocument()
    expect(endpoints.generateAdminUserOtp).toHaveBeenCalledWith('grace.okafor@example.com', 'registration')
  })

  it('shows an error message when generating a failover code fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'generateAdminUserOtp').mockRejectedValue(new ApiError(500, 'The server had a problem. Try again.'))
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /generate registration code/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The server had a problem. Try again.')
  })
})
