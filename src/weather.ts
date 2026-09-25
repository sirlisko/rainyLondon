import type { Current, History } from './api'

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

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)
const dry = (xs: number[]): number => xs.filter(x => x < RAIN_DAY_MM).length

export function stats (h: History): Stats {
  const p = h.precipitation
  const last30 = p.slice(-30)
  return {
    totalMm: sum(p),
    dryDays: dry(p),
    days: p.length,
    last30,
    last30Mm: sum(last30),
    last30DryDays: dry(last30)
  }
}

export interface YearTotal {
  year: number
  mm: number
  dryDays: number
}

export function yearlyTotals (h: History): YearTotal[] {
  const byYear = new Map<number, number[]>()
  h.dates.forEach((d, i) => {
    const year = Number(d.slice(0, 4))
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(h.precipitation[i])
  })
  return [...byYear].map(([year, p]) => ({ year, mm: sum(p), dryDays: dry(p) }))
}
