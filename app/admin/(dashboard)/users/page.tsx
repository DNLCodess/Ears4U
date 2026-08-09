'use client'
import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getAdminUsers, getAdminAuditLogs } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import type { AdminUserSummary } from '@/lib/api/admin/types'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { UserManageSheet } from '@/components/admin/user-manage-sheet'

const STATUS_OPTIONS: { value: '' | 'active' | 'suspended'; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

export function formatJoinedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatLogTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | 'active' | 'suspended'>('')
  const [page, setPage] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const users = useQuery({
    queryKey: [...adminQk.users, { search, status, page }],
    queryFn: () => getAdminUsers({ search: search || undefined, status: status || undefined, page }),
    placeholderData: keepPreviousData,
  })
  const auditLogs = useQuery({ queryKey: adminQk.auditLogs, queryFn: getAdminAuditLogs })

  const selectedUser: AdminUserSummary | null =
    users.data?.users.find(u => u.id === selectedUserId) ?? null

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Users</h1>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <Field label="Search" placeholder="Name or email"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setStatus(opt.value); setPage(1) }}
              className={`rounded-full px-3.5 py-2 text-sm font-medium
                ${status === opt.value ? 'bg-fir text-oat' : 'bg-card opacity-70'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {users.isError ? (
        <ErrorState error={users.error} retry={() => void users.refetch()} />
      ) : users.isLoading || !users.data ? (
        <div className="rounded-2xl bg-card px-4 py-3.5">
          <Skeleton lines={5} />
        </div>
      ) : (
        <>
          {users.data.users.length === 0 ? (
            <div className="rounded-2xl bg-card px-4 py-6 text-center text-sm opacity-55">
              No users match that search.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-fir/10 rounded-2xl bg-card px-4">
              {users.data.users.map(u => (
                <div key={u.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{u.name}</p>
                    <p className="truncate text-xs opacity-55">{u.email}</p>
                  </div>
                  <div className="flex flex-none items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold
                      ${u.status === 'active' ? 'bg-leaf/15 text-leaf' : 'bg-clay/15 text-clay'}`}>
                      {u.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                    <span className="hidden text-xs opacity-50 lg:inline">{formatJoinedAt(u.joinedAt)}</span>
                    <Button type="button" variant="ghost" onClick={() => setSelectedUserId(u.id)}>Manage</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {users.data.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <span className="opacity-60">Page {users.data.page} of {users.data.totalPages}</span>
              <Button type="button" variant="ghost" disabled={page >= users.data.totalPages}
                onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold opacity-70">Recent audit logs</p>
        {auditLogs.isError ? (
          <ErrorState error={auditLogs.error} retry={() => void auditLogs.refetch()} />
        ) : auditLogs.isLoading || !auditLogs.data ? (
          <div className="rounded-2xl bg-card px-4 py-3.5">
            <Skeleton lines={3} />
          </div>
        ) : auditLogs.data.length === 0 ? (
          <div className="rounded-2xl bg-card px-4 py-6 text-center text-sm opacity-55">
            No audit activity yet.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-fir/10 rounded-2xl bg-card px-4">
            {auditLogs.data.map(log => (
              <div key={log.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px]">{log.action}</p>
                  <p className="text-xs opacity-55">{log.actor}</p>
                </div>
                <span className="flex-none text-xs opacity-50">{formatLogTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <UserManageSheet user={selectedUser} open={selectedUserId !== null} onClose={() => setSelectedUserId(null)} />
    </div>
  )
}
