'use client'
import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { QueryProvider } from '@/lib/query/provider'
import { onAuthExpired } from '@/lib/api/client'
import { TabBar } from '@/components/shell/tab-bar'
import { useIdlePing } from '@/lib/use-idle-ping'

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    onAuthExpired(() => router.replace('/signin'))
  }, [router])
  const idlePrompt = useIdlePing()
  return (
    <QueryProvider>
      <div className="min-h-dvh flex flex-col lg:flex-row lg:max-w-[1440px] lg:mx-auto">
        <TabBar />
        <main className="flex-1 pb-28 lg:pb-8 lg:pl-8">{children}</main>
        {idlePrompt}
      </div>
    </QueryProvider>
  )
}
