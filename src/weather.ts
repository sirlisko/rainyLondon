import type { Current, History, Hourly } from './api'

export type Kind = 'clear' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

const LABELS: Record<number, [string, Kind]> = {
  0: ['Clear sky', 'clear'],
  1: ['Mainly clear', 'clear'],
  2: ['Partly cloudy', 'partly'],
  3: ['Overcast', 'cloud'],
  45: ['Fog', 'fog'],
  48: ['Freezing fog', 'fog'],
  51: ['Light drizzle', 'drizzle'],
  53: ['Drizzle', 'drizzle'],
  55: ['Heavy drizzle', 'drizzle'],
  56: ['Freezing drizzle', 'drizzle'],
  57: ['Freezing drizzle', 'drizzle'],
  61: ['Light rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy rain', 'rain'],
  66: ['Freezing rain', 'rain'],
  67: ['Freezing rain', 'rain'],
  71: ['Light snow', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy snow', 'snow'],
  77: ['Snow grains', 'snow'],
  80: ['Light showers', 'rain'],
  81: ['Showers', 'rain'],
  82: ['Violent showers', 'rain'],
  85: ['Snow showers', 'snow'],
  86: ['Snow showers', 'snow'],
  95: ['Thunderstorm', 'storm'],
  96: ['Thunderstorm, hail', 'storm'],
  99: ['Thunderstorm, hail', 'storm']
}

export function describe (code: number): { label: string, kind: Kind } {
  const [label, kind] = LABELS[code] ?? ['Unknown', 'cloud']
  return { label, kind }
}

export function isRaining (c: Current): boolean {
  const { kind } = describe(c.weatherCode)
  return kind === 'drizzle' || kind === 'rain' || kind === 'storm' || c.precipitation > 0
}

// WMO/Met Office convention: a "rain day" has at least 1 mm, so a dry day has less.
export const RAIN_DAY_MM = 1

export interface Stats {
  totalMm: number
  dryDays: number
  days: number
  last30: number[]
  last30Mm: number
  last30DryDays: number
}

export function stats (h: History): Stats {
  const p = h.precipitation
  const last30 = p.slice(-30)
  const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)
  const dry = (xs: number[]): number => xs.filter(x => x < RAIN_DAY_MM).length
  return {
    totalMm: sum(p),
    dryDays: dry(p),
    days: p.length,
    last30,
    last30Mm: sum(last30),
    last30DryDays: dry(last30)
  }
}

// Hourly model output reports traces; below this an hour doesn't count as rainy.
const WET_HOUR_MM = 0.1

export const AHEAD_HOURS = 12
// Models forecast trace amounts in most hours; only call an hour wet when rain is also more likely than not.
const LIKELY_CHANCE = 50

export interface HourAhead {
  time: string
  chance: number | null
  likely: boolean
}

export interface Outlook {
  hoursSinceRain: number | null
  dryHoursBeforeThisRain: number | null
  restOfDayChance: number | null
  // First hour ahead where the rain is expected to start (if dry now) or stop (if raining).
  turn: { at: string, tomorrow: boolean } | null
  ahead: HourAhead[]
}

// `now` is the local ISO time from the forecast's `current` block, same timezone as `h.time`.
export function outlook (h: Hourly, now: string, rainingNow: boolean): Outlook {
  let cur = -1
  h.time.forEach((t, i) => { if (t <= now) cur = i })
  const wet = (i: number): boolean => h.precipitation[i] >= WET_HOUR_MM
  const lastWetFrom = (from: number): number => {
    for (let i = from; i >= 0; i--) if (wet(i)) return i
    return -1
  }

  const lastWet = lastWetFrom(cur)
  let dryHoursBeforeThisRain: number | null = null
  if (rainingNow) {
    let start = cur
    while (start > 0 && wet(start - 1)) start--
    const previous = lastWetFrom(start - 1)
    dryHoursBeforeThisRain = previous < 0 ? null : start - previous - 1
  }

  const today = now.slice(0, 10)
  const ahead = h.time
    .map((t, i) => ({ t, p: h.probability[i] }))
    .filter(({ t, p }, i) => i > cur && t.startsWith(today) && p != null)
    .map(({ p }) => p!)

  const next = h.time.slice(cur + 1, cur + 1 + AHEAD_HOURS).map((time, k): HourAhead => {
    const i = cur + 1 + k
    const chance = h.probability[i]
    return { time, chance, likely: wet(i) && (chance ?? 100) >= LIKELY_CHANCE }
  })
  const turnAt = next.find(x => x.likely !== rainingNow)?.time

  return {
    hoursSinceRain: lastWet < 0 ? null : cur - lastWet,
    dryHoursBeforeThisRain,
    restOfDayChance: ahead.length ? Math.max(...ahead) : null,
    turn: turnAt ? { at: turnAt.slice(11, 16), tomorrow: !turnAt.startsWith(today) } : null,
    ahead: next
  }
}
