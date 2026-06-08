'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function undoCheckmarkAction(checkmarkId: string) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    return { error: 'Unauthorized' }
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

  await prisma.checkmark.update({
    where: { id: checkmarkId },
    data: { 
      status: 'undone', 
      undoneAt: new Date(), 
      undoneByUserId: session.user.id 
    }
  })

  revalidatePath('/parent')
  return { success: true }
}
