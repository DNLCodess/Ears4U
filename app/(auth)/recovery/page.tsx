'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { recoveryInitiate, recoveryConfirm } from '@/lib/api/endpoints'
import { ApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { OtpInput } from '@/components/otp-input'

type Stage = 'email' | 'otp'

export default function RecoveryPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await recoveryInitiate(email)
      setStage('otp')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleOtpComplete(code: string) {
    setError(null)
    try {
      await recoveryConfirm(email, code)
      router.replace('/home')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display font-semibold text-4xl leading-[1.05] tracking-tight mb-1">
        Recover your account
      </h1>

      {stage === 'email' ? (
        <form onSubmit={submitEmail} className="flex flex-col gap-4">
          <p className="text-sm text-fir/70">
            Enter your account email and we will send you a code to sign you back in.
          </p>
          <Field label="Email" type="email" autoComplete="email" required
            value={email} onChange={e => setEmail(e.target.value)} error={error ?? undefined} />
          <Button type="submit" busy={busy}>Send code</Button>
        </form>
      ) : null}

      {stage === 'otp' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fir/70">Enter the 6-digit code we sent to {email}.</p>
          <OtpInput length={6} onComplete={handleOtpComplete} />
          {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
