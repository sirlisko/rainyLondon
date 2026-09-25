import type { City } from './cities'

export interface Current {
  time: string
  temperature: number
  precipitation: number
  weatherCode: number
  isDay: boolean
}

export interface Hourly {
  time: string[]
  precipitation: number[]
  probability: Array<number | null>
}

export interface History {
  dates: string[]
  precipitation: number[]
}

export interface SearchResult extends City {
  id: number
  region?: string
}

interface GeoResult {
  id: number
  name: string
  latitude: number
  longitude: number
  timezone: string
  country?: string
  admin1?: string
}

const HISTORY_DAYS = 365
// ERA5 reanalysis trails real time by ~5 days; stay clear of the ragged edge.
const ARCHIVE_LAG_DAYS = 6

function cached<T> (key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw) {
      const { at, value } = JSON.parse(raw) as { at: number, value: T }
      if (Date.now() - at < ttlMs) return Promise.resolve(value)
    }
  } catch {}
  return load().then(value => {
    try {
      sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value }))
    } catch {}
    return value
  })
}

async function getJson<T> (url: string, attempts = 3): Promise<T> {
  const res = await fetch(url)
  if (res.ok) return await res.json() as T
  // Open-Meteo rate-limits bursts; loading a grid of cities in parallel can trip it.
  if (attempts > 1 && (res.status === 429 || res.status >= 500)) {
    await new Promise(resolve => setTimeout(resolve, (4 - attempts) * 1500))
    return await getJson<T>(url, attempts - 1)
  }
  throw new Error(`${res.status} ${res.statusText}`)
}

const isoDate = (d: Date): string => d.toISOString().slice(0, 10)

export function historyRange (): { start: string, end: string } {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - ARCHIVE_LAG_DAYS)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (HISTORY_DAYS - 1))
  return { start: isoDate(start), end: isoDate(end) }
}

export function fetchCurrent (city: City): Promise<Current> {
  const url = 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: 'precipitation,weather_code,temperature_2m,is_day',
    timezone: city.timezone
  }).toString()
  return cached(`now:${url}`, 10 * 60_000, async () => {
    const { current } = await getJson<{ current: { time: string, temperature_2m: number, precipitation: number, weather_code: number, is_day: number } }>(url)
    return {
      time: current.time,
      temperature: current.temperature_2m,
      precipitation: current.precipitation,
      weatherCode: current.weather_code,
      isDay: current.is_day === 1
    }
  })
}

export function fetchHourly (city: City): Promise<Hourly> {
  const url = 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    hourly: 'precipitation,precipitation_probability',
    past_days: '14',
    forecast_days: '2',
    timezone: city.timezone
  }).toString()
  return cached(`hourly:${url}`, 10 * 60_000, async () => {
    const { hourly } = await getJson<{ hourly: { time: string[], precipitation: Array<number | null>, precipitation_probability: Array<number | null> } }>(url)
    return {
      time: hourly.time,
      precipitation: hourly.precipitation.map(v => v ?? 0),
      probability: hourly.precipitation_probability
    }
  })
}

function archiveUrl (city: City, start: string, end: string): string {
  return 'https://archive-api.open-meteo.com/v1/archive?' + new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    daily: 'precipitation_sum',
    start_date: start,
    end_date: end,
    timezone: city.timezone
  }).toString()
}

async function fetchDaily (url: string): Promise<History> {
  const { daily } = await getJson<{ daily: { time: string[], precipitation_sum: Array<number | null> } }>(url)
  return {
    dates: daily.time,
    precipitation: daily.precipitation_sum.map(v => v ?? 0)
  }
}

export function fetchHistory (city: City): Promise<History> {
  const { start, end } = historyRange()
  const url = archiveUrl(city, start, end)
  return cached(`hist:${url}`, 6 * 60 * 60_000, () => fetchDaily(url))
}

const toResult = (r: GeoResult): SearchResult => ({
  id: r.id,
  name: r.name,
  country: r.country ?? '',
  region: r.admin1,
  latitude: r.latitude,
  longitude: r.longitude,
  timezone: r.timezone
})

export async function searchCity (name: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = 'https://geocoding-api.open-meteo.com/v1/search?' + new URLSearchParams({
    name, count: '6', language: 'en', format: 'json'
  }).toString()
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const { results = [] } = await res.json() as { results?: GeoResult[] }
  return results.filter(r => r.timezone).map(toResult)
}

export function fetchCityById (id: number): Promise<SearchResult> {
  const url = `https://geocoding-api.open-meteo.com/v1/get?id=${id}`
  return cached(`geo:${id}`, 7 * 24 * 60 * 60_000, async () => toResult(await getJson<GeoResult>(url)))
}

export async function fetchVisitorCity (): Promise<City & { region?: string } | undefined> {
  const res = await fetch('/api/geo')
  if (!res.ok || !res.headers.get('content-type')?.includes('json')) return undefined
  const g = await res.json() as { city?: string, country?: string, region?: string, latitude?: number, longitude?: number, timezone?: string }
  // 0,0 is what unresolvable IPs (and `netlify dev --geo=mock`) report.
  if (!g.city || !g.timezone || !g.latitude || !g.longitude) return undefined
  return { name: g.city, country: g.country ?? '', region: g.region, latitude: g.latitude, longitude: g.longitude, timezone: g.timezone }
}
