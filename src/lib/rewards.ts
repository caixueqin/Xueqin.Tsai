const DRAW_COST = 100

const TIER_WEIGHTS = [
  { tier: 'special', weight: 5 },
  { tier: 'first', weight: 15 },
  { tier: 'second', weight: 30 },
  { tier: 'third', weight: 50 },
]

export function getPointValue(itemType: string) {
  if (itemType === 'alcumus_blue') return 90
  if (itemType === 'alcumus_green') return 50
  if (itemType === 'review_q' || itemType === 'challenge') return 20
  if (itemType === 'try' || itemType === 'aops_way') return 5
  return 5
}

function pickWeightedTier(activePrizes: any[]) {
  const availableTiers = new Set(activePrizes.map((prize: any) => prize.tier))
  const weighted = TIER_WEIGHTS.filter(entry => availableTiers.has(entry.tier))
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = Math.random() * total

  for (const entry of weighted) {
    roll -= entry.weight
    if (roll <= 0) return entry.tier
  }

  return weighted[weighted.length - 1]?.tier || activePrizes[0]?.tier
}

function pickRandom(items: any[]) {
  return items[Math.floor(Math.random() * items.length)]
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
  const existing = await tx.pointLedger.findFirst({
    where: {
      checkmarkId: checkmark.id,
      type: 'checkmark_award',
    },
  })

  if (existing) return

  const points = getPointValue(itemType)
  await tx.pointLedger.create({
    data: {
      childId: checkmark.childId,
      checkmarkId: checkmark.id,
      points,
      type: 'checkmark_award',
      note: itemType,
    },
  })

  await logActivity(tx, {
    childId: checkmark.childId,
    actorUserId,
    eventType: 'points_awarded',
    message: `Earned ${points} points.`,
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

export async function autoDrawRewards(tx: any, childId: string, actorUserId: string) {
  const createdDraws = []

  while (await getPointBalance(tx, childId) >= DRAW_COST) {
    const activePrizes = await tx.prize.findMany({
      where: {
        childId,
        status: 'active',
      },
    })

    if (activePrizes.length === 0) break

    const tier = pickWeightedTier(activePrizes)
    const tierPrizes = activePrizes.filter((prize: any) => prize.tier === tier)
    const prize = pickRandom(tierPrizes.length > 0 ? tierPrizes : activePrizes)

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

    createdDraws.push({ ...draw, prize })
  }

  return createdDraws
}

export async function revokeDrawsIfNeeded(tx: any, childId: string, actorUserId: string, reason: string) {
  const revokedDraws = []

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
      metadata: { drawId: draw.id, reason },
    })

    revokedDraws.push(draw)
  }

  return revokedDraws
}
