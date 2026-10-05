import climate from '../data/climate.json'
import { isSamePlace, type City } from '../cities'
import { esc, ordinal, rain } from './format'

const LAKE = 'Lake Maggiore'
// Places people picture as sunny or glamorous; the headline names the ones London beats.
const HEADLINE_RIVALS = ['Rome', 'New York', 'Sydney', 'Tokyo', 'Seattle']

const { cities } = climate
const london = cities.find(c => c.name === 'London')!
const period = `${climate.from}–${climate.to}`
const yearCount = climate.to - climate.from + 1

export const joinNames = (names: string[]): string =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

export const rivalsBeaten = (): string[] => HEADLINE_RIVALS
  .filter(name => (cities.find(c => c.name === name)?.avgMm ?? 0) > london.avgMm)
  .slice(0, 3)

// Within this, a year is too close to the average to call it wetter or drier.
const ABOUT_AVERAGE_PCT = 3

// Both figures come from the same ERA5 dataset, so a place's last 12 months compare fairly with its own average.
export function versusAverage (place: Pick<City, 'latitude' | 'longitude'>, last12Mm: number): string | undefined {
  const avg = cities.find(c => isSamePlace(c, place))?.avgMm
  if (!avg) return undefined
  const pct = Math.round((last12Mm / avg - 1) * 100)
  if (Math.abs(pct) < ABOUT_AVERAGE_PCT) return `About average for ${period}`
  return `${Math.abs(pct)}% ${pct < 0 ? 'drier' : 'wetter'} than its ${period} average`
}

// Figures quoted in static copy (footer, data note) so they follow the data file and units.
export function renderClimateRefs (root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-climate-period]').forEach(el => { el.textContent = period })
  root.querySelectorAll<HTMLElement>('[data-climate-mm]').forEach(el => {
    const city = cities.find(c => c.name === el.dataset.climateMm)
    if (city) el.textContent = rain(city.avgMm)
  })
}

export function renderClimate (root: HTMLElement): void {
  const ranked = [...cities].sort((a, b) => a.avgMm - b.avgMm)
  const max = ranked.at(-1)!.avgMm
  const position = ranked.indexOf(london) + 1
  const lake = cities.find(c => c.name === LAKE)
  const beaten = rivalsBeaten()

  const rows = ranked.map((c, i) => {
    const cls = c === london ? ' rank--london' : c === lake ? ' rank--lake' : ''
    const note = c === lake
      ? '<span class="rank__note">where I grew up</span>'
      : c === london ? '<span class="rank__note">where I live now</span>' : ''
    return `<li class="rank${cls}">
      <span class="rank__pos">${i + 1}</span>
      <span class="rank__name">${esc(c.name)}${note}</span>
      <span class="rank__bar" aria-hidden="true"><span style="--w:${(c.avgMm / max) * 100}%"></span></span>
      <span class="rank__value">${rain(c.avgMm)}</span>
      <span class="rank__dry">${c.avgDryDays} dry days</span>
    </li>`
  }).join('')

  const lakeNote = lake
    ? `<p class="climate__note">I grew up on Lake Maggiore, in northern Italy, and lived there until I was 21, so it had to be on the list.
        It gets ${(lake.avgMm / london.avgMm).toFixed(1)}× as much rain as London, and was wetter
        in ${lake.yearsWetterThanLondon === yearCount ? 'every one' : lake.yearsWetterThanLondon} of these ${yearCount} years.</p>`
    : ''

  root.innerHTML = `
    <h2 class="climate__title">${beaten.length
      ? `London gets less rain than ${joinNames(beaten)}.`
      : `London gets ${rain(london.avgMm)} of rain a year.`}</h2>
    <p class="climate__lead">Over ${period} it averaged ${rain(london.avgMm)} of rain a year, and ${london.avgDryDays} of its 365 days were dry.
      Of these ${cities.length} places, it's the <strong>${position === 1 ? '' : `${ordinal(position)} `}driest</strong>.</p>
    <ol class="ranking">${rows}</ol>
    ${lakeNote}`
}
