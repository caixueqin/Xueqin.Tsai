export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { hashPin } from '@/lib/pin'

const PARENT_ACCOUNTS = [
  { childName: 'Jeff', parentName: 'JeffMom' },
  { childName: 'Shirley', parentName: 'ShirleyMom' },
  { childName: 'Yao', parentName: 'YaoMom' },
  { childName: 'Sean', parentName: 'SeanMom' },
]

export async function POST() {
  const session = await getSession()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = []

  for (const account of PARENT_ACCOUNTS) {
    const child = await prisma.child.findFirst({
      where: { displayName: account.childName },
    })

    if (!child) {
      results.push({ ...account, status: 'missing_child' })
      continue
    }

    const existingParent = child.parentUserId
      ? await prisma.user.findUnique({ where: { id: child.parentUserId } })
      : await prisma.user.findFirst({ where: { name: account.parentName } })

    const parent = existingParent
      ? await prisma.user.update({
          where: { id: existingParent.id },
          data: {
            role: 'parent',
            password: hashPin('1234'),
            mustChangePin: true,
          },
        })
      : await prisma.user.create({
          data: {
            name: account.parentName,
            role: 'parent',
            password: hashPin('1234'),
            mustChangePin: true,
          },
        })

    await prisma.child.update({
      where: { id: child.id },
      data: { parentUserId: parent.id },
    })

    results.push({
      ...account,
      parentUserId: parent.id,
      childId: child.id,
      status: existingParent ? 'reset' : 'created',
    })
  }

  return NextResponse.json({ success: true, results })
}
