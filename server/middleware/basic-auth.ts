import { timingSafeEqual } from 'node:crypto'

const PUBLIC_GET_PATHS: string[] = []

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export default defineEventHandler((event) => {
  const user = process.env.ADMIN_USER
  const pass = process.env.ADMIN_PASSWORD
  if (!user || !pass) {
    throw createError({ statusCode: 503, statusMessage: 'Auth not configured' })
  }

  const path = getRequestURL(event).pathname
  if (event.method === 'GET' && PUBLIC_GET_PATHS.some((p) => path.startsWith(p))) {
    return
  }

  const header = getRequestHeader(event, 'authorization') || ''
  const [scheme, encoded] = header.split(' ')
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8')
    const sep = decoded.indexOf(':')
    const u = decoded.slice(0, sep)
    const p = decoded.slice(sep + 1)
    if (sep > -1 && safeEqual(u, user) && safeEqual(p, pass)) return
  }

  setResponseHeader(event, 'WWW-Authenticate', 'Basic realm="NU Display Admin", charset="UTF-8"')
  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
})
