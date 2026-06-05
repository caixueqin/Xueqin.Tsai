import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './child.module.css'

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
    include: {
      checkmarks: {
        where: {
          status: 'active',
          checkedAt: { gte: today }
        }
      }
    }
  })

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.statusDashboard}>
          {allChildren.map(child => {
            const isWorking = child.checkmarks.length > 0
            const isMe = child.userId === session.user.id
            return (
              <div key={child.id} className={`${styles.minerStatus} ${isMe ? styles.me : ''}`}>
                <span className={styles.minerName}>{child.displayName}</span>
                <span className={styles.minerIcon}>{isWorking ? '⛏️' : '💤'}</span>
                {isWorking && <span className={styles.minerCount}>{child.checkmarks.length}</span>}
              </div>
            )
          })}
        </div>
      </header>

      <main className={styles.mainContent}>
        {children}
      </main>
      
      <nav className={styles.bottomNav}>
        <Link href="/child" className={styles.navItem}>Today</Link>
        <Link href="/child/map" className={styles.navItem}>Map</Link>
        <Link href="/child/guild" className={styles.navItem}>Guild</Link>
      </nav>
    </div>
  )
}
