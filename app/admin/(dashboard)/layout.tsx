'use client'
import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { QueryProvider } from '@/lib/query/provider'
import { onAdminAuthExpired } from '@/lib/api/admin/client'
import { getAdminAccessToken } from '@/lib/api/admin/token'
import { AdminShell } from '@/components/admin/shell'

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    onAdminAuthExpired(() => router.replace('/admin/login'))
  }, [router])
  useEffect(() => {
    if (!getAdminAccessToken()) router.replace('/admin/login')
  }, [router])
  return (
    <QueryProvider>
      <AdminShell>{children}</AdminShell>
    </QueryProvider>
  )
}
