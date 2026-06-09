import styles from './child.module.css'

type ChildStatus = {
  id: string
  userId: string
  displayName: string
  todayCount: number
}

export default function ChildStatusBar({
  childrenList,
  currentUserId,
}: {
  childrenList: ChildStatus[]
  currentUserId: string
}) {
  const me = childrenList.find(child => child.userId === currentUserId)
  const others = childrenList.filter(child => child.userId !== currentUserId)

  const renderMinerStatus = (child: ChildStatus, isMe = false) => {
    const isWorking = child.todayCount > 0

    return (
      <div key={child.id} className={`${styles.minerStatus} ${isMe ? styles.me : ''}`}>
        <span className={styles.minerName}>{child.displayName}</span>
        <span className={styles.minerIcon}>{isWorking ? '⛏️' : '💤'}</span>
      </div>
    )
  }

  return (
    <div className={styles.statusDashboard}>
      <div className={styles.statusMe}>
        {me && renderMinerStatus(me, true)}
      </div>
      <div className={styles.statusOthers}>
        {others.map(child => renderMinerStatus(child))}
      </div>
    </div>
  )
}
