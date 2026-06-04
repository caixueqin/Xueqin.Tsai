import { getSession } from '@/lib/auth'
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

  return (
    <div className={styles.layout}>
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
