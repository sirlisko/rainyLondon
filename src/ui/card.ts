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
  const h = 40
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

export function renderCard (e: Entry, scale: Scale, rank: number | undefined, fresh: boolean): string {
  const { city } = e
  const rankLabel = rank !== undefined ? `<span class="card__rank" aria-label="Rank ${rank}">${String(rank).padStart(2, '0')}</span>` : ''
  const removable = e.role === 'random' || e.role === 'added' || e.role === 'you'
  const tag = [ROLE_TAG[e.role], e.nearVisitor ? 'Near you' : undefined].filter(Boolean).join(' · ')
  const cls = `card card--${e.role}${fresh ? ' card--enter' : ''}`
  const place = [city.region !== city.name ? city.region : undefined, city.country].filter(Boolean).join(', ')

  const head = `
    <header class="card__head">
      <div>
        <p class="card__tag">${rankLabel}${tag}</p>
        <h3 class="card__name">${esc(city.name)}</h3>
        <p class="card__place">${esc(place)} · ${clock(city.timezone)}</p>
      </div>
      ${removable ? `<button class="card__remove" data-remove="${esc(e.key)}" aria-label="Remove ${esc(city.name)}">×</button>` : ''}
    </header>`

  if (e.failed) {
    return `<article class="${cls}" data-key="${esc(e.key)}">${head}
      <p class="card__error">Couldn't load the weather here. <button class="link" data-retry="${esc(e.key)}">Retry</button></p></article>`
  }

  const now = e.current
    ? (() => {
        const wet = isRaining(e.current)
        const { label, kind } = describe(e.current.weatherCode)
        return `<div class="now now--${wet ? 'wet' : 'dry'}">
          ${icon(kind, e.current.isDay)}
          <span class="now__verdict">${wet ? 'Raining' : 'Dry'}</span>
          <span class="now__detail">${temp(e.current.temperature)} · ${label}</span>
        </div>`
      })()
    : '<div class="now now--loading"><span class="skeleton skeleton--line"></span></div>'

  const s = e.stats
  const note = s && versusAverage(city, s.totalMm)
  const body = s
    ? `
      <dl class="figures">
        <div class="figure">
          <dt>Rain, last 12 months</dt>
          <dd><span class="figure__num">${rainValue(s.totalMm)}</span> <span class="figure__unit">${rainUnit()}</span></dd>
          <div class="bar" aria-hidden="true"><span style="--w:${(s.totalMm / scale.maxTotalMm) * 100}%"></span></div>
          ${note ? `<p class="figure__note">${note}</p>` : ''}
        </div>
        <div class="figure">
          <dt>Dry days (under 1 mm)</dt>
          <dd><span class="figure__num">${s.dryDays}</span> <span class="figure__unit">of ${s.days}</span></dd>
          <div class="bar bar--dry" aria-hidden="true"><span style="--w:${(s.dryDays / s.days) * 100}%"></span></div>
        </div>
      </dl>
      <div class="recent">
        <p class="recent__label"><span>Last 30 days</span><span>${rain(s.last30Mm)} · ${s.last30DryDays} dry days</span></p>
        ${sparkline(s.last30, scale.maxDailyMm)}
      </div>`
    : `<div class="figures figures--loading">
        <span class="skeleton skeleton--num"></span><span class="skeleton skeleton--bar"></span>
        <span class="skeleton skeleton--num"></span><span class="skeleton skeleton--bar"></span>
        <span class="skeleton skeleton--spark"></span>
      </div>`

  return `<article class="${cls}" data-key="${esc(e.key)}" aria-busy="${s ? 'false' : 'true'}">${head}${now}${body}</article>`
}
