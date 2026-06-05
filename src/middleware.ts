import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Return 200 OK for HEAD health checks to site root to satisfy GoDaddy
  if ((pathname === '/' || pathname === '') && request.method === 'HEAD') {
    return new NextResponse('OK', { status: 200 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/',
}
