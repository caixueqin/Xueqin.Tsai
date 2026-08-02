'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logActivity, reverseCheckmarkPoints, revokeDrawsIfNeeded } from '@/lib/rewards'

const PRIZE_TIERS = new Set(['special', 'first', 'second', 'third'])
const PRIZE_STATUSES = new Set(['active', 'inactive'])
const PRIZE_RATE_FIELDS = [
  'specialPrizeRate',
  'firstPrizeRate',
  'secondPrizeRate',
  'thirdPrizeRate',
] as const

function getTodayStart() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

async function assertCanManageChild(childId: string, userId: string, role: string) {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true, parentUserId: true },
  })

  if (!child) return null
  if (role !== 'admin' && child.parentUserId !== userId) return null
  return child
}

async function assertCanManagePrize(prizeId: string, userId: string, role: string) {
  const prize = await prisma.prize.findUnique({
    where: { id: prizeId },
    include: { child: true },
  })

  if (!prize || prize.status === 'deleted') return null
  if (role !== 'admin' && prize.child.parentUserId !== userId) return null
  return prize
}

async function assertCanManagePrizeDraw(drawId: string, userId: string, role: string) {
  const draw = await prisma.prizeDraw.findUnique({
    where: { id: drawId },
    include: { child: true },
  })

  if (!draw) return null
  if (role !== 'admin' && draw.child.parentUserId !== userId) return null
  return draw
}

function normalizePrize(formData: FormData) {
  const title = ((formData.get('title') as string) || '').trim()
  const tier = ((formData.get('tier') as string) || '').trim()
  const isRepeatable = formData.get('isRepeatable') === 'on'

  if (!title || !PRIZE_TIERS.has(tier)) return null
  return { title, tier, isRepeatable }
}

function normalizePrizeRates(formData: FormData) {
  const entries = PRIZE_RATE_FIELDS.map(field => {
    const value = Number(formData.get(field))
    return [field, value] as const
  })

  if (entries.some(([, value]) => !Number.isInteger(value) || value < 0 || value > 100)) {
    return null
  }

  const rates = Object.fromEntries(entries) as Record<(typeof PRIZE_RATE_FIELDS)[number], number>
  const total = Object.values(rates).reduce((sum, value) => sum + value, 0)
  return total === 100 ? rates : null
}

export async function updatePrizeRatesAction(childId: string, formData: FormData) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    return { error: '无权修改中奖率。' }
  }

  const child = await assertCanManageChild(childId, session.user.id, session.user.role)
  const rates = normalizePrizeRates(formData)

  if (!child) return { error: '找不到对应的孩子。' }
  if (!rates) return { error: '四个奖级必须是 0–100 的整数，并且合计为 100%。' }

  await prisma.$executeRaw`
    UPDATE "Child"
    SET
      "specialPrizeRate" = ${rates.specialPrizeRate},
      "firstPrizeRate" = ${rates.firstPrizeRate},
      "secondPrizeRate" = ${rates.secondPrizeRate},
      "thirdPrizeRate" = ${rates.thirdPrizeRate}
    WHERE "id" = ${child.id}
  `

  revalidatePath('/parent')
  revalidatePath('/child')
  return { success: true }
}

export async function undoCheckmarkAction(checkmarkId: string) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    return
  }

  const checkmark = await prisma.checkmark.findUnique({
    where: { id: checkmarkId },
    include: { child: true },
  })

  if (!checkmark) {
    return { error: 'Checkmark not found' }
  }

  if (session.user.role !== 'admin' && checkmark.child.parentUserId !== session.user.id) {
    return { error: 'Unauthorized' }
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.checkmark.update({
      where: { id: checkmarkId },
      data: {
        status: 'undone',
        parentReviewStatus: 'needs_fix',
        undoneAt: new Date(),
        undoneByUserId: session.user.id,
      },
    })

    await reverseCheckmarkPoints(tx, updated, session.user.id, 'parent_return')
    await revokeDrawsIfNeeded(tx, checkmark.childId, session.user.id, 'parent_return')
  })

  revalidatePath('/parent')
  revalidatePath('/child')
  revalidatePath('/child/treasure')
  return { success: true }
}

export async function approveCheckmarkAction(checkmarkId: string) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    return
  }

  const checkmark = await prisma.checkmark.findUnique({
    where: { id: checkmarkId },
    include: { child: true },
  })

  if (!checkmark) return
  if (session.user.role !== 'admin' && checkmark.child.parentUserId !== session.user.id) return

  await prisma.$transaction(async (tx) => {
    await tx.checkmark.update({
      where: { id: checkmarkId },
      data: { parentReviewStatus: 'ok' },
    })

    const approvedDraws = await tx.prizeDraw.updateMany({
      where: {
        childId: checkmark.childId,
        status: 'pending',
      },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
    })

    await logActivity(tx, {
      childId: checkmark.childId,
      actorUserId: session.user.id,
      eventType: 'checkmark_approved',
      message: '家长确认了今日打卡。',
      metadata: { checkmarkId, approvedDrawCount: approvedDraws.count },
    })
  })

  revalidatePath('/parent')
  revalidatePath('/child')
  revalidatePath('/child/treasure')
  return { success: true }
}

export async function approveTodayAboveAction(childId: string) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    return
  }

  const child = await assertCanManageChild(childId, session.user.id, session.user.role)
  if (!child) return

  await prisma.$transaction(async (tx) => {
    const approved = await tx.checkmark.updateMany({
      where: {
        childId,
        status: 'active',
        parentReviewStatus: { not: 'ok' },
        checkedAt: { gte: getTodayStart() },
      },
      data: { parentReviewStatus: 'ok' },
    })

    const approvedDraws = await tx.prizeDraw.updateMany({
      where: {
        childId,
        status: 'pending',
      },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
    })

    await logActivity(tx, {
      childId,
      actorUserId: session.user.id,
      eventType: 'checkmarks_approved_batch',
      message: `已通过 ${approved.count} 项打卡。`,
      metadata: { approvedCount: approved.count, approvedDrawCount: approvedDraws.count },
    })
  })

  revalidatePath('/parent')
  revalidatePath('/child')
  revalidatePath('/child/treasure')
}

export async function undoTodayAboveAction(childId: string) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    return
  }

  const child = await assertCanManageChild(childId, session.user.id, session.user.role)
  if (!child) return

  await prisma.$transaction(async (tx) => {
    const marks = await tx.checkmark.findMany({
      where: {
        childId,
        status: 'active',
        parentReviewStatus: { not: 'ok' },
        checkedAt: { gte: getTodayStart() },
      },
      orderBy: { checkedAt: 'desc' },
    })

    for (const mark of marks) {
      const updated = await tx.checkmark.update({
        where: { id: mark.id },
        data: {
          status: 'undone',
          parentReviewStatus: 'needs_fix',
          undoneAt: new Date(),
          undoneByUserId: session.user.id,
        },
      })
      await reverseCheckmarkPoints(tx, updated, session.user.id, 'parent_batch_return')
    }

    await revokeDrawsIfNeeded(tx, childId, session.user.id, 'parent_batch_return')

    await logActivity(tx, {
      childId,
      actorUserId: session.user.id,
      eventType: 'checkmarks_returned_batch',
      message: `已退回 ${marks.length} 项打卡。`,
      metadata: { returnedCount: marks.length },
    })
  })

  revalidatePath('/parent')
  revalidatePath('/child')
  revalidatePath('/child/treasure')
}

export async function createPrizeAction(formData: FormData) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    return
  }

  const childId = ((formData.get('childId') as string) || '').trim()
  const child = await assertCanManageChild(childId, session.user.id, session.user.role)
  const prize = normalizePrize(formData)

  if (!child || !prize) return

  await prisma.prize.create({
    data: {
      childId: child.id,
      title: prize.title,
      tier: prize.tier,
      isRepeatable: prize.isRepeatable,
    },
  })

  revalidatePath('/parent')
  revalidatePath('/child/treasure')
}

export async function updatePrizeAction(prizeId: string, formData: FormData) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    return
  }

  const existing = await assertCanManagePrize(prizeId, session.user.id, session.user.role)
  const prize = normalizePrize(formData)

  if (!existing || !prize) return

  await prisma.prize.update({
    where: { id: prizeId },
    data: {
      title: prize.title,
      tier: prize.tier,
      isRepeatable: prize.isRepeatable,
    },
  })

  revalidatePath('/parent')
  revalidatePath('/child/treasure')
}

export async function setPrizeStatusAction(prizeId: string, status: string) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    return
  }

  const existing = await assertCanManagePrize(prizeId, session.user.id, session.user.role)
  if (!existing || !PRIZE_STATUSES.has(status)) return

  await prisma.prize.update({
    where: { id: prizeId },
    data: { status },
  })

  revalidatePath('/parent')
  revalidatePath('/child/treasure')
}

export async function deletePrizeAction(prizeId: string) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    return
  }

  const existing = await assertCanManagePrize(prizeId, session.user.id, session.user.role)
  if (!existing) return

  await prisma.prize.update({
    where: { id: prizeId },
    data: { status: 'deleted' },
  })

  revalidatePath('/parent')
  revalidatePath('/child/treasure')
}

export async function redeemPrizeDrawAction(drawId: string) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    return
  }

  const draw = await assertCanManagePrizeDraw(drawId, session.user.id, session.user.role)
  if (!draw || draw.status !== 'approved') return

  await prisma.prizeDraw.update({
    where: { id: draw.id },
    data: { status: 'redeemed' },
  })

  revalidatePath('/parent')
  revalidatePath('/child/treasure')
}
