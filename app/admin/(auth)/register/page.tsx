// app/admin/(auth)/register/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerAdmin } from '@/lib/api/admin/endpoints'
import { ApiError } from '@/lib/api/errors'
import { passwordIssue } from '@/lib/password'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { AdminAuthCard } from '@/components/admin/auth-card'

export default function AdminRegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pwIssue = passwordIssue(password)
  const valid = name.trim().length > 0 && /.+@.+\..+/.test(email) && !pwIssue && password === confirmPassword

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true); setError(null)
    try {
      await registerAdmin({ adminName: name, adminEmail: email, adminPassword: password })
      router.push(`/admin/verify?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <AdminAuthCard title="Create an admin account" subtitle="A short setup, then a code to confirm it's you.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}
        <Field label="Name" required value={name} onChange={e => setName(e.target.value)} />
        <Field label="Email" type="email" autoComplete="email" required
          value={email} onChange={e => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="new-password" required
          value={password} onChange={e => setPassword(e.target.value)}
          error={password.length > 0 ? pwIssue ?? undefined : undefined} />
        <Field label="Confirm password" type="password" autoComplete="new-password" required
          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        <Button type="submit" busy={busy} disabled={!valid}>Continue</Button>
      </form>
    </AdminAuthCard>
  )
}
