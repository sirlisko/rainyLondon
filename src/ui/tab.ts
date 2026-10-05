import type { Kind } from '../weather'
import { icon } from './icons'

// Same tile as public/favicon.svg, so the icon only changes what's drawn on it.
const TILE = '<style>.tile{fill:#e8ebee}svg{color:#2c55c9}@media (prefers-color-scheme:dark){.tile{fill:#15181e}svg{color:#86a8ff}}</style><rect class="tile" width="32" height="32" rx="8"/>'

export function paintTab (raining: boolean, kind: Kind, isDay: boolean): void {
  document.title = `${raining ? 'Yes.' : 'No.'} · Is It Raining in London?`
  const glyph = icon(kind, isDay)
    .replace('<svg ', '<svg x="4" y="4" width="24" height="24" overflow="visible" ')
    .replace('stroke-width="1.75"', 'stroke-width="2.2"')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${TILE}${glyph}</svg>`
  document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href = `data:image/svg+xml,${encodeURIComponent(svg)}`
}
