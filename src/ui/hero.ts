import type { Current } from '../api'
import { LONDON } from '../cities'
import { describe, isRaining } from '../weather'
import { icon } from './icons'
import { localTime, temp, tempUnit } from './format'

export function renderHero (el: HTMLElement, current: Current): void {
  const raining = isRaining(current)
  const { label, kind } = describe(current.weatherCode)
  el.dataset.state = raining ? 'wet' : current.isDay ? 'dry' : 'night'
  el.dataset.kind = kind
  el.setAttribute('aria-busy', 'false')
  el.querySelector('.hero__answer')!.textContent = raining ? 'Yes.' : 'No.'
  el.querySelector('.hero__icon')!.innerHTML = icon(kind, current.isDay)
  el.querySelector('.hero__detail')!.textContent =
    `${temp(current.temperature)}${tempUnit()} · ${label} · ${localTime(LONDON.timezone)} in London`
  el.querySelector('.hero__quip')!.textContent = raining
    ? 'Fine, it is. Enjoy it while it lasts. Scroll down for some perspective.'
    : 'Surprised? Scroll down: the numbers say London is drier than you think.'
}

export function renderHeroError (el: HTMLElement): void {
  el.setAttribute('aria-busy', 'false')
  el.querySelector('.hero__answer')!.textContent = 'Hmm.'
  el.querySelector('.hero__detail')!.textContent = "Couldn't reach the weather service. Try again in a minute."
}
