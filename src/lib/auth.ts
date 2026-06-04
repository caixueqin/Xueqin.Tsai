import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'

const secretKey = 'super-secret-mathcraft-key'
const key = new TextEncoder().encode(secretKey)

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30 d')
    .sign(key)
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  })
  return payload
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return null
  try {
    return await decrypt(session)
  } catch (err) {
    return null
  }
}

export async function loginUser(user: { id: string, name: string, role: string }) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ user, expires })

  const cookieStore = await cookies()
  cookieStore.set('session', session, { expires, httpOnly: true, sameSite: 'lax' })
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.set('session', '', { expires: new Date(0) })
}
