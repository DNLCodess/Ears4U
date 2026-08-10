'use client'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeEmailInitiate, changeEmailVerify, changePasswordInitiate, changePasswordVerify,
  deleteAccount, getNotificationSettings, getProfile, logout, resendEmailChangeOtp,
  resendPasswordChangeOtp, updateNotificationSettings, updateProfile,
} from '@/lib/api/endpoints'
import { qk } from '@/lib/query/keys'
import { errorMessage } from '@/lib/api/errors'
import { passwordIssue } from '@/lib/password'
import type { NotificationSettings, UpdateProfilePayload, UserProfile } from '@/lib/api/types'
import { Lifeline } from '@/components/lifeline'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { Toggle } from '@/components/ui/toggle'
import { OtpInput, ResendButton } from '@/components/otp-input'

const COUNTRIES = [
  'Nigeria', 'United States', 'United Kingdom', 'Canada', 'Ghana', 'Kenya',
  'South Africa', 'India', 'Australia', 'Germany', 'France', 'Ireland',
  'Netherlands', 'Sweden', 'Spain', 'Italy', 'Brazil', 'Mexico',
  'United Arab Emirates', 'Saudi Arabia', 'Egypt', 'Ethiopia', 'Uganda',
  'Rwanda', 'Cameroon', 'Philippines', 'Singapore', 'Malaysia', 'China', 'Japan',
]
const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced']
const EMPLOYMENT_STATUSES = ['Student', 'Employed', 'Self Employed', 'Unemployed']

const EMAIL_RE = /.+@.+\..+/

function maxDob(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 13)
  return d.toISOString().slice(0, 10)
}

const selectClass = 'w-full rounded-xl border-[1.5px] border-fir/30 bg-card px-4 py-3 text-[15px]'
  + ' outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/25'

function SelectField({ label, value, onChange, options }:
  { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className={selectClass}>
        <option value="" disabled>Select {label.toLowerCase()}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

// ---------------------------------------------------------------------------
// Section shell
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card px-5 py-4">
      <p className="text-sm font-medium opacity-60">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function RowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center justify-between text-left text-[15px]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
    >
      {label}
      <span aria-hidden className="opacity-40">{'>'}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header({ profile }: { profile: UserProfile }) {
  const initial = profile.name.trim().charAt(0).toUpperCase() || '?'
  const year = new Date(profile.createdAt).getFullYear()
  const memberSince = Number.isNaN(year) ? '' : `Member since ${year}`
  return (
    <div className="flex items-center gap-4 px-1">
      <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-leaf
        font-display text-2xl font-semibold text-oat">
        {initial}
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-xl font-semibold">{profile.name}</p>
        <p className="truncate text-sm opacity-70">{profile.email}</p>
        {memberSince ? <p className="text-[13px] opacity-50">{memberSince}</p> : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile editor
// ---------------------------------------------------------------------------

function ProfileEditor({ profile, onDone }: { profile: UserProfile; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(profile.name)
  const [gender, setGender] = useState(profile.gender)
  const [country, setCountry] = useState(profile.country)
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth?.slice(0, 10) ?? '')
  const [maritalStatus, setMaritalStatus] = useState(profile.maritalStatus)
  const [employmentStatus, setEmploymentStatus] = useState(profile.employmentStatus)

  const save = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.profile })
      onDone()
    },
  })

  const valid = name.trim().length > 0 && !!gender && !!country && !!dateOfBirth
    && !!maritalStatus && !!employmentStatus

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    save.mutate({ name, gender, country, dateOfBirth, maritalStatus, employmentStatus })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {save.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(save.error)}</p> : null}
      <Field label="Name" required value={name} onChange={e => setName(e.target.value)} />
      <SelectField label="Gender" value={gender} onChange={setGender} options={GENDERS} />
      <SelectField label="Country" value={country} onChange={setCountry} options={COUNTRIES} />
      <label className="block">
        <span className="block text-sm font-medium mb-1.5">Date of birth</span>
        <input type="date" required max={maxDob()} value={dateOfBirth}
          onChange={e => setDateOfBirth(e.target.value)} className={selectClass} />
      </label>
      <SelectField label="Marital status" value={maritalStatus} onChange={setMaritalStatus} options={MARITAL_STATUSES} />
      <SelectField label="Employment status" value={employmentStatus} onChange={setEmploymentStatus} options={EMPLOYMENT_STATUSES} />
      <Button type="submit" busy={save.isPending} disabled={!valid}>Save changes</Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Change password
// ---------------------------------------------------------------------------

function ChangePasswordFlow({ email, onDone }: { email: string; onDone: () => void }) {
  const [step, setStep] = useState<'current' | 'verify' | 'done'>('current')
  const [oldPassword, setOldPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const initiate = useMutation({
    mutationFn: () => changePasswordInitiate(email, oldPassword),
    onSuccess: () => setStep('verify'),
  })

  const verify = useMutation({
    mutationFn: () => changePasswordVerify(email, oldPassword, newPassword, otp),
    onSuccess: () => setStep('done'),
  })

  if (step === 'done') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px]">Password updated.</p>
        <Button type="button" onClick={onDone}>Done</Button>
      </div>
    )
  }

  if (step === 'verify') {
    const pwIssue = passwordIssue(newPassword)
    const newPasswordValid = !pwIssue && newPassword === confirmPassword
    return (
      <form onSubmit={e => { e.preventDefault(); if (otp.length === 6 && newPasswordValid) verify.mutate() }}
        className="flex flex-col gap-4">
        {verify.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(verify.error)}</p> : null}
        <OtpInput length={6} onComplete={setOtp} />
        <Field label="New password" type="password" autoComplete="new-password" required
          value={newPassword} onChange={e => setNewPassword(e.target.value)}
          error={newPassword.length > 0 ? pwIssue ?? undefined : undefined} />
        <Field label="Confirm new password" type="password" autoComplete="new-password" required
          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        <ResendButton cooldownSeconds={60} onResend={resendPasswordChangeOtp} />
        <Button type="submit" busy={verify.isPending} disabled={otp.length !== 6 || !newPasswordValid}>
          Update password
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={e => { e.preventDefault(); if (oldPassword) initiate.mutate() }} className="flex flex-col gap-4">
      {initiate.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(initiate.error)}</p> : null}
      <Field label="Current password" type="password" autoComplete="current-password" required
        value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
      <Button type="submit" busy={initiate.isPending} disabled={!oldPassword}>Continue</Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Change email
// ---------------------------------------------------------------------------

function ChangeEmailFlow({ email, onDone }: { email: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'new' | 'verify' | 'done'>('new')
  const [newEmail, setNewEmail] = useState('')
  const [otp, setOtp] = useState('')

  const initiate = useMutation({
    mutationFn: () => changeEmailInitiate(email, newEmail),
    onSuccess: () => setStep('verify'),
  })

  const verify = useMutation({
    mutationFn: () => changeEmailVerify(email, newEmail, otp),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.profile })
      setStep('done')
    },
  })

  if (step === 'done') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px]">Email updated.</p>
        <Button type="button" onClick={onDone}>Done</Button>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <form onSubmit={e => { e.preventDefault(); if (otp.length === 6) verify.mutate() }} className="flex flex-col gap-4">
        {verify.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(verify.error)}</p> : null}
        <p className="text-sm opacity-70">Enter the code sent to {newEmail}.</p>
        <OtpInput length={6} onComplete={setOtp} />
        <ResendButton cooldownSeconds={60} onResend={resendEmailChangeOtp} />
        <Button type="submit" busy={verify.isPending} disabled={otp.length !== 6}>Confirm new email</Button>
      </form>
    )
  }

  const valid = EMAIL_RE.test(newEmail) && newEmail !== email

  return (
    <form onSubmit={e => { e.preventDefault(); if (valid) initiate.mutate() }} className="flex flex-col gap-4">
      {initiate.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(initiate.error)}</p> : null}
      <Field label="New email" type="email" autoComplete="email" required
        value={newEmail} onChange={e => setNewEmail(e.target.value)} />
      <Button type="submit" busy={initiate.isPending} disabled={!valid}>Send code</Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Delete account
// ---------------------------------------------------------------------------

function DeleteAccountFlow() {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')

  const del = useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: async () => {
      await logout()
      router.replace('/signin')
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px]">This erases your journals, moods, and conversations. It cannot be undone.</p>
      {del.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(del.error)}</p> : null}
      <Field label='Type "DELETE" to confirm' value={confirmText} onChange={e => setConfirmText(e.target.value)} />
      <Button
        type="button"
        variant="destructive"
        busy={del.isPending}
        disabled={confirmText !== 'DELETE'}
        onClick={() => del.mutate()}
      >
        Delete my account
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notification settings
// ---------------------------------------------------------------------------

const TOGGLE_ROWS: { key: keyof NotificationSettings; label: string }[] = [
  { key: 'pushNotifications', label: 'Push notifications' },
  { key: 'emailNotifications', label: 'Email updates' },
  { key: 'moodReminders', label: 'Mood reminders' },
  { key: 'journalReminders', label: 'Journal reminders' },
  { key: 'therapySessionReminders', label: 'Session reminders' },
  { key: 'communityActivity', label: 'Community activity' },
]

function NotificationSettingsSection() {
  const queryClient = useQueryClient()
  const settings = useQuery({ queryKey: qk.notificationSettings, queryFn: getNotificationSettings })

  const update = useMutation({
    mutationFn: (next: NotificationSettings) => updateNotificationSettings(next),
    onMutate: async (next: NotificationSettings) => {
      await queryClient.cancelQueries({ queryKey: qk.notificationSettings })
      const previous = queryClient.getQueryData<NotificationSettings>(qk.notificationSettings)
      queryClient.setQueryData(qk.notificationSettings, next)
      return { previous }
    },
    onError: (_err, _next, context) => {
      if (context?.previous) queryClient.setQueryData(qk.notificationSettings, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notificationSettings })
    },
  })

  if (settings.isError) {
    return (
      <Section title="Notifications">
        <ErrorState error={settings.error} retry={() => void settings.refetch()} />
      </Section>
    )
  }
  if (settings.isLoading || !settings.data) {
    return (
      <Section title="Notifications">
        <Skeleton lines={4} />
      </Section>
    )
  }

  const current = settings.data

  return (
    <Section title="Notifications">
      <div className="flex flex-col divide-y divide-fir/10">
        {TOGGLE_ROWS.map(row => (
          <div key={row.key} className="flex items-center justify-between gap-4 py-2.5">
            <span className="text-[15px]">{row.label}</span>
            <Toggle
              checked={current[row.key] as boolean}
              onChange={value => update.mutate({ ...current, [row.key]: value })}
              label={row.label}
              disabled={update.isPending}
            />
          </div>
        ))}
        {current.moodReminders ? (
          <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="text-[15px]">Reminder time</span>
            <input
              type="time"
              value={current.moodReminderTime}
              onChange={e => update.mutate({ ...current, moodReminderTime: e.target.value })}
              className="rounded-xl border-[1.5px] border-fir/30 bg-card px-3 py-2 text-[15px]
                outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/25"
            />
          </div>
        ) : null}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type SheetKind = 'profile' | 'password' | 'email' | 'delete' | null

function YouSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-5 py-6 lg:px-6">
      <Skeleton lines={2} />
      <div className="rounded-2xl bg-card px-5 py-4"><Skeleton lines={3} /></div>
      <div className="rounded-2xl bg-card px-5 py-4"><Skeleton lines={3} /></div>
    </div>
  )
}

export default function YouPage() {
  const router = useRouter()
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [signingOut, setSigningOut] = useState(false)

  const profile = useQuery({ queryKey: qk.profile, queryFn: getProfile })

  async function handleSignOut() {
    setSigningOut(true)
    await logout()
    router.replace('/signin')
  }

  if (profile.isError) {
    return (
      <div className="mx-auto max-w-xl px-5 py-10 lg:px-6">
        <ErrorState error={profile.error} retry={() => void profile.refetch()} />
      </div>
    )
  }
  if (profile.isLoading || !profile.data) return <YouSkeleton />

  const data = profile.data

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 pb-10 pt-6 lg:px-6">
      <Header profile={data} />

      <Section title="Profile">
        <RowButton label="Edit profile" onClick={() => setSheet('profile')} />
      </Section>

      <Section title="Security">
        <div className="flex flex-col divide-y divide-fir/10">
          <RowButton label="Change password" onClick={() => setSheet('password')} />
          <RowButton label="Change email" onClick={() => setSheet('email')} />
        </div>
      </Section>

      <NotificationSettingsSection />

      <Section title="Support">
        <Lifeline />
      </Section>

      <div className="mt-2 flex flex-col gap-3">
        <Button type="button" variant="ghost" busy={signingOut} onClick={handleSignOut}>
          Sign out
        </Button>
        <button
          type="button"
          onClick={() => setSheet('delete')}
          className="inline-flex min-h-11 items-center justify-center self-center text-sm
            text-fir/60 underline underline-offset-4
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
        >
          Delete account
        </button>
      </div>

      <Sheet open={sheet === 'profile'} onClose={() => setSheet(null)} title="Edit profile">
        <ProfileEditor profile={data} onDone={() => setSheet(null)} />
      </Sheet>

      <Sheet open={sheet === 'password'} onClose={() => setSheet(null)} title="Change password">
        <ChangePasswordFlow email={data.email} onDone={() => setSheet(null)} />
      </Sheet>

      <Sheet open={sheet === 'email'} onClose={() => setSheet(null)} title="Change email">
        <ChangeEmailFlow email={data.email} onDone={() => setSheet(null)} />
      </Sheet>

      <Sheet open={sheet === 'delete'} onClose={() => setSheet(null)} title="Delete your account?">
        <DeleteAccountFlow />
      </Sheet>
    </div>
  )
}
