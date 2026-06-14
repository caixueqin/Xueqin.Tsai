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
  const reportStart = new Date(today)
  const dayOfWeek = reportStart.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  reportStart.setDate(reportStart.getDate() + mondayOffset - 21)

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

  const progressChapters = await prisma.chapter.findMany({
    orderBy: { orderIndex: 'asc' },
    take: 6,
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: {
          checkItems: {
            orderBy: { orderIndex: 'asc' },
            select: { id: true },
          },
        },
      },
    },
  })

  const progressMarks = await prisma.checkmark.findMany({
    where: {
      childId: { in: children.map(child => child.id) },
      status: 'active',
      checkItem: {
        section: {
          chapterId: { in: progressChapters.map(chapter => chapter.id) },
        },
      },
    },
    select: {
      childId: true,
      checkItemId: true,
      checkedAt: true,
      checkItem: {
        select: {
          section: {
            select: { chapterId: true },
          },
        },
      },
    },
  })

  const totalCheckpoints = progressChapters.reduce(
    (chapterSum, chapter) => chapterSum + chapter.sections.reduce((sectionSum, section) => sectionSum + section.checkItems.length, 0),
    0
  )
  const checkpointPosition = new Map<string, number>()
  const chapterRanges: { chapterId: string, number: number, start: number, end: number, total: number }[] = []
  let checkpointIndex = 0

  progressChapters.forEach(chapter => {
    const start = checkpointIndex + 1
    chapter.sections.forEach(section => {
      section.checkItems.forEach(item => {
        checkpointIndex += 1
        checkpointPosition.set(item.id, checkpointIndex)
      })
    })
    chapterRanges.push({
      chapterId: chapter.id,
      number: chapter.number,
      start,
      end: checkpointIndex,
      total: Math.max(0, checkpointIndex - start + 1),
    })
  })

  const completionEstimate = children.map(child => {
    const childMarks = progressMarks.filter(mark => mark.childId === child.id)
    const currentPosition = childMarks.reduce((max, mark) => {
      return Math.max(max, checkpointPosition.get(mark.checkItemId) || 0)
    }, 0)
    const dailyMap = new Map<string, number>()

    childMarks.forEach(mark => {
      const position = checkpointPosition.get(mark.checkItemId) || 0
      const dayKey = mark.checkedAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })
      dailyMap.set(dayKey, Math.max(dailyMap.get(dayKey) || 0, position))
    })

    let previousPosition = 0
    const dailyLogs = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dayKey, dayPosition]) => {
        const count = Math.max(0, dayPosition - previousPosition)
        previousPosition = Math.max(previousPosition, dayPosition)
        return { dayKey, count }
      })
      .filter(day => day.count > 0)
    const learningDays = dailyLogs.length
    const avgSpeed = learningDays > 0 ? currentPosition / learningDays : 0
    const recentLogs = dailyLogs.slice(-7)
    const recentSpeed = recentLogs.length > 0
      ? recentLogs.reduce((sum, day) => sum + day.count, 0) / recentLogs.length
      : 0
    const finalSpeed = recentSpeed * 0.6 + avgSpeed * 0.4
    const adjustedSpeed = finalSpeed * 0.8
    const remaining = Math.max(0, totalCheckpoints - currentPosition)
    const estimatedRemainingDays = adjustedSpeed > 0 ? Math.ceil(remaining / adjustedSpeed) : null
    let estimatedCompletionDate: string | null = null

    if (estimatedRemainingDays !== null) {
      const estimatedDate = new Date(today)
      estimatedDate.setDate(estimatedDate.getDate() + estimatedRemainingDays)
      estimatedCompletionDate = estimatedDate.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai',
      })
    }

    return {
      childId: child.id,
      total: totalCheckpoints,
      currentPosition,
      remaining,
      avgSpeed,
      recentSpeed,
      estimatedRemainingDays,
      estimatedCompletionDate,
      chapters: chapterRanges,
    }
  })

  const reportMarks = await prisma.checkmark.findMany({
    where: {
      childId: { in: children.map(child => child.id) },
      status: 'active',
      checkedAt: { gte: reportStart },
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
    orderBy: { checkedAt: 'asc' }
  })

  const prizeDraws = await prisma.prizeDraw.findMany({
    where: {
      childId: { in: children.map(child => child.id) },
      status: 'approved',
    },
    orderBy: [
      { childId: 'asc' },
      { approvedAt: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  const problemTexts = await loadProblemTexts()

  return <ParentClient childrenList={children} recentMarks={recentMarks} prizes={prizes} activityLogs={activityLogs} reportMarks={reportMarks} prizeDraws={prizeDraws} completionEstimate={completionEstimate} problemTexts={problemTexts} />
}
