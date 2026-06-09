export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import {
  autoDrawRewards,
  awardCheckmarkPoints,
  reverseCheckmarkPoints,
  revokeDrawsIfNeeded,
} from '@/lib/rewards'

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

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as CheckmarkRequest
  if (!body.checkItemId) {
    return NextResponse.json({ error: 'checkItemId is required' }, { status: 400 })
  }
  const parentNote = body.parentNote && SMART_COMPARE_NOTES.has(body.parentNote)
    ? body.parentNote
    : undefined

  const child = await prisma.child.findUnique({ where: { userId: session.user.id } })
  if (!child) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

      return { checkmark, revokedDraws }
    })

    if (result.locked) {
      return NextResponse.json({ error: 'This checkmark has been approved by a parent.' }, { status: 409 })
    }

    return NextResponse.json({ success: true, checkmark: result.checkmark, revokedDraws: result.revokedDraws })
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

      return NextResponse.json({ success: true, checkmark, duplicate: false })
    }
  }

  const result = await prisma.$transaction(async (tx) => {
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

    const checkmark = await tx.checkmark.create({
      data: {
        childId: child.id,
        checkItemId: checkItem.id,
        createdByUserId: session.user.id,
        parentNote,
      },
    })

    await awardCheckmarkPoints(tx, checkmark, checkItem.itemType, session.user.id)
    const revokedDraws = await revokeDrawsIfNeeded(tx, child.id, session.user.id, 'alcumus_switch')
    const draws = await autoDrawRewards(tx, child.id, session.user.id)

    return { checkmark, draws, revokedDraws }
  })

  return NextResponse.json({ success: true, checkmark: result.checkmark, draws: result.draws, revokedDraws: result.revokedDraws })
}
