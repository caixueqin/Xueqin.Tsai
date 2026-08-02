import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import MapClient from './MapClient'
import { getUnlockedChapterIds } from '@/lib/progression'

export default async function MapPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'child') redirect('/login')

  const child = await prisma.child.findUnique({
    where: { userId: session.user.id }
  })
  if (!child) redirect('/login')

  const chapters = await prisma.chapter.findMany({
    orderBy: { orderIndex: 'asc' }
  })
  const unlockedChapterIds = Array.from(await getUnlockedChapterIds(prisma, child.id))

  let currentChapterId: string | null = null
  if (child.currentSectionId) {
    const currentSection = await prisma.section.findUnique({
      where: { id: child.currentSectionId }
    })
    if (currentSection) {
      currentChapterId = currentSection.chapterId
    }
  }

  return (
    <MapClient
      chapters={chapters}
      currentChapterId={currentChapterId}
      unlockedChapterIds={unlockedChapterIds}
    />
  )
}
