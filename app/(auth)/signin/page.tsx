'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/api/endpoints'
import { ApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function safeNext(): string {
    const next = params.get('next')
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) return next
    return '/home'
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await login(email, password)
      router.replace(safeNext())
    } catch (err) {
      // The backend now always returns a real message body (see
      // docs/BACKEND-NOTES.md), so err.friendly already carries the right
      // sentence, whether that's "Incorrect email or password." or a
      // cold-start notice, without us guessing from the status code.
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1 className="font-display font-semibold text-5xl leading-[1.02] tracking-tight mb-4">
        Ears<br />for <span className="text-leaf">you.</span>
      </h1>
      <Field label="Email" type="email" autoComplete="email" required
        value={email} onChange={e => setEmail(e.target.value)} />
      <Field label="Password" type="password" autoComplete="current-password" required
        value={password} onChange={e => setPassword(e.target.value)} error={error ?? undefined} />
      <Button type="submit" busy={busy}>Sign in</Button>
      <Button type="button" variant="ghost" onClick={() => router.push('/register')}>Create an account</Button>
      <Link
        className="text-sm underline underline-offset-4 opacity-80 self-start rounded
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
        href="/forgot-password"
      >
        Forgot password?
      </Link>
    </form>
  )
}

export default function SignInPage() {
  return <Suspense><SignInForm /></Suspense>
}
