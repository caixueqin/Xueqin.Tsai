import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ParentClient from './ParentClient'

export default async function ParentPage() {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) redirect('/login')

  const children = await prisma.child.findMany({
    where: session.user.role === 'admin' ? undefined : { parentUserId: session.user.id },
    orderBy: { displayName: 'asc' }
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const recentMarks = await prisma.checkmark.findMany({
    where: {
      checkedAt: { gte: today },
      childId: { in: children.map(child => child.id) }
    },
    include: {
      checkItem: {
        include: {
          section: {
            include: { chapter: true }
          }
        }
      }
    },
    orderBy: { checkedAt: 'desc' }
  })

  const prizes = await prisma.prize.findMany({
    where: {
      childId: { in: children.map(child => child.id) },
      status: { not: 'deleted' },
    },
    orderBy: [
      { childId: 'asc' },
      { tier: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      childId: { in: children.map(child => child.id) },
      audience: { in: ['parent', 'both'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
  })

  return <ParentClient childrenList={children} recentMarks={recentMarks} prizes={prizes} activityLogs={activityLogs} />
}
