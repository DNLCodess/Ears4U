// components/admin/user-manage-sheet.tsx
'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  suspendAdminUser, reactivateAdminUser, changeAdminUserEmail, generateAdminUserOtp,
} from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { errorMessage } from '@/lib/api/errors'
import type { AdminUserSummary } from '@/lib/api/admin/types'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

const EMAIL_RE = /.+@.+\..+/

type OtpKind = 'registration' | 'password' | 'email' | 'password-change'

const OTP_KINDS: { kind: OtpKind; label: string }[] = [
  { kind: 'registration', label: 'Generate registration code' },
  { kind: 'password', label: 'Generate password reset code' },
  { kind: 'email', label: 'Generate email change code' },
  { kind: 'password-change', label: 'Generate password change code' },
]

function StatusAction({ user }: { user: AdminUserSummary }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const isActive = user.status === 'Active'

  const mutation = useMutation({
    mutationFn: () => (isActive ? suspendAdminUser(user.email) : reactivateAdminUser(user.email)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.users })
      void queryClient.invalidateQueries({ queryKey: adminQk.auditLogs })
      setConfirming(false)
    },
  })

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        {mutation.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(mutation.error)}</p> : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isActive ? 'destructive' : 'primary'}
            busy={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {isActive ? 'Confirm suspend' : 'Confirm reactivate'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => { mutation.reset(); setConfirming(false) }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button type="button" variant={isActive ? 'destructive' : 'primary'} onClick={() => setConfirming(true)}>
      {isActive ? 'Suspend user' : 'Reactivate user'}
    </Button>
  )
}

function ChangeEmailForm({ user }: { user: AdminUserSummary }) {
  const queryClient = useQueryClient()
  const [newEmail, setNewEmail] = useState('')

  const mutation = useMutation({
    mutationFn: () => changeAdminUserEmail(user.email, newEmail),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.users })
      void queryClient.invalidateQueries({ queryKey: adminQk.auditLogs })
      setNewEmail('')
    },
  })

  const valid = EMAIL_RE.test(newEmail) && newEmail !== user.email

  return (
    <form
      onSubmit={e => { e.preventDefault(); if (valid) mutation.mutate() }}
      className="flex flex-col gap-3"
    >
      {mutation.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(mutation.error)}</p> : null}
      {mutation.isSuccess ? <p role="status" className="text-sm text-leaf">Email updated.</p> : null}
      <Field label="New email" type="email" autoComplete="email" required
        value={newEmail} onChange={e => { setNewEmail(e.target.value); mutation.reset() }} />
      <Button type="submit" busy={mutation.isPending} disabled={!valid}>Update email</Button>
    </form>
  )
}

function FailoverOtpButton({ user, kind, label }: { user: AdminUserSummary; kind: OtpKind; label: string }) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  // Each row owns its own mutation so generating one code doesn't clear or
  // hide another row's already-displayed code or error.
  const mutation = useMutation({
    mutationFn: () => generateAdminUserOtp(user.email, kind),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.auditLogs })
    },
  })

  const copyCode = () => {
    const code = mutation.data?.otp
    if (!code) return
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="ghost"
        busy={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {label}
      </Button>
      {mutation.isSuccess ? (
        <p role="status" className="flex items-center gap-2 text-sm text-leaf">
          Code: <span className="font-display font-semibold">{mutation.data?.otp}</span>
          <Button type="button" variant="ghost" onClick={copyCode}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </p>
      ) : null}
      {mutation.isError ? (
        <p role="alert" className="text-sm text-clay">{errorMessage(mutation.error)}</p>
      ) : null}
    </div>
  )
}

function FailoverOtp({ user }: { user: AdminUserSummary }) {
  return (
    <div className="flex flex-col gap-3">
      {OTP_KINDS.map(({ kind, label }) => (
        <FailoverOtpButton key={kind} user={user} kind={kind} label={label} />
      ))}
    </div>
  )
}

export function UserManageSheet({ user, open, onClose }: {
  user: AdminUserSummary | null
  open: boolean
  onClose: () => void
}) {
  if (!user) return null
  return (
    <Sheet open={open} onClose={onClose} title={user.name}>
      <div key={user.id} className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-sm font-semibold opacity-70">Status</p>
          <StatusAction user={user} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold opacity-70">Change email</p>
          <ChangeEmailForm user={user} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold opacity-70">Support failover</p>
          <FailoverOtp user={user} />
        </div>
      </div>
    </Sheet>
  )
}
