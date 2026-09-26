import climate from '../data/climate.json'
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

export function renderHeadline (root: HTMLElement): void {
  const beaten = rivalsBeaten()
  root.innerHTML = `
    <p class="punchline__lead">${beaten.length
      ? `London gets less rain than <strong>${joinNames(beaten)}</strong>.`
      : `London gets <strong>${rain(london.avgMm)}</strong> of rain a year.`}</p>
    <p class="punchline__sub">On average it gets ${rain(london.avgMm)} of rain a year, and ${london.avgDryDays} of its 365 days are dry.
      <span class="punchline__period">Yearly averages, ${period}</span></p>`
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

  const rows = ranked.map((c, i) => {
    const cls = c === london ? ' rank--london' : c === lake ? ' rank--lake' : ''
    const note = c === lake
      ? '<span class="rank__note">where I grew up</span>'
      : c === london ? '<span class="rank__note">where I live now</span>' : ''
    return `<li class="rank${cls}">
      <span class="rank__pos">${String(i + 1).padStart(2, '0')}</span>
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
    <h2 class="climate__title">Thirty years of rain</h2>
    <p class="climate__lead">Average rain per year, ${period}. Of these ${cities.length} places, London is the
      <strong>${position === 1 ? '' : `${ordinal(position)} `}driest</strong>.</p>
    <ol class="ranking">${rows}</ol>
    ${lakeNote}`
}
