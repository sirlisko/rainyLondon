// Builds src/data/climate.json: 30-year rainfall averages for the long-term comparison.
// Historical data never changes, so this runs once a year (GitHub Action, or `npm run climate`), not on every build.
// Open-Meteo counts multi-year requests as many calls, so it waits out rate limits and
// keeps finished cities in a cache to resume from.
import { mkdir, readFile, writeFile } from 'node:fs/promises'

// The last 30 complete years. ERA5 trails real time by about 5 days, so run it after early January.
const TO = new Date().getUTCFullYear() - 1
const FROM = TO - 29
const RAIN_DAY_MM = 1
const OUT = new URL('../src/data/climate.json', import.meta.url)
const CACHE = new URL('../node_modules/.cache/climate/', import.meta.url)

const CITIES = [
  { name: 'London', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Lake Maggiore', place: 'Verbania', latitude: 45.9214, longitude: 8.5518 },
  { name: 'Rome', latitude: 41.8919, longitude: 12.5113 },
  { name: 'Paris', latitude: 48.8534, longitude: 2.3488 },
  { name: 'Barcelona', latitude: 41.3888, longitude: 2.159 },
  { name: 'Dublin', latitude: 53.3331, longitude: -6.2489 },
  { name: 'Seattle', latitude: 47.6062, longitude: -122.3321 },
  { name: 'New York', latitude: 40.7143, longitude: -74.006 },
  { name: 'Sydney', latitude: -33.8679, longitude: 151.2073 },
  { name: 'Tokyo', latitude: 35.6895, longitude: 139.6917 }
]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function daily (city) {
  const file = new URL(`${city.name.replace(/\W+/g, '-')}-${FROM}-${TO}.json`, CACHE)
  try { return JSON.parse(await readFile(file, 'utf8')) } catch {}
  const url = 'https://archive-api.open-meteo.com/v1/archive?' + new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    daily: 'precipitation_sum',
    start_date: `${FROM}-01-01`,
    end_date: `${TO}-12-31`,
    timezone: 'UTC'
  })
  for (;;) {
    const res = await fetch(url)
    if (res.status === 429) {
      console.log(`  rate limited, waiting a minute (${city.name})`)
      await sleep(65_000)
      continue
    }
    if (!res.ok) throw new Error(`${city.name}: ${res.status} ${await res.text()}`)
    const { daily } = await res.json()
    await mkdir(CACHE, { recursive: true })
    await writeFile(file, JSON.stringify(daily))
    return daily
  }
}

function yearly ({ time, precipitation_sum: p }) {
  const years = new Map()
  time.forEach((d, i) => {
    const y = Number(d.slice(0, 4))
    const t = years.get(y) ?? { mm: 0, dry: 0 }
    const v = p[i] ?? 0
    t.mm += v
    if (v < RAIN_DAY_MM) t.dry++
    years.set(y, t)
  })
  return [...years.values()]
}

const results = []
for (const city of CITIES) {
  console.log(city.name)
  results.push({ city, years: yearly(await daily(city)) })
}

const london = results[0].years
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const data = {
  from: FROM,
  to: TO,
  cities: results.map(({ city, years }) => ({
    ...city,
    avgMm: Math.round(mean(years.map(y => y.mm))),
    avgDryDays: Math.round(mean(years.map(y => y.dry))),
    yearsWetterThanLondon: years.filter((y, i) => y.mm > london[i].mm).length
  }))
}

await mkdir(new URL('.', OUT), { recursive: true })
await writeFile(OUT, JSON.stringify(data, null, 2) + '\n')
console.table(data.cities.map(({ name, avgMm, avgDryDays, yearsWetterThanLondon }) => ({ name, avgMm, avgDryDays, yearsWetterThanLondon })))
