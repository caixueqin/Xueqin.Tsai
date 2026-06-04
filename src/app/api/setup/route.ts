import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await prisma.user.updateMany({
      where: {
        name: { in: ['Sean', 'Mia', 'Leo'] }
      },
      data: {
        pin: '1234'
      }
    })
    return NextResponse.json({ success: true, message: 'Updated pins to 1234' })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) })
  }
}
