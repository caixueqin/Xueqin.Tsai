import manifest from '../../image/cards/manifest.json'
import { MINERAL_PRONUNCIATIONS } from './mineralPronunciations'

export type MineralFamily = 'gemstone' | 'metal' | 'industry' | 'geology' | 'joker'
export type MineralPrizeTier = 'joker' | 'first' | 'second' | 'third'
export type MineralRarity = 'legendary' | 'rare' | 'uncommon' | 'common'

export type MineralCard = {
  id: string
  zhName: string
  enName: string
  pinyin: string
  ipa: string
  family: MineralFamily
  prizeTier: MineralPrizeTier
  rarity: MineralRarity
  value: number
  elementTags: string[]
  funFact: string
  imageKey: string
  safety: string | null
}

type ManifestCard = {
  id: string
  name_zh: string
  name_en: string
  prize_tier: string
  rarity: string
  value: number
  elements: string
  fun_fact: string
  safety: string | null
  suit: MineralFamily
  image: string
}

const PRIZE_TIER_MAP: Record<string, MineralPrizeTier> = {
  特等奖: 'joker',
  一等奖: 'first',
  二等奖: 'second',
  三等奖: 'third',
}

function getRarity(value: string): MineralRarity {
  if (value.startsWith('UR') || value.startsWith('SSR')) return 'legendary'
  if (value.startsWith('SR')) return 'rare'
  if (value.startsWith('R')) return 'uncommon'
  return 'common'
}

function getElementTags(value: string) {
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
}

export const mineralCards: MineralCard[] = (manifest.cards as ManifestCard[]).map(card => ({
  id: card.id,
  zhName: card.name_zh,
  enName: card.name_en,
  pinyin: MINERAL_PRONUNCIATIONS[card.id]?.pinyin || '',
  ipa: MINERAL_PRONUNCIATIONS[card.id]?.ipa || '',
  family: card.suit,
  prizeTier: PRIZE_TIER_MAP[card.prize_tier],
  rarity: getRarity(card.rarity),
  value: card.value,
  elementTags: getElementTags(card.elements),
  funFact: card.fun_fact,
  imageKey: `/image/cards/${card.image}`,
  safety: card.safety,
}))

export const mineralCardsById = new Map(mineralCards.map(card => [card.id, card]))

export const MINERAL_FAMILIES: Array<{
  key: MineralFamily
  label: string
  total: number
}> = [
  { key: 'gemstone', label: 'Gemstone', total: 15 },
  { key: 'metal', label: 'Metal', total: 15 },
  { key: 'industry', label: 'Energy & Industry', total: 15 },
  { key: 'geology', label: 'Geology', total: 15 },
  { key: 'joker', label: 'Joker', total: 4 },
]

export function getMineralPool(prizeTier: MineralPrizeTier) {
  return mineralCards.filter(card => card.prizeTier === prizeTier)
}
