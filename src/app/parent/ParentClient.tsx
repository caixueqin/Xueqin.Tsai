'use client'

import { useTransition } from 'react'
import { undoCheckmarkAction } from './actions'

export default function ParentClient({ childrenList, recentMarks }: { childrenList: any[], recentMarks: any[] }) {
  const [isPending, startTransition] = useTransition()

  const handleUndo = (id: string) => {
    startTransition(() => {
      undoCheckmarkAction(id)
    })
  }

  return (
    <div style={{ paddingTop: '40px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>Parent Dashboard</h1>
      
      {childrenList.map(child => {
        const childMarks = recentMarks.filter(m => m.childId === child.id)
        const activeMarks = childMarks.filter(m => m.status === 'active')
        const undoneMarks = childMarks.filter(m => m.status === 'undone')

        return (
          <div key={child.id} style={{ border: '1px solid #e8e1d7', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>{child.displayName} {activeMarks.length > 0 ? '😅' : 'Zzz'}</h2>
              <span style={{ color: '#9c9284', fontSize: '14px' }}>Checked {activeMarks.length} items</span>
            </div>

            {activeMarks.length === 0 && undoneMarks.length === 0 && (
              <p style={{ color: '#9c9284', fontSize: '14px', margin: 0 }}>No activity today.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeMarks.map(mark => (
                <div key={mark.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {mark.checkItem.section.chapter.number}.{mark.checkItem.section.number} {mark.checkItem.section.titleEn}
                    </div>
                    <div style={{ fontWeight: 600, color: '#374151' }}>✓ {mark.checkItem.labelEn}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {new Date(mark.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button 
                      onClick={() => handleUndo(mark.id)} 
                      disabled={isPending}
                      style={{ fontSize: '12px', background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: '6px' }}
                    >
                      Undo
                    </button>
                  </div>
                </div>
              ))}
              {undoneMarks.map(mark => (
                <div key={mark.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f3f4f6', padding: '12px', borderRadius: '8px', opacity: 0.6 }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'line-through' }}>
                      {mark.checkItem.section.chapter.number}.{mark.checkItem.section.number} {mark.checkItem.section.titleEn}
                    </div>
                    <div style={{ fontWeight: 600, color: '#9ca3af', textDecoration: 'line-through' }}>✓ {mark.checkItem.labelEn}</div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>Undone</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
