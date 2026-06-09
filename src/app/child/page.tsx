import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import RoadmapClient from './RoadmapClient'

export default async function ChildPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'child') redirect('/login')

  const child = await prisma.child.findUnique({
    where: { userId: session.user.id }
  })
  if (!child) redirect('/login')

  let sectionId = child.currentSectionId
  if (!sectionId) {
    const firstSection = await prisma.section.findFirst({
      orderBy: [{ chapterId: 'asc' }, { orderIndex: 'asc' }]
    })
    if (firstSection) {
      await prisma.child.update({ where: { id: child.id }, data: { currentSectionId: firstSection.id } })
      sectionId = firstSection.id
    }
  }

  if (!sectionId) {
    return <div>No mine available. Please wait for Admin.</div>
  }

  // Find the current chapter based on currentSectionId
  const currentSection = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { chapter: true }
  })

  if (!currentSection) return <div>Mine corrupted.</div>

  const chapterId = currentSection.chapterId

  // Fetch the entire chapter, including all sections and check items
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: {
          checkItems: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      }
    }
  })

  // Fetch ALL historical marks for this child to show roadmap progress
  const allMarks = await prisma.checkmark.findMany({
    where: {
      childId: child.id,
      status: 'active'
    }
  })

  // Also fetch today's marks specifically to know if they are "Awake" today
  // (We could compute this from allMarks if we check dates, but querying is fine)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const hasMarkedToday = allMarks.some(m => new Date(m.checkedAt) >= today)

  const pointBalance = await prisma.pointLedger.aggregate({
    where: { childId: child.id },
    _sum: { points: true },
  })

  return (
    <RoadmapClient 
      child={child} 
      chapter={chapter} 
      allMarks={allMarks} 
      hasMarkedToday={hasMarkedToday}
      initialPoints={pointBalance._sum.points || 0}
    />
  )
}
