'use client'
import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdminSettings, updateAdminSettings, resetAdminSetting } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { errorMessage } from '@/lib/api/errors'
import type { AdminSystemSettings, AdminSettingResetKey } from '@/lib/api/admin/types'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'

const DELIVERY_CHANNELS: AdminSystemSettings['otpConfiguration']['deliveryChannel'][] = ['EMAIL', 'SMS', 'BOTH']

// The form's own local shape: identical to AdminSystemSettings except every numeric leaf field is
// tracked as its RAW STRING input value, not a coerced number. A number input can be legitimately
// empty mid-edit (cleared while retyping) - `Number('')` is `0`, a valid-looking number, not `NaN`,
// so a naive `Number(raw) || 0` coercion stored directly in form state would silently turn a
// cleared field into a real `0` the instant Save is clicked. Fields like session_timeout_minutes,
// jwt_expiry_minutes, security_max_login_attempts and otp_length map straight to production Redis
// keys the backend depends on being positive (a zero-duration Redis TTL is rejected server-side,
// e.g. for session_timeout_minutes that means every login attempt throws, locking out every admin
// including the one trying to fix it) - so this form never lets an in-progress edit look like a
// valid `0`. Numbers are only ever produced at Save time, from validated raw strings - see
// toSettingsPayload below.
type SettingsFormState = {
  apiConfiguration: { baseUrl: string; apiVersion: string; rateLimitPerMinute: string; timeoutMs: string }
  emailConfiguration: AdminSystemSettings['emailConfiguration']
  otpConfiguration: {
    otpLength: string; otpExpiryMinutes: string; maxAttempts: string
    deliveryChannel: AdminSystemSettings['otpConfiguration']['deliveryChannel']
  }
  securitySettings: {
    jwtExpiryMinutes: string; refreshTokenExpiryDays: string; maxLoginAttempts: string; sessionTimeoutMinutes: string
    mfaEnabled: boolean; ipWhitelistEnabled: boolean
  }
  aiConfiguration: AdminSystemSettings['aiConfiguration']
}

function toFormState(s: AdminSystemSettings): SettingsFormState {
  return {
    apiConfiguration: {
      baseUrl: s.apiConfiguration.baseUrl,
      apiVersion: s.apiConfiguration.apiVersion,
      rateLimitPerMinute: String(s.apiConfiguration.rateLimitPerMinute),
      timeoutMs: String(s.apiConfiguration.timeoutMs),
    },
    emailConfiguration: { ...s.emailConfiguration },
    otpConfiguration: {
      otpLength: String(s.otpConfiguration.otpLength),
      otpExpiryMinutes: String(s.otpConfiguration.otpExpiryMinutes),
      maxAttempts: String(s.otpConfiguration.maxAttempts),
      deliveryChannel: s.otpConfiguration.deliveryChannel,
    },
    securitySettings: {
      jwtExpiryMinutes: String(s.securitySettings.jwtExpiryMinutes),
      refreshTokenExpiryDays: String(s.securitySettings.refreshTokenExpiryDays),
      maxLoginAttempts: String(s.securitySettings.maxLoginAttempts),
      sessionTimeoutMinutes: String(s.securitySettings.sessionTimeoutMinutes),
      mfaEnabled: s.securitySettings.mfaEnabled,
      ipWhitelistEnabled: s.securitySettings.ipWhitelistEnabled,
    },
    aiConfiguration: { ...s.aiConfiguration },
  }
}

const NUMERIC_FIELD_ERROR = 'Enter a whole number of at least 1.'

// A numeric field's raw string is only ever "valid" if it's non-empty and parses to a finite
// number >= 1 - every one of this form's numeric fields backs a value the backend either rejects
// or treats as effectively "off" at 0 (see the SettingsFormState comment above), so there is no
// safe value to clamp or guess down to; an invalid field just blocks Save until corrected.
function parseValidNumber(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ? n : null
}

function numericFieldError(raw: string): string | undefined {
  return parseValidNumber(raw) === null ? NUMERIC_FIELD_ERROR : undefined
}

// Builds the actual PATCH-ready payload, converting every numeric field's raw string to a number
// for the first time. Returns null if any numeric field fails validation - the only place that
// decides "is this form submittable", shared by the Save button's disabled state and the submit
// handler itself so the two can never disagree.
function toSettingsPayload(form: SettingsFormState): AdminSystemSettings | null {
  const rateLimitPerMinute = parseValidNumber(form.apiConfiguration.rateLimitPerMinute)
  const timeoutMs = parseValidNumber(form.apiConfiguration.timeoutMs)
  const otpLength = parseValidNumber(form.otpConfiguration.otpLength)
  const otpExpiryMinutes = parseValidNumber(form.otpConfiguration.otpExpiryMinutes)
  const maxAttempts = parseValidNumber(form.otpConfiguration.maxAttempts)
  const jwtExpiryMinutes = parseValidNumber(form.securitySettings.jwtExpiryMinutes)
  const refreshTokenExpiryDays = parseValidNumber(form.securitySettings.refreshTokenExpiryDays)
  const maxLoginAttempts = parseValidNumber(form.securitySettings.maxLoginAttempts)
  const sessionTimeoutMinutes = parseValidNumber(form.securitySettings.sessionTimeoutMinutes)
  if (
    rateLimitPerMinute === null || timeoutMs === null || otpLength === null || otpExpiryMinutes === null ||
    maxAttempts === null || jwtExpiryMinutes === null || refreshTokenExpiryDays === null ||
    maxLoginAttempts === null || sessionTimeoutMinutes === null
  ) {
    return null
  }
  return {
    apiConfiguration: { baseUrl: form.apiConfiguration.baseUrl, apiVersion: form.apiConfiguration.apiVersion, rateLimitPerMinute, timeoutMs },
    emailConfiguration: form.emailConfiguration,
    otpConfiguration: { otpLength, otpExpiryMinutes, maxAttempts, deliveryChannel: form.otpConfiguration.deliveryChannel },
    securitySettings: {
      jwtExpiryMinutes, refreshTokenExpiryDays, maxLoginAttempts, sessionTimeoutMinutes,
      mfaEnabled: form.securitySettings.mfaEnabled, ipWhitelistEnabled: form.securitySettings.ipWhitelistEnabled,
    },
    aiConfiguration: form.aiConfiguration,
  }
}

// Applies just the one field a given reset key corresponds to onto the current form, reading the
// fresh value from a just-refetched AdminSystemSettings. Deliberately per-field, not a whole-object
// replace: a reset succeeding for one field must never discard an admin's unsaved edits elsewhere
// on the form. Mirrors the shape of mock-store.ts's SETTING_RESET_DEFAULTS (also keyed by every
// AdminSettingResetKey), but reads the freshly-fetched value rather than hardcoding a default,
// since two keys (email_api_key, ai_system_prompt) have no literal default known client-side.
// Numeric fields are re-stringified going back into the form, matching SettingsFormState's raw
// string tracking.
const RESET_KEY_APPLY: Record<AdminSettingResetKey, (form: SettingsFormState, fresh: AdminSystemSettings) => SettingsFormState> = {
  api_base_url: (f, fresh) => ({ ...f, apiConfiguration: { ...f.apiConfiguration, baseUrl: fresh.apiConfiguration.baseUrl } }),
  api_version: (f, fresh) => ({ ...f, apiConfiguration: { ...f.apiConfiguration, apiVersion: fresh.apiConfiguration.apiVersion } }),
  api_rate_limit_per_minute: (f, fresh) => ({ ...f, apiConfiguration: { ...f.apiConfiguration, rateLimitPerMinute: String(fresh.apiConfiguration.rateLimitPerMinute) } }),
  api_timeout_ms: (f, fresh) => ({ ...f, apiConfiguration: { ...f.apiConfiguration, timeoutMs: String(fresh.apiConfiguration.timeoutMs) } }),
  email_api_key: (f, fresh) => ({ ...f, emailConfiguration: { ...f.emailConfiguration, apiKey: fresh.emailConfiguration.apiKey } }),
  email_sender_email: (f, fresh) => ({ ...f, emailConfiguration: { ...f.emailConfiguration, senderEmail: fresh.emailConfiguration.senderEmail } }),
  email_sender_name: (f, fresh) => ({ ...f, emailConfiguration: { ...f.emailConfiguration, senderName: fresh.emailConfiguration.senderName } }),
  otp_length: (f, fresh) => ({ ...f, otpConfiguration: { ...f.otpConfiguration, otpLength: String(fresh.otpConfiguration.otpLength) } }),
  otp_expiry_minutes: (f, fresh) => ({ ...f, otpConfiguration: { ...f.otpConfiguration, otpExpiryMinutes: String(fresh.otpConfiguration.otpExpiryMinutes) } }),
  otp_max_attempts: (f, fresh) => ({ ...f, otpConfiguration: { ...f.otpConfiguration, maxAttempts: String(fresh.otpConfiguration.maxAttempts) } }),
  otp_delivery_channel: (f, fresh) => ({ ...f, otpConfiguration: { ...f.otpConfiguration, deliveryChannel: fresh.otpConfiguration.deliveryChannel } }),
  jwt_expiry_minutes: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, jwtExpiryMinutes: String(fresh.securitySettings.jwtExpiryMinutes) } }),
  jwt_refresh_expiry_days: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, refreshTokenExpiryDays: String(fresh.securitySettings.refreshTokenExpiryDays) } }),
  security_max_login_attempts: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, maxLoginAttempts: String(fresh.securitySettings.maxLoginAttempts) } }),
  session_timeout_minutes: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, sessionTimeoutMinutes: String(fresh.securitySettings.sessionTimeoutMinutes) } }),
  security_mfa_enabled: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, mfaEnabled: fresh.securitySettings.mfaEnabled } }),
  security_ip_whitelist_enabled: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, ipWhitelistEnabled: fresh.securitySettings.ipWhitelistEnabled } }),
  enable_ai_chat: (f, fresh) => ({ ...f, aiConfiguration: { ...f.aiConfiguration, enableAiChat: fresh.aiConfiguration.enableAiChat } }),
  ai_system_prompt: (f, fresh) => ({ ...f, aiConfiguration: { ...f.aiConfiguration, aiSystemPrompt: fresh.aiConfiguration.aiSystemPrompt } }),
}

// Each row owns its own mutation (matching the already-fixed FailoverOtpButton pattern in
// components/admin/user-manage-sheet.tsx) so one field's reset failing and showing its error
// message doesn't get silently cleared the moment a different field's reset is clicked - a single
// shared mutation instance can only ever describe its own single latest call.
function ResetAction({ label, settingKey, onReset }: {
  label: string
  settingKey: AdminSettingResetKey
  onReset: (key: AdminSettingResetKey) => void
}) {
  const mutation = useMutation({
    mutationFn: () => resetAdminSetting(settingKey),
    onSuccess: () => onReset(settingKey),
  })
  return (
    <div className="flex shrink-0 flex-col items-end gap-1 self-end sm:self-auto">
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        aria-label={`Reset ${label} to default`}
        className="inline-flex min-h-11 items-center text-sm text-fir/60 underline underline-offset-4
          disabled:opacity-50
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
      >
        {mutation.isPending ? 'Resetting…' : 'Reset to default'}
      </button>
      {mutation.isError ? <span role="alert" className="text-xs text-clay">{errorMessage(mutation.error)}</span> : null}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-card px-5 py-4">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-4 flex flex-col gap-5">{children}</div>
    </section>
  )
}

function FieldRow({ label, settingKey, onReset, children }: {
  label: string
  settingKey: AdminSettingResetKey
  onReset: (key: AdminSettingResetKey) => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">{children}</div>
      <ResetAction label={label} settingKey={settingKey} onReset={onReset} />
    </div>
  )
}

function ToggleRow({ label, checked, onChange, settingKey, onReset }: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  settingKey: AdminSettingResetKey
  onReset: (key: AdminSettingResetKey) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">{label}</span>
        <Toggle label={label} checked={checked} onChange={onChange} />
      </div>
      <div className="flex justify-end">
        <ResetAction label={label} settingKey={settingKey} onReset={onReset} />
      </div>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card px-5 py-4">
          <Skeleton lines={4} />
        </div>
      ))}
    </div>
  )
}

function SettingsForm({ settings }: { settings: AdminSystemSettings }) {
  const queryClient = useQueryClient()
  // Seeded once from the query's data (this component only ever mounts once settings.data
  // exists - see AdminSettingsPage below), not a controlled form bound live to query data, so
  // background refetches don't clobber an in-progress edit. Mutations that legitimately change
  // the stored settings (Save, per-field Reset) explicitly pull the freshly-refetched data back
  // out and overwrite this state themselves, rather than relying on a prop resync that would also
  // fire on unrelated refetches.
  const [form, setForm] = useState<SettingsFormState>(() => toFormState(settings))
  // null: showing the fetched masked value as read-only text with a "Change API key" button.
  // string (including ''): the admin clicked "Change API key" - this is the fresh value being
  // typed, tracked separately from `form` so the masked text never becomes directly editable
  // (the backend silently drops a save whose apiKey contains an 8+ run of '*', so editing the
  // mask in place risks a silent no-op - see the field's own comment below).
  const [apiKeyDraft, setApiKeyDraft] = useState<string | null>(null)

  const isFormValid = toSettingsPayload(form) !== null

  // Fetches a genuinely fresh copy of settings (staleTime: 0 forces a real network/mock round
  // trip, bypassing the query client's default 30s staleTime so this can't just hand back the
  // pre-mutation cache entry) and returns null - never a stale value - if that fetch fails.
  // queryClient.fetchQuery rejects on a failed fetch (unlike invalidateQueries/refetchQueries,
  // which swallow the rejection by default), which is what lets this function tell a real failure
  // apart from a successful refetch, instead of a caller reading potentially-stale data straight
  // out of the cache after an unchecked invalidate.
  async function refetchSettings(): Promise<AdminSystemSettings | null> {
    try {
      return await queryClient.fetchQuery({ queryKey: adminQk.settings, queryFn: getAdminSettings, staleTime: 0 })
    } catch {
      return null
    }
  }

  async function handleReset(key: AdminSettingResetKey) {
    // The audit panel on the Users page should reflect this reset without a manual refresh - mark
    // it stale now regardless of whether the settings refetch below succeeds.
    void queryClient.invalidateQueries({ queryKey: adminQk.auditLogs })
    const fresh = await refetchSettings()
    // If the refetch failed, the DELETE itself may still have succeeded server-side - but with no
    // confirmed fresh value to apply, the only safe move is to leave the admin's current form
    // exactly as it is rather than silently reverting or guessing.
    if (fresh) {
      setForm(f => RESET_KEY_APPLY[key](f, fresh))
      if (key === 'email_api_key') setApiKeyDraft(null)
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const base = toSettingsPayload(form)
      if (!base) throw new Error('Fix the highlighted fields before saving.')
      // Only ever send a typed, non-blank apiKey. Whitespace-only input (e.g. an accidental
      // space) is treated the same as never having typed anything. If "Change API key" was never
      // clicked, or was clicked but left blank, omit apiKey from the payload entirely rather than
      // resending form.emailConfiguration.apiKey - that field itself can legitimately be '' (the
      // backend's maskApiKey returns '' for a short/unset key), and an empty string is NOT caught
      // by the backend's "contains 8+ stars" skip-write guard, so resending it verbatim would
      // genuinely wipe the stored key. Omitting the field lets the backend's own `!= null`
      // skip-write check decide, which is safe for every case.
      const trimmedDraft = apiKeyDraft?.trim() || ''
      if (trimmedDraft) {
        return updateAdminSettings({ ...base, emailConfiguration: { ...base.emailConfiguration, apiKey: trimmedDraft } })
      }
      return updateAdminSettings({
        ...base,
        emailConfiguration: { senderEmail: base.emailConfiguration.senderEmail, senderName: base.emailConfiguration.senderName },
      })
    },
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.auditLogs })
      const fresh = await refetchSettings()
      // Same reasoning as handleReset: the PATCH itself succeeded, but if the follow-up GET
      // failed, there is no confirmed fresh value to reset the form (or the API key draft) to -
      // leave both exactly as they are rather than reverting to stale pre-save values.
      if (fresh) {
        setForm(toFormState(fresh))
        setApiKeyDraft(null)
      }
    },
  })

  function set<K extends keyof SettingsFormState>(section: K, patch: Partial<SettingsFormState[K]>) {
    setForm(f => ({ ...f, [section]: { ...f[section], ...patch } }))
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); if (isFormValid) saveMutation.mutate() }}
      className="flex flex-col gap-4"
    >
      {saveMutation.isError ? (
        <p role="alert" className="text-sm text-clay">{errorMessage(saveMutation.error)}</p>
      ) : null}

      <Section title="API Configuration">
        <FieldRow label="Base URL" settingKey="api_base_url" onReset={handleReset}>
          <Field label="Base URL" value={form.apiConfiguration.baseUrl}
            onChange={e => set('apiConfiguration', { baseUrl: e.target.value })} />
        </FieldRow>
        <FieldRow label="API version" settingKey="api_version" onReset={handleReset}>
          <Field label="API version" value={form.apiConfiguration.apiVersion}
            onChange={e => set('apiConfiguration', { apiVersion: e.target.value })} />
        </FieldRow>
        <FieldRow label="Rate limit (per minute)" settingKey="api_rate_limit_per_minute" onReset={handleReset}>
          <Field label="Rate limit (per minute)" type="number" min={1} value={form.apiConfiguration.rateLimitPerMinute}
            onChange={e => set('apiConfiguration', { rateLimitPerMinute: e.target.value })}
            error={numericFieldError(form.apiConfiguration.rateLimitPerMinute)} />
        </FieldRow>
        <FieldRow label="Timeout (ms)" settingKey="api_timeout_ms" onReset={handleReset}>
          <Field label="Timeout (ms)" type="number" min={1} value={form.apiConfiguration.timeoutMs}
            onChange={e => set('apiConfiguration', { timeoutMs: e.target.value })}
            error={numericFieldError(form.apiConfiguration.timeoutMs)} />
        </FieldRow>
      </Section>

      <Section title="Email Configuration">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            {apiKeyDraft === null ? (
              // Read-only by design: the fetched value is always masked (first 4 + a run of '*' +
              // last 4), and the backend silently drops any submitted value that merely contains
              // an 8+ run of '*' - editing this text in place risks a silent no-op that looks
              // successful. "Change API key" below reveals a genuinely empty input instead.
              <>
                <span className="block text-sm font-medium mb-1.5">API key</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-xl border-[1.5px] border-fir/15 bg-oat px-4 py-3 text-[15px] font-mono">
                    {form.emailConfiguration.apiKey || '(not set)'}
                  </span>
                  <Button type="button" variant="ghost" onClick={() => setApiKeyDraft('')}>
                    Change API key
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1">
                  <Field label="New API key" autoComplete="off" value={apiKeyDraft}
                    onChange={e => setApiKeyDraft(e.target.value)} />
                </div>
                <Button type="button" variant="ghost" onClick={() => setApiKeyDraft(null)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <ResetAction label="API key" settingKey="email_api_key" onReset={handleReset} />
        </div>
        <FieldRow label="Sender email" settingKey="email_sender_email" onReset={handleReset}>
          <Field label="Sender email" type="email" value={form.emailConfiguration.senderEmail}
            onChange={e => set('emailConfiguration', { senderEmail: e.target.value })} />
        </FieldRow>
        <FieldRow label="Sender name" settingKey="email_sender_name" onReset={handleReset}>
          <Field label="Sender name" value={form.emailConfiguration.senderName}
            onChange={e => set('emailConfiguration', { senderName: e.target.value })} />
        </FieldRow>
      </Section>

      <Section title="OTP Configuration">
        <FieldRow label="OTP length" settingKey="otp_length" onReset={handleReset}>
          <Field label="OTP length" type="number" min={1} value={form.otpConfiguration.otpLength}
            onChange={e => set('otpConfiguration', { otpLength: e.target.value })}
            error={numericFieldError(form.otpConfiguration.otpLength)} />
        </FieldRow>
        <FieldRow label="OTP expiry (minutes)" settingKey="otp_expiry_minutes" onReset={handleReset}>
          <Field label="OTP expiry (minutes)" type="number" min={1} value={form.otpConfiguration.otpExpiryMinutes}
            onChange={e => set('otpConfiguration', { otpExpiryMinutes: e.target.value })}
            error={numericFieldError(form.otpConfiguration.otpExpiryMinutes)} />
        </FieldRow>
        <FieldRow label="Max attempts" settingKey="otp_max_attempts" onReset={handleReset}>
          <Field label="Max attempts" type="number" min={1} value={form.otpConfiguration.maxAttempts}
            onChange={e => set('otpConfiguration', { maxAttempts: e.target.value })}
            error={numericFieldError(form.otpConfiguration.maxAttempts)} />
        </FieldRow>
        <div className="flex flex-col gap-2">
          <p id="delivery-channel-label" className="text-sm font-medium">Delivery channel</p>
          <div role="group" aria-labelledby="delivery-channel-label" className="flex gap-2">
            {DELIVERY_CHANNELS.map(opt => (
              <button
                key={opt}
                type="button"
                aria-pressed={form.otpConfiguration.deliveryChannel === opt}
                onClick={() => set('otpConfiguration', { deliveryChannel: opt })}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  form.otpConfiguration.deliveryChannel === opt
                    ? 'border-fir bg-fir text-oat'
                    : 'border-fir/15 bg-oat'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <ResetAction label="Delivery channel" settingKey="otp_delivery_channel" onReset={handleReset} />
          </div>
        </div>
      </Section>

      <Section title="Security Settings">
        <FieldRow label="JWT expiry (minutes)" settingKey="jwt_expiry_minutes" onReset={handleReset}>
          <Field label="JWT expiry (minutes)" type="number" min={1} value={form.securitySettings.jwtExpiryMinutes}
            onChange={e => set('securitySettings', { jwtExpiryMinutes: e.target.value })}
            error={numericFieldError(form.securitySettings.jwtExpiryMinutes)} />
        </FieldRow>
        <FieldRow label="Refresh token expiry (days)" settingKey="jwt_refresh_expiry_days" onReset={handleReset}>
          <Field label="Refresh token expiry (days)" type="number" min={1} value={form.securitySettings.refreshTokenExpiryDays}
            onChange={e => set('securitySettings', { refreshTokenExpiryDays: e.target.value })}
            error={numericFieldError(form.securitySettings.refreshTokenExpiryDays)} />
        </FieldRow>
        <FieldRow label="Max login attempts" settingKey="security_max_login_attempts" onReset={handleReset}>
          <Field label="Max login attempts" type="number" min={1} value={form.securitySettings.maxLoginAttempts}
            onChange={e => set('securitySettings', { maxLoginAttempts: e.target.value })}
            error={numericFieldError(form.securitySettings.maxLoginAttempts)} />
        </FieldRow>
        <FieldRow label="Session timeout (minutes)" settingKey="session_timeout_minutes" onReset={handleReset}>
          <Field label="Session timeout (minutes)" type="number" min={1} value={form.securitySettings.sessionTimeoutMinutes}
            onChange={e => set('securitySettings', { sessionTimeoutMinutes: e.target.value })}
            error={numericFieldError(form.securitySettings.sessionTimeoutMinutes)} />
        </FieldRow>
        <ToggleRow label="Multi-factor authentication" checked={form.securitySettings.mfaEnabled}
          onChange={next => set('securitySettings', { mfaEnabled: next })}
          settingKey="security_mfa_enabled" onReset={handleReset} />
        <ToggleRow label="IP whitelist" checked={form.securitySettings.ipWhitelistEnabled}
          onChange={next => set('securitySettings', { ipWhitelistEnabled: next })}
          settingKey="security_ip_whitelist_enabled" onReset={handleReset} />
      </Section>

      <Section title="AI Configuration">
        <ToggleRow label="Enable AI chat" checked={form.aiConfiguration.enableAiChat}
          onChange={next => set('aiConfiguration', { enableAiChat: next })}
          settingKey="enable_ai_chat" onReset={handleReset} />
        <div className="flex flex-col gap-2">
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">System prompt</span>
            <textarea
              value={form.aiConfiguration.aiSystemPrompt}
              onChange={e => set('aiConfiguration', { aiSystemPrompt: e.target.value })}
              rows={4}
              className="w-full rounded-xl border-[1.5px] border-fir/30 bg-card px-4 py-3 text-[15px]
                outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/25"
            />
          </label>
          <div className="flex justify-end">
            <ResetAction label="System prompt" settingKey="ai_system_prompt" onReset={handleReset} />
          </div>
        </div>
      </Section>

      <Button type="submit" busy={saveMutation.isPending} disabled={!isFormValid} className="self-start">
        Save changes
      </Button>
    </form>
  )
}

export default function AdminSettingsPage() {
  const settings = useQuery({ queryKey: adminQk.settings, queryFn: getAdminSettings })

  let content: ReactNode
  // Gated on isError && !data (not isError alone): a background refetch that react-query triggers
  // after a successful mutation (e.g. this page's own invalidateQueries calls) can itself fail
  // without the earlier successful fetch's data ever being cleared. Unmounting SettingsForm in
  // that case would discard any unsaved edits still sitting in its local form state, even though
  // the write that triggered the refetch already succeeded - so only show the full-page error
  // state when there has never been a successful fetch to fall back on.
  if (settings.isError && !settings.data) {
    content = <ErrorState error={settings.error} retry={() => void settings.refetch()} />
  } else if (settings.isLoading || !settings.data) {
    content = <SettingsSkeleton />
  } else {
    content = <SettingsForm settings={settings.data} />
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>
      {content}
    </div>
  )
}
