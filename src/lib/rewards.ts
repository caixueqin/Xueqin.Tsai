import { createHmac, timingSafeEqual } from 'crypto'
import { getChildPrizeOdds, type PrizeOdds, type PrizeTier } from '@/lib/prize-odds'
import { getServerSecret } from '@/lib/server-secret'

const DRAW_COST = 100
const rewardChoiceSecret = getServerSecret()

const PRIZE_TIER_ORDER: PrizeTier[] = ['special', 'first', 'second', 'third']

export type RewardChoice = {
  prizeId: string
  prizeTitle: string
  tier: string
  choiceToken: string
}

export function getPointValue(itemType: string) {
  if (itemType === 'alcumus_blue') return 110
  if (itemType === 'alcumus_green') return 60
  if (itemType === 'review_q' || itemType === 'challenge') return 20
  if (itemType === 'try') return 3
  if (itemType === 'aops_way') return 5
  return 5
}

function pickWeightedTier(activePrizes: any[], odds: PrizeOdds) {
  const availableTiers = new Set(activePrizes.map((prize: any) => prize.tier))
  const weighted = PRIZE_TIER_ORDER
    .map(tier => ({ tier, weight: odds[tier] }))
    .filter(entry => availableTiers.has(entry.tier) && entry.weight > 0)
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  if (total <= 0) return null

  let roll = Math.random() * total

  for (const entry of weighted) {
    roll -= entry.weight
    if (roll <= 0) return entry.tier
  }

  return weighted[weighted.length - 1]?.tier || null
}

function pickRandom(items: any[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function pickPrize(activePrizes: any[], odds: PrizeOdds) {
  const tier = pickWeightedTier(activePrizes, odds)
  if (!tier) return null
  const tierPrizes = activePrizes.filter((prize: any) => prize.tier === tier)
  return pickRandom(tierPrizes.length > 0 ? tierPrizes : activePrizes)
}

function getChoicePayload(childId: string, prizeId: string, tier: string) {
  return `${childId}:${prizeId}:${tier}`
}

function signRewardChoice(childId: string, prizeId: string, tier: string) {
  return createHmac('sha256', rewardChoiceSecret)
    .update(getChoicePayload(childId, prizeId, tier))
    .digest('hex')
}

function isValidRewardChoiceToken(childId: string, prizeId: string, tier: string, choiceToken: string) {
  const expected = signRewardChoice(childId, prizeId, tier)
  const expectedBuffer = Buffer.from(expected, 'hex')
  const actualBuffer = Buffer.from(choiceToken, 'hex')

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}

export async function getPointBalance(tx: any, childId: string) {
  const result = await tx.pointLedger.aggregate({
    where: { childId },
    _sum: { points: true },
  })

  return result._sum.points || 0
}

export async function logActivity(tx: any, data: {
  childId: string
  actorUserId?: string
  audience?: 'child' | 'parent' | 'both'
  eventType: string
  message: string
  metadata?: Record<string, unknown>
}) {
  await tx.activityLog.create({
    data: {
      childId: data.childId,
      actorUserId: data.actorUserId,
      audience: data.audience || 'both',
      eventType: data.eventType,
      message: data.message,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    },
  })
}

export async function awardCheckmarkPoints(tx: any, checkmark: any, itemType: string, actorUserId: string) {
  const points = getPointValue(itemType)
  const awarded = await tx.pointLedger.aggregate({
    where: {
      checkmarkId: checkmark.id,
      type: 'checkmark_award',
    },
    _sum: { points: true },
  })
  const reversed = await tx.pointLedger.aggregate({
    where: {
      checkmarkId: checkmark.id,
      type: 'checkmark_reversal',
    },
    _sum: { points: true },
  })
  const currentNetPoints = (awarded._sum.points || 0) + (reversed._sum.points || 0)
  const pointsToAward = points - currentNetPoints

  if (pointsToAward <= 0) return

  await tx.pointLedger.create({
    data: {
      childId: checkmark.childId,
      checkmarkId: checkmark.id,
      points: pointsToAward,
      type: 'checkmark_award',
      note: itemType,
    },
  })

  await logActivity(tx, {
    childId: checkmark.childId,
    actorUserId,
    eventType: 'points_awarded',
    message: `Earned ${pointsToAward} points.`,
    metadata: { checkmarkId: checkmark.id, itemType },
  })
}

export async function reverseCheckmarkPoints(tx: any, checkmark: any, actorUserId: string, reason: string) {
  const awarded = await tx.pointLedger.aggregate({
    where: {
      checkmarkId: checkmark.id,
      type: 'checkmark_award',
    },
    _sum: { points: true },
  })
  const reversed = await tx.pointLedger.aggregate({
    where: {
      checkmarkId: checkmark.id,
      type: 'checkmark_reversal',
    },
    _sum: { points: true },
  })
  const awardedPoints = awarded._sum.points || 0
  const alreadyReversed = Math.abs(reversed._sum.points || 0)
  const pointsToReverse = awardedPoints - alreadyReversed

  if (pointsToReverse <= 0) return

  await tx.pointLedger.create({
    data: {
      childId: checkmark.childId,
      checkmarkId: checkmark.id,
      points: -pointsToReverse,
      type: 'checkmark_reversal',
      note: reason,
    },
  })

  await logActivity(tx, {
    childId: checkmark.childId,
    actorUserId,
    eventType: 'points_reversed',
    message: `${pointsToReverse} points were removed.`,
    metadata: { checkmarkId: checkmark.id, reason },
  })
}

export async function buildRewardChoices(tx: any, childId: string, count = 3): Promise<RewardChoice[]> {
  if (await getPointBalance(tx, childId) < DRAW_COST) return []

  const [activePrizes, childOddsRows] = await Promise.all([
    tx.prize.findMany({
      where: {
        childId,
        status: 'active',
      },
    }),
    tx.$queryRaw`
      SELECT
        "specialPrizeRate",
        "firstPrizeRate",
        "secondPrizeRate",
        "thirdPrizeRate"
      FROM "Child"
      WHERE "id" = ${childId}
      LIMIT 1
    `,
  ])

  const child = (childOddsRows as Array<{
    specialPrizeRate: number
    firstPrizeRate: number
    secondPrizeRate: number
    thirdPrizeRate: number
  }>)[0]

  if (activePrizes.length === 0 || !child) return []

  const odds = getChildPrizeOdds(child)
  const choices: RewardChoice[] = []

  for (let index = 0; index < count; index += 1) {
    const prize = pickPrize(activePrizes, odds)
    if (!prize) return []
    choices.push({
      prizeId: prize.id,
      prizeTitle: prize.title,
      tier: prize.tier,
      choiceToken: signRewardChoice(childId, prize.id, prize.tier),
    })
  }

  return choices
}

export async function createPrizeDrawFromChoice(
  tx: any,
  childId: string,
  actorUserId: string,
  prizeId: string,
  choiceToken: string
) {
  if (await getPointBalance(tx, childId) < DRAW_COST) {
    throw new Error('Not enough points')
  }

  const prize = await tx.prize.findFirst({
    where: {
      id: prizeId,
      childId,
      status: 'active',
    },
  })

  if (!prize) {
    throw new Error('Prize is no longer available')
  }

  if (!isValidRewardChoiceToken(childId, prize.id, prize.tier, choiceToken)) {
    throw new Error('Invalid prize choice')
  }

  const draw = await tx.prizeDraw.create({
    data: {
      childId,
      prizeId: prize.id,
      prizeTitle: prize.title,
      tier: prize.tier,
      status: 'pending',
      pointsSpent: DRAW_COST,
    },
  })

  await tx.pointLedger.create({
    data: {
      childId,
      drawId: draw.id,
      points: -DRAW_COST,
      type: 'draw_spend',
      note: prize.title,
    },
  })

  if (!prize.isRepeatable) {
    await tx.prize.update({
      where: { id: prize.id },
      data: { status: 'inactive' },
    })
  }

  await logActivity(tx, {
    childId,
    actorUserId,
    eventType: 'prize_drawn',
    message: `Drew ${prize.title} (${prize.tier}).`,
    metadata: { drawId: draw.id, prizeId: prize.id, tier: prize.tier },
  })

  return { ...draw, prize }
}

export async function autoDrawRewards(tx: any, childId: string, actorUserId: string) {
  const createdDraws = []

  while (await getPointBalance(tx, childId) >= DRAW_COST) {
    const choices = await buildRewardChoices(tx, childId, 1)
    if (choices.length === 0) break

    const draw = await createPrizeDrawFromChoice(
      tx,
      childId,
      actorUserId,
      choices[0].prizeId,
      choices[0].choiceToken
    )
    createdDraws.push(draw)
  }

  return createdDraws
}

export async function revokeDrawsIfNeeded(tx: any, childId: string, actorUserId: string, reason: string) {
  const revokedDraws = []
  const child = await tx.child.findUnique({
    where: { id: childId },
    select: { userId: true },
  })

  while (await getPointBalance(tx, childId) < 0) {
    const draw = await tx.prizeDraw.findFirst({
      where: {
        childId,
        status: { in: ['pending', 'approved'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!draw) break

    await tx.prizeDraw.update({
      where: { id: draw.id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedReason: reason,
      },
    })

    await tx.pointLedger.create({
      data: {
        childId,
        drawId: draw.id,
        points: DRAW_COST,
        type: 'draw_refund',
        note: reason,
      },
    })

    let revokedMineralCardId: string | null = null
    if (child) {
      const mineralDraw = await tx.mineralDrawRecord.findFirst({
        where: {
          prizeDrawId: draw.id,
          revokedAt: null,
        },
      })

      if (mineralDraw) {
        revokedMineralCardId = mineralDraw.cardId
        await tx.mineralDrawRecord.update({
          where: { id: mineralDraw.id },
          data: { revokedAt: new Date() },
        })

        const collection = await tx.userMineralCollection.findUnique({
          where: {
            userId_cardId: {
              userId: child.userId,
              cardId: mineralDraw.cardId,
            },
          },
        })

        if (collection) {
          if (collection.ownedCount <= 1) {
            await tx.userMineralCollection.delete({
              where: { id: collection.id },
            })
          } else {
            await tx.userMineralCollection.update({
              where: { id: collection.id },
              data: {
                ownedCount: { decrement: 1 },
              },
            })
          }
        }
      }
    }

    if (draw.prizeId) {
      const prize = await tx.prize.findUnique({ where: { id: draw.prizeId } })
      if (prize && !prize.isRepeatable && prize.status === 'inactive') {
        await tx.prize.update({
          where: { id: prize.id },
          data: { status: 'active' },
        })
      }
    }

    await logActivity(tx, {
      childId,
      actorUserId,
      eventType: 'prize_revoked',
      message: `${draw.prizeTitle || 'A prize'} was revoked.`,
      metadata: { drawId: draw.id, reason, revokedMineralCardId },
    })

    revokedDraws.push(draw)
  }

  return revokedDraws
}
