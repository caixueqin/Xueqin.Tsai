import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ParentClient from './ParentClient'

export default async function ParentPage() {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) redirect('/login')

  const children = await prisma.child.findMany({
    orderBy: { displayName: 'asc' }
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const recentMarks = await prisma.checkmark.findMany({
    where: {
      checkedAt: { gte: today }
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

  return <ParentClient childrenList={children} recentMarks={recentMarks} />
}
