import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const HASH_PREFIX = 'scrypt'
const KEY_LENGTH = 32

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, KEY_LENGTH).toString('hex')
  return `${HASH_PREFIX}$${salt}$${hash}`
}

export function verifyPin(pin: string, stored: string | null | undefined) {
  if (!stored) return false

  if (!stored.startsWith(`${HASH_PREFIX}$`)) {
    return stored === pin
  }

  const [, salt, hash] = stored.split('$')
  if (!salt || !hash) return false

  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(pin, salt, expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
