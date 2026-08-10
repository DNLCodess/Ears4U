import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminSettingsPage from './page'
import * as endpoints from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { ApiError } from '@/lib/api/errors'
import type { AdminSystemSettings } from '@/lib/api/admin/types'

const useQueryMock = vi.fn()
const useMutationMock = vi.fn()
const useQueryClientMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryKey: readonly unknown[] }) => useQueryMock(opts),
  useMutation: (opts: unknown) => useMutationMock(opts),
  useQueryClient: () => useQueryClientMock(),
}))

type MutationOpts<TVariables> = {
  mutationFn: (variables: TVariables) => Promise<unknown>
  onSuccess?: (data: unknown, variables: TVariables) => unknown
  onError?: (error: unknown) => unknown
}

// Mirrors the real useMutation closely enough to exercise onSuccess/onError and, crucially, to
// track `variables` the way react-query does - the page's per-field "Reset to default" buttons
// key their busy/error state off `resetMutation.variables === settingKey` since all 19 fields
// share a single mutation instance.
function useFakeMutation<TVariables = void>(opts: MutationOpts<TVariables>) {
  const [state, setState] = useState<{
    isPending: boolean
    isError: boolean
    error: unknown
    variables: TVariables | undefined
  }>({ isPending: false, isError: false, error: undefined, variables: undefined })
  return {
    ...state,
    mutate: (variables?: TVariables) => {
      setState(s => ({ ...s, isPending: true, isError: false, error: undefined, variables: variables as TVariables }))
      void opts.mutationFn(variables as TVariables).then(
        data => {
          setState(s => ({ ...s, isPending: false, isError: false, error: undefined }))
          opts.onSuccess?.(data, variables as TVariables)
        },
        error => {
          setState(s => ({ ...s, isPending: false, isError: true, error }))
          opts.onError?.(error)
        },
      )
    },
    reset: () => setState(s => ({ ...s, isPending: false, isError: false, error: undefined })),
  }
}

type QueryState<T> = {
  data?: T
  isLoading?: boolean
  isError?: boolean
  error?: unknown
  refetch?: () => void
}

function mockQueries(state: QueryState<AdminSystemSettings>) {
  useQueryMock.mockImplementation((opts: { queryKey: readonly unknown[] }) => {
    const base: QueryState<unknown> = { data: undefined, isLoading: false, isError: false, error: undefined, refetch: vi.fn() }
    if (opts.queryKey[0] === adminQk.settings[0]) return { ...base, ...state }
    return base
  })
}

const SETTINGS: AdminSystemSettings = {
  apiConfiguration: { baseUrl: 'https://api.earsfor.you', apiVersion: 'v1', rateLimitPerMinute: 120, timeoutMs: 5000 },
  emailConfiguration: { apiKey: 'sk-x****************3f2a', senderEmail: 'hello@earsfor.you', senderName: 'EarsForYou' },
  otpConfiguration: { otpLength: 6, otpExpiryMinutes: 10, maxAttempts: 3, deliveryChannel: 'EMAIL' },
  securitySettings: {
    jwtExpiryMinutes: 60, refreshTokenExpiryDays: 7, maxLoginAttempts: 5,
    sessionTimeoutMinutes: 30, mfaEnabled: true, ipWhitelistEnabled: false,
  },
  aiConfiguration: { enableAiChat: true, aiSystemPrompt: 'You are a mental health support assistant for Ears for You.' },
}

let invalidateQueries: ReturnType<typeof vi.fn>
let getQueryData: ReturnType<typeof vi.fn>

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
    useMutationMock.mockReset()
    useQueryClientMock.mockReset()
    useMutationMock.mockImplementation(useFakeMutation)
    invalidateQueries = vi.fn().mockResolvedValue(undefined)
    getQueryData = vi.fn().mockReturnValue(undefined)
    useQueryClientMock.mockReturnValue({ invalidateQueries, getQueryData })
    vi.restoreAllMocks()
  })

  it('renders a skeleton form while loading', () => {
    mockQueries({ isLoading: true })
    const { container } = render(<AdminSettingsPage />)
    expect(screen.queryByText('API Configuration')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders an ErrorState with a working retry when the settings query errors', async () => {
    const refetch = vi.fn()
    mockQueries({ isError: true, error: new ApiError(500, 'The server had a problem. Try again.'), refetch })
    const user = userEvent.setup()
    render(<AdminSettingsPage />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The server had a problem. Try again.')
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders all five sections with correct values on success', () => {
    mockQueries({ data: SETTINGS })
    render(<AdminSettingsPage />)

    expect(screen.getByText('API Configuration')).toBeInTheDocument()
    expect(screen.getByText('Email Configuration')).toBeInTheDocument()
    expect(screen.getByText('OTP Configuration')).toBeInTheDocument()
    expect(screen.getByText('Security Settings')).toBeInTheDocument()
    expect(screen.getByText('AI Configuration')).toBeInTheDocument()

    expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.earsfor.you')
    expect(screen.getByLabelText('API version')).toHaveValue('v1')
    expect(screen.getByLabelText('Rate limit (per minute)')).toHaveValue(120)
    expect(screen.getByLabelText('Timeout (ms)')).toHaveValue(5000)

    expect(screen.getByText('sk-x****************3f2a')).toBeInTheDocument()
    expect(screen.getByLabelText('Sender email')).toHaveValue('hello@earsfor.you')
    expect(screen.getByLabelText('Sender name')).toHaveValue('EarsForYou')

    expect(screen.getByLabelText('OTP length')).toHaveValue(6)
    expect(screen.getByLabelText('OTP expiry (minutes)')).toHaveValue(10)
    expect(screen.getByLabelText('Max attempts')).toHaveValue(3)
    expect(screen.getByRole('button', { name: 'EMAIL' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'SMS' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'BOTH' })).toHaveAttribute('aria-pressed', 'false')

    expect(screen.getByLabelText('JWT expiry (minutes)')).toHaveValue(60)
    expect(screen.getByLabelText('Refresh token expiry (days)')).toHaveValue(7)
    expect(screen.getByLabelText('Max login attempts')).toHaveValue(5)
    expect(screen.getByLabelText('Session timeout (minutes)')).toHaveValue(30)
    expect(screen.getByRole('switch', { name: 'Multi-factor authentication' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('switch', { name: 'IP whitelist' })).toHaveAttribute('aria-checked', 'false')

    expect(screen.getByRole('switch', { name: 'Enable AI chat' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('System prompt')).toHaveValue('You are a mental health support assistant for Ears for You.')
  })

  describe('Save changes', () => {
    it('submits the full current form state via updateAdminSettings, including an edited field', async () => {
      vi.spyOn(endpoints, 'updateAdminSettings').mockResolvedValue({ message: 'ok' })
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      const senderName = screen.getByLabelText('Sender name')
      await user.clear(senderName)
      await user.type(senderName, 'New Sender Name')

      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(endpoints.updateAdminSettings).toHaveBeenCalledWith({
        ...SETTINGS,
        emailConfiguration: { ...SETTINGS.emailConfiguration, senderName: 'New Sender Name' },
      })
    })

    it('shows a busy Save button while pending and the error message on failure', async () => {
      let rejectSave: (err: unknown) => void = () => {}
      const pending = new Promise<unknown>((_resolve, reject) => { rejectSave = reject })
      vi.spyOn(endpoints, 'updateAdminSettings').mockReturnValue(pending)
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      const saveButton = screen.getByRole('button', { name: 'Save changes' })
      await user.click(saveButton)
      expect(saveButton).toBeDisabled()

      rejectSave(new ApiError(500, 'The server had a problem. Try again.'))
      expect(await screen.findByRole('alert')).toHaveTextContent('The server had a problem. Try again.')
    })
  })

  describe('Reset to default', () => {
    it('calls resetAdminSetting with the exact key for the clicked field', async () => {
      vi.spyOn(endpoints, 'resetAdminSetting').mockResolvedValue({ message: "Setting 'otp_length' has been reset to system default." })
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      // "Reset to default" buttons render in the same fixed order as the fields themselves
      // (API config x4, email key, email x2, OTP length/expiry/attempts/channel, ...) - index 7
      // (0-based) is "OTP length", the 8th field on the page.
      const resetButtons = screen.getAllByRole('button', { name: 'Reset to default' })
      await user.click(resetButtons[7])

      expect(endpoints.resetAdminSetting).toHaveBeenCalledWith('otp_length')
    })

    it('invalidates and re-syncs the form from the query cache on success', async () => {
      vi.spyOn(endpoints, 'resetAdminSetting').mockResolvedValue({ message: 'ok' })
      const resetSettings: AdminSystemSettings = {
        ...SETTINGS,
        otpConfiguration: { ...SETTINGS.otpConfiguration, otpLength: 6 },
      }
      getQueryData.mockReturnValue(resetSettings)
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      const resetButtons = screen.getAllByRole('button', { name: 'Reset to default' })
      await user.click(resetButtons[0])

      await vi.waitFor(() => {
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: adminQk.settings })
      })
      expect(getQueryData).toHaveBeenCalledWith(adminQk.settings)
    })
  })

  describe('API key field', () => {
    it('starts masked and read-only, and reveals an empty input after "Change API key"', async () => {
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      expect(screen.getByText('sk-x****************3f2a')).toBeInTheDocument()
      expect(screen.queryByLabelText('New API key')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Change API key' }))

      expect(screen.queryByText('sk-x****************3f2a')).not.toBeInTheDocument()
      expect(screen.getByLabelText('New API key')).toHaveValue('')
    })

    it('sends the typed value in place of the masked string on the next Save', async () => {
      vi.spyOn(endpoints, 'updateAdminSettings').mockResolvedValue({ message: 'ok' })
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      await user.click(screen.getByRole('button', { name: 'Change API key' }))
      await user.type(screen.getByLabelText('New API key'), 'sk-brand-new-key')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(endpoints.updateAdminSettings).toHaveBeenCalledWith({
        ...SETTINGS,
        emailConfiguration: { ...SETTINGS.emailConfiguration, apiKey: 'sk-brand-new-key' },
      })
    })

    it('resends the original masked string unmodified when "Change API key" was never clicked', async () => {
      vi.spyOn(endpoints, 'updateAdminSettings').mockResolvedValue({ message: 'ok' })
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(endpoints.updateAdminSettings).toHaveBeenCalledWith(SETTINGS)
    })
  })
})
