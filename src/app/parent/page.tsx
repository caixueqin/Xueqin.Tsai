import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ParentClient from './ParentClient'

async function loadProblemTexts() {
  const filePath = path.join(process.cwd(), 'data/# AoPS PreAlgebra 1-6 章节例题内容列表')
  const content = await readFile(filePath, 'utf8')

  return content.split(/\r?\n/).reduce<Record<string, string>>((acc, line) => {
    const match = line.trim().match(/^(\d+\.\d+)[:：]\s*(.+)$/)
    if (match) acc[match[1]] = match[2]
    return acc
  }, {})
}

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

  const problemTexts = await loadProblemTexts()

  return <ParentClient childrenList={children} recentMarks={recentMarks} prizes={prizes} activityLogs={activityLogs} problemTexts={problemTexts} />
}
