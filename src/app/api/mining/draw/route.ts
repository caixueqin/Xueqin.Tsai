export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMineralPool, mineralCardsById } from '@/data/minerals'
import {
  getAvailableMineralDraws,
  MINERAL_DRAW_COST,
  pickMineralCard,
} from '@/lib/mining'
import {
  rewardTierToMineralTier,
  signMiningChoice,
  verifyMiningChoice,
} from '@/lib/mining-server'
import {
  buildRewardChoices,
  createPrizeDrawFromChoice,
  getPointBalance,
  logActivity,
} from '@/lib/rewards'

const MINING_CHOICE_TTL_MS = 10 * 60 * 1000

type DrawRequest = {
  action?: string
  choiceToken?: string
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const child = await prisma.child.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!child) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({})) as DrawRequest

    if (body.action === 'prepare') {
      const result = await prisma.$transaction(async tx => {
        const [rewardChoices, ownedCards] = await Promise.all([
          buildRewardChoices(tx, child.id, 3),
          tx.userMineralCollection.findMany({
            where: { userId: session.user.id },
            select: { cardId: true },
          }),
        ])
        if (rewardChoices.length < 3) {
          throw new Error(
            rewardChoices.length === 0
              ? 'No available rewards for mining'
              : 'Not enough reward choices for mining'
          )
        }

        const ownedCardIds = new Set(ownedCards.map(card => card.cardId))
        return rewardChoices.map(choice => {
          const mineralTier = rewardTierToMineralTier(choice.tier)
          const card = pickMineralCard(getMineralPool(mineralTier), ownedCardIds)
          return {
            choiceToken: signMiningChoice({
              nonce: randomUUID(),
              childId: child.id,
              prizeId: choice.prizeId,
              rewardChoiceToken: choice.choiceToken,
              tier: choice.tier,
              cardId: card.id,
              createdAt: Date.now(),
            }),
          }
        })
      })

      return NextResponse.json({ success: true, choices: result })
    }

    if (body.action !== 'claim' || !body.choiceToken) {
      return NextResponse.json({ error: 'Invalid mining request' }, { status: 400 })
    }

    const miningChoice = verifyMiningChoice(body.choiceToken)
    if (!miningChoice || miningChoice.childId !== child.id) {
      return NextResponse.json({ error: 'Invalid mining choice' }, { status: 400 })
    }
    if (Date.now() - miningChoice.createdAt > MINING_CHOICE_TTL_MS) {
      return NextResponse.json({ error: 'Mining choice expired' }, { status: 409 })
    }

    const result = await prisma.$transaction(async tx => {
      await tx.miningChoiceClaim.create({
        data: {
          nonce: miningChoice.nonce,
          childId: child.id,
        },
      })

      const pointBalance = await getPointBalance(tx, child.id)
      if (pointBalance < MINERAL_DRAW_COST) {
        throw new Error('Not enough points for a mineral draw')
      }

      const prizeDraw = await createPrizeDrawFromChoice(
        tx,
        child.id,
        session.user.id,
        miningChoice.prizeId,
        miningChoice.rewardChoiceToken
      )
      const prizeTier = rewardTierToMineralTier(prizeDraw.tier)
      const card = mineralCardsById.get(miningChoice.cardId)
      if (!card || card.prizeTier !== prizeTier) {
        throw new Error('Invalid mineral card choice')
      }
      const existing = await tx.userMineralCollection.findUnique({
        where: {
          userId_cardId: {
            userId: session.user.id,
            cardId: card.id,
          },
        },
      })
      const isNew = !existing
      const now = new Date()

      const collection = existing
        ? await tx.userMineralCollection.update({
            where: { id: existing.id },
            data: {
              ownedCount: { increment: 1 },
              lastObtainedAt: now,
            },
          })
        : await tx.userMineralCollection.create({
            data: {
              userId: session.user.id,
              cardId: card.id,
              ownedCount: 1,
              firstObtainedAt: now,
              lastObtainedAt: now,
            },
          })

      const drawRecord = await tx.mineralDrawRecord.create({
        data: {
          userId: session.user.id,
          prizeDrawId: prizeDraw.id,
          cardId: card.id,
          prizeTier,
          isNew,
        },
      })

      await logActivity(tx, {
        childId: child.id,
        actorUserId: session.user.id,
        audience: 'child',
        eventType: 'mineral_card_drawn',
        message: `${isNew ? 'Found' : 'Found another'} ${card.enName} with ${prizeDraw.prizeTitle}.`,
        metadata: {
          cardId: card.id,
          prizeTier,
          isNew,
          ownedCount: collection.ownedCount,
          drawRecordId: drawRecord.id,
          prizeDrawId: prizeDraw.id,
          prizeId: prizeDraw.prizeId,
        },
      })

      const remainingPoints = pointBalance - MINERAL_DRAW_COST
      return {
        card,
        prize: {
          id: prizeDraw.prizeId,
          title: prizeDraw.prizeTitle,
          tier: prizeDraw.tier,
          drawId: prizeDraw.id,
        },
        isNew,
        ownedCount: collection.ownedCount,
        pointBalance: remainingPoints,
        availableDraws: getAvailableMineralDraws(remainingPoints),
      }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not draw a mineral card'
    const isReplay =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    const status = isReplay || message.includes('Not enough points') ? 409 : 500
    return NextResponse.json(
      { error: isReplay ? 'This mining choice has already been claimed' : message },
      { status }
    )
  }
}
