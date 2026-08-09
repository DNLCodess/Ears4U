// components/admin/user-manage-sheet.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserManageSheet } from './user-manage-sheet'
import * as endpoints from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'
import { adminQk } from '@/lib/query/admin-keys'

const USER = { id: 1, name: 'Grace Okafor', email: 'grace.okafor@example.com', status: 'active' as const, joinedAt: '2026-02-14T00:00:00Z' }
const SUSPENDED_USER = { ...USER, id: 2, status: 'suspended' as const }

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidateQueries = vi.spyOn(client, 'invalidateQueries')
  const view = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
  return { ...view, invalidateQueries }
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

  it('invalidates both the users list and the audit log after a successful suspend', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'suspendAdminUser').mockResolvedValue(undefined)
    const { invalidateQueries } = renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /suspend user/i }))
    await user.click(screen.getByRole('button', { name: /confirm suspend/i }))

    await screen.findByRole('button', { name: /suspend user/i })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminQk.users })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminQk.auditLogs })
  })

  it('invalidates both the users list and the audit log after a successful email change', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'changeAdminUserEmail').mockResolvedValue(undefined)
    const { invalidateQueries } = renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.type(screen.getByLabelText(/new email/i), 'grace.new@example.com')
    await user.click(screen.getByRole('button', { name: /update email/i }))

    await screen.findByText('Email updated.')
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminQk.users })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminQk.auditLogs })
  })

  it('invalidates the audit log after a successful failover code generation', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'generateAdminUserOtp').mockResolvedValue({ otp: '482913' })
    const { invalidateQueries } = renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /generate registration code/i }))

    await screen.findByText('482913')
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminQk.auditLogs })
  })

  it('marks the "Email updated." success message and the generated code as live regions for screen readers', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'changeAdminUserEmail').mockResolvedValue(undefined)
    vi.spyOn(endpoints, 'generateAdminUserOtp').mockResolvedValue({ otp: '482913' })
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.type(screen.getByLabelText(/new email/i), 'grace.new@example.com')
    await user.click(screen.getByRole('button', { name: /update email/i }))
    expect(await screen.findByText('Email updated.')).toHaveAttribute('role', 'status')

    await user.click(screen.getByRole('button', { name: /generate registration code/i }))
    const code = await screen.findByText('482913')
    expect(code.closest('[role="status"]')).not.toBeNull()
  })

  it('clears the "Email updated." success message once the admin starts editing the field again', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'changeAdminUserEmail').mockResolvedValue(undefined)
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.type(screen.getByLabelText(/new email/i), 'grace.new@example.com')
    await user.click(screen.getByRole('button', { name: /update email/i }))
    expect(await screen.findByText('Email updated.')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/new email/i), 'x')
    expect(screen.queryByText('Email updated.')).not.toBeInTheDocument()
  })

  it('copies the generated code to the clipboard when Copy is clicked', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'generateAdminUserOtp').mockResolvedValue({ otp: '482913' })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderWithClient(<UserManageSheet user={USER} open={true} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /generate registration code/i }))
    await screen.findByText('482913')
    await user.click(screen.getByRole('button', { name: /^copy$/i }))

    expect(writeText).toHaveBeenCalledWith('482913')
  })
})
