import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../child.module.css'

export default async function GuildPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'child') redirect('/login')

  const children = await prisma.child.findMany({
    orderBy: { displayName: 'asc' }
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayMarks = await prisma.checkmark.findMany({
    where: {
      status: 'active',
      checkedAt: { gte: today }
    }
  })

  // Map each child to their checkmarks count today
  const childStatus = children.map(c => {
    const marks = todayMarks.filter(m => m.childId === c.id)
    return {
      ...c,
      isAwake: marks.length > 0
    }
  })

  const awakeCount = childStatus.filter(c => c.isAwake).length
  const totalMarks = await prisma.checkmark.count({ where: { status: 'active' } })

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Today's Guild</h1>
      </div>

      <div className={styles.sectionBox}>
        <div className={styles.checkList}>
          {childStatus.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '18px', fontWeight: 600 }}>{c.displayName}</span>
              <span style={{ fontSize: '18px' }}>{c.isAwake ? '😅' : 'Zzz'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.sectionBox} style={{ marginTop: '20px' }}>
        <p style={{ margin: 0, fontSize: '16px', color: 'var(--text-muted)' }}>
          Today: {awakeCount} / {children.length} awake
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '16px', color: 'var(--text-muted)' }}>
          Project Little Miner: {totalMarks} / 1000
        </p>
      </div>

      <Link href="/child" className={styles.saveBtn} style={{ display: 'block', textAlign: 'center' }}>
        Back to Mine
      </Link>
    </>
  )
}
