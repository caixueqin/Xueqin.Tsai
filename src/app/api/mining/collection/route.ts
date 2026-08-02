export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mineralCardsById } from '@/data/minerals'
import { getAvailableMineralDraws } from '@/lib/mining'

export async function GET() {
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

  const [pointBalance, collection, recentDraws] = await Promise.all([
    prisma.pointLedger.aggregate({
      where: { childId: child.id },
      _sum: { points: true },
    }),
    prisma.userMineralCollection.findMany({
      where: { userId: session.user.id },
      orderBy: { firstObtainedAt: 'asc' },
    }),
    prisma.mineralDrawRecord.findMany({
      where: {
        userId: session.user.id,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  const points = pointBalance._sum.points || 0
  return NextResponse.json({
    pointBalance: points,
    availableDraws: getAvailableMineralDraws(points),
    collection: collection.map(item => ({
      ...item,
      card: mineralCardsById.get(item.cardId) || null,
    })),
    recentDraws: recentDraws.map(draw => ({
      ...draw,
      card: mineralCardsById.get(draw.cardId) || null,
    })),
  })
}
