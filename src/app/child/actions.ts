'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AVATAR_THEME_KEYS, type AvatarThemeKey } from '@/lib/avatarThemes'
import { getUnlockedChapterIds } from '@/lib/progression'

export async function chooseAvatarThemeAction(theme: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'child') return { error: 'Unauthorized' }
  if (!AVATAR_THEME_KEYS.includes(theme as AvatarThemeKey)) return { error: 'Invalid theme' }

  const child = await prisma.child.findUnique({ where: { userId: session.user.id } })
  if (!child) return { error: 'Unauthorized' }
  if (child.avatarTheme) return { success: true, theme: child.avatarTheme }

  const claimed = await prisma.child.findFirst({
    where: {
      avatarTheme: theme,
      id: { not: child.id },
    },
    select: { id: true },
  })
  if (claimed) return { error: 'Theme already taken' }

  const updated = await prisma.child.update({
    where: { id: child.id },
    data: { avatarTheme: theme },
    select: { avatarTheme: true },
  })

  revalidatePath('/child')
  return { success: true, theme: updated.avatarTheme }
}

export async function enterNextMineAction(currentChapterId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'child') return { error: 'Unauthorized' }

  const child = await prisma.child.findUnique({ where: { userId: session.user.id } })
  if (!child) return { error: 'Unauthorized' }

  const currentSection = child.currentSectionId
    ? await prisma.section.findUnique({
        where: { id: child.currentSectionId },
        select: { chapterId: true },
      })
    : null
  if (!currentSection || currentSection.chapterId !== currentChapterId) {
    return { error: 'This is not the current mine.' }
  }

  const chapters = await prisma.chapter.findMany({
    orderBy: { orderIndex: 'asc' },
    select: { id: true },
  })
  const currentIndex = chapters.findIndex(chapter => chapter.id === currentChapterId)
  const nextChapter = currentIndex >= 0 ? chapters[currentIndex + 1] : null

  if (!nextChapter) return { error: 'No more chapters' }
  const unlockedChapterIds = await getUnlockedChapterIds(prisma, child.id)
  if (!unlockedChapterIds.has(nextChapter.id)) {
    return { error: 'Finish the final gate before entering the next mine.' }
  }

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
