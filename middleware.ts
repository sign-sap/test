import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const publicPaths = ['/login', '/']
  const apiAuthPaths = ['/api/auth']
  
  const isPublicPath = publicPaths.some(path => pathname === path)
  const isApiAuthPath = apiAuthPaths.some(path => pathname.startsWith(path))
  
  if (isPublicPath || isApiAuthPath) {
    return NextResponse.next()
  }
  
  const sessionCookie = request.cookies.get('innovation_session')
  
  if (!sessionCookie && (pathname.startsWith('/dashboard') || pathname.startsWith('/ideas'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
