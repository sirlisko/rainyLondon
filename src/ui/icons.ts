import type { Kind } from '../weather'

// 24px grid, one stroke weight. The cloud is drawn once and reused; weather that
// falls out of it (rain, snow, lightning) uses the raised variant.
const CLOUD = 'M7 19h10.5a4.5 4.5 0 0 0 .6-8.96A6 6 0 0 0 6.6 11.1A4 4 0 0 0 7 19z'
const CLOUD_HIGH = 'translate(0 -3.5)'
const PARTLY = 'translate(3 3) scale(0.86)'

let uid = 0

function sun (cx: number, cy: number, r: number, rays: [number, number]): string {
  const spokes = Array.from({ length: 8 }, (_, i) =>
    `<line x1="${cx}" y1="${cy - rays[0]}" x2="${cx}" y2="${cy - rays[1]}" transform="rotate(${i * 45} ${cx} ${cy})"/>`).join('')
  return `<circle cx="${cx}" cy="${cy}" r="${r}"/><g class="i-rays" style="transform-origin:${cx}px ${cy}px">${spokes}</g>`
}

const moon = (scale = 1, dx = 0, dy = 0): string =>
  `<path transform="translate(${dx} ${dy}) scale(${scale})" d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>`

function behindCloud (content: string): string {
  const id = `ic${uid++}`
  return `<mask id="${id}"><rect x="0" y="0" width="24" height="24" fill="#fff"/>
    <path transform="${PARTLY}" d="${CLOUD}" fill="#000" stroke="#000" stroke-width="4.5"/></mask>
    <g mask="url(#${id})">${content}</g><path class="i-cloud" transform="${PARTLY}" d="${CLOUD}"/>`
}

const flake = (x: number, y: number): string =>
  [0, 60, 120].map(a => `<line x1="${x}" y1="${y - 1.4}" x2="${x}" y2="${y + 1.4}" transform="rotate(${a} ${x} ${y})"/>`).join('')

const falling = (marks: string): string =>
  `<path class="i-cloud" transform="${CLOUD_HIGH}" d="${CLOUD}"/><g class="i-fall">${marks}</g>`

const BODIES: Record<Kind, (day: boolean) => string> = {
  clear: day => day ? sun(12, 12, 4.25, [7, 9.5]) : moon(),
  partly: day => behindCloud(day ? sun(9, 9, 3.5, [6, 8]) : moon(0.72, 1.5, 0.5)),
  cloud: () => `<path class="i-cloud" d="${CLOUD}"/>`,
  fog: () => `<path class="i-cloud" transform="${CLOUD_HIGH}" d="${CLOUD}"/>
    <g class="i-fog"><line x1="5" y1="19" x2="19" y2="19"/><line x1="8" y1="22" x2="16" y2="22"/></g>`,
  drizzle: () => falling('<line x1="9" y1="18.5" x2="9" y2="19"/><line x1="12.5" y1="20.5" x2="12.5" y2="21"/><line x1="16" y1="18.5" x2="16" y2="19"/>'),
  rain: () => falling('<line x1="9" y1="18" x2="8" y2="21"/><line x1="12.5" y1="18" x2="11.5" y2="21"/><line x1="16" y1="18" x2="15" y2="21"/>'),
  snow: () => falling(`<g stroke-width="1.25">${flake(8.5, 19)}${flake(12.5, 20.8)}${flake(16.5, 19)}</g>`),
  storm: () => `<path class="i-cloud" transform="${CLOUD_HIGH}" d="${CLOUD}"/><path class="i-bolt" d="M13 15.5l-2.5 3.5h3l-2.5 3.5"/>`
}

export function icon (kind: Kind, isDay = true): string {
  return `<svg class="icon icon--${kind}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${BODIES[kind](isDay)}</svg>`
}
