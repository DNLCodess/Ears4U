'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ICON_PATHS = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9h13v-9" />
    </>
  ),
  checkin: (
    <>
      <path d="M12 18c3 0 5-2 5-5V8a5 5 0 0 0-10 0v5c0 3 2 5 5 5Z" />
      <path d="M6 11v1a6 6 0 0 0 12 0v-1M12 20v2" strokeLinecap="round" />
    </>
  ),
  insights: (
    <>
      <path d="M3 17 Q 8 13 12 15 T 21 12" />
      <path d="M3 12 Q 8 8 12 10 T 21 7" opacity=".55" />
      <path d="M3 21.5 Q 8 19 12 20 T 21 18" opacity=".3" />
    </>
  ),
  journal: (
    <>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
      <path d="M5 4v13a3 3 0 0 0 3 3" />
      <path d="M9.5 9h6M9.5 13h4" />
    </>
  ),
} as const

type IconName = keyof typeof ICON_PATHS

function NavIcon({ name, className = 'w-[21px] h-[21px]' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden
    >
      {ICON_PATHS[name]}
    </svg>
  )
}

function TalkIcon({ className = 'w-[25px] h-[25px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.4-.2-3.4-.6L3 21l1.8-4.2C3.7 15.4 3 13.8 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
    </svg>
  )
}

type NavItem = { href: string; label: string; icon: IconName } | { href: string; label: string; raised: true }

const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/checkin', label: 'Check in', icon: 'checkin' },
  { href: '/chat', label: 'Talk to me', raised: true },
  { href: '/insights', label: 'Insights', icon: 'insights' },
  { href: '/journal', label: 'Journal', icon: 'journal' },
]

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir'

export function TabBar() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <nav
        aria-label="Primary"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-end justify-around
          border-t border-fir/10 bg-oat/95 px-1 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur"
      >
        {NAV.map(item =>
          'raised' in item ? (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              aria-label={item.label}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg pb-0.5 text-[10.5px] font-semibold ${FOCUS_RING}`}
            >
              <span
                className="-mt-11 mb-0.5 flex h-[58px] w-[58px] items-center justify-center rounded-full
                  bg-gradient-to-br from-marigold to-marigold-deep text-white
                  shadow-[0_10px_24px_rgba(217,155,33,.4),0_0_0_6px_var(--color-oat)]"
              >
                <TalkIcon />
              </span>
              Talk
            </Link>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1 text-[10.5px]
                ${isActive(item.href) ? 'font-semibold opacity-100' : 'font-medium opacity-55'} ${FOCUS_RING}`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          )
        )}
      </nav>

      <nav
        aria-label="Primary"
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[220px] lg:flex-none lg:flex-col lg:gap-1
          lg:border-r lg:border-fir/10 lg:px-4 lg:py-8"
      >
        <p className="font-display text-lg font-semibold mb-8 px-2">Ears for you.</p>
        {NAV.map(item =>
          'raised' in item ? (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`mt-1 mb-3 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br
                from-marigold to-marigold-deep px-4 py-3.5 font-display font-semibold text-fir-deep
                shadow-lg shadow-marigold-deep/30 ${FOCUS_RING}`}
            >
              <TalkIcon className="w-5 h-5" />
              {item.label}
            </Link>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px]
                ${isActive(item.href) ? 'font-semibold opacity-100' : 'font-medium opacity-55 hover:opacity-80'} ${FOCUS_RING}`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          )
        )}
        <YouLink active={isActive('/you')} />
      </nav>
    </>
  )
}

function YouLink({ active }: { active: boolean }) {
  return (
    <Link
      href="/you"
      aria-current={active ? 'page' : undefined}
      className={`mt-auto flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px]
        ${active ? 'font-semibold opacity-100' : 'font-medium opacity-70 hover:opacity-100'} ${FOCUS_RING}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-marigold text-[12px]
        font-bold text-fir-deep">
        D
      </span>
      You
    </Link>
  )
}
