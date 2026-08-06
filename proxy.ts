import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/home', '/insights', '/checkin', '/chat', '/journal', '/notifications', '/you']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PROTECTED.some(p => pathname.startsWith(p)) && !request.cookies.get('user_refresh_token')) {
    const url = new URL('/signin', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/home/:path*', '/insights/:path*', '/checkin/:path*', '/chat/:path*', '/journal/:path*', '/notifications/:path*', '/you/:path*'] }
