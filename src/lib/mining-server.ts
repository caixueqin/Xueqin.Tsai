import { createHmac, timingSafeEqual } from 'crypto'
import type { MineralPrizeTier } from '@/data/minerals'
import { getServerSecret } from '@/lib/server-secret'

const miningChoiceSecret = getServerSecret()

export type MiningChoicePayload = {
  nonce: string
  childId: string
  prizeId: string
  rewardChoiceToken: string
  tier: string
  cardId: string
  createdAt: number
}

export function rewardTierToMineralTier(tier: string): MineralPrizeTier {
  if (tier === 'special') return 'joker'
  if (tier === 'first' || tier === 'second' || tier === 'third') return tier
  return 'third'
}

function signPayload(payload: string) {
  return createHmac('sha256', miningChoiceSecret).update(payload).digest('hex')
}

export function signMiningChoice(choice: MiningChoicePayload) {
  const payload = Buffer.from(JSON.stringify(choice)).toString('base64url')
  return `${payload}.${signPayload(payload)}`
}

export function verifyMiningChoice(token: string): MiningChoicePayload | null {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = signPayload(payload)
  const expectedBuffer = Buffer.from(expected, 'hex')
  const actualBuffer = Buffer.from(signature, 'hex')
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (
      typeof decoded.childId !== 'string' ||
      typeof decoded.nonce !== 'string' ||
      typeof decoded.prizeId !== 'string' ||
      typeof decoded.rewardChoiceToken !== 'string' ||
      typeof decoded.tier !== 'string' ||
      typeof decoded.cardId !== 'string' ||
      typeof decoded.createdAt !== 'number'
    ) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}
