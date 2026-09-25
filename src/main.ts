import './styles.css'
import { fetchCityById, fetchCurrent, fetchHistory, fetchVisitorCity, fetchYearly, historyRange, type Current, type SearchResult } from './api'
import { cityKey, distanceKm, LONDON, pickRandom, POOL, VERBANIA, type City } from './cities'
import { stats } from './weather'
import { renderCard, type Entry, type Role, type Scale } from './ui/card'
import { renderClimate, type ClimateSeries } from './ui/climate'
import { renderHero, renderHeroError } from './ui/hero'
import { mountSearch } from './ui/search'
import { getUnits, rain, setUnits, shortDate, type Units } from './ui/format'

type SortBy = 'mm' | 'dry'

const RANDOM_COUNT = 4
// IP geolocation is only city-accurate, so anything this close counts as the same place.
const SAME_PLACE_KM = 30
const REFRESH_MS = 15 * 60_000
const hero = document.querySelector<HTMLElement>('.hero')!
const grid = document.querySelector<HTMLElement>('.grid')!
const punchline = document.querySelector<HTMLElement>('.punchline__body')!
const climate = document.querySelector<HTMLElement>('.climate')!
const summary = document.querySelector<HTMLElement>('.league__summary')!

let entries: Entry[] = []
let sortBy: SortBy = 'mm'
let londonNow: Current | undefined
let climateData: ClimateSeries | undefined
let lastRefresh = Date.now()
const shown = new Set<string>()

const byKey = (key: string): Entry | undefined => entries.find(e => e.key === key)

function addEntry (city: Entry['city'], role: Role): Entry | undefined {
  const key = cityKey(city)
  if (byKey(key)) return undefined
  const entry: Entry = { key, city, role }
  entries.push(entry)
  return entry
}

async function load (entry: Entry): Promise<void> {
  entry.failed = false
  const [current, history] = await Promise.allSettled([fetchCurrent(entry.city), fetchHistory(entry.city)])
  if (!byKey(entry.key)) return
  if (current.status === 'fulfilled') entry.current = current.value
  if (history.status === 'fulfilled') entry.stats = stats(history.value)
  entry.failed = history.status === 'rejected'
  render()
}

function scale (): Scale {
  const ready = entries.flatMap(e => e.stats ? [e.stats] : [])
  return {
    maxTotalMm: Math.max(1, ...ready.map(s => s.totalMm)),
    maxDailyMm: Math.max(1, ...ready.flatMap(s => s.last30))
  }
}

function sorted (): Entry[] {
  if (entries.some(e => !e.stats && !e.failed)) return entries
  // Lower is better in both orders: least rain first, most dry days first.
  const metric = (e: Entry): number => e.stats
    ? (sortBy === 'mm' ? e.stats.totalMm : -e.stats.dryDays)
    : Infinity
  return [...entries].sort((a, b) => metric(a) - metric(b))
}

const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

function renderPunchline (): void {
  const london = byKey(cityKey(LONDON))?.stats
  const home = byKey(cityKey(VERBANIA))?.stats
  if (!london || !home) return
  const ratio = home.totalMm / london.totalMm
  const comparison = ratio >= 1.05
    ? `<strong>${ratio.toFixed(1)}×</strong> as much`
    : ratio <= 0.95
      ? `only <strong>${Math.round(ratio * 100)}%</strong> of that`
      : 'about the same'
  const { start, end } = historyRange()
  punchline.innerHTML = `
    <p class="punchline__lead">Over the last 12 months, London got <strong>${rain(london.totalMm)}</strong> of rain.
      Verbania, on Lake Maggiore, got <strong>${rain(home.totalMm)}</strong>. That's ${comparison}.</p>
    <p class="punchline__sub">London was dry (under 1 mm of rain) on ${london.dryDays} of ${london.days} days. The lake was dry on ${home.dryDays}.
      <span class="punchline__period">${shortDate(start)} to ${shortDate(end)}</span></p>`
  punchline.setAttribute('aria-busy', 'false')
}

function renderSummary (list: Entry[]): void {
  const ready = list.filter(e => e.stats)
  const i = ready.findIndex(e => e.role === 'london')
  if (list !== entries && i >= 0) {
    const what = sortBy === 'mm' ? 'least total rain' : 'most dry days'
    summary.innerHTML = `Of these ${ready.length} places, London has the <strong>${i === 0 ? '' : ordinal(i + 1) + ' '}${what}</strong>.`
  } else {
    summary.textContent = ''
  }
}

function render (): void {
  const list = sorted()
  const ranked = list !== entries
  const s = scale()
  grid.innerHTML = list.map((e, i) => {
    const fresh = !shown.has(e.key)
    shown.add(e.key)
    return renderCard(e, s, ranked ? i + 1 : undefined, fresh)
  }).join('')
  renderPunchline()
  renderSummary(list)
}

function renderAll (): void {
  if (londonNow) renderHero(hero, londonNow)
  if (climateData) renderClimate(climate, climateData)
  render()
}

async function refreshNow (): Promise<void> {
  lastRefresh = Date.now()
  try {
    londonNow = await fetchCurrent(LONDON)
    renderHero(hero, londonNow)
  } catch {}
  await Promise.all(entries.map(async e => {
    try { e.current = await fetchCurrent(e.city) } catch {}
  }))
  render()
}

function readAdded (): number[] {
  const raw = new URLSearchParams(location.search).get('add') ?? ''
  return raw.split(',').map(Number).filter(n => Number.isInteger(n) && n > 0)
}

function writeAdded (): void {
  const ids = entries.flatMap(e => e.role === 'added' && e.city.id ? [e.city.id] : [])
  const url = new URL(location.href)
  if (ids.length) url.searchParams.set('add', ids.join(','))
  else url.searchParams.delete('add')
  history.replaceState(null, '', url)
}

function onPick (city: SearchResult): void {
  const existing = byKey(cityKey(city))
  if (existing) {
    grid.querySelector(`[data-key="${CSS.escape(existing.key)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  const entry = addEntry(city, 'added')!
  writeAdded()
  render()
  void load(entry)
}

function loadClimate (): void {
  Promise.all([fetchYearly(LONDON), fetchYearly(VERBANIA)])
    .then(([london, lake]) => {
      climateData = { london, lake }
      renderClimate(climate, climateData)
    })
    .catch(() => {
      climate.innerHTML = '<p class="climate__error">Couldn\'t load the 30-year record. <button class="link" type="button">Retry</button></p>'
      climate.querySelector('button')!.addEventListener('click', loadClimate)
    })
}

grid.addEventListener('click', e => {
  const target = e.target as HTMLElement
  const remove = target.closest<HTMLElement>('[data-remove]')?.dataset.remove
  const retry = target.closest<HTMLElement>('[data-retry]')?.dataset.retry
  if (remove) {
    entries = entries.filter(x => x.key !== remove)
    writeAdded()
    render()
  } else if (retry) {
    const entry = byKey(retry)
    if (entry) void load(entry)
  }
})

function bindToggle (attr: string, current: string, onChange: (value: string) => void): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(`[${attr}]`)
  const press = (value: string): void => buttons.forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value)))
  press(current)
  buttons.forEach(btn => btn.addEventListener('click', () => {
    const value = btn.getAttribute(attr)!
    press(value)
    onChange(value)
  }))
}

bindToggle('data-sort', sortBy, value => { sortBy = value as SortBy; render() })
bindToggle('data-units', getUnits(), value => { setUnits(value as Units); renderAll() })

mountSearch(document.querySelector<HTMLElement>('.search')!, onPick)

fetchCurrent(LONDON)
  .then(current => { londonNow = current; renderHero(hero, current) })
  .catch(() => renderHeroError(hero))

const initial: Array<[City, Role]> = [
  [LONDON, 'london'],
  [VERBANIA, 'home'],
  ...pickRandom(POOL, RANDOM_COUNT).map((c): [City, Role] => [c, 'random'])
]
for (const [city, role] of initial) addEntry(city, role)
render()
entries.forEach(e => { void load(e) })

fetchVisitorCity()
  .then(city => {
    if (!city) return
    const near = entries.find(e => distanceKm(e.city, city) < SAME_PLACE_KM)
    if (near) {
      near.nearVisitor = true
      render()
      return
    }
    const entry = addEntry(city, 'you')
    if (!entry) return
    // The visitor's city takes the place of one random city, keeping the grid at six.
    const lastRandom = entries.findLast(e => e.role === 'random')
    entries = entries.filter(e => e !== entry && e !== lastRandom)
    entries.splice(2, 0, entry)
    render()
    void load(entry)
  })
  .catch(() => {})

readAdded().forEach(id => {
  fetchCityById(id)
    .then(city => {
      const entry = addEntry(city, 'added')
      if (!entry) return
      render()
      void load(entry)
    })
    .catch(() => {})
})

// The 30-year request is the heaviest one; only make it when the section is about to be seen.
new IntersectionObserver((seen, obs) => {
  if (seen.some(s => s.isIntersecting)) {
    obs.disconnect()
    loadClimate()
  }
}, { rootMargin: '600px' }).observe(climate)

setInterval(() => { void refreshNow() }, REFRESH_MS)
// Keeps the local clocks on the hero and cards current.
setInterval(() => {
  if (document.hidden) return
  if (londonNow) renderHero(hero, londonNow)
  render()
}, 60_000)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() - lastRefresh > REFRESH_MS) void refreshNow()
})

const range = historyRange()
document.querySelector('.footer__period')!.textContent = `${shortDate(range.start)} to ${shortDate(range.end)}`
