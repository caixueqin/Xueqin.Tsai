'use client'

import { useState, useTransition } from 'react'
import type { ActivityLog, Child, Prisma, Prize, PrizeDraw } from '@prisma/client'
import { Check, CheckCircle2, ChevronDown, Pause, Pencil, Play, Save, Trash2 } from 'lucide-react'
import styles from './parent.module.css'
import {
  approveCheckmarkAction,
  approveTodayAboveAction,
  createPrizeAction,
  deletePrizeAction,
  redeemPrizeDrawAction,
  setPrizeStatusAction,
  undoTodayAboveAction,
  undoCheckmarkAction,
  updatePrizeAction,
} from './actions'

const PRIZE_TIERS = [
  { value: 'special', label: '特别奖' },
  { value: 'first', label: '一等奖' },
  { value: 'second', label: '二等奖' },
  { value: 'third', label: '三等奖' },
]
const PARENT_TABS = ['今日', '奖品池', '周报告'] as const
type ParentTab = typeof PARENT_TABS[number]
const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const PALETTE = {
  blue: '#377ec0',
  red: '#f04f52',
  yellow: '#fbdf54',
  teal: '#12baaa',
  orange: '#f7891f',
  ink: '#2f2f38',
  muted: '#6d6257',
  border: '#efd998',
  surface: '#ffffff',
  warm: '#fff7d7',
} as const
const UI = {
  radius: '8px',
  border: '1px solid #edf1f4',
  softBorder: '1px solid #e8e1d7',
  textSize: '14px',
  metaSize: '12px',
} as const
const ITEM_TYPE_LABELS: Record<string, string> = {
  try: '先自己试',
  aops_way: 'AoPS 方法',
  alcumus_green: 'Alcumus 绿色',
  alcumus_blue: 'Alcumus 蓝色',
  review_read: '复习阅读',
  review_q: '复习题',
  challenge: '挑战题',
}
type TodayProblemGroup = {
  key: string
  problemNumber: string | null
  problemText: string | null
  sectionLabel: string
  marks: CheckmarkWithItem[]
}
type CheckmarkWithItem = Prisma.CheckmarkGetPayload<{
  include: {
    checkItem: {
      include: {
        section: {
          include: { chapter: true }
        }
      }
    }
  }
}>
type ParentClientProps = {
  childrenList: Child[]
  recentMarks: CheckmarkWithItem[]
  prizes: Prize[]
  activityLogs: ActivityLog[]
  reportMarks: CheckmarkWithItem[]
  prizeDraws: PrizeDraw[]
  completionEstimate: {
    childId: string
    total: number
    currentPosition: number
    remaining: number
    avgSpeed: number
    recentSpeed: number
    estimatedRemainingDays: number | null
    estimatedCompletionDate: string | null
    chapters: {
      chapterId: string
      number: number
      start: number
      end: number
      total: number
    }[]
  }[]
  problemTexts: Record<string, string>
}

const WHO_WINS_STYLES: Record<string, { label: string, background: string, border: string, color: string }> = {
  aops_smarter: { label: 'AoPS 更好', background: '#dffaf7', border: PALETTE.teal, color: '#0f766e' },
  tie: { label: '差不多', background: '#fff7d7', border: PALETTE.yellow, color: '#8a5b00' },
  me: { label: '我的方法更好', background: '#fff0df', border: PALETTE.orange, color: '#a84b00' },
}

function getProblemNumber(mark: CheckmarkWithItem) {
  const source = `${mark.checkItem.itemGroup || ''} ${mark.checkItem.labelEn || ''}`
  return source.match(/(\d+\.\d+)/)?.[1] || null
}

function getSectionLabel(mark: CheckmarkWithItem) {
  return `${mark.checkItem.section.number} ${mark.checkItem.section.titleZh || mark.checkItem.section.titleEn}`
}

function getCheckItemLabel(mark: CheckmarkWithItem) {
  return mark.checkItem.labelZh || ITEM_TYPE_LABELS[mark.checkItem.itemType] || mark.checkItem.labelEn
}

function getPrizeStatusLabel(status: string) {
  if (status === 'active') return '启用中'
  if (status === 'inactive') return '已暂停'
  return status
}

function getActivityLogLabel(log: ActivityLog) {
  if (log.eventType === 'checkmark_approved') return '家长确认了今日打卡。'
  if (log.eventType === 'checkmarks_approved_batch') return log.message.replace(/^Approved (\d+) checkmarks\.$/, '已通过 $1 项打卡。')
  if (log.eventType === 'checkmarks_returned_batch') return log.message.replace(/^Returned (\d+) checkmarks\.$/, '已退回 $1 项打卡。')
  return log.message
}

function getEventTypeLabel(eventType: string) {
  if (eventType === 'checkmark_approved') return '单项确认'
  if (eventType === 'checkmarks_approved_batch') return '批量通过'
  if (eventType === 'checkmarks_returned_batch') return '批量退回'
  return eventType
}

function buildTodayGroups(marks: CheckmarkWithItem[], problemTexts: Record<string, string>) {
  const groups = new Map<string, TodayProblemGroup>()

  marks.forEach(mark => {
    const problemNumber = getProblemNumber(mark)
    const key = problemNumber ? `problem-${problemNumber}` : mark.id

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        problemNumber,
        problemText: problemNumber ? problemTexts[problemNumber] || null : null,
        sectionLabel: getSectionLabel(mark),
        marks: [],
      })
    }

    groups.get(key)?.marks.push(mark)
  })

  return Array.from(groups.values())
}

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  })
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  })
}

function getDateKey(value: string | Date) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })
}

function formatShortDate(value: string | Date) {
  return new Date(value).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  })
}

function getShanghaiStartOfDay(value: Date) {
  const key = getDateKey(value)
  return new Date(`${key}T00:00:00+08:00`)
}

function getCurrentWeekDays() {
  const todayStart = getShanghaiStartOfDay(new Date())
  const dayOfWeek = todayStart.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(todayStart)
  monday.setDate(todayStart.getDate() + mondayOffset)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return date
  })
}

function getWeekStart(value: string | Date) {
  const date = getShanghaiStartOfDay(new Date(value))
  const dayOfWeek = date.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  date.setDate(date.getDate() + mondayOffset)
  return date
}

function getWeekLabel(weekStart: Date) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  return `${formatShortDate(weekStart)}-${formatShortDate(weekEnd)}`
}

function countUniqueProblems(marks: CheckmarkWithItem[]) {
  const problemKeys = new Set<string>()

  marks.forEach(mark => {
    problemKeys.add(getProblemNumber(mark) || mark.checkItemId)
  })

  return problemKeys.size
}

function buildDayReport(marks: CheckmarkWithItem[]) {
  const tryCount = countUniqueProblems(marks.filter(mark => mark.checkItem.itemType === 'try'))
  const compareMarks = marks.filter(mark => mark.checkItem.itemType === 'aops_way')
  const sameAsAoPS = countUniqueProblems(compareMarks.filter(mark => mark.parentNote === 'tie'))
  const learnedAoPS = countUniqueProblems(compareMarks.filter(mark => mark.parentNote === 'aops_smarter'))
  const betterThanAoPS = countUniqueProblems(compareMarks.filter(mark => mark.parentNote === 'me'))
  const alcumusMarks = marks.filter(mark => mark.checkItem.itemType === 'alcumus_green' || mark.checkItem.itemType === 'alcumus_blue')

  return {
    tryCount,
    sameAsAoPS,
    learnedAoPS,
    betterThanAoPS,
    alcumusMarks,
  }
}

function buildWeeklyComparison(marks: CheckmarkWithItem[]) {
  const weekMap = new Map<string, { weekStart: Date, completedCount: number, dayKeys: Set<string> }>()

  marks.forEach(mark => {
    const weekStart = getWeekStart(mark.checkedAt)
    const key = getDateKey(weekStart)

    if (!weekMap.has(key)) {
      weekMap.set(key, { weekStart, completedCount: 0, dayKeys: new Set<string>() })
    }

    const week = weekMap.get(key)
    if (!week) return
    week.completedCount += 1
    week.dayKeys.add(getDateKey(mark.checkedAt))
  })

  const currentWeekStart = getWeekStart(new Date())
  return Array.from({ length: 4 }, (_, index) => {
    const weekStart = new Date(currentWeekStart)
    weekStart.setDate(currentWeekStart.getDate() - (3 - index) * 7)
    const existing = weekMap.get(getDateKey(weekStart))

    return {
      weekStart,
      label: getWeekLabel(weekStart),
      completedCount: existing?.completedCount || 0,
      checkInDays: existing?.dayKeys.size || 0,
    }
  })
}

const iconButtonStyle = {
  width: '30px',
  height: '30px',
  borderRadius: UI.radius,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: UI.border,
  background: '#fff',
  color: '#6b7280',
} as const

const fieldStyle = {
  height: '36px',
  border: UI.softBorder,
  borderRadius: UI.radius,
  background: '#fff',
  color: '#374151',
  fontSize: '14px',
  fontWeight: 600,
} as const

function PrizeFields({ prize }: { prize?: Prize }) {
  return (
    <>
      <input
        name="title"
        defaultValue={prize?.title || ''}
        placeholder="奖品名称"
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
        可重复
      </label>
  </>
)
}

export default function ParentClient({ childrenList, recentMarks, prizes, activityLogs, reportMarks, prizeDraws, completionEstimate, problemTexts }: ParentClientProps) {
  const [isPending, startTransition] = useTransition()
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ParentTab>('今日')

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

  const handleRedeemPrize = (drawId: string) => {
    startTransition(() => {
      redeemPrizeDrawAction(drawId)
    })
  }

  return (
    <div style={{ paddingTop: '40px', fontSize: UI.textSize }}>
      <div className={styles.estimatePanel}>
        {childrenList.map(child => {
          const estimate = completionEstimate.find(progress => progress.childId === child.id)
          if (!estimate) return null

          return (
            <div key={child.id} className={styles.estimateCard}>
              <div className={styles.estimateHeader}>
                <h1 className={styles.reportTitle}>
                  {childrenList.length === 1 ? `${child.displayName}的学习报告` : `${child.displayName}的学习报告`}
                </h1>
                <div className={styles.estimateDate}>预计完成日期：{estimate.estimatedCompletionDate || '-'}</div>
              </div>
              <div className={styles.segmentProgressTrack}>
                {estimate.chapters.map(chapter => {
                  const isComplete = estimate.currentPosition >= chapter.end
                  const isCurrent = estimate.currentPosition >= chapter.start && estimate.currentPosition <= chapter.end
                  const fillPercent = isComplete
                    ? 100
                    : isCurrent && chapter.total > 0
                      ? Math.max(0, Math.min(100, ((estimate.currentPosition - chapter.start + 1) / chapter.total) * 100))
                      : 0

                  return (
                    <div key={chapter.chapterId} className={styles.segmentProgressPart}>
                      <div className={styles.segmentProgressFill} style={{ width: `${fillPercent}%` }} />
                      {isCurrent && <div className={styles.pinMarker} style={{ left: `${fillPercent}%` }} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: UI.border, overflowX: 'auto' }}>
        {PARENT_TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 12px',
              borderBottom: activeTab === tab ? `3px solid ${PALETTE.blue}` : '3px solid transparent',
              color: activeTab === tab ? PALETTE.blue : PALETTE.muted,
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
        const activeGroups = buildTodayGroups(activeMarks, problemTexts)
        const childPrizes = prizes.filter(prize => prize.childId === child.id)
        const childLogs = activityLogs.filter(log => log.childId === child.id)
        const childReportMarks = reportMarks.filter(mark => mark.childId === child.id)
        const childPrizeDraws = prizeDraws.filter(draw => draw.childId === child.id)
        const currentWeekDays = getCurrentWeekDays()
        const weeklyComparison = buildWeeklyComparison(childReportMarks)
        const maxCompleted = Math.max(1, ...weeklyComparison.map(week => week.completedCount))
        const maxCheckInDays = 7

        return (
          <div key={child.id} style={{ border: UI.softBorder, borderRadius: UI.radius, padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>{child.displayName} {activeMarks.length > 0 ? '😅' : '休息中'}</h2>
              <span style={{ color: '#9c9284', fontSize: '13px' }}>今日完成 {activeMarks.length} 项</span>
            </div>

            {activeTab === '今日' && (
              <>
                {activeMarks.length === 0 && undoneMarks.length === 0 && (
                  <p style={{ color: '#9c9284', fontSize: '13px', margin: 0 }}>今天还没有打卡。</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingActiveMarks.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff7ed', border: `1px solid ${PALETTE.orange}`, borderRadius: UI.radius, padding: '10px 12px' }}>
                      <div style={{ flex: 1, color: '#92400e', fontSize: '13px', fontWeight: 800 }}>
                        上方有 {pendingActiveMarks.length} 项待确认
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApproveAbove(child.id)}
                        disabled={isPending}
                        style={{ background: '#eefcf9', color: PALETTE.teal, padding: '7px 10px', borderRadius: UI.radius, fontSize: '12px', fontWeight: 800 }}
                      >
                        全部通过
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUndoAbove(child.id)}
                        disabled={isPending}
                        style={{ background: '#fff0f1', color: PALETTE.red, padding: '7px 10px', borderRadius: UI.radius, fontSize: '12px', fontWeight: 800 }}
                      >
                        全部退回
                      </button>
                    </div>
                  )}
                  {activeGroups.map(group => {
                    const tryMark = group.marks.find(mark => mark.checkItem.itemType === 'try')
                    const compareMark = group.marks.find(mark => mark.checkItem.itemType === 'aops_way')
                    const otherMarks = group.marks.filter(mark => mark.checkItem.itemType !== 'try' && mark.checkItem.itemType !== 'aops_way')
                    const compareStyle = compareMark?.parentNote ? WHO_WINS_STYLES[compareMark.parentNote] : null

                    return (
                      <div key={group.key} style={{ background: '#f9fafb', padding: '12px', borderRadius: UI.radius, border: UI.border }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {group.problemNumber ? `例题 ${group.problemNumber}` : group.sectionLabel}
                            </div>
                            {group.problemText ? (
                              <div style={{ fontWeight: 700, color: '#374151', marginTop: '5px', lineHeight: 1.45 }}>
                                {group.problemText}
                              </div>
                            ) : (
                              <div style={{ fontWeight: 600, color: '#374151', marginTop: '5px' }}>
                                {group.marks.map(mark => getCheckItemLabel(mark)).join(' · ')}
                              </div>
                            )}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '9px' }}>
                              {tryMark && (
                                <span style={{ background: '#dbeafe', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '999px', padding: '4px 8px', fontSize: '12px', fontWeight: 800 }}>
                                  先自己试
                                </span>
                              )}
                              {compareMark && (
                                <span style={{
                                  background: compareStyle?.background || '#f3f4f6',
                                  border: `1px solid ${compareStyle?.border || '#e5e7eb'}`,
                                  color: compareStyle?.color || '#6b7280',
                                  borderRadius: '999px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                }}>
                                  方法比较：{compareStyle?.label || '未选择'}
                                </span>
                              )}
                              {otherMarks.map(mark => (
                                <span key={mark.id} style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', borderRadius: '999px', padding: '4px 8px', fontSize: '12px', fontWeight: 800 }}>
                                  {getCheckItemLabel(mark)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                            {formatTime(group.marks[0].checkedAt)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', marginTop: '10px' }}>
                          {group.marks.map(mark => (
                            <div key={mark.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 700 }}>{getCheckItemLabel(mark)}</span>
                              <button
                                onClick={() => handleApprove(mark.id)}
                                disabled={isPending || mark.parentReviewStatus === 'ok'}
                                title={mark.parentReviewStatus === 'ok' ? '已通过' : '通过'}
                                style={{ width: '30px', height: '30px', borderRadius: UI.radius, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: mark.parentReviewStatus === 'ok' ? '#eefcf9' : '#eef7ff', color: mark.parentReviewStatus === 'ok' ? PALETTE.teal : PALETTE.blue, border: UI.border }}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                onClick={() => handleUndo(mark.id)}
                                disabled={isPending}
                                style={{ fontSize: '12px', background: '#fff0f1', color: PALETTE.red, padding: '6px 10px', borderRadius: UI.radius }}
                              >
                                退回
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {undoneMarks.map(mark => (
                    <div key={mark.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f3f4f6', padding: '12px', borderRadius: UI.radius, opacity: 0.6 }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'line-through' }}>
                          {mark.checkItem.section.number} {mark.checkItem.section.titleZh || mark.checkItem.section.titleEn}
                        </div>
                        <div style={{ fontWeight: 600, color: '#9ca3af', textDecoration: 'line-through' }}>✓ {getCheckItemLabel(mark)}</div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>已退回</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === '奖品池' && (
              <div>
                {childPrizes.length === 0 && (
                  <p style={{ color: '#9c9284', fontSize: '13px', margin: '0 0 14px' }}>还没有奖品。</p>
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
                              <div key={prize.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: prize.status === 'active' ? '#f8fffd' : '#f9fafb', border: UI.border, borderRadius: UI.radius, padding: '10px' }}>
                                {isEditing ? (
                                  <form
                                    action={async (formData) => {
                                      await updatePrizeAction(prize.id, formData)
                                      setEditingPrizeId(null)
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}
                                  >
                                    <PrizeFields prize={prize} />
                                    <button type="submit" title="保存" aria-label="保存奖品" style={{ ...iconButtonStyle, color: PALETTE.teal, background: '#eefcf9' }}>
                                      <Save size={16} />
                                    </button>
                                  </form>
                                ) : (
                                  <>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 700, color: '#374151' }}>{prize.title}</div>
                                      <div style={{ display: 'flex', gap: '8px', marginTop: '3px', color: '#6b7280', fontSize: '12px' }}>
                                      <span>{prize.isRepeatable ? '可重复' : '一次性'}</span>
                                      <span>{getPrizeStatusLabel(prize.status)}</span>
                                      </div>
                                    </div>
                                    <button type="button" title="编辑" aria-label="编辑奖品" onClick={() => setEditingPrizeId(prize.id)} style={{ ...iconButtonStyle, color: '#377ec0' }}>
                                      <Pencil size={16} />
                                    </button>
                                  </>
                                )}

                                <form action={togglePrize}>
                                  <button type="submit" title={prize.status === 'active' ? '暂停' : '启用'} aria-label={prize.status === 'active' ? '暂停奖品' : '启用奖品'} style={{ ...iconButtonStyle, color: prize.status === 'active' ? PALETTE.orange : PALETTE.teal, background: prize.status === 'active' ? '#fff7d7' : '#eefcf9' }}>
                                    {prize.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                                  </button>
                                </form>
                                <form action={deletePrize}>
                                  <button type="submit" title="删除" aria-label="删除奖品" style={{ ...iconButtonStyle, color: PALETTE.red, background: '#fff0f1' }}>
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

                <form action={createPrizeAction} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: UI.border }}>
                  <input type="hidden" name="childId" value={child.id} />
                  <PrizeFields />
                  <button
                    type="submit"
                    style={{ background: PALETTE.blue, color: '#fff', padding: '8px 12px', borderRadius: UI.radius, fontSize: '13px', fontWeight: 700 }}
                  >
                    添加奖品
                  </button>
                </form>
              </div>
            )}

            {activeTab === '周报告' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ color: '#374151', fontSize: '15px', fontWeight: 800, marginBottom: '8px' }}>本周进度</div>
                  <div className={styles.reportCard}>
                    <table className={styles.reportTable}>
                      <colgroup>
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                      </colgroup>
                      <thead>
                        <tr>
                          <th><span className={styles.headContent}><span className={`${styles.headDot} ${styles.dotBlue}`} />日期</span></th>
                          <th><span className={styles.headContent}><span className={`${styles.headDot} ${styles.dotBlue}`} />试做</span></th>
                          <th><span className={styles.headContent}><span className={`${styles.headDot} ${styles.dotYellow}`} />一致解法</span></th>
                          <th><span className={styles.headContent}><span className={`${styles.headDot} ${styles.dotTeal}`} />优化解法</span></th>
                          <th><span className={styles.headContent}><span className={`${styles.headDot} ${styles.dotOrange}`} />超越AoPS</span></th>
                          <th><span className={styles.headContent}><span className={`${styles.headDot} ${styles.dotRed}`} />Alcumus</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentWeekDays.map((day, index) => {
                          const dayMarks = childReportMarks.filter(mark => getDateKey(mark.checkedAt) === getDateKey(day))
                          const report = buildDayReport(dayMarks)
                          const dateClassName = [
                            styles.dateCell,
                            index === 5 ? styles.weekendSat : '',
                            index === 6 ? styles.weekendSun : '',
                          ].filter(Boolean).join(' ')

                          return (
                            <tr key={getDateKey(day)}>
                              <td className={dateClassName}>
                                <div className={styles.weekdayLabel}>{WEEKDAY_LABELS[index]}</div>
                                <div className={styles.dateLabel}>{formatShortDate(day)}</div>
                              </td>
                              <td className={`${styles.metricCell} ${report.tryCount ? styles.metricBlue : styles.metricEmpty}`}>{report.tryCount || '-'}</td>
                              <td className={`${styles.metricCell} ${report.sameAsAoPS ? styles.metricYellow : styles.metricEmpty}`}>{report.sameAsAoPS || '-'}</td>
                              <td className={`${styles.metricCell} ${report.learnedAoPS ? styles.metricTeal : styles.metricEmpty}`}>{report.learnedAoPS || '-'}</td>
                              <td className={`${styles.metricCell} ${report.betterThanAoPS ? styles.metricOrange : styles.metricEmpty}`}>{report.betterThanAoPS || '-'}</td>
                              <td className={styles.alcumusCell}>
                                {report.alcumusMarks.length === 0 ? (
                                  <span className={styles.metricEmpty}>-</span>
                                ) : (
                                  <div className={styles.pillGroup}>
                                    {report.alcumusMarks.map(mark => {
                                      const isBlue = mark.checkItem.itemType === 'alcumus_blue'
                                      const sectionNumber = mark.checkItem.section.number

                                      return (
                                        <span
                                          key={mark.id}
                                          title={`${sectionNumber} ${mark.checkItem.section.titleZh || mark.checkItem.section.titleEn}`}
                                          className={`${styles.alcumusPill} ${isBlue ? styles.pillBlue : styles.pillTeal}`}
                                        >
                                          {sectionNumber}
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div style={{ color: '#374151', fontSize: '15px', fontWeight: 800, marginBottom: '8px' }}>周对比</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(148px, 1fr))', gap: '10px' }}>
                    <div style={{ background: '#eef7ff', border: `1px solid ${PALETTE.blue}`, borderRadius: UI.radius, padding: '10px 12px' }}>
                      <div style={{ color: PALETTE.blue, fontSize: '12px', fontWeight: 800, marginBottom: '8px' }}>完成项目数</div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '7px', height: '72px' }}>
                        {weeklyComparison.map(week => (
                          <div key={getDateKey(week.weekStart)} title={`${week.label}：${week.completedCount} 项`} style={{ width: '10px', height: `${Math.max(5, (week.completedCount / maxCompleted) * 62)}px`, background: PALETTE.blue, borderRadius: '999px 999px 2px 2px' }} />
                        ))}
                      </div>
                    </div>

                    <div style={{ background: '#eefcf9', border: `1px solid ${PALETTE.teal}`, borderRadius: UI.radius, padding: '10px 12px' }}>
                      <div style={{ color: PALETTE.teal, fontSize: '12px', fontWeight: 800, marginBottom: '8px' }}>打卡天数</div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '7px', height: '72px' }}>
                        {weeklyComparison.map(week => (
                          <div key={getDateKey(week.weekStart)} title={`${week.label}：${week.checkInDays} 天`} style={{ width: '10px', height: `${Math.max(5, (week.checkInDays / maxCheckInDays) * 62)}px`, background: PALETTE.teal, borderRadius: '999px 999px 2px 2px' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ color: '#374151', fontSize: '15px', fontWeight: 800, marginBottom: '8px' }}>尚未兑现的奖品</div>
                  {childPrizeDraws.length === 0 ? (
                    <p style={{ color: '#9c9284', fontSize: '13px', margin: 0 }}>没有尚未兑现的奖品。</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {childPrizeDraws.map(draw => (
                        <label key={draw.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f9fafb', border: UI.border, borderRadius: UI.radius, padding: '10px 12px' }}>
                          <span style={{ position: 'relative', width: '18px', height: '18px', flexShrink: 0 }}>
                            <input
                              type="checkbox"
                              className={styles.checkboxInput}
                              disabled={isPending}
                              onChange={() => handleRedeemPrize(draw.id)}
                            />
                            <Check size={13} className={styles.checkboxIcon} />
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', color: '#374151', fontSize: '14px', fontWeight: 800 }}>{draw.prizeTitle || '神秘奖品'}</span>
                            <span style={{ display: 'block', color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
                              {PRIZE_TIERS.find(tier => tier.value === draw.tier)?.label || draw.tier} · 获得于 {formatDateTime(draw.approvedAt || draw.createdAt)}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {childLogs.length > 0 && (
                  <div>
                    <div style={{ color: '#374151', fontSize: '15px', fontWeight: 800, marginBottom: '8px' }}>家长记录</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {childLogs.slice(0, 3).map(log => (
                        <div key={log.id} style={{ background: '#f9fafb', borderRadius: UI.radius, border: UI.border, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#374151' }}>{getActivityLogLabel(log)}</div>
                          <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '3px' }}>
                            {getEventTypeLabel(log.eventType)} · {formatDateTime(log.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
