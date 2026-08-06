'use client'
import { createElement, useEffect, useReducer, type ReactNode } from 'react'
import { ping } from '@/lib/api/endpoints'
import { Button } from '@/components/ui/button'

const IDLE_MS = 12 * 60 * 1000
const CHECK_INTERVAL_MS = 30 * 1000

export type IdlePingState = { lastActive: number; idle: boolean }

export type IdlePingAction =
  | { type: 'activity'; at: number }
  | { type: 'tick'; at: number }
  | { type: 'stay' }

// Pure state transition, exported so the "does the banner re-arm for a new
// idle period after being dismissed once" behavior can be unit tested
// without mocking timers. `idle` is the single source of truth for whether
// the banner is visible: there is no separate "dismissed" flag that could
// outlive the idle period that set it, which is what previously let one
// Stay click permanently suppress every later idle period.
export function idlePingReducer(state: IdlePingState, action: IdlePingAction): IdlePingState {
  switch (action.type) {
    case 'activity':
      return { ...state, lastActive: action.at }
    case 'tick':
      return { ...state, idle: action.at - state.lastActive >= IDLE_MS }
    case 'stay':
      return { ...state, idle: false }
    default:
      return state
  }
}

export function useIdlePing(): ReactNode | null {
  const [state, dispatch] = useReducer(
    idlePingReducer, undefined, (): IdlePingState => ({ lastActive: Date.now(), idle: false })
  )

  useEffect(() => {
    // pointerdown also fires for the Stay button itself, so clicking it
    // already reports fresh activity before the "stay" dispatch below runs.
    function markActive() {
      dispatch({ type: 'activity', at: Date.now() })
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
      dispatch({ type: 'tick', at: Date.now() })
    }, CHECK_INTERVAL_MS)
    return () => clearInterval(t)
  }, [])

  if (!state.idle) return null

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
        dispatch({ type: 'stay' })
        ping().catch(() => undefined)
      },
    }, 'Stay')
  )
}
