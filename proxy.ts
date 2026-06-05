import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (!request.cookies.get('session')?.value) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export default proxy;

export const config = {
  matcher: ['/child/:path*', '/parent/:path*'],
}
