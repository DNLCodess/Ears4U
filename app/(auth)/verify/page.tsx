'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyUser, resendRegistrationOtp } from '@/lib/api/endpoints'
import { ApiError } from '@/lib/api/errors'
import { OtpInput, ResendButton } from '@/components/otp-input'
import { CompactHero } from '@/components/listening/compact-hero'

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
    if (!email) router.replace('/register')
  }, [email, router])

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

  if (!email) return null

  return (
    <main>
      <CompactHero
        title="Check your email."
        subtitle={`We sent a 6-digit code to ${maskEmail(email)}.`}
        onBack={() => router.back()}
      />
      <div className="mx-auto -mt-7 flex max-w-[420px] flex-col gap-4 rounded-t-[26px] bg-oat px-6 pb-10 pt-7
        shadow-[0_-8px_24px_rgba(0,0,0,.05)]">
        <div ref={groupRef}>
          <OtpInput key={attempt} length={6} onComplete={handleComplete} />
        </div>
        {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
        <ResendButton cooldownSeconds={60} onResend={() => resendRegistrationOtp(email)} />
      </div>
    </main>
  )
}

export default function VerifyPage() {
  return <Suspense><VerifyForm /></Suspense>
}
