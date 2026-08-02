import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TreasureClient from './TreasureClient'

export default async function TreasurePage() {
  const session = await getSession()
  if (!session || session.user.role !== 'child') redirect('/login')

  const child = await prisma.child.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!child) redirect('/login')

  const collection = await prisma.userMineralCollection.findMany({
    where: { userId: session.user.id },
    orderBy: { firstObtainedAt: 'asc' },
  })

  return (
    <TreasureClient
      initialCollection={collection.map(item => ({
        cardId: item.cardId,
        ownedCount: item.ownedCount,
        firstObtainedAt: item.firstObtainedAt.toISOString(),
        lastObtainedAt: item.lastObtainedAt.toISOString(),
      }))}
    />
  )
}
