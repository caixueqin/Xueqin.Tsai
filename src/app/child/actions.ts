'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function toggleCheckmarkAction(childId: string, checkItemId: string, currentlyChecked: boolean) {
  const session = await getSession()
  if (!session || session.user.role !== 'child') return { error: 'Unauthorized' }
  
  // Verify it's their own childId
  const child = await prisma.child.findUnique({ where: { userId: session.user.id } })
  if (!child || child.id !== childId) return { error: 'Unauthorized' }

  if (currentlyChecked) {
    // If it was checked today, we mark it undone
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const existing = await prisma.checkmark.findFirst({
      where: {
        childId,
        checkItemId,
        status: 'active',
        checkedAt: { gte: today }
      }
    })
    
    if (existing) {
      await prisma.checkmark.update({
        where: { id: existing.id },
        data: { status: 'undone', undoneAt: new Date(), undoneByUserId: session.user.id }
      })
    }
  } else {
    // Add checkmark
    await prisma.checkmark.create({
      data: {
        childId,
        checkItemId,
        createdByUserId: session.user.id,
      }
    })
  }

  revalidatePath('/child')
  return { success: true }
}

export async function enterNextMineAction(currentChapterId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'child') return { error: 'Unauthorized' }

  const child = await prisma.child.findUnique({ where: { userId: session.user.id } })
  if (!child) return { error: 'Unauthorized' }

  // Find the next chapter based on orderIndex
  const currentChapter = await prisma.chapter.findUnique({ where: { id: currentChapterId } })
  if (!currentChapter) return { error: 'Chapter not found' }

  const nextChapter = await prisma.chapter.findFirst({
    where: { orderIndex: { gt: currentChapter.orderIndex } },
    orderBy: { orderIndex: 'asc' }
  })

  if (!nextChapter) return { error: 'No more chapters' }

  // Find the first section of the next chapter
  const nextSection = await prisma.section.findFirst({
    where: { chapterId: nextChapter.id },
    orderBy: { orderIndex: 'asc' }
  })

  if (nextSection) {
    await prisma.child.update({
      where: { id: child.id },
      data: { currentSectionId: nextSection.id }
    })
  }

  redirect('/child')
}
