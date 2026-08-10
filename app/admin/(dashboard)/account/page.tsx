// app/admin/(dashboard)/account/page.tsx
'use client'
import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminLogout, changeAdminEmailInitiate, changeAdminEmailVerify, changeAdminPasswordInitiate,
  changeAdminPasswordVerify, deleteAdminAccount, getAdminProfile, resendAdminEmailChangeOtp,
  resendAdminPasswordChangeOtp, updateAdminProfile,
} from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { errorMessage } from '@/lib/api/errors'
import { passwordIssue } from '@/lib/password'
import type { AdminProfile } from '@/lib/api/admin/types'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { OtpInput, ResendButton } from '@/components/otp-input'

const EMAIL_RE = /.+@.+\..+/

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

function Header({ profile }: { profile: AdminProfile }) {
  const initial = profile.adminName.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="flex items-center gap-4 px-1">
      <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-fir
        font-display text-xl font-semibold text-oat">
        {initial}
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-lg font-semibold">{profile.adminName}</p>
        <p className="truncate text-sm opacity-70">{profile.adminEmail}</p>
      </div>
    </div>
  )
}

function ProfileEditor({ profile, onDone }: { profile: AdminProfile; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(profile.adminName)

  const save = useMutation({
    mutationFn: () => updateAdminProfile({ adminName: name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.profile })
      onDone()
    },
  })

  const valid = name.trim().length > 0

  return (
    <form
      onSubmit={e => { e.preventDefault(); if (valid) save.mutate() }}
      className="flex flex-col gap-4"
    >
      {save.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(save.error)}</p> : null}
      <Field label="Name" required value={name} onChange={e => setName(e.target.value)} />
      <Button type="submit" busy={save.isPending} disabled={!valid}>Save changes</Button>
    </form>
  )
}

function ChangePasswordFlow({ email, onDone }: { email: string; onDone: () => void }) {
  const [step, setStep] = useState<'current' | 'verify' | 'done'>('current')
  const [oldPassword, setOldPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const initiate = useMutation({
    mutationFn: () => changeAdminPasswordInitiate(email, oldPassword),
    onSuccess: () => setStep('verify'),
  })
  const verify = useMutation({
    mutationFn: () => changeAdminPasswordVerify(email, oldPassword, newPassword, otp),
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
        <ResendButton cooldownSeconds={60} onResend={resendAdminPasswordChangeOtp} />
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

function ChangeEmailFlow({ email, onDone }: { email: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'new' | 'verify' | 'done'>('new')
  const [newEmail, setNewEmail] = useState('')
  const [otp, setOtp] = useState('')

  const initiate = useMutation({
    mutationFn: () => changeAdminEmailInitiate(email, newEmail),
    onSuccess: () => setStep('verify'),
  })
  const verify = useMutation({
    mutationFn: () => changeAdminEmailVerify(email, newEmail, otp),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.profile })
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
        <ResendButton cooldownSeconds={60} onResend={resendAdminEmailChangeOtp} />
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

function DeleteAccountFlow() {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')

  const del = useMutation({
    mutationFn: () => deleteAdminAccount(),
    onSuccess: async () => {
      await adminLogout()
      router.replace('/admin/login')
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px]">This removes your admin access. It cannot be undone.</p>
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

type SheetKind = 'profile' | 'password' | 'email' | 'delete' | null

function AccountSkeleton() {
  return (
    <div className="max-w-xl space-y-4">
      <Skeleton lines={2} />
      <div className="rounded-2xl bg-card px-5 py-4"><Skeleton lines={3} /></div>
    </div>
  )
}

export default function AdminAccountPage() {
  const router = useRouter()
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [signingOut, setSigningOut] = useState(false)

  const profile = useQuery({ queryKey: adminQk.profile, queryFn: getAdminProfile })

  async function handleSignOut() {
    setSigningOut(true)
    await adminLogout()
    router.replace('/admin/login')
  }

  if (profile.isError) {
    return <ErrorState error={profile.error} retry={() => void profile.refetch()} />
  }
  if (profile.isLoading || !profile.data) return <AccountSkeleton />

  const data = profile.data

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold">Account</h1>
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
        <ChangePasswordFlow email={data.adminEmail} onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'email'} onClose={() => setSheet(null)} title="Change email">
        <ChangeEmailFlow email={data.adminEmail} onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'delete'} onClose={() => setSheet(null)} title="Delete your admin account?">
        <DeleteAccountFlow />
      </Sheet>
    </div>
  )
}
