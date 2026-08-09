'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV: { href: string; label: string }[] = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/emergency', label: 'Emergency Resources' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/telemetry', label: 'Telemetry' },
  { href: '/admin/broadcasts', label: 'Broadcasts' },
]
const ACCOUNT = { href: '/admin/account', label: 'Account' }

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir'

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function currentSectionLabel(pathname: string): string {
  if (isActive(pathname, ACCOUNT.href)) return ACCOUNT.label
  return NAV.find(item => isActive(pathname, item.href))?.label ?? ''
}

function IdentityLink({ active }: { active: boolean }) {
  return (
    <Link
      href="/admin/account"
      aria-label="Account"
      aria-current={active ? 'page' : undefined}
      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full bg-marigold
        text-[12px] font-bold text-fir-deep ${FOCUS_RING}`}
    >
      A
    </Link>
  )
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {NAV.map(item => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive(pathname, item.href) ? 'page' : undefined}
          className={`flex items-center rounded-lg px-3 py-2.5 text-[14px] ${FOCUS_RING}
            ${isActive(pathname, item.href) ? 'bg-fir text-oat font-semibold' : 'font-medium opacity-70 hover:opacity-100'}`}
        >
          {item.label}
        </Link>
      ))}
      <Link
        href={ACCOUNT.href}
        onClick={onNavigate}
        aria-current={isActive(pathname, ACCOUNT.href) ? 'page' : undefined}
        className={`mt-2 flex items-center rounded-lg border-t border-fir/10 px-3 pb-0.5 pt-3.5 text-[14px] ${FOCUS_RING}
          ${isActive(pathname, ACCOUNT.href) ? 'bg-fir text-oat font-semibold' : 'font-medium opacity-70 hover:opacity-100'}`}
      >
        {ACCOUNT.label}
      </Link>
    </>
  )
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const sectionLabel = currentSectionLabel(pathname)
  const accountActive = isActive(pathname, ACCOUNT.href)

  const drawerPanelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(() => setDrawerOpen(false))
  useEffect(() => {
    onCloseRef.current = () => setDrawerOpen(false)
  })

  // Focus the panel only on the open transition. Depending on the close
  // handler here would re-run this whenever an inline onClose gets a new
  // function identity, stealing focus back from anything inside the drawer.
  useEffect(() => {
    if (!drawerOpen) return
    drawerPanelRef.current?.focus()
  }, [drawerOpen])

  useEffect(() => {
    if (!drawerOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [drawerOpen])

  return (
    <div className="min-h-dvh lg:flex">
      <nav
        aria-label="Admin"
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[240px] lg:flex-none lg:flex-col lg:gap-1
          lg:border-r lg:border-fir/10 lg:px-4 lg:py-8"
      >
        <p className="mb-8 px-3 font-display text-base font-semibold">
          Ears for you. <span className="opacity-50">Admin</span>
        </p>
        <NavLinks pathname={pathname} />
      </nav>

      <div className="flex flex-1 flex-col lg:min-w-0">
        <div className="hidden items-center justify-between border-b border-fir/10 px-8 py-4 lg:flex">
          <p className="font-display text-[15px] font-semibold">{sectionLabel}</p>
          <IdentityLink active={accountActive} />
        </div>

        <div className="flex items-center justify-between border-b border-fir/10 px-4 py-3 lg:hidden">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="flex-none font-display text-[13px] font-semibold opacity-50">Admin</span>
            <p className="min-w-0 truncate font-display text-[15px] font-semibold">{sectionLabel}</p>
          </div>
          <div className="flex flex-none items-center gap-3">
            <IdentityLink active={accountActive} />
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${FOCUS_RING}`}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-night/50" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div
            ref={drawerPanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            className="relative flex h-full w-[78%] max-w-[300px] flex-col gap-1 bg-oat px-4 py-6 shadow-xl outline-none"
          >
            <div className="mb-4 flex items-center justify-between px-3">
              <p className="font-display text-[15px] font-semibold">Menu</p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${FOCUS_RING}`}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                  strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav aria-label="Admin" className="flex flex-col gap-1">
              <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  )
}
