import type { MineralCard, MineralPrizeTier } from '@/data/minerals'

export const MINERAL_DRAW_COST = 100
export const NEW_MINERAL_CARD_CHANCE = 0.9

export function getAvailableMineralDraws(pointBalance: number) {
  return Math.max(0, Math.floor(pointBalance / MINERAL_DRAW_COST))
}

export function pickMineralPrizeTier(): MineralPrizeTier {
  if (Math.random() < 0.01) return 'joker'

  const normalRoll = Math.random()
  if (normalRoll < 0.1) return 'first'
  if (normalRoll < 0.4) return 'second'
  return 'third'
}

export function pickRandomItem<T>(items: T[]) {
  if (items.length === 0) {
    throw new Error('Mineral card pool is empty')
  }
  return items[Math.floor(Math.random() * items.length)]
}

export function pickMineralCard(
  pool: MineralCard[],
  ownedCardIds: ReadonlySet<string>,
  random = Math.random
) {
  if (pool.length === 0) {
    throw new Error('Mineral card pool is empty')
  }

  const newCards = pool.filter(card => !ownedCardIds.has(card.id))
  const ownedCards = pool.filter(card => ownedCardIds.has(card.id))
  const wantsNewCard = random() < NEW_MINERAL_CARD_CHANCE
  const preferredPool = wantsNewCard ? newCards : ownedCards
  const fallbackPool = wantsNewCard ? ownedCards : newCards
  const selectedPool = preferredPool.length > 0 ? preferredPool : fallbackPool

  return selectedPool[Math.floor(random() * selectedPool.length)]
}
