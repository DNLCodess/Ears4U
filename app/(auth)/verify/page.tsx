'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyUser, resendRegistrationOtp } from '@/lib/api/endpoints'
import { ApiError } from '@/lib/api/errors'
import { OtpInput, ResendButton } from '@/components/otp-input'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 1)
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`
}

function VerifyForm() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const groupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (error) groupRef.current?.querySelector('input')?.focus()
  }, [error, attempt])

  async function handleComplete(code: string) {
    setError(null)
    try {
      await verifyUser(email, code)
      router.replace('/home')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
      setAttempt(a => a + 1)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display font-semibold text-4xl leading-[1.05] tracking-tight mb-1">
        Check your email
      </h1>
      <p className="text-sm text-fir/70">
        We sent a 6-digit code to {maskEmail(email)}.
      </p>
      <div ref={groupRef}>
        <OtpInput key={attempt} length={6} onComplete={handleComplete} />
      </div>
      {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
      <ResendButton cooldownSeconds={60} onResend={() => resendRegistrationOtp(email)} />
    </div>
  )
}

export default function VerifyPage() {
  return <Suspense><VerifyForm /></Suspense>
}
