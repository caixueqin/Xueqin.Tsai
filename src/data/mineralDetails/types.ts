export type MineralDetail = {
  title?: string
  content: string
  codename?: string
  mission?: string
  /**
   * 仅供内容审核使用的中文译稿，不在儿童界面显示。
   */
  reviewZh?: MineralReviewTranslation
  photo?: {
    src: string
    alt: string
    credit: string
    sourceUrl: string
  }
  facts?: Array<{
    label: string
    value: string
    help?: string
  }>
  sections?: Array<{
    heading: string
    content: string
    illustration?: string
    links?: Array<{
      label: string
      url: string
    }>
  }>
}

export type MineralReviewTranslation = {
  superpower: string
  weakSpot: string
  secretIdentity: string
  humanUses: string
  originStory: string
  funSecret: string[]
  learningLinks: string[]
  safetyNote: string
}

export type MineralDetailSeed = {
  title: string
  mission: string
  photo?: MineralDetail['photo']
  reviewZh?: MineralReviewTranslation
  classification: string
  formula: string
  colors: string
  hardness: string
  luster: string
  streak: string
  density: string
  superpower: string
  weakSpot: string
  secretIdentity: string
  humanUses: string
  originStory: string
  funSecrets: [string, string, ...string[]]
  safetyNote: string
  sources: Array<{
    label: string
    url: string
  }>
}
