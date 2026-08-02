'use client'

import { useState, useTransition } from 'react'
import type { CSSProperties } from 'react'
import { AVATAR_EXPRESSIONS, AVATAR_THEMES } from '@/lib/avatarThemes'
import { chooseAvatarThemeAction } from './actions'
import styles from './child.module.css'

export default function AvatarThemePicker({
  currentTheme,
  usedThemes,
}: {
  currentTheme: string | null
  usedThemes: string[]
}) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  if (selectedTheme) return null

  const chooseTheme = (theme: string) => {
    setError('')
    startTransition(async () => {
      const result = await chooseAvatarThemeAction(theme)
      if (result?.success) {
        setSelectedTheme(result.theme || theme)
      } else {
        setError(result?.error || 'Could not save this theme.')
      }
    })
  }

  return (
    <section className={styles.avatarPicker}>
      <div className={styles.avatarPickerHeader}>
        <h2>Choose your mining crew color</h2>
        <span>First come, first served</span>
      </div>
      <div className={styles.avatarThemeGrid}>
        {AVATAR_THEMES.map(theme => {
          const isTaken = usedThemes.includes(theme.key)

          return (
            <button
              key={theme.key}
              type="button"
              onClick={() => chooseTheme(theme.key)}
              disabled={isPending || isTaken}
              className={styles.avatarThemeOption}
              style={{ '--avatar-theme-color': theme.color } as CSSProperties}
            >
              <div className={styles.avatarThemeTitle}>
                <span>{theme.label}</span>
                {isTaken && <small>Taken</small>}
              </div>
              <div className={styles.avatarPreviewRow}>
                {AVATAR_EXPRESSIONS.map(expression => (
                  <img
                    key={expression.code}
                    src={`/image/user-icons/${theme.key}${expression.code}.png`}
                    alt={`${theme.label} ${expression.label}`}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>
      {error && <p className={styles.avatarPickerError}>{error}</p>}
    </section>
  )
}
