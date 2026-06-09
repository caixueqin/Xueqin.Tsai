'use client'

import { useTransition, useState, useRef, useEffect, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { enterNextMineAction } from './actions'
import styles from './child.module.css'
import Link from 'next/link'
import { Flag, Star, CheckCircle2, PenTool, BookOpen, Lock, ChevronDown, Trophy, RefreshCw } from 'lucide-react'

const SECTION_COLORS = ['#12baaa', '#377ec0', '#f7891f', '#f03f52']
const SMART_COMPARE_OPTIONS = [
  { value: 'me', label: 'Me', title: 'My method wins' },
  { value: 'aops_smarter', label: 'AoPS', title: 'AoPS method wins' },
  { value: 'tie', label: 'Tie', title: 'Both methods are equally good' },
]
const PRIZE_TIER_LABELS: Record<string, string> = {
  special: 'Special Prize',
  first: 'First Prize',
  second: 'Second Prize',
  third: 'Third Prize',
}

function getPointValue(itemType: string) {
  if (itemType === 'alcumus_blue') return 90
  if (itemType === 'alcumus_green') return 50
  if (itemType === 'review_q' || itemType === 'challenge') return 20
  if (itemType === 'try' || itemType === 'aops_way') return 5
  return 5
}

type SyncState = 'syncing' | 'synced'
type LocalMark = {
  id: string
  checkItemId: string
  childId: string
  status?: string
  checkedAt?: string | Date
  parentNote?: string | null
  parentReviewStatus?: string
  optimistic?: boolean
}
type PendingOperation = {
  action: 'create' | 'undo'
  itemId: string
  parentNote?: string
  tempMark?: LocalMark
  removedMarks?: LocalMark[]
  exclusiveItemIds?: string[]
  pointDelta?: number
}

export default function RoadmapClient({ 
  child, 
  chapter, 
  allMarks,
  hasMarkedToday,
  initialPoints
}: { 
  child: any, 
  chapter: any, 
  allMarks: any[],
  hasMarkedToday: boolean,
  initialPoints: number
}) {
  const [isPending, startTransition] = useTransition()
  const [marks, setMarks] = useState<LocalMark[]>(allMarks)
  const [points, setPoints] = useState(initialPoints)
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({})
  const [alcumusSliderValues, setAlcumusSliderValues] = useState<Record<string, number>>({})
  const [recentDraws, setRecentDraws] = useState<any[]>([])
  const [drawRevealed, setDrawRevealed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const defaultExpanded = useRef<Record<string, boolean> | null>(null)
  const prevActiveIndex = useRef<number | null>(null)

  const itemPointValue = (itemId: string) => {
    for (const section of chapter.sections) {
      const item = section.checkItems.find((candidate: any) => candidate.id === itemId)
      if (item) return getPointValue(item.itemType)
    }
    return 0
  }

  const syncCheckmark = async (operation: PendingOperation) => {
    setSyncStates(prev => ({ ...prev, [operation.itemId]: 'syncing' }))

    try {
      const response = await fetch('/api/checkmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkItemId: operation.itemId,
          action: operation.action,
          parentNote: operation.parentNote,
        }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Sync failed')
      }

      if (operation.action === 'create' && result.checkmark) {
        setMarks(prev =>
          prev.map(mark =>
            mark.id === operation.tempMark?.id
              ? { ...result.checkmark, optimistic: false }
              : mark
          )
        )
      }
      if (operation.action === 'undo') {
        setMarks(prev => prev.filter(mark => mark.checkItemId !== operation.itemId))
      }

      if (Array.isArray(result.draws) && result.draws.length > 0) {
        setPoints(prev => prev - result.draws.length * 100)
        setDrawRevealed(false)
        setRecentDraws(result.draws)
      }
      if (Array.isArray(result.revokedDraws) && result.revokedDraws.length > 0) {
        setPoints(prev => prev + result.revokedDraws.length * 100)
      }

      setSyncStates(prev => {
        const next = { ...prev }
        if (operation.action === 'create') {
          next[operation.itemId] = 'synced'
        } else {
          delete next[operation.itemId]
        }
        return next
      })
    } catch {
      if (operation.action === 'create') {
        setPoints(prev => prev - (operation.pointDelta || 0))
        setMarks(prev => [
          ...(operation.removedMarks || []),
          ...prev.filter(mark => mark.id !== operation.tempMark?.id)
        ])
      } else {
        setPoints(prev => prev + Math.abs(operation.pointDelta || 0))
        setMarks(prev => [...(operation.removedMarks || []), ...prev])
      }
      setSyncStates(prev => {
        const next = { ...prev }
        delete next[operation.itemId]
        return next
      })
    }
  }

  const handleUndoItem = (item: any) => {
    const removedMarks = marks.filter(mark => mark.checkItemId === item.id)
    if (removedMarks.length === 0) return

    const pointDelta = -removedMarks.reduce((sum, mark) => sum + itemPointValue(mark.checkItemId), 0)
    setPoints(prev => prev + pointDelta)
    setMarks(prev => prev.filter(mark => mark.checkItemId !== item.id))
    syncCheckmark({ action: 'undo', itemId: item.id, removedMarks, pointDelta })
  }

  const handleToggle = (item: any, isChecked: boolean) => {
    if (!item.isRepeatable && isChecked) {
      handleUndoItem(item)
      return
    }

    const tempMark: LocalMark = {
      id: `optimistic-${item.id}-${Date.now()}`,
      childId: child.id,
      checkItemId: item.id,
      status: 'active',
      checkedAt: new Date().toISOString(),
      optimistic: true,
    }

    const exclusiveItemIds = item.exclusiveItemIds || []
    const removedMarks = item.isRepeatable
      ? marks.filter(mark => exclusiveItemIds.includes(mark.checkItemId))
      : marks.filter(mark => mark.checkItemId === item.id || exclusiveItemIds.includes(mark.checkItemId))
    const removedPoints = removedMarks.reduce((sum, mark) => sum + itemPointValue(mark.checkItemId), 0)
    const pointDelta = getPointValue(item.itemType) - removedPoints

    setPoints(prev => prev + pointDelta)
    setMarks(prev => item.isRepeatable
      ? [...prev.filter(mark => !exclusiveItemIds.includes(mark.checkItemId)), tempMark]
      : [...prev.filter(mark => mark.checkItemId !== item.id && !exclusiveItemIds.includes(mark.checkItemId)), tempMark]
    )
    syncCheckmark({ action: 'create', itemId: item.id, tempMark, removedMarks, exclusiveItemIds, pointDelta })
  }

  const handleSmartCompare = (item: any, choice: string) => {
    const existingMarks = marks.filter(mark => mark.checkItemId === item.id)
    if (existingMarks.some(mark => mark.parentNote === choice)) return
    const pointDelta = existingMarks.length > 0 ? 0 : getPointValue(item.itemType)

    const tempMark: LocalMark = {
      id: `optimistic-${item.id}-${Date.now()}`,
      childId: child.id,
      checkItemId: item.id,
      status: 'active',
      checkedAt: new Date().toISOString(),
      parentNote: choice,
      optimistic: true,
    }

    setPoints(prev => prev + pointDelta)
    setMarks(prev => [...prev.filter(mark => mark.checkItemId !== item.id), tempMark])
    syncCheckmark({
      action: 'create',
      itemId: item.id,
      parentNote: choice,
      tempMark,
      removedMarks: existingMarks,
      pointDelta,
    })
  }

  const handleNextMine = () => {
    startTransition(() => {
      enterNextMineAction(chapter.id)
    })
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const sectionData = useMemo(() => chapter.sections.map((section: any, idx: number) => {
    const checkItems = section.checkItems || []
    
    const alcumusGreen = checkItems.find((i: any) => i.itemType === 'alcumus_green')
    const alcumusBlue = checkItems.find((i: any) => i.itemType === 'alcumus_blue')
    
    const hasGreen = alcumusGreen ? marks.some(m => m.checkItemId === alcumusGreen.id) : false
    const hasBlue = alcumusBlue ? marks.some(m => m.checkItemId === alcumusBlue.id) : false

    let isUnlocked = true
    if (idx > 0) {
      const prevSection = chapter.sections[idx - 1]
      const prevAlcumusGreen = prevSection.checkItems.find((i: any) => i.itemType === 'alcumus_green')
      const prevAlcumusBlue = prevSection.checkItems.find((i: any) => i.itemType === 'alcumus_blue')
      
      if (prevAlcumusGreen || prevAlcumusBlue) {
        const prevHasGreen = prevAlcumusGreen ? marks.some(m => m.checkItemId === prevAlcumusGreen.id) : false
        const prevHasBlue = prevAlcumusBlue ? marks.some(m => m.checkItemId === prevAlcumusBlue.id) : false
        isUnlocked = prevHasGreen || prevHasBlue
      } else {
        if (prevSection.checkItems.length > 0) {
           const lastItem = prevSection.checkItems[prevSection.checkItems.length - 1]
           isUnlocked = marks.some(m => m.checkItemId === lastItem.id)
        }
      }
    }

    // Preserve order of groups
    const groupsMap = new Map<string, any[]>()
    checkItems.forEach((item: any) => {
      const g = item.itemGroup || 'Other'
      if (!groupsMap.has(g)) groupsMap.set(g, [])
      groupsMap.get(g)!.push(item)
    })
    
    // Convert to array of { name, items }
    const groups = Array.from(groupsMap.entries()).map(([name, items]) => ({ name, items }))

    return {
      ...section,
      isUnlocked,
      hasGreen,
      hasBlue,
      groups
    }
  }), [chapter.sections, marks])

  // Find the first locked section to apply pulse animation
  const firstLockedIndex = sectionData.findIndex((s: any) => !s.isUnlocked)
  const activeSectionIndex = firstLockedIndex === -1 ? sectionData.length - 1 : firstLockedIndex - 1

  // Set default expanded states on first render ONLY
  if (!defaultExpanded.current) {
    defaultExpanded.current = {}
    sectionData.forEach((s: any, idx: number) => {
      defaultExpanded.current![s.id] = (idx === activeSectionIndex)
    })
  }

  // Watch for new unlocks to auto-open them (without closing previously open ones)
  useEffect(() => {
    if (prevActiveIndex.current !== null && prevActiveIndex.current !== activeSectionIndex) {
      if (sectionData[activeSectionIndex]) {
        setExpandedSections(prev => ({
          ...prev,
          [sectionData[activeSectionIndex].id]: true
        }))
      }
    }
    prevActiveIndex.current = activeSectionIndex
  }, [activeSectionIndex, sectionData])

  useEffect(() => {
    if (recentDraws.length === 0) return
    const timer = window.setTimeout(() => setDrawRevealed(true), 3000)
    return () => window.clearTimeout(timer)
  }, [recentDraws])

  const hasClearedFinalGate = sectionData.some((s: any) => s.sectionType === 'final_gate' && marks.some((m: any) => s.checkItems.some((i: any) => i.id === m.checkItemId)))
  const visiblePoints = Math.max(0, points)
  const energyPoints = visiblePoints % 100
  const energyPercent = Math.min(100, energyPoints)
  const pointsToNextDraw = energyPoints === 0 && visiblePoints > 0 ? 0 : 100 - energyPoints

  return (
    <>
      <div style={{ 
        position: 'fixed', 
        top: 'var(--child-status-offset)', 
        left: 0,
        right: 0,
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        zIndex: 150, 
        backgroundColor: 'var(--surface-color)', 
        padding: '8px 12px 10px', 
        borderBottom: '1px solid var(--border-color)', 
      }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>
            <span>{visiblePoints} pts</span>
            <span>{pointsToNextDraw} to treasure</span>
          </div>
          <div style={{ height: '10px', borderRadius: '999px', background: 'rgba(255,255,255,0.72)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${energyPercent}%`, borderRadius: '999px', background: 'linear-gradient(90deg, var(--gem-green), var(--gem-blue), var(--gem-pink))', transition: 'width 0.2s ease' }} />
          </div>
        </div>
      </div>

      <h1 style={{ fontFamily: 'var(--font-coiny)', fontSize: '24px', fontWeight: 400, color: 'var(--text-main)', margin: '0 0 24px', letterSpacing: '-1px' }}>
        {chapter.number}. {chapter.titleEn}
      </h1>

      <div style={{ position: 'relative', marginTop: '16px' }}>
        
        {/* The Left-Aligned Timeline Axis */}
        <div style={{ position: 'absolute', left: '44px', transform: 'translateX(-50%)', top: '24px', bottom: (() => {
          const lastSection = sectionData[sectionData.length - 1];
          if (!lastSection) return '0';
          const isLastExpanded = expandedSections[lastSection.id] !== undefined 
            ? expandedSections[lastSection.id] 
            : (defaultExpanded.current ? defaultExpanded.current[lastSection.id] : false);
          return isLastExpanded ? '20px' : '32px';
        })(), width: '12px', backgroundColor: 'var(--gem-purple)', borderRadius: '6px', zIndex: 0 }}></div>

        {sectionData.map((section: any, idx: number) => {
          const isActive = idx === activeSectionIndex
          const isCompleted = section.hasBlue || section.hasGreen || section.groups.every((g: any) => g.items.every((i: any) => marks.some((m: any) => m.checkItemId === i.id)))
          const isPerfectClear = section.checkItems.length > 0 && section.checkItems.every((i: any) => marks.some((m: any) => m.checkItemId === i.id))
          const isLocked = !section.isUnlocked
          
          const themeColor = SECTION_COLORS[idx % SECTION_COLORS.length]

          // Determine if section is expanded
          const isExpanded = expandedSections[section.id] !== undefined 
            ? expandedSections[section.id] 
            : (defaultExpanded.current ? defaultExpanded.current[section.id] : false)

          const isLastSection = idx === sectionData.length - 1

          return (
            <div key={section.id} className="animate-slide-up" style={{ animationDelay: `${idx * 0.1}s`, position: 'relative', marginBottom: isLastSection ? '0' : '32px', display: 'flex', flexDirection: 'column' }}>
              
              {/* Section Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative', minHeight: '64px' }}>
                
                {/* Big Circle Node on Axis */}
                <div 
                  className={isActive ? 'animate-pulse' : ''}
                  style={{ 
                    position: 'absolute',
                    left: '44px',
                    transform: 'translateX(-50%)',
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? themeColor : (isLocked ? 'var(--gem-gray)' : 'var(--surface-color)'), 
                    zIndex: 2, 
                    border: `4px solid ${isCompleted ? themeColor : (isLocked ? 'var(--border-color)' : 'var(--gem-purple)')}`,
                    boxShadow: isCompleted ? 'inset 0 0 0 4px rgba(255,255,255,0.3), var(--shadow-md)' : (isLocked ? 'none' : 'inset 0 0 0 4px rgba(64,63,76,0.1), var(--shadow-sm)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isCompleted ? '#fff' : (isLocked ? '#9ca3af' : 'var(--gem-purple)'),
                    fontSize: '28px',
                    fontFamily: 'var(--font-coiny)',
                    fontWeight: 400,
                    letterSpacing: '-1px'
                  }}
                >
                  {isLocked ? <Lock size={20} /> : (section.number === 'Review' ? '★' : section.number.split('.').pop())}
                  
                  {isPerfectClear && (
                    <div style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: 'var(--gem-yellow)', borderRadius: '50%', padding: '6px', border: '2px solid var(--surface-color)', boxShadow: 'var(--shadow-sm)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trophy fill="white" color="white" size={14} />
                    </div>
                  )}
                </div>

                {/* Section Title & Toggle */}
                <div 
                  onClick={() => { if (!isLocked) toggleSection(section.id) }}
                  className={!isLocked ? styles.sectionTitleRow : ""}
                  style={{ 
                    marginLeft: '96px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    zIndex: 2,
                    minHeight: '64px'
                  }}
                >
                  <h2 style={{ fontFamily: 'var(--font-coiny)', margin: 0, fontSize: '24px', fontWeight: 400, color: isLocked ? '#9ca3af' : 'var(--text-main)', lineHeight: '1.2', letterSpacing: '-1px' }}>
                    {section.titleEn}
                  </h2>
                  
                  {!isLocked && (
                    <div style={{ marginLeft: '8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <ChevronDown size={24} />
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Timeline Items */}
              {isExpanded && (
                <div style={{ width: '100%', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {section.groups.map((group: any, idx: number) => {
                    const items = group.items
                    const groupName = group.name
                    const alcumusGreen = items.find((i: any) => i.itemType === 'alcumus_green')
                    const alcumusBlue = items.find((i: any) => i.itemType === 'alcumus_blue')
                    const hasAlcumusSlider = Boolean(alcumusGreen && alcumusBlue)
                    const regularItems = hasAlcumusSlider
                      ? items.filter((i: any) => i.itemType !== 'alcumus_green' && i.itemType !== 'alcumus_blue')
                      : items
                    const allItemsChecked = hasAlcumusSlider
                      ? regularItems.every((i: any) => marks.some(m => m.checkItemId === i.id)) &&
                        [alcumusGreen, alcumusBlue].some((i: any) => marks.some(m => m.checkItemId === i.id))
                      : items.every((i: any) => marks.some(m => m.checkItemId === i.id))
                    const displayGroupName = groupName.replace('Problem ', '')

                    const renderAlcumusSlider = () => {
                      if (!alcumusGreen || !alcumusBlue) return null

                      const greenItem = { ...alcumusGreen, exclusiveItemIds: [alcumusBlue.id] }
                      const blueItem = { ...alcumusBlue, exclusiveItemIds: [alcumusGreen.id] }
                      const hasGreen = marks.some(m => m.checkItemId === alcumusGreen.id)
                      const hasBlue = marks.some(m => m.checkItemId === alcumusBlue.id)
                      const selectedAlcumusMark = marks.find(m => m.checkItemId === (hasBlue ? alcumusBlue.id : alcumusGreen.id))
                      const selectedValue = hasBlue ? 2 : hasGreen ? 1 : 0
                      const sliderKey = `${section.id}:${groupName}:alcumus`
                      const sliderValue = alcumusSliderValues[sliderKey] ?? selectedValue
                      const syncingItemId = syncStates[alcumusGreen.id] === 'syncing'
                        ? alcumusGreen.id
                        : syncStates[alcumusBlue.id] === 'syncing'
                          ? alcumusBlue.id
                          : null
                      const isSynced = syncStates[alcumusGreen.id] === 'synced' || syncStates[alcumusBlue.id] === 'synced'
                      const sliderColor = sliderValue === 2
                        ? 'var(--gem-blue)'
                        : sliderValue === 1
                          ? 'var(--gem-green)'
                          : 'var(--border-color)'
                      const disabled = !section.isUnlocked || Boolean(syncingItemId) || selectedAlcumusMark?.parentReviewStatus === 'ok'

                      const clearDraftValue = () => {
                        setAlcumusSliderValues(prev => {
                          const next = { ...prev }
                          delete next[sliderKey]
                          return next
                        })
                      }

                      const commitAlcumusValue = (value: number) => {
                        clearDraftValue()
                        if (value === selectedValue) return

                        if (value === 0) {
                          handleUndoItem(hasBlue ? blueItem : greenItem)
                          return
                        }

                        handleToggle(value === 2 ? blueItem : greenItem, false)
                      }

                      return (
                        <div
                          key="alcumus-slider"
                          className={styles.alcumusSlider}
                          style={{ '--alcumus-color': sliderColor } as CSSProperties}
                        >
                          <div className={styles.alcumusTrackWrap}>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="1"
                              value={sliderValue}
                              disabled={disabled}
                              aria-label="Alcumus result"
                              onChange={(event) => {
                                const value = Number(event.currentTarget.value)
                                setAlcumusSliderValues(prev => ({ ...prev, [sliderKey]: value }))
                              }}
                              onPointerUp={(event) => commitAlcumusValue(Number(event.currentTarget.value))}
                            />
                            {syncingItemId && (
                              <span className={`${styles.syncBadge} ${styles.syncing}`}>
                                <RefreshCw size={8} className={styles.syncSpin} />
                              </span>
                            )}
                            {isSynced && !syncingItemId && (
                              <span className={`${styles.syncBadge} ${styles.synced}`} />
                            )}
                          </div>
                        </div>
                      )
                    }

                    // Helper to render an item button
                    const renderItemButton = (item: any) => {
                      const exclusiveItemIds = item.itemType === 'alcumus_green' || item.itemType === 'alcumus_blue'
                        ? items
                            .filter((candidate: any) =>
                              candidate.id !== item.id &&
                              (candidate.itemType === 'alcumus_green' || candidate.itemType === 'alcumus_blue')
                            )
                            .map((candidate: any) => candidate.id)
                        : []
                      item = { ...item, exclusiveItemIds }
                      const itemMarks = marks.filter(m => m.checkItemId === item.id)
                      const activeMark = itemMarks[0]
                      const isChecked = itemMarks.length > 0
                      const syncState = syncStates[item.id]
                      const selectedCompare = activeMark?.parentNote || null
                      const isApproved = activeMark?.parentReviewStatus === 'ok'

                      if (item.itemType === 'aops_way') {
                        return (
                          <div key={item.id} className={styles.smartCompare}>
                            <span className={styles.smartCompareLabel}>Who wins</span>
                            <div className={styles.smartCompareOptions}>
                              {SMART_COMPARE_OPTIONS.map(option => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleSmartCompare(item, option.value)}
                                  disabled={!section.isUnlocked || syncState === 'syncing' || isApproved}
                                  title={option.title}
                                  className={selectedCompare === option.value ? styles.smartCompareSelected : ''}
                                >
                                  {option.label}
                                  {selectedCompare === option.value && syncState === 'syncing' && (
                                    <span className={`${styles.syncBadge} ${styles.syncing}`}>
                                      <RefreshCw size={8} className={styles.syncSpin} />
                                    </span>
                                  )}
                                  {selectedCompare === option.value && syncState === 'synced' && (
                                    <span className={`${styles.syncBadge} ${styles.synced}`} />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      }

                      let bgColor = 'var(--surface-color)'
                      let color = 'var(--text-muted)'
                      
                      if (isChecked) {
                        if (item.itemType === 'try') bgColor = 'var(--gem-blue)'
                        else if (item.itemType === 'alcumus_green') bgColor = 'var(--gem-green)'
                        else if (item.itemType === 'alcumus_blue') bgColor = 'var(--gem-blue)'
                        else if (item.itemType === 'challenge') bgColor = 'var(--gem-pink)'
                        else if (item.itemType === 'review_q') bgColor = 'var(--gem-orange)'
                        else bgColor = themeColor
                        color = '#fff'
                      }

                      let Icon = null
                      if (isChecked) {
                        Icon = <CheckCircle2 size={18} />
                      } else {
                        if (item.itemType === 'try') Icon = <PenTool size={16} />
                        if (item.itemType === 'aops_way') Icon = <BookOpen size={16} />
                        if (item.itemType === 'alcumus_green') Icon = <Flag size={16} />
                        if (item.itemType === 'alcumus_blue') Icon = <Star size={16} />
                        if (item.itemType === 'review_q' || item.itemType === 'challenge' || item.itemType === 'read') Icon = <CheckCircle2 size={16} />
                      }

                      return (
                        <div key={item.id} className={styles.checkmarkControl}>
                          <button 
                            onClick={() => handleToggle(item, isChecked)}
                            disabled={!section.isUnlocked || syncState === 'syncing' || isApproved}
                            title={item.labelEn}
                            className={(section.isUnlocked && syncState !== 'syncing') ? "hover-bounce" : ""}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: bgColor,
                              color: color,
                              border: isChecked ? 'none' : '2px solid var(--border-color)',
                              boxShadow: isChecked ? 'var(--shadow-sm)' : 'none',
                              transform: 'none',
                              cursor: (!section.isUnlocked || syncState === 'syncing' || isApproved) ? 'not-allowed' : 'pointer',
                              outline: 'none',
                              flexShrink: 0,
                              transition: 'all 0.2s',
                              position: 'relative'
                            }}
                          >
                            {Icon}
                            {syncState === 'syncing' && (
                              <span className={`${styles.syncBadge} ${styles.syncing}`}>
                                <RefreshCw size={8} className={styles.syncSpin} />
                              </span>
                            )}
                            {syncState === 'synced' && (
                              <span className={`${styles.syncBadge} ${styles.synced}`} />
                            )}
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div key={groupName} className="animate-pop" style={{
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        padding: '4px 0'
                      }}>
                        
                        {/* Small Dot on Axis */}
                        <div style={{
                          position: 'absolute',
                          left: '44px',
                          transform: 'translateX(-50%)',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: allItemsChecked ? themeColor : 'var(--surface-color)',
                          border: `4px solid ${allItemsChecked ? themeColor : 'var(--gem-purple)'}`,
                          zIndex: 2
                        }} />

                        {/* List Row Content */}
                        <div style={{
                          marginLeft: '96px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          gap: '12px',
                          width: '100%',
                          paddingBottom: '8px',
                          borderBottom: idx === section.groups.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)'
                        }}>

                          {/* Text Segment */}
                          <div style={{
                            fontWeight: 600,
                            fontSize: '16px',
                            color: allItemsChecked ? themeColor : 'var(--text-main)',
                            transition: 'all 0.3s'
                          }}>
                            {displayGroupName}
                          </div>

                          {/* Buttons Segment */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {hasAlcumusSlider && renderAlcumusSlider()}
                            {regularItems.map((item: any) => renderItemButton(item))}
                          </div>
                        </div>
                        
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasClearedFinalGate && (
        <button 
          onClick={handleNextMine}
          disabled={isPending}
          className={styles.saveBtn}
          style={{ marginTop: '40px', backgroundColor: 'var(--gem-blue)', color: '#fff', display: 'block', textAlign: 'center', border: 'none', cursor: 'pointer', width: '100%', fontSize: '20px', fontFamily: 'var(--font-coiny)', padding: '16px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', letterSpacing: '-1px' }}
        >
          Enter Next Treasure Mine 💎
        </button>
      )}

      {recentDraws.length > 0 && (
        <div className={styles.drawModalBackdrop}>
          <div className={styles.drawModal}>
            {!drawRevealed ? (
              <>
                <h2>Mining...</h2>
                <div className={styles.drawRevealAnimation}>
                  <div className={styles.drawPickaxe}>⛏</div>
                  <div className={styles.drawChest}>?</div>
                </div>
                <p className={styles.drawRevealHint}>Something is inside...</p>
              </>
            ) : (
              <>
                <h2>Treasure Found!</h2>
                {recentDraws.map(draw => (
                  <div key={draw.id} className={styles.drawModalPrize}>
                    <span>{PRIZE_TIER_LABELS[draw.tier] || draw.tier}</span>
                    <strong>{draw.prize?.title || draw.prizeTitle || 'Mystery Prize'}</strong>
                  </div>
                ))}
                <button type="button" onClick={() => {
                  setRecentDraws([])
                  setDrawRevealed(false)
                }}>
                  Nice
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
