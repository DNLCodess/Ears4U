'use client'
import { useEffect, useRef, type ReactNode } from 'react'

export function Sheet({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Focus the panel only on the open transition. Depending on `onClose` here
  // would re-run this on every render where the caller passes an inline
  // onClose (a new function identity each time), stealing focus back from
  // any input inside the sheet the user is typing into.
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <div className="absolute inset-0 bg-night/50" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative max-h-[85dvh] w-full overflow-auto rounded-t-3xl bg-oat p-6 outline-none
          lg:max-w-lg lg:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="font-display text-lg font-semibold">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
              strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
