'use client'

import { useState, useTransition } from 'react'
import { Check, CheckCircle2, ChevronDown, Pause, Pencil, Play, Save, Trash2 } from 'lucide-react'
import styles from './parent.module.css'
import {
  approveCheckmarkAction,
  approveTodayAboveAction,
  createPrizeAction,
  deletePrizeAction,
  setPrizeStatusAction,
  undoTodayAboveAction,
  undoCheckmarkAction,
  updatePrizeAction,
} from './actions'

const PRIZE_TIERS = [
  { value: 'special', label: 'Special' },
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
  { value: 'third', label: 'Third' },
]
const PARENT_TABS = ['Today', 'Prize Pool', 'Report'] as const
type ParentTab = typeof PARENT_TABS[number]

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  })
}

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

const iconButtonStyle = {
  width: '30px',
  height: '30px',
  borderRadius: '8px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#6b7280',
} as const

const fieldStyle = {
  height: '36px',
  border: '1px solid #e8e1d7',
  borderRadius: '8px',
  background: '#fff',
  color: '#374151',
  fontSize: '13px',
  fontWeight: 600,
} as const

function PrizeFields({ prize }: { prize?: any }) {
  return (
    <>
      <input
        name="title"
        defaultValue={prize?.title || ''}
        placeholder="Prize name"
        required
        style={{ ...fieldStyle, minWidth: '160px', flex: 1, padding: '0 10px' }}
      />
      <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <select
          name="tier"
          defaultValue={prize?.tier || 'third'}
          style={{ ...fieldStyle, appearance: 'none', padding: '0 34px 0 10px', minWidth: '104px' }}
        >
          {PRIZE_TIERS.map(tier => (
            <option key={tier.value} value={tier.value}>{tier.label}</option>
          ))}
        </select>
        <ChevronDown size={14} style={{ position: 'absolute', right: '10px', color: '#6b7280', pointerEvents: 'none' }} />
      </label>
      <label style={{ ...fieldStyle, display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0 10px', color: '#6b7280', whiteSpace: 'nowrap' }}>
        <span style={{ position: 'relative', width: '16px', height: '16px', flexShrink: 0 }}>
          <input
            name="isRepeatable"
            type="checkbox"
            defaultChecked={Boolean(prize?.isRepeatable)}
            className={styles.checkboxInput}
          />
          <Check size={12} className={styles.checkboxIcon} />
        </span>
        Repeatable
      </label>
    </>
  )
}

export default function ParentClient({ childrenList, recentMarks, prizes, activityLogs }: { childrenList: any[], recentMarks: any[], prizes: any[], activityLogs: any[] }) {
  const [isPending, startTransition] = useTransition()
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ParentTab>('Today')

  const handleUndo = (id: string) => {
    startTransition(() => {
      undoCheckmarkAction(id)
    })
  }

  const handleApprove = (id: string) => {
    startTransition(() => {
      approveCheckmarkAction(id)
    })
  }

  const handleApproveAbove = (childId: string) => {
    startTransition(() => {
      approveTodayAboveAction(childId)
    })
  }

  const handleUndoAbove = (childId: string) => {
    startTransition(() => {
      undoTodayAboveAction(childId)
    })
  }

  return (
    <div style={{ paddingTop: '40px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>Parent Dashboard</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #f0ebe3', overflowX: 'auto' }}>
        {PARENT_TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 12px',
              borderBottom: activeTab === tab ? '3px solid #377ec0' : '3px solid transparent',
              color: activeTab === tab ? '#377ec0' : '#6b7280',
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {childrenList.map(child => {
        const childMarks = recentMarks.filter(m => m.childId === child.id)
        const activeMarks = childMarks.filter(m => m.status === 'active')
        const pendingActiveMarks = activeMarks.filter(m => m.parentReviewStatus !== 'ok')
        const undoneMarks = childMarks.filter(m => m.status === 'undone')
        const childPrizes = prizes.filter(prize => prize.childId === child.id)
        const childLogs = activityLogs.filter(log => log.childId === child.id)

        return (
          <div key={child.id} style={{ border: '1px solid #e8e1d7', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>{child.displayName} {activeMarks.length > 0 ? '😅' : 'Zzz'}</h2>
              <span style={{ color: '#9c9284', fontSize: '14px' }}>Checked {activeMarks.length} items</span>
            </div>

            {activeTab === 'Today' && (
              <>
                {activeMarks.length === 0 && undoneMarks.length === 0 && (
                  <p style={{ color: '#9c9284', fontSize: '14px', margin: 0 }}>No activity today.</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingActiveMarks.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '10px 12px' }}>
                      <div style={{ flex: 1, color: '#92400e', fontSize: '13px', fontWeight: 800 }}>
                        {pendingActiveMarks.length} pending above
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApproveAbove(child.id)}
                        disabled={isPending}
                        style={{ background: '#d1fae5', color: '#047857', padding: '7px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }}
                      >
                        Approve above
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUndoAbove(child.id)}
                        disabled={isPending}
                        style={{ background: '#fee2e2', color: '#ef4444', padding: '7px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }}
                      >
                        Undo above
                      </button>
                    </div>
                  )}
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
                          {formatTime(mark.checkedAt)}
                        </span>
                        <button 
                          onClick={() => handleApprove(mark.id)}
                          disabled={isPending || mark.parentReviewStatus === 'ok'}
                          title={mark.parentReviewStatus === 'ok' ? 'Approved' : 'Approve'}
                          style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: mark.parentReviewStatus === 'ok' ? '#d1fae5' : '#ecfeff', color: '#047857', border: '1px solid #d1fae5' }}
                        >
                          <CheckCircle2 size={16} />
                        </button>
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
              </>
            )}

            {activeTab === 'Prize Pool' && (
              <div>
                {childPrizes.length === 0 && (
                  <p style={{ color: '#9c9284', fontSize: '14px', margin: '0 0 14px' }}>No prizes yet.</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {PRIZE_TIERS.map(tier => {
                    const tierPrizes = childPrizes.filter(prize => prize.tier === tier.value)
                    if (tierPrizes.length === 0) return null

                    return (
                      <div key={tier.value}>
                        <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                          {tier.label}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {tierPrizes.map(prize => {
                            const isEditing = editingPrizeId === prize.id
                            const nextStatus = prize.status === 'active' ? 'inactive' : 'active'
                            const togglePrize = setPrizeStatusAction.bind(null, prize.id, nextStatus)
                            const deletePrize = deletePrizeAction.bind(null, prize.id)

                            return (
                              <div key={prize.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: prize.status === 'active' ? '#f8fffd' : '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px' }}>
                                {isEditing ? (
                                  <form
                                    action={async (formData) => {
                                      await updatePrizeAction(prize.id, formData)
                                      setEditingPrizeId(null)
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}
                                  >
                                    <PrizeFields prize={prize} />
                                    <button type="submit" title="Save" aria-label="Save prize" style={{ ...iconButtonStyle, color: '#047857', background: '#d1fae5' }}>
                                      <Save size={16} />
                                    </button>
                                  </form>
                                ) : (
                                  <>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 700, color: '#374151' }}>{prize.title}</div>
                                      <div style={{ display: 'flex', gap: '8px', marginTop: '3px', color: '#6b7280', fontSize: '12px' }}>
                                        <span>{prize.isRepeatable ? 'Repeatable' : 'One-time'}</span>
                                        <span>{prize.status}</span>
                                      </div>
                                    </div>
                                    <button type="button" title="Edit" aria-label="Edit prize" onClick={() => setEditingPrizeId(prize.id)} style={{ ...iconButtonStyle, color: '#377ec0' }}>
                                      <Pencil size={16} />
                                    </button>
                                  </>
                                )}

                                <form action={togglePrize}>
                                  <button type="submit" title={prize.status === 'active' ? 'Deactivate' : 'Activate'} aria-label={prize.status === 'active' ? 'Deactivate prize' : 'Activate prize'} style={{ ...iconButtonStyle, color: prize.status === 'active' ? '#92400e' : '#047857', background: prize.status === 'active' ? '#fef3c7' : '#d1fae5' }}>
                                    {prize.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                                  </button>
                                </form>
                                <form action={deletePrize}>
                                  <button type="submit" title="Delete" aria-label="Delete prize" style={{ ...iconButtonStyle, color: '#ef4444', background: '#fee2e2' }}>
                                    <Trash2 size={16} />
                                  </button>
                                </form>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <form action={createPrizeAction} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f0ebe3' }}>
                  <input type="hidden" name="childId" value={child.id} />
                  <PrizeFields />
                  <button
                    type="submit"
                    style={{ background: '#377ec0', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
                  >
                    Add Prize
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'Report' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                  <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: 700 }}>Today Active</div>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{activeMarks.length}</div>
                  </div>
                  <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: 700 }}>Undone</div>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{undoneMarks.length}</div>
                  </div>
                  <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: 700 }}>Active Prizes</div>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{childPrizes.filter(prize => prize.status === 'active').length}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {childLogs.length === 0 ? (
                    <p style={{ color: '#9c9284', fontSize: '14px', margin: 0 }}>No log yet.</p>
                  ) : childLogs.map(log => (
                    <div key={log.id} style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#374151' }}>{log.message}</div>
                      <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '3px' }}>
                        {log.eventType} · {formatDateTime(log.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
