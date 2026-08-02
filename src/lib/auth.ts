import { jwtVerify, SignJWT, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { getServerSecret } from '@/lib/server-secret'

const secretKey = getServerSecret()
const key = new TextEncoder().encode(secretKey)

type SessionUser = {
  id: string
  name: string
  role: string
}

type SessionPayload = JWTPayload & {
  user: SessionUser
}

export async function encrypt(payload: JWTPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30 d')
    .sign(key)
}

export async function decrypt(input: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  })
  const user = payload.user
  if (
    !user ||
    typeof user !== 'object' ||
    !('id' in user) ||
    !('name' in user) ||
    !('role' in user) ||
    typeof user.id !== 'string' ||
    typeof user.name !== 'string' ||
    typeof user.role !== 'string'
  ) {
    throw new Error('Invalid session payload')
  }
  return { ...payload, user: user as SessionUser }
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return null
  try {
    return await decrypt(session)
  } catch {
    return null
  }
}

export async function loginUser(user: { id: string, name: string, role: string }) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ user })

  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    expires,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.set('session', '', { expires: new Date(0) })
}
