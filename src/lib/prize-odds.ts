export const DEFAULT_PRIZE_ODDS = {
  special: 1,
  first: 9,
  second: 30,
  third: 60,
} as const

export const PRIZE_ODD_FIELDS = {
  special: 'specialPrizeRate',
  first: 'firstPrizeRate',
  second: 'secondPrizeRate',
  third: 'thirdPrizeRate',
} as const

export type PrizeTier = keyof typeof DEFAULT_PRIZE_ODDS

export type PrizeOdds = Record<PrizeTier, number>

export type ChildPrizeOdds = {
  specialPrizeRate: number
  firstPrizeRate: number
  secondPrizeRate: number
  thirdPrizeRate: number
}

export function getChildPrizeOdds(child: ChildPrizeOdds): PrizeOdds {
  return {
    special: child.specialPrizeRate,
    first: child.firstPrizeRate,
    second: child.secondPrizeRate,
    third: child.thirdPrizeRate,
  }
}
