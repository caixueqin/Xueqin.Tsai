export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Setup route is disabled in production.' }, { status: 403 });
  }

  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    return NextResponse.json({ success: true, message: 'Database connection successful', result }, { status: 200 });
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}