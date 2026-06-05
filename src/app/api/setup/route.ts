export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Rename Mia to Shirley
    const mia = await prisma.user.findFirst({ where: { name: 'Mia' } })
    if (mia) {
      await prisma.user.update({ where: { id: mia.id }, data: { name: 'Shirley' } })
      await prisma.child.update({ where: { userId: mia.id }, data: { displayName: 'Shirley' } })
    }

    // Rename Leo to Jeff
    const leo = await prisma.user.findFirst({ where: { name: 'Leo' } })
    if (leo) {
      await prisma.user.update({ where: { id: leo.id }, data: { name: 'Jeff' } })
      await prisma.child.update({ where: { userId: leo.id }, data: { displayName: 'Jeff' } })
    }

    // Set pins to 1234 for Sean, Shirley, Jeff
    await prisma.user.updateMany({
      where: {
        name: { in: ['Sean', 'Shirley', 'Jeff'] }
      },
      data: {
        pin: '1234'
      }
    })
    
    return NextResponse.json({ success: true, message: 'Renamed to Shirley & Jeff, and updated pins to 1234' })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) })
  }
}
