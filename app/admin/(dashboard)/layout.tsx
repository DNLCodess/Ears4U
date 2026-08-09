'use client'
import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { QueryProvider } from '@/lib/query/provider'
import { onAdminAuthExpired, refreshAdminSession } from '@/lib/api/admin/client'
import { getAdminAccessToken } from '@/lib/api/admin/token'
import { MOCKS_ENABLED } from '@/lib/mocks'
import { AdminShell } from '@/components/admin/shell'

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    onAdminAuthExpired(() => router.replace('/admin/login'))
  }, [router])
  useEffect(() => {
    if (getAdminAccessToken()) return
    if (MOCKS_ENABLED) {
      router.replace('/admin/login')
      return
    }
    void refreshAdminSession().then(ok => {
      if (!ok) router.replace('/admin/login')
    })
  }, [router])
  return (
    <QueryProvider>
      <AdminShell>{children}</AdminShell>
    </QueryProvider>
  )
}
