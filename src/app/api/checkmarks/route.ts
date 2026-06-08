export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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
    select: { id: true, isRepeatable: true },
  })
  if (!checkItem) {
    return NextResponse.json({ error: 'Check item not found' }, { status: 404 })
  }

  if (body.action === 'undo') {
    const existing = await prisma.checkmark.findFirst({
      where: {
        childId: child.id,
        checkItemId: checkItem.id,
        status: 'active',
      },
      orderBy: { checkedAt: 'desc' },
    })

    if (!existing) {
      return NextResponse.json({ success: true, checkmark: null })
    }

    const checkmark = await prisma.checkmark.update({
      where: { id: existing.id },
      data: {
        status: 'undone',
        undoneAt: new Date(),
        undoneByUserId: session.user.id,
      },
    })

    return NextResponse.json({ success: true, checkmark })
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

  const checkmark = await prisma.checkmark.create({
    data: {
      childId: child.id,
      checkItemId: checkItem.id,
      createdByUserId: session.user.id,
      parentNote,
    },
  })

  return NextResponse.json({ success: true, checkmark })
}
