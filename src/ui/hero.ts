import type { Current } from '../api'
import { LONDON } from '../cities'
import { AHEAD_HOURS, describe, isRaining, type HourAhead, type Outlook } from '../weather'
import { joinNames, rivalsBeaten } from './climate'
import { icon } from './icons'
import { clock, esc, temp, tempUnit } from './format'

export interface HeroData {
  current: Current
  outlook?: Outlook
  visitor?: { name: string, current: Current }
}

const days = (hours: number): string => {
  const d = Math.floor(hours / 24)
  return d === 1 ? 'a day' : `${d} days`
}

export function outlookLines (o: Outlook, raining: boolean): string[] {
  const lines: string[] = []
  if (raining) {
    if (o.dryHoursBeforeThisRain === null) lines.push('The first rain in over two weeks.')
    else if (o.dryHoursBeforeThisRain >= 48) lines.push(`The first rain in ${days(o.dryHoursBeforeThisRain)}.`)
  } else if (o.hoursSinceRain === null) {
    lines.push('No rain in over two weeks.')
  } else if (o.hoursSinceRain >= 24) {
    lines.push(`Dry for ${days(o.hoursSinceRain)}.`)
  } else if (o.hoursSinceRain > 0) {
    lines.push(`Last rain ${o.hoursSinceRain === 1 ? 'an hour' : `${o.hoursSinceRain} hours`} ago.`)
  }
  if (o.turn) {
    const when = `around ${o.turn.at}${o.turn.tomorrow ? ' tomorrow' : ''}`
    lines.push(raining ? `Should ease off ${when}.` : `Rain likely from ${when}.`)
  } else if (raining && o.ahead.length === AHEAD_HOURS) {
    lines.push(`Set in for the next ${AHEAD_HOURS} hours.`)
  } else if (o.restOfDayChance !== null) {
    lines.push(o.restOfDayChance >= 50
      ? `Take an umbrella later: ${o.restOfDayChance}% chance of rain.`
      : o.restOfDayChance === 0
        ? 'No rain expected for the rest of today.'
        : `${o.restOfDayChance}% chance of rain for the rest of today.`)
  }
  return lines
}

// Below this every bar is a sliver; the strip would only restate "no rain expected".
const STRIP_MIN_CHANCE = 20

function aheadStrip (ahead: HourAhead[]): string {
  if (!ahead.some(x => (x.chance ?? 0) >= STRIP_MIN_CHANCE)) return ''
  const w = 8
  const gap = 3
  const h = 32
  const bars = ahead.map((x, i) => {
    const bh = Math.max(1.5, ((x.chance ?? 0) / 100) * h)
    return `<rect class="ahead__bar${x.likely ? ' ahead__bar--likely' : ''}" x="${i * (w + gap)}" y="${h - bh}" width="${w}" height="${bh}" rx="1.5"/>`
  }).join('')
  const peak = ahead.reduce((a, b) => (b.chance ?? 0) > (a.chance ?? 0) ? b : a)
  const label = `Chance of rain over the next ${ahead.length} hours peaks at ${peak.chance}% around ${peak.time.slice(11, 16)}`
  return `<p class="ahead__label">Next ${ahead.length} hours</p>
    <svg class="ahead__chart" viewBox="0 0 ${ahead.length * (w + gap) - gap} ${h}" preserveAspectRatio="none" role="img" aria-label="${label}">${bars}</svg>
    <p class="ahead__times"><span>${ahead[0].time.slice(11, 16)}</span><span>${ahead.at(-1)!.time.slice(11, 16)}</span></p>`
}

export function shareText (current: Current): string {
  const rivals = joinNames(rivalsBeaten())
  if (isRaining(current)) {
    return `Yes, it's raining in London right now.${rivals ? ` Still, it gets less rain than ${rivals}.` : ''}`
  }
  return `It's not raining in London right now.${rivals ? ` It gets less rain than ${rivals}.` : ''}`
}

export function renderHero (el: HTMLElement, { current, outlook, visitor }: HeroData): void {
  const raining = isRaining(current)
  const { label, kind } = describe(current.weatherCode)
  el.dataset.state = raining ? 'wet' : current.isDay ? 'dry' : 'night'
  el.dataset.kind = kind
  el.setAttribute('aria-busy', 'false')
  el.querySelector('.hero__answer')!.textContent = raining ? 'Yes.' : 'No.'
  el.querySelector('.hero__icon')!.innerHTML = icon(kind, current.isDay)
  el.querySelector('.hero__detail')!.innerHTML =
    `${temp(current.temperature)}${tempUnit()} · ${label} · ${clock(LONDON.timezone)} in London`
  // The hero repaints on refreshes and unit changes; only a changed answer is worth announcing.
  const announce = el.querySelector('.hero__announce')!
  const answer = raining ? "Yes, it's raining in London right now." : "No, it's not raining in London right now."
  if (announce.textContent !== answer) announce.textContent = answer
  el.querySelector('.hero__outlook')!.innerHTML = outlook
    ? outlookLines(outlook, raining).map(l => `<span>${l}</span>`).join('')
    : ''
  el.querySelector('.hero__ahead')!.innerHTML = outlook ? aheadStrip(outlook.ahead) : ''
  el.querySelector('.hero__quip')!.textContent = raining
    ? 'Fine, it is. Enjoy it while it lasts. Scroll down for some perspective.'
    : 'Surprised? Scroll down: the numbers say London is drier than you think.'
  el.querySelector('.hero__visitor')!.innerHTML = visitor
    ? `And in ${esc(visitor.name)}? <strong>${isRaining(visitor.current) ? 'Raining' : 'Dry'}</strong>, ${temp(visitor.current.temperature)}${tempUnit()}.`
    : ''
  el.querySelector<HTMLElement>('.hero__share')!.hidden = false
}

export function renderHeroError (el: HTMLElement): void {
  el.setAttribute('aria-busy', 'false')
  el.querySelector('.hero__answer')!.textContent = 'Hmm.'
  el.querySelector('.hero__detail')!.textContent = "Couldn't reach the weather service. Try again in a minute."
}
