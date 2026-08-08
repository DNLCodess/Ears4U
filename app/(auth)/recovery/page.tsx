'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { recoveryInitiate, recoveryConfirm } from '@/lib/api/endpoints'
import { ApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { OtpInput } from '@/components/otp-input'
import { CompactHero } from '@/components/listening/compact-hero'

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
    <main>
      <CompactHero
        title="Recover your account."
        subtitle={stage === 'email' ? 'Enter your account email and we will send you a code to sign you back in.' : undefined}
        onBack={() => router.back()}
      />
      <div className="mx-auto -mt-7 flex max-w-[420px] flex-col gap-4 rounded-t-[26px] bg-oat px-6 pb-10 pt-7
        shadow-[0_-8px_24px_rgba(0,0,0,.05)]">
        {stage === 'email' ? (
          <form onSubmit={submitEmail} className="flex flex-col gap-4">
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
    </main>
  )
}
