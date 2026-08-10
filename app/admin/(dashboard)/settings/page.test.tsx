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

type MutationOpts = {
  mutationFn: () => Promise<unknown>
  onSuccess?: (data: unknown) => unknown
  onError?: (error: unknown) => unknown
}

// A small stand-in for react-query's real useMutation, close enough to exercise onSuccess/onError
// and busy state. Each `useMutation(...)` call site gets its own independent hook instance (React
// tracks hooks per component fiber), which is exactly the property under test for the page's
// per-field "Reset to default" buttons: every field now owns its own mutation (via its own
// ResetAction instance), so one field's pending/error state can never bleed into another's.
function useFakeMutation(opts: MutationOpts) {
  const [state, setState] = useState<{ isPending: boolean; isError: boolean; error: unknown }>({
    isPending: false, isError: false, error: undefined,
  })
  return {
    ...state,
    mutate: () => {
      setState({ isPending: true, isError: false, error: undefined })
      void opts.mutationFn().then(
        data => {
          setState({ isPending: false, isError: false, error: undefined })
          opts.onSuccess?.(data)
        },
        error => {
          setState({ isPending: false, isError: true, error })
          opts.onError?.(error)
        },
      )
    },
    reset: () => setState({ isPending: false, isError: false, error: undefined }),
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

// "Reset to default" buttons render in the same fixed order as the fields themselves - API config
// x4, email key, email x2, OTP length/expiry/attempts/channel, security x6, AI x2. Named indices
// avoid re-deriving this each time a test needs a specific field's button.
const RESET_INDEX = {
  apiBaseUrl: 0,
  apiVersion: 1,
  emailApiKey: 4,
  senderName: 6,
  otpLength: 7,
  jwtExpiryMinutes: 11,
  jwtRefreshExpiryDays: 12,
  mfaEnabled: 15,
  ipWhitelistEnabled: 16,
  aiSystemPrompt: 18,
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
    expect(screen.getByRole('group', { name: 'Delivery channel' })).toBeInTheDocument()

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

    it('treats an empty API key draft as unchanged, never sending a literal empty string', async () => {
      // Guards against a genuinely destructive accidental wipe: the backend's masking guard only
      // blocks values containing an 8+ run of '*', so an empty string is NOT caught by it and
      // would really overwrite the stored key if sent as-is.
      vi.spyOn(endpoints, 'updateAdminSettings').mockResolvedValue({ message: 'ok' })
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      await user.click(screen.getByRole('button', { name: 'Change API key' }))
      expect(screen.getByLabelText('New API key')).toHaveValue('')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(endpoints.updateAdminSettings).toHaveBeenCalledWith(SETTINGS)
    })
  })

  describe('Reset to default', () => {
    it('calls resetAdminSetting with the exact key for the clicked field', async () => {
      vi.spyOn(endpoints, 'resetAdminSetting').mockResolvedValue({ message: "Setting 'otp_length' has been reset to system default." })
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      const resetButtons = screen.getAllByRole('button', { name: 'Reset to default' })
      await user.click(resetButtons[RESET_INDEX.otpLength])

      expect(endpoints.resetAdminSetting).toHaveBeenCalledWith('otp_length')
    })

    it('applies only the reset field from the refetched settings, leaving an unrelated unsaved edit and an unrelated server-side change alone', async () => {
      vi.spyOn(endpoints, 'resetAdminSetting').mockResolvedValue({ message: 'ok' })
      // Simulates the server's post-reset state: api_base_url really did change to its default,
      // but senderName also differs from SETTINGS here (standing in for a value that changed for
      // some unrelated reason server-side) - the targeted merge must not pull that second, unasked
      // -for change into the form; only api_base_url should move.
      const fresh: AdminSystemSettings = {
        ...SETTINGS,
        apiConfiguration: { ...SETTINGS.apiConfiguration, baseUrl: 'https://reset-default.example.com' },
        emailConfiguration: { ...SETTINGS.emailConfiguration, senderName: 'Some Other Server Value' },
      }
      getQueryData.mockReturnValue(fresh)
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      // Edit Sender name locally first (an in-progress, unsaved edit).
      const senderName = screen.getByLabelText('Sender name')
      await user.clear(senderName)
      await user.type(senderName, 'My Unsaved Edit')

      const resetButtons = screen.getAllByRole('button', { name: 'Reset to default' })
      await user.click(resetButtons[RESET_INDEX.apiBaseUrl])

      await vi.waitFor(() => {
        expect(screen.getByLabelText('Base URL')).toHaveValue('https://reset-default.example.com')
      })
      // Neither the admin's own unsaved edit nor the unrelated fresh-cache value clobbered it.
      expect(screen.getByLabelText('Sender name')).toHaveValue('My Unsaved Edit')
    })

    it('a failed reset on one field does not clear a different field\'s already-shown error', async () => {
      vi.spyOn(endpoints, 'resetAdminSetting')
        .mockRejectedValueOnce(new ApiError(500, 'The server had a problem. Try again.'))
        .mockResolvedValueOnce({ message: 'ok' })
      getQueryData.mockReturnValue(SETTINGS)
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      const resetButtons = screen.getAllByRole('button', { name: 'Reset to default' })
      await user.click(resetButtons[RESET_INDEX.apiBaseUrl])
      expect(await screen.findByRole('alert')).toHaveTextContent('The server had a problem. Try again.')

      await user.click(resetButtons[RESET_INDEX.apiVersion])
      await vi.waitFor(() => {
        expect(endpoints.resetAdminSetting).toHaveBeenCalledWith('api_version')
      })

      // A single shared mutation would have cleared this the moment the second reset started.
      expect(screen.getByRole('alert')).toHaveTextContent('The server had a problem. Try again.')
    })

    it('resetting jwt_expiry_minutes does not touch the adjacent jwt_refresh_expiry_days field', async () => {
      vi.spyOn(endpoints, 'resetAdminSetting').mockResolvedValue({ message: 'ok' })
      const fresh: AdminSystemSettings = {
        ...SETTINGS,
        securitySettings: { ...SETTINGS.securitySettings, jwtExpiryMinutes: 999, refreshTokenExpiryDays: 111 },
      }
      getQueryData.mockReturnValue(fresh)
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      const resetButtons = screen.getAllByRole('button', { name: 'Reset to default' })
      await user.click(resetButtons[RESET_INDEX.jwtExpiryMinutes])

      expect(endpoints.resetAdminSetting).toHaveBeenCalledWith('jwt_expiry_minutes')
      await vi.waitFor(() => {
        expect(screen.getByLabelText('JWT expiry (minutes)')).toHaveValue(999)
      })
      // fresh's refreshTokenExpiryDays (111) must NOT have propagated - only the reset key did.
      expect(screen.getByLabelText('Refresh token expiry (days)')).toHaveValue(7)
    })

    it('resetting security_mfa_enabled does not touch the adjacent security_ip_whitelist_enabled field', async () => {
      vi.spyOn(endpoints, 'resetAdminSetting').mockResolvedValue({ message: 'ok' })
      const fresh: AdminSystemSettings = {
        ...SETTINGS,
        securitySettings: { ...SETTINGS.securitySettings, mfaEnabled: false, ipWhitelistEnabled: true },
      }
      getQueryData.mockReturnValue(fresh)
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      const resetButtons = screen.getAllByRole('button', { name: 'Reset to default' })
      await user.click(resetButtons[RESET_INDEX.mfaEnabled])

      expect(endpoints.resetAdminSetting).toHaveBeenCalledWith('security_mfa_enabled')
      await vi.waitFor(() => {
        expect(screen.getByRole('switch', { name: 'Multi-factor authentication' })).toHaveAttribute('aria-checked', 'false')
      })
      // fresh's ipWhitelistEnabled (true) must NOT have propagated - only the reset key did.
      expect(screen.getByRole('switch', { name: 'IP whitelist' })).toHaveAttribute('aria-checked', 'false')
    })

    it('resetting email_api_key clears an in-progress "Change API key" draft', async () => {
      vi.spyOn(endpoints, 'resetAdminSetting').mockResolvedValue({ message: 'ok' })
      const fresh: AdminSystemSettings = {
        ...SETTINGS,
        emailConfiguration: { ...SETTINGS.emailConfiguration, apiKey: 'sk-y****************9z1c' },
      }
      getQueryData.mockReturnValue(fresh)
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      await user.click(screen.getByRole('button', { name: 'Change API key' }))
      await user.type(screen.getByLabelText('New API key'), 'sk-typed-but-not-saved')

      const resetButtons = screen.getAllByRole('button', { name: 'Reset to default' })
      await user.click(resetButtons[RESET_INDEX.emailApiKey])

      await vi.waitFor(() => {
        expect(screen.getByText('sk-y****************9z1c')).toBeInTheDocument()
      })
      expect(screen.queryByLabelText('New API key')).not.toBeInTheDocument()
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

    it('"Cancel" returns to the masked display without submitting anything', async () => {
      mockQueries({ data: SETTINGS })
      const user = userEvent.setup()
      render(<AdminSettingsPage />)

      await user.click(screen.getByRole('button', { name: 'Change API key' }))
      await user.type(screen.getByLabelText('New API key'), 'sk-typed-but-cancelled')
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByLabelText('New API key')).not.toBeInTheDocument()
      expect(screen.getByText('sk-x****************3f2a')).toBeInTheDocument()
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
