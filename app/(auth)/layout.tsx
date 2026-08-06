'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { MOCKS_ENABLED } from '@/lib/mocks'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const [waking, setWaking] = useState(false)
  useEffect(() => {
    if (MOCKS_ENABLED) return
    const t = setTimeout(() => setWaking(true), 8000)
    fetch('/backend/actuator/health').catch(() => undefined).finally(() => {
      clearTimeout(t); setWaking(false)
    })
    return () => clearTimeout(t)
  }, [])
  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-10 max-w-md mx-auto lg:max-w-lg">
      {waking ? (
        <p className="mb-6 rounded-xl border-[1.5px] border-dashed border-fir/40 px-4 py-3 text-sm">
          Connecting. The server is waking up, this can take about a minute.
        </p>
      ) : null}
      {children}
    </main>
  )
}
