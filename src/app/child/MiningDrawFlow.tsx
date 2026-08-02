'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { RotateCcw, X } from 'lucide-react'
import type { MineralCard, MineralFamily } from '@/data/minerals'
import { MINERAL_DETAILS } from '@/data/mineralDetails'
import styles from './child.module.css'

export type MiningDrawResult = {
  card: MineralCard
  prize: {
    id: string | null
    title: string | null
    tier: string
    drawId: string
  }
  isNew: boolean
  ownedCount: number
  pointBalance: number
  availableDraws: number
}

type RockChoice = {
  choiceToken: string
}

const ROCKS = [
  {
    key: 'small',
    rock: '/image/draw-assets/small_rock.png',
    broken: '/image/draw-assets/small_break.png',
    className: styles.rock0,
  },
  {
    key: 'midium',
    rock: '/image/draw-assets/midium_rock.png',
    broken: '/image/draw-assets/medium_break.png',
    className: styles.rock1,
  },
  {
    key: 'big',
    rock: '/image/draw-assets/big_rock.png',
    broken: '/image/draw-assets/big_break.png',
    className: styles.rock2,
  },
]

const PRIZE_TIER_LABEL: Record<string, string> = {
  special: '特等奖',
  first: '一等奖',
  second: '二等奖',
  third: '三等奖',
}

const FAMILY_FRAME: Record<MineralFamily, string> = {
  gemstone: '/image/frames/gemstone.png',
  metal: '/image/frames/metal.png',
  industry: '/image/frames/industry.png',
  geology: '/image/frames/geology.png',
  joker: '/image/frames/joker.png',
}

const FAMILY_CLASS: Record<MineralFamily, string> = {
  gemstone: styles.familyGemstone,
  metal: styles.familyMetal,
  industry: styles.familyIndustry,
  geology: styles.familyGeology,
  joker: styles.familyJoker,
}

const RARITY_LABEL = {
  legendary: '传说',
  rare: '超稀有',
  uncommon: '稀有',
  common: '常见',
} as const

function MineralChineseName({
  name,
  pinyin,
}: {
  name: string
  pinyin: string
}) {
  const characters = Array.from(name)
  const syllables = pinyin.trim().split(/\s+/)

  return (
    <>
      {characters.map((character, index) => (
        <ruby key={`${character}-${index}`}>
          {character}
          <rt>{syllables[index] || ''}</rt>
        </ruby>
      ))}
    </>
  )
}

export function MineralCardArt({
  card,
  locked = false,
  size = 210,
}: {
  card?: MineralCard
  locked?: boolean
  size?: number
}) {
  if (locked || !card) {
    return (
      <div className={styles.mineralCardArt} style={{ width: size, height: size }}>
        <div className={styles.mineralCardLockedPlate} />
        <Image
          src="/image/cards/lock.png"
          alt=""
          fill
          sizes={`${size}px`}
          className={styles.mineralCardLockImage}
        />
      </div>
    )
  }

  return (
    <div className={styles.mineralCardArt} style={{ width: size, height: size }}>
      <Image
        src={FAMILY_FRAME[card.family]}
        alt=""
        fill
        sizes={`${size}px`}
        className={styles.mineralCardFrame}
      />
      <Image
        src={card.imageKey}
        alt={card.enName}
        fill
        sizes={`${size}px`}
        className={styles.mineralCardSpecimen}
      />
      <div className={styles.mineralCardInnerLabel}>
        <strong>{card.zhName}</strong>
        <span>{card.enName}</span>
      </div>
    </div>
  )
}

export function FlippableMineralCard({
  card,
  size = 150,
  badge,
  flipped: controlledFlipped,
  onFlippedChange,
}: {
  card: MineralCard
  size?: number
  badge?: string
  flipped?: boolean
  onFlippedChange?: (flipped: boolean) => void
}) {
  const [internalFlipped, setInternalFlipped] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const details = MINERAL_DETAILS[card.id]
  const flipped = controlledFlipped ?? internalFlipped

  const toggleFlipped = () => {
    const nextFlipped = !flipped
    if (controlledFlipped === undefined) {
      setInternalFlipped(nextFlipped)
    }
    onFlippedChange?.(nextFlipped)
  }

  return (
    <>
      <div
        className={`${styles.mineralCardFlipButton} ${FAMILY_CLASS[card.family]}`}
        role="button"
        tabIndex={0}
        aria-label={`${card.zhName}资料卡，点击${flipped ? '返回正面' : '查看背面'}`}
        aria-pressed={flipped}
        onClick={toggleFlipped}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            toggleFlipped()
          }
        }}
      >
        <div className={`${styles.mineralCardFlipInner} ${flipped ? styles.mineralCardFlipped : ''}`}>
          <div className={`${styles.mineralCardFace} ${styles.mineralCardFront}`}>
            <MineralCardArt card={card} size={size} />
            {badge && <span className={styles.mineralResultStatus}>{badge}</span>}
            <span className={styles.mineralFlipHint}>
              <RotateCcw size={12} />
            </span>
          </div>

          <div className={`${styles.mineralCardFace} ${styles.mineralCardBack}`}>
            <div className={styles.mineralBackHeader}>
              <div>
                <strong>{card.zhName}</strong>
                <small>{card.pinyin}</small>
                <small>{card.enName}</small>
                <small>{card.ipa}</small>
              </div>
              <RotateCcw size={14} />
            </div>

            <div className={styles.mineralBackPills}>
              <b>价值 {card.value}</b>
              <b>{RARITY_LABEL[card.rarity]}</b>
            </div>
            <div className={`${styles.mineralBackPills} ${styles.mineralElementPills}`}>
              {card.elementTags.map(tag => <b key={tag}>{tag}</b>)}
            </div>

            <div className={styles.mineralBackFact}>{card.funFact}</div>
            {card.safety && <div className={styles.mineralBackSafety}>⚠ {card.safety}</div>}
            <button
              type="button"
              className={styles.mineralMoreButton}
              onClick={event => {
                event.stopPropagation()
                setShowDetails(true)
              }}
            >
              More
            </button>
          </div>
        </div>
      </div>

      {showDetails && (
        <div
          className={styles.mineralDetailBackdrop}
          role="presentation"
          onClick={() => setShowDetails(false)}
        >
          <section
            className={`${styles.mineralDetailModal} ${FAMILY_CLASS[card.family]}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`mineral-detail-${card.id}`}
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.mineralDetailClose}
              aria-label="关闭详细资料"
              onClick={() => setShowDetails(false)}
            >
              <X size={20} />
            </button>
            <div className={styles.mineralDetailHeading}>
              <span className={styles.mineralDetailFileLabel}>
                {card.id} · SECRET FILE
              </span>
              <div className={styles.mineralDetailTitleLayout}>
                <div className={styles.mineralDetailNames}>
                  <div className={styles.mineralDetailNameGroup}>
                    <h2 id={`mineral-detail-${card.id}`}>
                      <MineralChineseName name={card.zhName} pinyin={card.pinyin} />
                    </h2>
                    <div className={styles.mineralDetailEnglishLine}>
                      <strong>{card.enName}</strong>
                      <span>{card.ipa}</span>
                    </div>
                  </div>
                </div>
                {details?.mission && <p className={styles.mineralDetailMission}>{details.mission}</p>}
              </div>
            </div>
            {details?.facts?.length ? (
              <div
                className={`${styles.mineralProfileIntro} ${
                  details.photo ? '' : styles.mineralProfileIntroNoPhoto
                }`}
              >
                {details.photo && (
                  <figure
                    className={styles.mineralProfilePhoto}
                    data-tooltip={`ID PHOTO · ${details.photo.credit}`}
                  >
                    <a
                      href={details.photo.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`查看照片来源：${details.photo.credit}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={details.photo.src} alt={details.photo.alt} />
                    </a>
                  </figure>
                )}
                <div className={styles.mineralProfileIdentity}>
                  {details.codename && <div><span>CODENAME</span><strong>{details.codename}</strong></div>}
                  <table>
                    <tbody>
                      {details.facts?.map(fact => (
                        <tr key={fact.label}>
                          <th>
                            {fact.label}
                            {fact.help && (
                              <span
                                className={styles.mineralTermHelp}
                                data-tooltip={fact.help}
                                tabIndex={0}
                                aria-label={`${fact.label}解释：${fact.help}`}
                              >
                                ?
                              </span>
                            )}
                          </th>
                          <td>{fact.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {details?.sections?.length ? (
              <div className={styles.mineralProfileSections}>
                {details.sections.map(section => (
                  <section key={section.heading}>
                    <h3>{section.heading}</h3>
                    {section.content && (
                      section.content.trimStart().startsWith('• ') ? (
                        <ul className={styles.mineralBulletList}>
                          {section.content
                            .split(/\n\s*\n/)
                            .map(item => item.replace(/^•\s*/, '').trim())
                            .filter(Boolean)
                            .map(item => <li key={item}>{item}</li>)}
                        </ul>
                      ) : (
                        <p>{section.content}</p>
                      )
                    )}
                    {section.links && (
                      <ul className={`${styles.mineralBulletList} ${styles.mineralLearningLinks}`}>
                        {section.links.map(link => (
                          <li key={link.url}>
                            <a href={link.url} target="_blank" rel="noreferrer">
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.illustration && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className={styles.mineralSectionIllustration}
                        src={section.illustration}
                        alt=""
                        aria-hidden="true"
                      />
                    )}
                  </section>
                ))}
              </div>
            ) : (
              <div className={styles.mineralDetailContent}>
                {details?.content.trim() || '资料待补充。'}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}

export default function MiningDrawFlow({
  requestKey,
  onClaimed,
  onClosed,
}: {
  requestKey: number
  onClaimed: (result: MiningDrawResult) => void
  onClosed?: (result: MiningDrawResult) => void
}) {
  const [rockChoices, setRockChoices] = useState<RockChoice[] | null>(null)
  const [drawResult, setDrawResult] = useState<MiningDrawResult | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedRockIndex, setSelectedRockIndex] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (requestKey <= 0) return
    let cancelled = false

    async function prepareMiningDraw() {
      setIsDrawing(true)
      setSelectedRockIndex(null)
      setDrawResult(null)
      setError('')

      try {
        const response = await fetch('/api/mining/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'prepare' }),
        })
        const result = await response.json()
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Could not open mine')
        }
        if (!cancelled) setRockChoices(result.choices)
      } catch (drawError) {
        if (!cancelled) {
          setError(drawError instanceof Error ? drawError.message : 'Could not open mine')
          setRockChoices(null)
        }
      } finally {
        if (!cancelled) setIsDrawing(false)
      }
    }

    prepareMiningDraw()
    return () => {
      cancelled = true
    }
  }, [requestKey])

  const chooseRock = async (choice: RockChoice, index: number) => {
    if (isDrawing) return
    setIsDrawing(true)
    setSelectedRockIndex(index)
    setError('')

    try {
      const response = await fetch('/api/mining/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', choiceToken: choice.choiceToken }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not open mine')
      }
      setDrawResult(result)
      setRockChoices(null)
      onClaimed(result)
    } catch (drawError) {
      setError(drawError instanceof Error ? drawError.message : 'Could not open mine')
      setSelectedRockIndex(null)
    } finally {
      setIsDrawing(false)
    }
  }

  const closeResult = () => {
    const result = drawResult
    setDrawResult(null)
    if (result) onClosed?.(result)
  }

  return (
    <>
      {rockChoices && (
        <div className={styles.drawModalBackdrop}>
          <div className={`${styles.drawModal} ${styles.drawChoosingModal}`}>
            <h2>Choose a rock</h2>
            <div className={styles.drawRockChoices}>
              {rockChoices.map((choice, index) => {
                const rock = ROCKS[index]
                const isSelected = selectedRockIndex === index
                return (
                  <button
                    key={rock.key}
                    type="button"
                    className={`${styles.drawRockButton} ${rock.className}`}
                    onClick={() => chooseRock(choice, index)}
                    disabled={isDrawing}
                    aria-label={`Choose ${rock.key} rock`}
                  >
                    <Image
                      src={isSelected ? rock.broken : rock.rock}
                      alt=""
                      width={130}
                      height={130}
                      className={styles.rockVisual}
                    />
                  </button>
                )
              })}
            </div>
            <p className={styles.rockPicking}>
              {isDrawing ? 'Opening...' : error}
            </p>
          </div>
        </div>
      )}

      {drawResult && (
        <div className={styles.drawModalBackdrop}>
          <div className={styles.mineralResultModal}>
            <div className={styles.mineralResultBody}>
              <div className={styles.drawModalPrize}>
                <span>{PRIZE_TIER_LABEL[drawResult.prize.tier] || drawResult.prize.tier}</span>
                <strong>{drawResult.prize.title || '神秘奖品'}</strong>
              </div>
              <div className={styles.mineralResultCardWrap}>
                <FlippableMineralCard
                  card={drawResult.card}
                  size={210}
                  badge={drawResult.isNew ? 'New!' : `x${drawResult.ownedCount}`}
                />
              </div>
            </div>
            <button
              type="button"
              className={styles.mineralCollectButton}
              onClick={closeResult}
            >
              Collect
            </button>
          </div>
        </div>
      )}
    </>
  )
}
