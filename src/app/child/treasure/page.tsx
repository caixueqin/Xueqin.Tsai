import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import styles from '../child.module.css'

const PRIZE_TIERS = [
  { value: 'special', label: 'Special Prize' },
  { value: 'first', label: 'First Prize' },
  { value: 'second', label: 'Second Prize' },
  { value: 'third', label: 'Third Prize' },
]

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  })
}

export default async function TreasurePage() {
  const session = await getSession()
  if (!session || session.user.role !== 'child') redirect('/login')

  const child = await prisma.child.findUnique({
    where: { userId: session.user.id },
  })
  if (!child) redirect('/login')

  const pointBalance = await prisma.pointLedger.aggregate({
    where: {
      childId: child.id,
    },
    _sum: { points: true },
  })

  const prizes = await prisma.prize.findMany({
    where: {
      childId: child.id,
      status: 'active',
    },
    orderBy: [
      { tier: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  const draws = await prisma.prizeDraw.findMany({
    where: {
      childId: child.id,
      status: { in: ['pending', 'approved'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const logs = await prisma.activityLog.findMany({
    where: {
      childId: child.id,
      audience: { in: ['child', 'both'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })

  const totalPoints = pointBalance._sum.points || 0
  const currentEnergy = totalPoints % 100
  const pointsToNextTreasure = currentEnergy === 0 && totalPoints > 0 ? 0 : 100 - currentEnergy
  const drawCount = Math.floor(totalPoints / 100)
  const energyPercent = Math.min(100, currentEnergy)

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Treasure</h1>
        <p className={styles.greeting}>Mine energy turns into treasure chances.</p>
      </div>

      <section className={styles.treasureHero}>
        <div className={styles.treasureScoreRow}>
          <div>
            <div className={styles.treasureLabel}>Total Points</div>
            <div className={styles.treasurePoints}>{totalPoints}</div>
          </div>
          <div className={styles.treasureBadge}>
            {drawCount} draw{drawCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className={styles.energyBar}>
          <div className={styles.energyFill} style={{ width: `${energyPercent}%` }} />
        </div>

        <div className={styles.energyMeta}>
          <span>{currentEnergy} / 100 energy</span>
          <span>{pointsToNextTreasure} to next treasure</span>
        </div>
      </section>

      <section className={styles.sectionBox}>
        <h2 className={styles.sectionTitle}>My Prizes</h2>
        {draws.length === 0 ? (
          <p className={styles.emptyPrize}>No treasures yet</p>
        ) : (
          <div className={styles.drawList}>
            {draws.map(draw => (
              <div key={draw.id} className={styles.drawItem}>
                <strong>{draw.prizeTitle || 'Mystery Prize'}</strong>
                <span>{draw.tier} · {draw.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.sectionBox}>
        <h2 className={styles.sectionTitle}>Prize Pool</h2>
        <div className={styles.prizePoolGrid}>
          {PRIZE_TIERS.map(tier => {
            const tierPrizes = prizes.filter(prize => prize.tier === tier.value)

            return (
              <div key={tier.value} className={styles.prizePoolTier}>
                <h3>{tier.label}</h3>
                {tierPrizes.length === 0 ? (
                  <span className={styles.emptyPrize}>No prizes yet</span>
                ) : (
                  <ul>
                    {tierPrizes.map(prize => (
                      <li key={prize.id}>
                        <span>{prize.title}</span>
                        <small>{prize.isRepeatable ? 'repeatable' : 'one-time'}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className={styles.sectionBox}>
        <h2 className={styles.sectionTitle}>Activity Log</h2>
        {logs.length === 0 ? (
          <p className={styles.emptyPrize}>No treasure activity yet</p>
        ) : (
          <div className={styles.drawList}>
            {logs.map(log => (
              <div key={log.id} className={styles.drawItem}>
                <strong>{log.message}</strong>
                <span>{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
