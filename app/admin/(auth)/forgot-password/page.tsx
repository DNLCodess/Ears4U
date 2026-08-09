'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  forgotAdminPassword, resendAdminForgottenPasswordOtp, resetAdminPassword,
} from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'
import { passwordIssue } from '@/lib/password'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { OtpInput, ResendButton } from '@/components/otp-input'
import { AdminAuthCard } from '@/components/admin/auth-card'

type Stage = 'email' | 'otp' | 'password' | 'done'

export default function AdminForgotPasswordPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await forgotAdminPassword(email)
      setStage('otp')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleOtpComplete(code: string) {
    setOtp(code)
    setStage('password')
  }

  const pwIssue = passwordIssue(password)
  const passwordValid = !pwIssue && password === confirmPassword

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordValid) return
    setBusy(true); setError(null)
    try {
      await resetAdminPassword(email, otp, password)
      setStage('done')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminAuthCard
      title="Forgot your password?"
      subtitle={stage === 'email' ? "Tell us your admin email and we'll send a code to get you back in." : undefined}
    >
      {stage === 'email' ? (
        <form onSubmit={submitEmail} className="flex flex-col gap-4">
          {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
          <Field label="Email" type="email" autoComplete="email" required
            value={email} onChange={e => setEmail(e.target.value)} />
          <Button type="submit" busy={busy}>Send code</Button>
          <Link
            className="self-center rounded text-sm underline underline-offset-4 opacity-70
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
            href="/admin/recovery"
          >
            Lost access to this email too? Recover your account a different way.
          </Link>
        </form>
      ) : null}

      {stage === 'otp' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm opacity-70">Enter the 6-digit code we sent to {email}.</p>
          <OtpInput length={6} onComplete={handleOtpComplete} />
          {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
          <ResendButton cooldownSeconds={60} onResend={() => resendAdminForgottenPasswordOtp(email)} />
        </div>
      ) : null}

      {stage === 'password' ? (
        <form onSubmit={submitPassword} className="flex flex-col gap-4">
          {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
          <Field label="New password" type="password" autoComplete="new-password" required
            value={password} onChange={e => setPassword(e.target.value)}
            error={password.length > 0 ? pwIssue ?? undefined : undefined} />
          <Field label="Confirm new password" type="password" autoComplete="new-password" required
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          <Button type="submit" busy={busy} disabled={!passwordValid}>Reset password</Button>
        </form>
      ) : null}

      {stage === 'done' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm opacity-70">Your password has been reset. Sign in with your new password.</p>
          <Button type="button" onClick={() => router.push('/admin/login')}>Sign in</Button>
        </div>
      ) : null}
    </AdminAuthCard>
  )
}
