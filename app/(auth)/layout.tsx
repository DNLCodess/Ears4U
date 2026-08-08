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
    <>
      {waking ? (
        <p className="fixed inset-x-0 top-0 z-50 bg-fir px-4 py-2.5 text-center text-sm text-oat">
          Connecting. The server is waking up, this can take about a minute.
        </p>
      ) : null}
      {children}
    </>
  )
}
