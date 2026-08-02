export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import {
  awardCheckmarkPoints,
  getPointBalance,
  reverseCheckmarkPoints,
  revokeDrawsIfNeeded,
} from '@/lib/rewards'
import { getAvailableMineralDraws } from '@/lib/mining'
import { getUnlockedChapterIds } from '@/lib/progression'

type CheckmarkRequest = {
  checkItemId?: string
  action?: 'create' | 'undo'
  parentNote?: string
}

const SMART_COMPARE_NOTES = new Set([
  'me',
  'aops_smarter',
  'tie',
])

const ALCUMUS_TYPES = new Set(['alcumus_green', 'alcumus_blue'])

function getShanghaiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

async function isCheckItemUnlocked(
  tx: typeof prisma,
  child: { id: string, currentSectionId: string | null },
  checkItem: { sectionId: string }
) {
  if (!child.currentSectionId) return false

  const [currentSection, targetSection] = await Promise.all([
    tx.section.findUnique({
      where: { id: child.currentSectionId },
      select: { chapterId: true },
    }),
    tx.section.findUnique({
      where: { id: checkItem.sectionId },
      select: { chapterId: true, orderIndex: true },
    }),
  ])

  if (!currentSection || !targetSection || targetSection.chapterId !== currentSection.chapterId) {
    return false
  }
  const unlockedChapterIds = await getUnlockedChapterIds(tx, child.id)
  if (!unlockedChapterIds.has(targetSection.chapterId)) return false

  const sections = await tx.section.findMany({
    where: { chapterId: targetSection.chapterId },
    orderBy: { orderIndex: 'asc' },
    include: {
      checkItems: {
        orderBy: { orderIndex: 'asc' },
        select: { id: true, itemType: true },
      },
    },
  })
  const targetIndex = sections.findIndex(section => section.id === checkItem.sectionId)
  if (targetIndex < 0) return false

  for (let index = 1; index <= targetIndex; index += 1) {
    const previousItems = sections[index - 1].checkItems
    const alcumusItems = previousItems.filter(item => ALCUMUS_TYPES.has(item.itemType))
    const requiredIds = alcumusItems.length > 0
      ? alcumusItems.map(item => item.id)
      : previousItems.slice(-1).map(item => item.id)

    if (requiredIds.length === 0) continue
    const completed = await tx.checkmark.findFirst({
      where: {
        childId: child.id,
        checkItemId: { in: requiredIds },
        status: 'active',
      },
      select: { id: true },
    })
    if (!completed) return false
  }

  return true
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as CheckmarkRequest
  const parentNote = body.parentNote && SMART_COMPARE_NOTES.has(body.parentNote)
    ? body.parentNote
    : undefined

  const child = await prisma.child.findUnique({
    where: { userId: session.user.id },
    select: { id: true, currentSectionId: true },
  })
  if (!child) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!body.checkItemId) {
    return NextResponse.json({ error: 'checkItemId is required' }, { status: 400 })
  }

  const checkItem = await prisma.checkItem.findUnique({
    where: { id: body.checkItemId },
    select: { id: true, isRepeatable: true, itemType: true, itemGroup: true, sectionId: true },
  })
  if (!checkItem) {
    return NextResponse.json({ error: 'Check item not found' }, { status: 404 })
  }

  if (body.action === 'undo') {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.checkmark.findFirst({
        where: {
          childId: child.id,
          checkItemId: checkItem.id,
          status: 'active',
        },
        orderBy: { checkedAt: 'desc' },
      })

      if (!existing) return { checkmark: null, revokedDraws: [] }
      if (existing.parentReviewStatus === 'ok') {
        return { locked: true, checkmark: existing, revokedDraws: [] }
      }

      const checkmark = await tx.checkmark.update({
        where: { id: existing.id },
        data: {
          status: 'undone',
          undoneAt: new Date(),
          undoneByUserId: session.user.id,
        },
      })

      await reverseCheckmarkPoints(tx, checkmark, session.user.id, 'child_undo')
      const revokedDraws = await revokeDrawsIfNeeded(tx, child.id, session.user.id, 'child_undo')

      const pointBalance = await getPointBalance(tx, child.id)
      return {
        checkmark,
        revokedDraws,
        pointBalance,
        availableDraws: getAvailableMineralDraws(pointBalance),
      }
    })

    if (result.locked) {
      return NextResponse.json({ error: 'This checkmark has been approved by a parent.' }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      checkmark: result.checkmark,
      revokedDraws: result.revokedDraws,
      pointBalance: result.pointBalance,
      availableDraws: result.availableDraws,
    })
  }

  if (!await isCheckItemUnlocked(prisma, child, checkItem)) {
    console.warn('[checkmarks] rejected locked item', {
      childId: child.id,
      checkItemId: checkItem.id,
      itemType: checkItem.itemType,
      sectionId: checkItem.sectionId,
    })
    return NextResponse.json({ error: 'This learning item is not unlocked.' }, { status: 403 })
  }

  if (!checkItem.isRepeatable) {
    const existing = await prisma.checkmark.findFirst({
      where: {
        childId: child.id,
        checkItemId: checkItem.id,
        status: 'active',
      },
      orderBy: { checkedAt: 'desc' },
    })

    if (existing) {
      const checkmark = parentNote !== undefined
        ? await prisma.checkmark.update({
            where: { id: existing.id },
            data: { parentNote },
          })
        : existing

      const pointBalance = await getPointBalance(prisma, child.id)
      return NextResponse.json({
        success: true,
        checkmark,
        duplicate: false,
        pointBalance,
        availableDraws: getAvailableMineralDraws(pointBalance),
      })
    }
  }

  let result
  try {
    result = await prisma.$transaction(async (tx) => {
      const awardKey = `${child.id}:${checkItem.id}:${getShanghaiDateKey()}`

      if (ALCUMUS_TYPES.has(checkItem.itemType)) {
        const otherAlcumusItems = await tx.checkItem.findMany({
          where: {
            sectionId: checkItem.sectionId,
            itemGroup: checkItem.itemGroup,
            itemType: checkItem.itemType === 'alcumus_green' ? 'alcumus_blue' : 'alcumus_green',
          },
          select: { id: true },
        })

        if (otherAlcumusItems.length > 0) {
          const activeOtherMarks = await tx.checkmark.findMany({
            where: {
              childId: child.id,
              checkItemId: { in: otherAlcumusItems.map(item => item.id) },
              status: 'active',
            },
          })

          for (const mark of activeOtherMarks) {
            const undoneMark = await tx.checkmark.update({
              where: { id: mark.id },
              data: {
                status: 'undone',
                undoneAt: new Date(),
                undoneByUserId: session.user.id,
              },
            })
            await reverseCheckmarkPoints(tx, undoneMark, session.user.id, 'alcumus_switch')
          }
        }
      }

      const reusableUndoneMark = await tx.checkmark.findFirst({
        where: {
          childId: child.id,
          checkItemId: checkItem.id,
          awardKey,
          status: 'undone',
        },
        orderBy: { checkedAt: 'desc' },
      })

      const checkmark = reusableUndoneMark
        ? await tx.checkmark.update({
            where: { id: reusableUndoneMark.id },
            data: {
              status: 'active',
              parentReviewStatus: 'unreviewed',
              parentNote,
              checkedAt: new Date(),
              undoneAt: null,
              undoneByUserId: null,
              createdByUserId: session.user.id,
            },
          })
        : await tx.checkmark.create({
            data: {
              childId: child.id,
              checkItemId: checkItem.id,
              createdByUserId: session.user.id,
              parentNote,
              awardKey,
            },
          })

      await awardCheckmarkPoints(tx, checkmark, checkItem.itemType, session.user.id)
      const revokedDraws = await revokeDrawsIfNeeded(tx, child.id, session.user.id, 'alcumus_switch')

      const pointBalance = await getPointBalance(tx, child.id)
      return {
        checkmark,
        revokedDraws,
        pointBalance,
        availableDraws: getAvailableMineralDraws(pointBalance),
      }
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.warn('[checkmarks] duplicate award key rejected', {
        childId: child.id,
        checkItemId: checkItem.id,
      })
      return NextResponse.json(
        { error: 'This learning item has already awarded points today.' },
        { status: 409 }
      )
    }
    console.error('[checkmarks] unexpected failure', error)
    throw error
  }

  return NextResponse.json({
    success: true,
    checkmark: result.checkmark,
    revokedDraws: result.revokedDraws,
    pointBalance: result.pointBalance,
    availableDraws: result.availableDraws,
  })
}
