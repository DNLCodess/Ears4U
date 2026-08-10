'use client'
import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { getAdminSettings, updateAdminSettings, resetAdminSetting } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { errorMessage } from '@/lib/api/errors'
import type { AdminSystemSettings, AdminSettingResetKey } from '@/lib/api/admin/types'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'

type ResetMutation = UseMutationResult<unknown, unknown, AdminSettingResetKey>

const DELIVERY_CHANNELS: AdminSystemSettings['otpConfiguration']['deliveryChannel'][] = ['EMAIL', 'SMS', 'BOTH']

// Coerces a number input's raw string to a finite number, falling back to 0 for an empty or
// otherwise non-numeric intermediate value (e.g. the box is momentarily cleared while retyping) -
// `type="number"` on the underlying input already keeps out non-numeric characters, this just
// keeps the controlled value from ever becoming NaN mid-edit.
function toNumber(raw: string): number {
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function ResetAction({ settingKey, resetMutation }: { settingKey: AdminSettingResetKey; resetMutation: ResetMutation }) {
  const busy = resetMutation.isPending && resetMutation.variables === settingKey
  const failed = resetMutation.isError && resetMutation.variables === settingKey
  return (
    <div className="flex shrink-0 flex-col items-end gap-1 self-end sm:self-auto">
      <button
        type="button"
        disabled={busy}
        onClick={() => resetMutation.mutate(settingKey)}
        className="inline-flex min-h-11 items-center text-sm text-fir/60 underline underline-offset-4
          disabled:opacity-50
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
      >
        {busy ? 'Resetting…' : 'Reset to default'}
      </button>
      {failed ? <span role="alert" className="text-xs text-clay">{errorMessage(resetMutation.error)}</span> : null}
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

function FieldRow({ settingKey, resetMutation, children }: {
  settingKey: AdminSettingResetKey
  resetMutation: ResetMutation
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">{children}</div>
      <ResetAction settingKey={settingKey} resetMutation={resetMutation} />
    </div>
  )
}

function ToggleRow({ label, checked, onChange, settingKey, resetMutation }: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  settingKey: AdminSettingResetKey
  resetMutation: ResetMutation
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">{label}</span>
        <Toggle label={label} checked={checked} onChange={onChange} />
      </div>
      <div className="flex justify-end">
        <ResetAction settingKey={settingKey} resetMutation={resetMutation} />
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

  async function syncFromCache() {
    await queryClient.invalidateQueries({ queryKey: adminQk.settings })
    const fresh = queryClient.getQueryData<AdminSystemSettings>(adminQk.settings)
    if (fresh) setForm(fresh)
  }

  const resetMutation = useMutation({
    mutationFn: (key: AdminSettingResetKey) => resetAdminSetting(key),
    onSuccess: async (_data, key) => {
      await syncFromCache()
      if (key === 'email_api_key') setApiKeyDraft(null)
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      // If "Change API key" was never clicked, resend the original masked string unmodified -
      // a safe no-op both by design and because the backend's own guard drops it anyway. Only a
      // genuinely typed replacement (apiKeyDraft !== null) is sent instead.
      const payload: AdminSystemSettings = {
        ...form,
        emailConfiguration: {
          ...form.emailConfiguration,
          apiKey: apiKeyDraft !== null ? apiKeyDraft : form.emailConfiguration.apiKey,
        },
      }
      return updateAdminSettings(payload)
    },
    onSuccess: async () => {
      await syncFromCache()
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
        <FieldRow settingKey="api_base_url" resetMutation={resetMutation}>
          <Field label="Base URL" value={form.apiConfiguration.baseUrl}
            onChange={e => set('apiConfiguration', { baseUrl: e.target.value })} />
        </FieldRow>
        <FieldRow settingKey="api_version" resetMutation={resetMutation}>
          <Field label="API version" value={form.apiConfiguration.apiVersion}
            onChange={e => set('apiConfiguration', { apiVersion: e.target.value })} />
        </FieldRow>
        <FieldRow settingKey="api_rate_limit_per_minute" resetMutation={resetMutation}>
          <Field label="Rate limit (per minute)" type="number" value={form.apiConfiguration.rateLimitPerMinute}
            onChange={e => set('apiConfiguration', { rateLimitPerMinute: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="api_timeout_ms" resetMutation={resetMutation}>
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
              <Field label="New API key" autoComplete="off" value={apiKeyDraft}
                onChange={e => setApiKeyDraft(e.target.value)} />
            )}
          </div>
          <ResetAction settingKey="email_api_key" resetMutation={resetMutation} />
        </div>
        <FieldRow settingKey="email_sender_email" resetMutation={resetMutation}>
          <Field label="Sender email" type="email" value={form.emailConfiguration.senderEmail}
            onChange={e => set('emailConfiguration', { senderEmail: e.target.value })} />
        </FieldRow>
        <FieldRow settingKey="email_sender_name" resetMutation={resetMutation}>
          <Field label="Sender name" value={form.emailConfiguration.senderName}
            onChange={e => set('emailConfiguration', { senderName: e.target.value })} />
        </FieldRow>
      </Section>

      <Section title="OTP Configuration">
        <FieldRow settingKey="otp_length" resetMutation={resetMutation}>
          <Field label="OTP length" type="number" value={form.otpConfiguration.otpLength}
            onChange={e => set('otpConfiguration', { otpLength: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="otp_expiry_minutes" resetMutation={resetMutation}>
          <Field label="OTP expiry (minutes)" type="number" value={form.otpConfiguration.otpExpiryMinutes}
            onChange={e => set('otpConfiguration', { otpExpiryMinutes: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="otp_max_attempts" resetMutation={resetMutation}>
          <Field label="Max attempts" type="number" value={form.otpConfiguration.maxAttempts}
            onChange={e => set('otpConfiguration', { maxAttempts: toNumber(e.target.value) })} />
        </FieldRow>
        <div className="flex flex-col gap-2">
          <p id="delivery-channel-label" className="text-sm font-medium">Delivery channel</p>
          <div aria-labelledby="delivery-channel-label" className="flex gap-2">
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
            <ResetAction settingKey="otp_delivery_channel" resetMutation={resetMutation} />
          </div>
        </div>
      </Section>

      <Section title="Security Settings">
        <FieldRow settingKey="jwt_expiry_minutes" resetMutation={resetMutation}>
          <Field label="JWT expiry (minutes)" type="number" value={form.securitySettings.jwtExpiryMinutes}
            onChange={e => set('securitySettings', { jwtExpiryMinutes: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="jwt_refresh_expiry_days" resetMutation={resetMutation}>
          <Field label="Refresh token expiry (days)" type="number" value={form.securitySettings.refreshTokenExpiryDays}
            onChange={e => set('securitySettings', { refreshTokenExpiryDays: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="security_max_login_attempts" resetMutation={resetMutation}>
          <Field label="Max login attempts" type="number" value={form.securitySettings.maxLoginAttempts}
            onChange={e => set('securitySettings', { maxLoginAttempts: toNumber(e.target.value) })} />
        </FieldRow>
        <FieldRow settingKey="session_timeout_minutes" resetMutation={resetMutation}>
          <Field label="Session timeout (minutes)" type="number" value={form.securitySettings.sessionTimeoutMinutes}
            onChange={e => set('securitySettings', { sessionTimeoutMinutes: toNumber(e.target.value) })} />
        </FieldRow>
        <ToggleRow label="Multi-factor authentication" checked={form.securitySettings.mfaEnabled}
          onChange={next => set('securitySettings', { mfaEnabled: next })}
          settingKey="security_mfa_enabled" resetMutation={resetMutation} />
        <ToggleRow label="IP whitelist" checked={form.securitySettings.ipWhitelistEnabled}
          onChange={next => set('securitySettings', { ipWhitelistEnabled: next })}
          settingKey="security_ip_whitelist_enabled" resetMutation={resetMutation} />
      </Section>

      <Section title="AI Configuration">
        <ToggleRow label="Enable AI chat" checked={form.aiConfiguration.enableAiChat}
          onChange={next => set('aiConfiguration', { enableAiChat: next })}
          settingKey="enable_ai_chat" resetMutation={resetMutation} />
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
            <ResetAction settingKey="ai_system_prompt" resetMutation={resetMutation} />
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
