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
  insights: (
    <>
      <path d="M3 17 Q 8 13 12 15 T 21 12" />
      <path d="M3 12 Q 8 8 12 10 T 21 7" opacity=".55" />
      <path d="M3 21.5 Q 8 19 12 20 T 21 18" opacity=".3" />
    </>
  ),
  chat: (
    <path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.4-.2-3.4-.6L3 21l1.8-4.2C3.7 15.4 3 13.8 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
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

function LeafIcon({ className = 'w-[30px] h-[30px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 21 C 11 14 11 9 12 3" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
      <path d="M12 10 C 7 9 4.5 6 5 2.5 C 9.5 3 12 6 12 10 Z" fill="#fff" />
      <path d="M12 14 C 16.5 13 19.5 10 19 6.5 C 14.5 7 12 10 12 14 Z" fill="#fff" opacity=".85" />
    </svg>
  )
}

type NavItem = { href: string; label: string; icon: IconName } | { href: string; label: string; leaf: true }

const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/insights', label: 'Insights', icon: 'insights' },
  { href: '/checkin', label: 'Check in', leaf: true },
  { href: '/chat', label: 'Chat', icon: 'chat' },
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
        className={`lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-end justify-around
          border-t border-fir/10 bg-oat/95 px-1 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur`}
      >
        {NAV.map(item =>
          'leaf' in item ? (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg pb-0.5 text-[10.5px] font-semibold ${FOCUS_RING}`}
            >
              <span
                className="-mt-11 mb-0.5 flex h-[58px] w-[58px] items-center justify-center rounded-full
                  bg-gradient-to-br from-leaf-bright to-leaf shadow-[0_10px_24px_rgba(46,125,73,.45),0_0_0_6px_var(--color-oat)]"
              >
                <LeafIcon />
              </span>
              {item.label}
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
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-56 lg:flex-none lg:flex-col lg:gap-1 lg:border-r lg:border-fir/10 lg:px-4 lg:py-8"
      >
        <p className="font-display text-lg font-semibold mb-8 px-2">Ears for you.</p>
        {NAV.map(item =>
          'leaf' in item ? (
            <Link
              key={item.href}
              href={item.href}
              className={`mt-1 mb-3 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br
                from-leaf-bright to-leaf px-4 py-3.5 font-display font-semibold text-white shadow-lg shadow-leaf/30 ${FOCUS_RING}`}
            >
              <LeafIcon className="w-5 h-5" />
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
        <Link
          href="/you"
          aria-current={isActive('/you') ? 'page' : undefined}
          className={`mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px]
            ${isActive('/you') ? 'font-semibold opacity-100' : 'font-medium opacity-55 hover:opacity-80'} ${FOCUS_RING}`}
        >
          You
        </Link>
      </nav>
    </>
  )
}
