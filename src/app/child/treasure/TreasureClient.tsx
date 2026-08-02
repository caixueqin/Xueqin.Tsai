'use client'

import { useMemo, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import {
  MINERAL_FAMILIES,
  mineralCards,
  type MineralFamily,
} from '@/data/minerals'
import { FlippableMineralCard, MineralCardArt } from '../MiningDrawFlow'
import styles from '../child.module.css'

type CollectionItem = {
  cardId: string
  ownedCount: number
  firstObtainedAt: string
  lastObtainedAt: string
}

const FAMILY_CLASS: Record<MineralFamily, string> = {
  gemstone: styles.familyGemstone,
  metal: styles.familyMetal,
  industry: styles.familyIndustry,
  geology: styles.familyGeology,
  joker: styles.familyJoker,
}

export default function TreasureClient({
  initialCollection,
}: {
  initialCollection: CollectionItem[]
}) {
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null)
  const collectionByCardId = useMemo(
    () => new Map(initialCollection.map(item => [item.cardId, item])),
    [initialCollection]
  )

  return (
    <>
      <div className={styles.pageIntro}>
        <h1 className={styles.title}>Mineral Cards</h1>
        <p className={styles.greeting}>Build your collection by completing learning tasks.</p>
      </div>

      <div className={styles.collectionFamilies}>
        {MINERAL_FAMILIES.map(family => {
          const cards = mineralCards.filter(card => card.family === family.key)
          const obtainedCount = cards.filter(card => collectionByCardId.has(card.id)).length

          return (
            <section
              key={family.key}
              className={`${styles.collectionFamily} ${FAMILY_CLASS[family.key]}`}
            >
              <div className={styles.collectionFamilyHeader}>
                <h2>{family.label}</h2>
                <span>{obtainedCount}/{family.total}</span>
              </div>

              <div className={styles.mineralCardGrid}>
                {cards.map(card => {
                  const owned = collectionByCardId.get(card.id)
                  return (
                    <article
                      key={card.id}
                      className={`${styles.mineralCard} ${owned ? '' : styles.mineralCardLocked}`}
                    >
                      {owned ? (
                        <FlippableMineralCard
                          card={card}
                          size={150}
                          badge={owned.ownedCount > 1 ? `x${owned.ownedCount}` : undefined}
                          flipped={flippedCardId === card.id}
                          onFlippedChange={flipped => {
                            setFlippedCardId(flipped ? card.id : null)
                          }}
                        />
                      ) : (
                        <div className={styles.mineralCardImage}>
                          <MineralCardArt locked size={150} />
                          <span className={styles.mineralLock}>
                            <LockKeyhole size={18} />
                          </span>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

    </>
  )
}
