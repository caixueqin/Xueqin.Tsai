import type { Prisma, PrismaClient } from '@prisma/client'

type DatabaseClient = PrismaClient | Prisma.TransactionClient

export async function getUnlockedChapterIds(
  tx: DatabaseClient,
  childId: string
) {
  const chapters = await tx.chapter.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      sections: {
        where: { sectionType: 'final_gate' },
        select: {
          checkItems: {
            select: { id: true },
          },
        },
      },
    },
  })

  const unlocked = new Set<string>()
  if (chapters.length === 0) return unlocked
  unlocked.add(chapters[0].id)

  for (let index = 0; index < chapters.length - 1; index += 1) {
    const finalGateItemIds = chapters[index].sections.flatMap(section =>
      section.checkItems.map(item => item.id)
    )
    if (finalGateItemIds.length === 0) break

    const cleared = await tx.checkmark.findFirst({
      where: {
        childId,
        checkItemId: { in: finalGateItemIds },
        status: 'active',
      },
      select: { id: true },
    })
    if (!cleared) break
    unlocked.add(chapters[index + 1].id)
  }

  return unlocked
}
