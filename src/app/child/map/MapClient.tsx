'use client'

import { useTransition } from 'react'
import { switchMineAction } from './actions'
import styles from '../child.module.css'

export default function MapClient({ chapters, currentChapterId }: { chapters: any[], currentChapterId: string | null }) {
  const [isPending, startTransition] = useTransition()

  const handleSwitch = (chapterId: string) => {
    startTransition(() => {
      switchMineAction(chapterId)
    })
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>The World Map</h1>
        <p className={styles.greeting}>Choose a treasure mine to explore.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {chapters.map(chapter => {
          const isCurrent = chapter.id === currentChapterId
          return (
            <button 
              key={chapter.id}
              disabled={isPending || isCurrent}
              onClick={() => handleSwitch(chapter.id)}
              className={styles.sectionBox}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px',
                margin: 0,
                background: isCurrent ? 'var(--gem-green-light)' : '#ffffff',
                border: isCurrent ? '2px solid var(--gem-green)' : '1px solid var(--border-color)',
                textAlign: 'left',
                cursor: isCurrent ? 'default' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: isCurrent ? 'var(--shadow-md)' : 'var(--shadow-sm)'
              }}
            >
              <div>
                <div style={{ fontSize: '14px', color: isCurrent ? 'var(--gem-green)' : 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                  Mine {chapter.number}
                </div>
                <div style={{ fontWeight: 700, fontSize: '20px', color: 'var(--text-main)' }}>
                  {chapter.titleEn}
                </div>
              </div>
              
              {isCurrent && (
                <div style={{ background: 'var(--gem-green)', color: '#fff', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 700 }}>
                  CURRENT
                </div>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
