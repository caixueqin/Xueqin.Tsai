export const AVATAR_THEMES = [
  { key: 'blue', color: '#377ec0', label: 'Blue' },
  { key: 'red', color: '#f03f52', label: 'Red' },
  { key: 'yellow', color: '#fbdf54', label: 'Yellow' },
  { key: 'aqua', color: '#12baaa', label: 'Aqua' },
  { key: 'orange', color: '#f7891f', label: 'Orange' },
] as const

export type AvatarThemeKey = typeof AVATAR_THEMES[number]['key']

export const AVATAR_THEME_KEYS = AVATAR_THEMES.map(theme => theme.key)

export const AVATAR_EXPRESSIONS = [
  { code: '01', label: 'Smile' },
  { code: '02', label: 'Treasure' },
  { code: '03', label: 'Mining' },
  { code: '04', label: 'Studying' },
  { code: '05', label: 'Sleeping' },
  { code: '06', label: 'Idea' },
] as const

export function getAvatarSrc(theme: string | null | undefined, expressionCode: string) {
  if (!theme || !AVATAR_THEME_KEYS.includes(theme as AvatarThemeKey)) return null
  return `/image/${theme}${expressionCode}.png`
}
