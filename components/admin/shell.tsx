'use client'
import { useState, type ReactNode } from 'react'
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

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  return (
    <>
      {NAV.map(item => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive(item.href) ? 'page' : undefined}
          className={`flex items-center rounded-lg px-3 py-2.5 text-[14px] ${FOCUS_RING}
            ${isActive(item.href) ? 'bg-fir text-oat font-semibold' : 'font-medium opacity-70 hover:opacity-100'}`}
        >
          {item.label}
        </Link>
      ))}
      <Link
        href={ACCOUNT.href}
        onClick={onNavigate}
        aria-current={isActive(ACCOUNT.href) ? 'page' : undefined}
        className={`mt-2 flex items-center rounded-lg border-t border-fir/10 px-3 pb-0.5 pt-3.5 text-[14px] ${FOCUS_RING}
          ${isActive(ACCOUNT.href) ? 'font-semibold opacity-100' : 'font-medium opacity-70 hover:opacity-100'}`}
      >
        {ACCOUNT.label}
      </Link>
    </>
  )
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

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
        <div className="flex items-center justify-between border-b border-fir/10 px-4 py-3 lg:hidden">
          <p className="font-display text-[15px] font-semibold">
            Ears for you. <span className="opacity-50">Admin</span>
          </p>
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

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-night/50" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="relative flex h-full w-[78%] max-w-[300px] flex-col gap-1 bg-oat px-4 py-6 shadow-xl">
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
            <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
