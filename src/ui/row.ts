import type { Current } from '../api'
import type { City } from '../cities'
import { describe, isRaining, RAIN_DAY_MM, type Stats } from '../weather'
import { versusAverage } from './climate'
import { icon } from './icons'
import { clock, esc, rain, rainUnit, rainValue, temp } from './format'

export type Role = 'london' | 'home' | 'you' | 'random' | 'added'

export interface Entry {
  key: string
  city: City & { id?: number, region?: string }
  role: Role
  current?: Current
  stats?: Stats
  failed?: boolean
  nearVisitor?: boolean
}

export interface Scale {
  maxTotalMm: number
  maxDailyMm: number
}

function sparkline (days: number[], maxDaily: number): string {
  const w = 4
  const gap = 1.5
  const h = 28
  const bars = days.map((v, i) => {
    const bh = v <= 0 ? 0 : Math.max(1.5, (v / maxDaily) * h)
    const wet = v >= RAIN_DAY_MM ? ' spark__bar--wet' : ''
    return `<rect class="spark__bar${wet}" x="${i * (w + gap)}" y="${h - bh}" width="${w}" height="${bh}" rx="1"/>`
  }).join('')
  const width = days.length * (w + gap) - gap
  return `<svg class="spark" viewBox="0 0 ${width} ${h}" preserveAspectRatio="none" role="img" aria-label="Daily rainfall over the last 30 days">
    <line class="spark__base" x1="0" y1="${h}" x2="${width}" y2="${h}"/>${bars}</svg>`
}

const ROLE_TAG: Partial<Record<Role, string>> = { london: 'The accused', home: 'Where I grew up', you: 'Near you' }

export function renderRow (e: Entry, scale: Scale, rank: number | undefined, fresh: boolean): string {
  const { city } = e
  const removable = e.role === 'random' || e.role === 'added' || e.role === 'you'
  const tags = [ROLE_TAG[e.role], e.nearVisitor ? 'Near you' : undefined].filter(Boolean)
  const place = [city.region !== city.name ? city.region : undefined, city.country].filter(Boolean).join(', ')
  const attrs = `class="row row--${e.role}${fresh ? ' row--enter' : ''}" data-key="${esc(e.key)}"`

  const head = `
    <span class="row__pos">${rank ?? ''}</span>
    <div class="row__name">
      <h3>${esc(city.name)}</h3>
      <p>${[esc(place), clock(city.timezone), ...tags].join(' · ')}</p>
    </div>
    ${removable ? `<button class="row__remove" data-remove="${esc(e.key)}" aria-label="Remove ${esc(city.name)}">×</button>` : ''}`

  if (e.failed) {
    return `<li ${attrs}>${head}
      <p class="row__error">Couldn't load the weather here. <button class="link" data-retry="${esc(e.key)}">Retry</button></p></li>`
  }

  const now = e.current
    ? (() => {
        const wet = isRaining(e.current)
        const { label, kind } = describe(e.current.weatherCode)
        return `<p class="row__now row__now--${wet ? 'wet' : 'dry'}">${icon(kind, e.current.isDay)}
          <span><strong>${wet ? 'Raining' : 'Dry'}</strong>, ${temp(e.current.temperature)}</span>
          <span class="row__label">${label}</span></p>`
      })()
    // Stats only arrive once both requests have settled, so without a reading by then it failed.
    : e.stats
      ? '<p class="row__now row__now--unavailable">Weather unavailable</p>'
      : '<p class="row__now"><span class="skeleton skeleton--line"></span></p>'

  const s = e.stats
  const note = s && versusAverage(city, s.totalMm)
  // Loading rows keep the same elements, so phone layouts place them identically.
  const loading = '<span class="skeleton skeleton--line"></span>'
  const body = `
    <div class="row__rain">
      <p class="row__value">${s
        ? `<span class="visually-hidden">Last 12 months: </span><span class="row__num">${rainValue(s.totalMm)}</span> ${rainUnit()}`
        : loading}</p>
      <div class="bar" aria-hidden="true">${s ? `<span style="--w:${(s.totalMm / scale.maxTotalMm) * 100}%"></span>` : ''}</div>
      ${note ? `<p class="row__note">${note}</p>` : ''}
    </div>
    <div class="row__dry">
      <p class="row__value">${s ? `<span class="row__num">${s.dryDays}</span> dry days` : loading}</p>
      <div class="bar bar--dry" aria-hidden="true">${s ? `<span style="--w:${(s.dryDays / s.days) * 100}%"></span>` : ''}</div>
    </div>
    <div class="row__recent">${s
      ? `${sparkline(s.last30, scale.maxDailyMm)}<p><span class="row__key">Last 30 days: </span>${rain(s.last30Mm)}, ${s.last30DryDays} dry days</p>`
      : '<span class="skeleton skeleton--spark"></span>'}</div>`

  return `<li ${attrs} aria-busy="${s ? 'false' : 'true'}">${head}${now}${body}</li>`
}
