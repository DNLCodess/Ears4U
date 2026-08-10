// components/admin/emergency-resource-sheet.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminEmergencyResourceSheet } from './emergency-resource-sheet'
import * as endpoints from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'
import { adminQk } from '@/lib/query/admin-keys'
import type { AdminEmergencyResource } from '@/lib/api/admin/types'

const RESOURCE: AdminEmergencyResource = {
  id: 7,
  name: 'National Crisis Line',
  country: 'Nigeria',
  resourceType: 'HOTLINE',
  contactInfo: '0800-123-456',
  active: true,
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidateQueries = vi.spyOn(client, 'invalidateQueries')
  const view = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
  return { ...view, invalidateQueries }
}

describe('AdminEmergencyResourceSheet', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders an empty form in create mode', () => {
    renderWithClient(<AdminEmergencyResourceSheet resource={null} open={true} onClose={() => {}} />)

    expect(screen.getByRole('dialog', { name: /add resource/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toHaveValue('')
    expect(screen.getByLabelText(/country/i)).toHaveValue('')
    expect(screen.getByLabelText(/contact info/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: /hotline/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('switch', { name: /active/i })).toHaveAttribute('aria-checked', 'true')
  })

  it('calls createAdminEmergencyResource with the entered values on submit', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'createAdminEmergencyResource').mockResolvedValue(RESOURCE)
    renderWithClient(<AdminEmergencyResourceSheet resource={null} open={true} onClose={() => {}} />)

    await user.type(screen.getByLabelText(/name/i), 'Youth Support Line')
    await user.type(screen.getByLabelText(/country/i), 'Kenya')
    await user.click(screen.getByRole('button', { name: /website/i }))
    await user.type(screen.getByLabelText(/contact info/i), 'https://youthsupport.example')
    await user.click(screen.getByRole('switch', { name: /active/i }))
    await user.click(screen.getByRole('button', { name: /add resource/i }))

    expect(endpoints.createAdminEmergencyResource).toHaveBeenCalledWith({
      name: 'Youth Support Line',
      country: 'Kenya',
      resourceType: 'WEBSITE',
      contactInfo: 'https://youthsupport.example',
      active: false,
    })
  })

  it('calls onClose and invalidates the emergency dashboard after a successful create', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'createAdminEmergencyResource').mockResolvedValue(RESOURCE)
    const onClose = vi.fn()
    const { invalidateQueries } = renderWithClient(
      <AdminEmergencyResourceSheet resource={null} open={true} onClose={onClose} />,
    )

    await user.type(screen.getByLabelText(/name/i), 'Youth Support Line')
    await user.type(screen.getByLabelText(/country/i), 'Kenya')
    await user.type(screen.getByLabelText(/contact info/i), '+254 700 000000')
    await user.click(screen.getByRole('button', { name: /add resource/i }))

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminQk.emergencyDashboard })
  })

  it('pre-fills every field from the passed resource in edit mode', () => {
    renderWithClient(<AdminEmergencyResourceSheet resource={RESOURCE} open={true} onClose={() => {}} />)

    expect(screen.getByRole('dialog', { name: /edit resource/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toHaveValue(RESOURCE.name)
    expect(screen.getByLabelText(/country/i)).toHaveValue(RESOURCE.country)
    expect(screen.getByLabelText(/contact info/i)).toHaveValue(RESOURCE.contactInfo)
    expect(screen.getByRole('button', { name: /hotline/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('switch', { name: /active/i })).toHaveAttribute('aria-checked', 'true')
  })

  it('calls updateAdminEmergencyResource with the resource id and edited values on submit', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'updateAdminEmergencyResource').mockResolvedValue(RESOURCE)
    renderWithClient(<AdminEmergencyResourceSheet resource={RESOURCE} open={true} onClose={() => {}} />)

    await user.clear(screen.getByLabelText(/contact info/i))
    await user.type(screen.getByLabelText(/contact info/i), '0800-999-000')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(endpoints.updateAdminEmergencyResource).toHaveBeenCalledWith(RESOURCE.id, {
      name: RESOURCE.name,
      country: RESOURCE.country,
      resourceType: RESOURCE.resourceType,
      contactInfo: '0800-999-000',
      active: RESOURCE.active,
    })
  })

  it('disables submit when required fields are blank', async () => {
    const user = userEvent.setup()
    renderWithClient(<AdminEmergencyResourceSheet resource={null} open={true} onClose={() => {}} />)

    expect(screen.getByRole('button', { name: /add resource/i })).toBeDisabled()

    await user.type(screen.getByLabelText(/name/i), 'Only name filled in')
    expect(screen.getByRole('button', { name: /add resource/i })).toBeDisabled()
  })

  it('re-disables submit when a required field is cleared in edit mode', async () => {
    const user = userEvent.setup()
    renderWithClient(<AdminEmergencyResourceSheet resource={RESOURCE} open={true} onClose={() => {}} />)

    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()

    await user.clear(screen.getByLabelText(/country/i))
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('shows an error message when creating fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'createAdminEmergencyResource').mockRejectedValue(
      new ApiError(500, 'The server had a problem. Try again.'),
    )
    renderWithClient(<AdminEmergencyResourceSheet resource={null} open={true} onClose={() => {}} />)

    await user.type(screen.getByLabelText(/name/i), 'Youth Support Line')
    await user.type(screen.getByLabelText(/country/i), 'Kenya')
    await user.type(screen.getByLabelText(/contact info/i), '+254 700 000000')
    await user.click(screen.getByRole('button', { name: /add resource/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The server had a problem. Try again.')
  })

  it('shows an error message when updating fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(endpoints, 'updateAdminEmergencyResource').mockRejectedValue(
      new ApiError(409, 'That conflicts with something that already exists.'),
    )
    renderWithClient(<AdminEmergencyResourceSheet resource={RESOURCE} open={true} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That conflicts with something that already exists.')
  })
})
