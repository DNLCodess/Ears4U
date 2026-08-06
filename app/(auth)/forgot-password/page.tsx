'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { forgotPassword, resendForgottenPasswordOtp, resetPassword } from '@/lib/api/endpoints'
import { ApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { OtpInput, ResendButton } from '@/components/otp-input'

type Stage = 'email' | 'otp' | 'password' | 'done'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const passwordValid = password.length >= 8 && password === confirmPassword

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await forgotPassword(email)
      setStage('otp')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function handleOtpComplete(code: string) {
    setOtp(code)
    setStage('password')
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordValid) return
    setBusy(true); setError(null)
    try {
      await resetPassword(email, otp, password)
      setStage('done')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display font-semibold text-4xl leading-[1.05] tracking-tight mb-1">
        Reset your password
      </h1>

      {stage === 'email' ? (
        <form onSubmit={submitEmail} className="flex flex-col gap-4">
          <p className="text-sm text-fir/70">
            Enter your email and we will send you a code to reset your password.
          </p>
          <Field label="Email" type="email" autoComplete="email" required
            value={email} onChange={e => setEmail(e.target.value)} error={error ?? undefined} />
          <Button type="submit" busy={busy}>Send code</Button>
          <Link className="text-sm underline underline-offset-4 opacity-80 self-start" href="/recovery">
            Lost access to this email? Recover your account
          </Link>
        </form>
      ) : null}

      {stage === 'otp' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fir/70">Enter the 6-digit code we sent to {email}.</p>
          <OtpInput length={6} onComplete={handleOtpComplete} />
          {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
          <ResendButton cooldownSeconds={60} onResend={() => resendForgottenPasswordOtp(email)} />
        </div>
      ) : null}

      {stage === 'password' ? (
        <form onSubmit={submitPassword} className="flex flex-col gap-4">
          <Field label="New password" type="password" autoComplete="new-password" required
            value={password} onChange={e => setPassword(e.target.value)} />
          <Field label="Confirm new password" type="password" autoComplete="new-password" required
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            error={error ?? undefined} />
          <Button type="submit" busy={busy} disabled={!passwordValid}>Reset password</Button>
        </form>
      ) : null}

      {stage === 'done' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fir/70">Your password has been reset. Sign in with your new password.</p>
          <Button type="button" onClick={() => router.push('/signin')}>Sign in</Button>
        </div>
      ) : null}
    </div>
  )
}
