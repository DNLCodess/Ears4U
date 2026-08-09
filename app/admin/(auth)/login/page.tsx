// app/admin/(auth)/login/page.tsx
'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { adminLogin } from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { AdminAuthCard } from '@/components/admin/auth-card'

function AdminLoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function safeNext(): string {
    const next = params.get('next')
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) return next
    return '/admin/dashboard'
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await adminLogin(email, password)
      router.replace(safeNext())
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <AdminAuthCard title="Admin sign in" subtitle="Manage the EARS FOR YOU platform.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
        <Field label="Email" type="email" autoComplete="email" required
          value={email} onChange={e => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required
          value={password} onChange={e => setPassword(e.target.value)} />
        <Button type="submit" busy={busy}>Sign in</Button>
        <Link
          className="self-center rounded text-sm underline underline-offset-4 opacity-70
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
          href="/admin/forgot-password"
        >
          Forgot password?
        </Link>
        <Link
          className="self-center rounded text-xs underline underline-offset-4 opacity-50
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
          href="/admin/register"
        >
          Need an admin account?
        </Link>
      </form>
    </AdminAuthCard>
  )
}

export default function AdminLoginPage() {
  return <Suspense><AdminLoginForm /></Suspense>
}
