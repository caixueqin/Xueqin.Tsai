import type { MineralDetail, MineralDetailSeed } from './types'
import photoMetadata from './photo-metadata.json'
import { mineralCards } from '../minerals'
import { MINERAL_REVIEW_ZH_BY_TITLE } from './reviewTranslations.zh'

const PHOTO_BY_ID = new Map(photoMetadata.map(photo => [photo.id, photo]))
const CARD_ID_BY_ENGLISH_NAME = new Map(mineralCards.map(card => [card.enName, card.id]))

const HELP = {
  classification:
    'A mineral species has a defined chemical composition and crystal structure. Some cards represent a mineral group, rock, ore, or commercial material instead.',
  formula:
    'A chemical formula shows the elements in a substance and their usual proportions. Groups and ores may not have one fixed formula.',
  hardness:
    'The Mohs scale ranks scratch resistance from 1 to 10. It does not measure whether a specimen will crack when struck.',
  luster:
    'Luster describes how light reflects from a fresh mineral surface, such as metallic, glassy, pearly, or dull.',
  streak:
    'Streak is the color of a mineral’s powder on unglazed porcelain. It can differ from the color of the specimen.',
  density:
    'Density compares mass with volume. Two specimens of the same size can feel very different in weight.',
}

export function createMineralDetail(seed: MineralDetailSeed): MineralDetail {
  const photo = PHOTO_BY_ID.get(CARD_ID_BY_ENGLISH_NAME.get(seed.title) || '')

  return {
    title: `${seed.title.toUpperCase()}｜Secret File`,
    mission: seed.mission,
    reviewZh: seed.reviewZh || MINERAL_REVIEW_ZH_BY_TITLE[seed.title],
    photo: seed.photo || (photo
      ? {
          src: photo.localFile,
          alt: `${seed.title} mineral specimen photograph`,
          credit: photo.credit,
          sourceUrl: photo.sourceUrl,
        }
      : undefined),
    facts: [
      {
        label: 'Type',
        value: seed.classification,
        help: HELP.classification,
      },
      { label: 'Color', value: seed.colors },
      { label: 'Formula', value: seed.formula, help: HELP.formula },
      { label: 'Hardness', value: seed.hardness, help: HELP.hardness },
      { label: 'Luster', value: seed.luster, help: HELP.luster },
      { label: 'Streak', value: seed.streak, help: HELP.streak },
      { label: 'Density', value: seed.density, help: HELP.density },
    ],
    sections: [
      { heading: 'SUPERPOWER', content: seed.superpower },
      { heading: 'WEAK SPOT', content: seed.weakSpot },
      { heading: 'SECRET IDENTITY', content: seed.secretIdentity },
      { heading: 'HUMAN USES', content: seed.humanUses },
      { heading: 'ORIGIN STORY', content: seed.originStory },
      {
        heading: 'FUN SECRET',
        content: seed.funSecrets.map(secret => `• ${secret}`).join('\n\n'),
      },
      { heading: 'LEARNING LINKS', content: '', links: seed.sources },
      { heading: 'SAFETY NOTE', content: seed.safetyNote },
    ],
    content: '',
  }
}
