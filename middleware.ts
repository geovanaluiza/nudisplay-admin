/**
 * Vercel Edge Middleware — this project is a Vite static SPA, not Nuxt.
 * Nitro `server/middleware` does not run here; this file does.
 */

const PUBLIC_GET_PATHS: string[] = []

function safeEqual(a: string, b: string) {
  const enc = new TextEncoder()
  const bufA = enc.encode(a)
  const bufB = enc.encode(b)
  if (bufA.byteLength !== bufB.byteLength) return false
  let out = 0
  for (let i = 0; i < bufA.byteLength; i++) out |= bufA[i] ^ bufB[i]
  return out === 0
}

export default function middleware(request: Request) {
  const user = process.env.ADMIN_USER
  const pass = process.env.ADMIN_PASSWORD
  if (!user || !pass) {
    return new Response('Auth not configured', { status: 503 })
  }

  const path = new URL(request.url).pathname
  if (request.method === 'GET' && PUBLIC_GET_PATHS.some((p) => path.startsWith(p))) {
    return
  }

  const header = request.headers.get('authorization') || ''
  const [scheme, encoded] = header.split(' ')
  if (scheme === 'Basic' && encoded) {
    let decoded = ''
    try {
      decoded = atob(encoded)
    } catch {
      decoded = ''
    }
    const sep = decoded.indexOf(':')
    const u = decoded.slice(0, sep)
    const p = decoded.slice(sep + 1)
    if (sep > -1 && safeEqual(u, user) && safeEqual(p, pass)) return
  }

  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="NU Display Admin", charset="UTF-8"',
    },
  })
}

export const config = {
  matcher: ['/', '/:path*'],
}
