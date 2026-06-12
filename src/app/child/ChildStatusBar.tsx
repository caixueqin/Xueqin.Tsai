import styles from './child.module.css'
import { AVATAR_THEMES, getAvatarSrc } from '@/lib/avatarThemes'

type ChildStatus = {
  id: string
  userId: string
  displayName: string
  avatarTheme?: string | null
  todayCount: number
  foundTreasureToday?: boolean
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

  const renderMinerStatus = (child: ChildStatus, index = 0, isMe = false) => {
    const expressionCode = isMe
      ? '03'
      : child.foundTreasureToday
        ? '02'
        : child.todayCount > 0
          ? '03'
          : '05'
    const fallbackTheme = AVATAR_THEMES[index % AVATAR_THEMES.length].key
    const avatarSrc = getAvatarSrc(child.avatarTheme || fallbackTheme, expressionCode)

    return (
      <div
        key={child.id}
        className={`${styles.minerStatus} ${isMe ? styles.me : ''}`}
        data-name={child.displayName}
        title={child.displayName}
      >
        <span className={styles.minerLabel}>{child.displayName}</span>
        {avatarSrc ? (
          <img
            className={styles.minerAvatar}
            src={avatarSrc}
            alt={`${child.displayName} avatar`}
          />
        ) : (
          <span className={styles.minerFallback}>{child.displayName.slice(0, 1)}</span>
        )}
      </div>
    )
  }

  return (
    <div className={styles.statusDashboard}>
      <div className={styles.statusMe}>
        {me && renderMinerStatus(me, 0, true)}
      </div>
      <div className={styles.statusEnergySpace} />
      <div className={styles.statusOthers}>
        {others.map((child, index) => renderMinerStatus(child, index + 1))}
      </div>
    </div>
  )
}
