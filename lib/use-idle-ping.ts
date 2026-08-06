'use client'
import { createElement, useEffect, useState, type ReactNode } from 'react'
import { ping } from '@/lib/api/endpoints'
import { Button } from '@/components/ui/button'

const IDLE_MS = 12 * 60 * 1000
const CHECK_INTERVAL_MS = 30 * 1000

export function useIdlePing(): ReactNode | null {
  const [lastActive, setLastActive] = useState(() => Date.now())
  const [idle, setIdle] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // pointerdown also fires for the Stay button itself, so clicking it
    // already resets lastActive here before the click handler below dismisses.
    function markActive() {
      setLastActive(Date.now())
      setDismissed(false)
    }
    window.addEventListener('pointerdown', markActive)
    window.addEventListener('keydown', markActive)
    return () => {
      window.removeEventListener('pointerdown', markActive)
      window.removeEventListener('keydown', markActive)
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      setIdle(Date.now() - lastActive >= IDLE_MS)
    }, CHECK_INTERVAL_MS)
    return () => clearInterval(t)
  }, [lastActive])

  if (!idle || dismissed) return null

  return createElement(
    'div',
    {
      role: 'status',
      className: 'fixed inset-x-4 bottom-24 z-50 flex items-center justify-between gap-3 rounded-2xl '
        + 'border-[1.5px] border-fir/20 bg-card px-4 py-3 shadow-lg lg:inset-x-auto lg:bottom-8 lg:right-8 lg:w-80',
    },
    createElement('p', { className: 'text-sm' }, 'Still there? Stay signed in'),
    createElement(Button, {
      variant: 'ghost',
      className: 'shrink-0 px-3 py-2 text-sm',
      onClick: () => {
        setIdle(false)
        setDismissed(true)
        ping().catch(() => undefined)
      },
    }, 'Stay')
  )
}
