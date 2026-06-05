export function proxy(request: Request) {
  const url = new URL(request.url)

  if (url.pathname === '/' && request.method === 'HEAD') {
    return new Response('OK', { status: 200 })
  }

  return fetch(request)
}

export const config = {
  matcher: '/',
}
