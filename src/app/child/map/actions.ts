'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUnlockedChapterIds } from '@/lib/progression'

export async function switchMineAction(chapterId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'child') return { error: 'Unauthorized' }

  const child = await prisma.child.findUnique({ where: { userId: session.user.id } })
  if (!child) return { error: 'Unauthorized' }
  const unlockedChapterIds = await getUnlockedChapterIds(prisma, child.id)
  if (!unlockedChapterIds.has(chapterId)) {
    return { error: 'This mine is still locked.' }
  }

  // Find the first section of this chapter
  const firstSection = await prisma.section.findFirst({
    where: { chapterId },
    orderBy: { orderIndex: 'asc' }
  })

  if (firstSection) {
    await prisma.child.update({
      where: { id: child.id },
      data: { currentSectionId: firstSection.id }
    })
  }

  redirect('/child')
}
