// app/admin/(auth)/verify/page.tsx
'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyAdmin, resendAdminRegistrationOtp } from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'
import { OtpInput, ResendButton } from '@/components/otp-input'
import { AdminAuthCard } from '@/components/admin/auth-card'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 1)
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`
}

function AdminVerifyForm() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!email) router.replace('/admin/register')
  }, [email, router])

  async function handleComplete(otp: string) {
    setError(null)
    try {
      await verifyAdmin(email, otp)
      router.replace('/admin/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'That code did not work. Try again.')
      setAttempt(a => a + 1)
    }
  }

  if (!email) return null

  return (
    <AdminAuthCard title="Check your email" subtitle={`We sent a 6-digit code to ${maskEmail(email)}.`}>
      <div className="flex flex-col gap-4">
        <OtpInput key={attempt} length={6} onComplete={handleComplete} />
        {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
        <ResendButton cooldownSeconds={60} onResend={() => resendAdminRegistrationOtp(email)} />
      </div>
    </AdminAuthCard>
  )
}

export default function AdminVerifyPage() {
  return <Suspense><AdminVerifyForm /></Suspense>
}
