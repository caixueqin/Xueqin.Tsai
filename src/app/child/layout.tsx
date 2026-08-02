import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './child.module.css'
import ChildStatusBar from './ChildStatusBar'

export default async function ChildLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.user.role !== 'child') {
    redirect('/login')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const allChildren = await prisma.child.findMany({
    orderBy: { displayName: 'asc' },
    include: {
      checkmarks: {
        where: {
          status: 'active',
          checkedAt: { gte: today }
        }
      }
    }
  })
  const todayMineralDraws = await prisma.mineralDrawRecord.findMany({
    where: {
      createdAt: { gte: today },
      revokedAt: null,
    },
    select: { userId: true },
  })
  const usersWithTreasureToday = new Set(todayMineralDraws.map(draw => draw.userId))

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <ChildStatusBar
          currentUserId={session.user.id}
          childrenList={allChildren.map(child => ({
            id: child.id,
            userId: child.userId,
            displayName: child.displayName,
            avatarTheme: child.avatarTheme,
            todayCount: child.checkmarks.length,
            foundTreasureToday: usersWithTreasureToday.has(child.userId),
          }))}
        />
      </header>

      <main className={styles.mainContent}>
        {children}
      </main>
      
      <nav className={styles.bottomNav}>
        <Link href="/child" className={styles.navItem}>Today</Link>
        <Link href="/child/map" className={styles.navItem}>Map</Link>
        <Link href="/child/guild" className={styles.navItem}>Guild</Link>
        <Link href="/child/treasure" className={styles.navItem}>Treasure</Link>
      </nav>
    </div>
  )
}
