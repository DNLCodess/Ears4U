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

// Coerces a number input's raw string to a finite number, falling back to 0 for an empty or
// otherwise non-numeric intermediate value (e.g. the box is momentarily cleared while retyping) -
// `type="number"` on the underlying input already keeps out non-numeric characters, this just
// keeps the controlled value from ever becoming NaN mid-edit.
function toNumber(raw: string): number {
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

// Applies just the one field a given reset key corresponds to onto the current form, reading the
// fresh value from a just-refetched AdminSystemSettings. Deliberately per-field, not a whole-object
// replace: a reset succeeding for one field must never discard an admin's unsaved edits elsewhere
// on the form. Mirrors the shape of mock-store.ts's SETTING_RESET_DEFAULTS (also keyed by every
// AdminSettingResetKey), but reads the freshly-fetched value rather than hardcoding a default,
// since two keys (email_api_key, ai_system_prompt) have no literal default known client-side.
const RESET_KEY_APPLY: Record<AdminSettingResetKey, (form: AdminSystemSettings, fresh: AdminSystemSettings) => AdminSystemSettings> = {
  api_base_url: (f, fresh) => ({ ...f, apiConfiguration: { ...f.apiConfiguration, baseUrl: fresh.apiConfiguration.baseUrl } }),
  api_version: (f, fresh) => ({ ...f, apiConfiguration: { ...f.apiConfiguration, apiVersion: fresh.apiConfiguration.apiVersion } }),
  api_rate_limit_per_minute: (f, fresh) => ({ ...f, apiConfiguration: { ...f.apiConfiguration, rateLimitPerMinute: fresh.apiConfiguration.rateLimitPerMinute } }),
  api_timeout_ms: (f, fresh) => ({ ...f, apiConfiguration: { ...f.apiConfiguration, timeoutMs: fresh.apiConfiguration.timeoutMs } }),
  email_api_key: (f, fresh) => ({ ...f, emailConfiguration: { ...f.emailConfiguration, apiKey: fresh.emailConfiguration.apiKey } }),
  email_sender_email: (f, fresh) => ({ ...f, emailConfiguration: { ...f.emailConfiguration, senderEmail: fresh.emailConfiguration.senderEmail } }),
  email_sender_name: (f, fresh) => ({ ...f, emailConfiguration: { ...f.emailConfiguration, senderName: fresh.emailConfiguration.senderName } }),
  otp_length: (f, fresh) => ({ ...f, otpConfiguration: { ...f.otpConfiguration, otpLength: fresh.otpConfiguration.otpLength } }),
  otp_expiry_minutes: (f, fresh) => ({ ...f, otpConfiguration: { ...f.otpConfiguration, otpExpiryMinutes: fresh.otpConfiguration.otpExpiryMinutes } }),
  otp_max_attempts: (f, fresh) => ({ ...f, otpConfiguration: { ...f.otpConfiguration, maxAttempts: fresh.otpConfiguration.maxAttempts } }),
  otp_delivery_channel: (f, fresh) => ({ ...f, otpConfiguration: { ...f.otpConfiguration, deliveryChannel: fresh.otpConfiguration.deliveryChannel } }),
  jwt_expiry_minutes: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, jwtExpiryMinutes: fresh.securitySettings.jwtExpiryMinutes } }),
  jwt_refresh_expiry_days: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, refreshTokenExpiryDays: fresh.securitySettings.refreshTokenExpiryDays } }),
  security_max_login_attempts: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, maxLoginAttempts: fresh.securitySettings.maxLoginAttempts } }),
  session_timeout_minutes: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, sessionTimeoutMinutes: fresh.securitySettings.sessionTimeoutMinutes } }),
  security_mfa_enabled: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, mfaEnabled: fresh.securitySettings.mfaEnabled } }),
  security_ip_whitelist_enabled: (f, fresh) => ({ ...f, securitySettings: { ...f.securitySettings, ipWhitelistEnabled: fresh.securitySettings.ipWhitelistEnabled } }),
  enable_ai_chat: (f, fresh) => ({ ...f, aiConfiguration: { ...f.aiConfiguration, enableAiChat: fresh.aiConfiguration.enableAiChat } }),
  ai_system_prompt: (f, fresh) => ({ ...f, aiConfiguration: { ...f.aiConfiguration, aiSystemPrompt: fresh.aiConfiguration.aiSystemPrompt } }),
}

// Each row owns its own mutation (matching the already-fixed FailoverOtpButton pattern in
// components/admin/user-manage-sheet.tsx) so one field's reset failing and showing its error
// message doesn't get silently cleared the moment a different field's reset is clicked - a single
// shared mutation instance can only ever describe its own single latest call.
function ResetAction({ settingKey, onReset }: { settingKey: AdminSettingResetKey; onReset: (key: AdminSettingResetKey) => void }) {
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

function FieldRow({ settingKey, onReset, children }: {
  settingKey: AdminSettingResetKey
  onReset: (key: AdminSettingResetKey) => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">{children}</div>
      <ResetAction settingKey={settingKey} onReset={onReset} />
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
        <ResetAction settingKey={settingKey} onReset={onReset} />
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
  // the stored settings (Save, per-field Reset) explicitly pull the freshly-invalidated data back
  // out of the query cache and overwrite this state themselves, rather than relying on a prop
  // resync that would also fire on unrelated refetches.
  const [form, setForm] = useState<AdminSystemSettings>(() => settings)
  // null: showing the fetched masked value as read-only text with a "Change API key" button.
  // string (including ''): the admin clicked "Change API key" - this is the fresh value being
  // typed, tracked separately from `form` so the masked text never becomes directly editable
  // (the backend silently drops a save whose apiKey contains an 8+ run of '*', so editing the
  // mask in place risks a silent no-op - see the field's own comment below).
  const [apiKeyDraft, setApiKeyDraft] = useState<string | null>(null)

  // Invalidates and returns the freshly-refetched settings (or undefined if the refetch somehow
  // still has no data) - shared by Save (which wants the whole object back) and Reset (which
  // applies only the one changed field, see RESET_KEY_APPLY above).
  async function refetchSettings(): Promise<AdminSystemSettings | undefined> {
    await queryClient.invalidateQueries({ queryKey: adminQk.settings })
    return queryClient.getQueryData<AdminSystemSettings>(adminQk.settings)
  }

  async function handleReset(key: AdminSettingResetKey) {
    const fresh = await refetchSettings()
    if (fresh) setForm(f => RESET_KEY_APPLY[key](f, fresh))
    if (key === 'email_api_key') setApiKeyDraft(null)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      // If "Change API key" was never clicked (apiKeyDraft === null), or it was clicked but left
      // empty (an accidental click, or an admin who changed their mind without hitting Cancel),
      // resend the original masked string unmodified - a safe no-op both by design and because
      // the backend's own guard drops it anyway. An empty string is NOT caught by that guard (it
      // contains no run of '*'), so treating it as "unchanged" here - rather than forwarding a
      // literal '' - is what actually prevents a genuinely destructive accidental wipe.
      const payload: AdminSystemSettings = {
        ...form,
        emailConfiguration: {
          ...form.emailConfiguration,
          apiKey: apiKeyDraft ? apiKeyDraft : form.emailConfiguration.apiKey,
        },
      }
      return updateAdminSettings(payload)
    },
    onSuccess: async () => {
      const fresh = await refetchSettings()
      if (fresh) setForm(fresh)
      setApiKeyDraft(null)
    },
  })

  function set<K extends keyof AdminSystemSettings>(section: K, patch: Partial<AdminSystemSettings[K]>) {
    setForm(f => ({ ...f, [section]: { ...f[section], ...patch } }))
  }

  return (
    <form onSubmit={e => { e.preventDefault(); saveMutation.mutate() }} className="flex flex-col gap-4">
      {saveMutation.isError ? (
        <p role="alert" className="text-sm text-clay">{errorMessage(saveMutation.error)}</p>
      ) : null}

      <Section title="API Configuration">
        <FieldRow settingKey="api_base_url" onReset={handleReset}>
          <Field label="Base URL" value={form.apiConfiguration.baseUrl}
            onChange={e => set('apiConfiguration', { baseUrl: e.target.value })} />
        </FieldRow>
        <FieldRow settingKey="api_version" onReset={handleReset}>
          <Field label="API version" value={form.apiConfiguration.apiVersion}
            onChange={e => set('apiConfiguration', { apiVersion: e.target.value })} />
        </FieldRow>
        <FieldRow settingKey="api_rate_limit_per_minute" onReset={handleReset}>
          <Field label="Rate limit (per minute)" type="number" value={form.apiConfiguration.rateLimitPerMinute}
            onChange={e => set('apiConfiguration', { rateLimitPerMinute: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="api_timeout_ms" onReset={handleReset}>
          <Field label="Timeout (ms)" type="number" value={form.apiConfiguration.timeoutMs}
            onChange={e => set('apiConfiguration', { timeoutMs: toNumber(e.target.value) })} />
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
          <ResetAction settingKey="email_api_key" onReset={handleReset} />
        </div>
        <FieldRow settingKey="email_sender_email" onReset={handleReset}>
          <Field label="Sender email" type="email" value={form.emailConfiguration.senderEmail}
            onChange={e => set('emailConfiguration', { senderEmail: e.target.value })} />
        </FieldRow>
        <FieldRow settingKey="email_sender_name" onReset={handleReset}>
          <Field label="Sender name" value={form.emailConfiguration.senderName}
            onChange={e => set('emailConfiguration', { senderName: e.target.value })} />
        </FieldRow>
      </Section>

      <Section title="OTP Configuration">
        <FieldRow settingKey="otp_length" onReset={handleReset}>
          <Field label="OTP length" type="number" value={form.otpConfiguration.otpLength}
            onChange={e => set('otpConfiguration', { otpLength: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="otp_expiry_minutes" onReset={handleReset}>
          <Field label="OTP expiry (minutes)" type="number" value={form.otpConfiguration.otpExpiryMinutes}
            onChange={e => set('otpConfiguration', { otpExpiryMinutes: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="otp_max_attempts" onReset={handleReset}>
          <Field label="Max attempts" type="number" value={form.otpConfiguration.maxAttempts}
            onChange={e => set('otpConfiguration', { maxAttempts: toNumber(e.target.value) })} />
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
            <ResetAction settingKey="otp_delivery_channel" onReset={handleReset} />
          </div>
        </div>
      </Section>

      <Section title="Security Settings">
        <FieldRow settingKey="jwt_expiry_minutes" onReset={handleReset}>
          <Field label="JWT expiry (minutes)" type="number" value={form.securitySettings.jwtExpiryMinutes}
            onChange={e => set('securitySettings', { jwtExpiryMinutes: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="jwt_refresh_expiry_days" onReset={handleReset}>
          <Field label="Refresh token expiry (days)" type="number" value={form.securitySettings.refreshTokenExpiryDays}
            onChange={e => set('securitySettings', { refreshTokenExpiryDays: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="security_max_login_attempts" onReset={handleReset}>
          <Field label="Max login attempts" type="number" value={form.securitySettings.maxLoginAttempts}
            onChange={e => set('securitySettings', { maxLoginAttempts: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="session_timeout_minutes" onReset={handleReset}>
          <Field label="Session timeout (minutes)" type="number" value={form.securitySettings.sessionTimeoutMinutes}
            onChange={e => set('securitySettings', { sessionTimeoutMinutes: toNumber(e.target.value) })} />
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
            <ResetAction settingKey="ai_system_prompt" onReset={handleReset} />
          </div>
        </div>
      </Section>

      <Button type="submit" busy={saveMutation.isPending} className="self-start">
        Save changes
      </Button>
    </form>
  )
}

export default function AdminSettingsPage() {
  const settings = useQuery({ queryKey: adminQk.settings, queryFn: getAdminSettings })

  let content: ReactNode
  if (settings.isError) {
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
