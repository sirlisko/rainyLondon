import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import './styles.css'
import { fetchCityById, fetchCurrent, fetchHistory, fetchHourly, fetchVisitorCity, historyRange, type Current, type SearchResult } from './api'
import { cityKey, isSamePlace, LONDON, pickRandom, POOL, VERBANIA, type City } from './cities'
import { describe, isRaining, outlook, stats, type Outlook } from './weather'
import { renderRow, type Entry, type Role, type Scale } from './ui/row'
import { renderClimate, renderClimateRefs } from './ui/climate'
import { renderHero, renderHeroError, shareText } from './ui/hero'
import { mountSearch } from './ui/search'
import { paintTab } from './ui/tab'
import { getUnits, ordinal, setUnits, shortDate, tickClocks, type Units } from './ui/format'

type SortBy = 'mm' | 'dry'

const RANDOM_COUNT = 4
const REFRESH_MS = 15 * 60_000
const HERO_RETRY_MS = 60_000
const SITE_URL = 'https://rainylondon.sirlisko.com/'
const ADDED_KEY = 'added'
const hero = document.querySelector<HTMLElement>('.hero')!
const rows = document.querySelector<HTMLElement>('.rows')!
const climate = document.querySelector<HTMLElement>('.climate')!
const summary = document.querySelector<HTMLElement>('.league__summary')!

let entries: Entry[] = []
let sortBy: SortBy = 'mm'
let londonNow: Current | undefined
let londonOutlook: Outlook | undefined
let visitor: { city: City, current?: Current } | undefined
let lastRefresh = Date.now()
let historyEnd = ''
let lastSummary = ''
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

function renderSummary (list: Entry[]): void {
  const ready = list.filter(e => e.stats)
  const i = ready.findIndex(e => e.role === 'london')
  const what = sortBy === 'mm' ? 'least total rain' : 'most dry days'
  const html = list !== entries && i >= 0
    ? `Over the last 12 months, London has the <strong>${i === 0 ? '' : ordinal(i + 1) + ' '}${what}</strong> of these ${ready.length} places.`
    : ''
  // Live region: rewriting identical text would make screen readers repeat it.
  if (html !== lastSummary) summary.innerHTML = lastSummary = html
}

// Row buttons are identified by their data attribute, so focus can survive a re-render.
function focusedControl (): string | undefined {
  const el = document.activeElement
  if (!(el instanceof HTMLElement) || !rows.contains(el)) return undefined
  for (const attr of ['data-remove', 'data-retry']) {
    const value = el.getAttribute(attr)
    if (value !== null) return `[${attr}="${CSS.escape(value)}"]`
  }
  return undefined
}

function render (): void {
  const list = sorted()
  const ranked = list !== entries
  const s = scale()
  const focused = focusedControl()
  rows.innerHTML = list.map((e, i) => {
    const fresh = !shown.has(e.key)
    shown.add(e.key)
    return renderRow(e, s, ranked ? i + 1 : undefined, fresh)
  }).join('')
  if (focused) rows.querySelector<HTMLElement>(focused)?.focus()
  renderSummary(list)
}

function paintHero (): void {
  if (!londonNow) return
  paintTab(isRaining(londonNow), describe(londonNow.weatherCode).kind, londonNow.isDay)
  renderHero(hero, {
    current: londonNow,
    outlook: londonOutlook,
    visitor: visitor?.current && { name: visitor.city.name, current: visitor.current }
  })
}

async function loadHero (): Promise<void> {
  const [current, hourly] = await Promise.allSettled([fetchCurrent(LONDON), fetchHourly(LONDON)])
  if (current.status === 'rejected') {
    if (!londonNow) {
      renderHeroError(hero)
      setTimeout(() => { void loadHero() }, HERO_RETRY_MS)
    }
    return
  }
  londonNow = current.value
  if (hourly.status === 'fulfilled') londonOutlook = outlook(hourly.value, londonNow.time, isRaining(londonNow))
  paintHero()
}

async function loadVisitorNow (): Promise<void> {
  if (!visitor) return
  try {
    visitor.current = await fetchCurrent(visitor.city)
    paintHero()
  } catch {}
}

function renderAll (): void {
  paintHero()
  renderClimate(climate)
  renderClimateRefs(document)
  render()
}

// Returns whether the 12-month window moved, which happens once a day.
function syncPeriod (): boolean {
  const range = historyRange()
  if (range.end === historyEnd) return false
  historyEnd = range.end
  document.querySelector('.footer__period')!.textContent = `${shortDate(range.start)} to ${shortDate(range.end)}`
  return true
}

async function refreshNow (): Promise<void> {
  lastRefresh = Date.now()
  // A tab left open past midnight UTC would otherwise keep showing yesterday's league.
  if (syncPeriod()) {
    await Promise.all([loadHero(), loadVisitorNow(), ...entries.map(load)])
    return
  }
  await Promise.all([loadHero(), loadVisitorNow()])
  await Promise.all(entries.map(async e => {
    try { e.current = await fetchCurrent(e.city) } catch {}
  }))
  render()
}

const parseIds = (raw: string): number[] =>
  raw.split(',').map(Number).filter(n => Number.isInteger(n) && n > 0)

const addedIds = (): number[] => entries.flatMap(e => e.role === 'added' && e.city.id ? [e.city.id] : [])

function withAdded (href: string, ids: number[]): URL {
  const url = new URL(href)
  if (ids.length) url.searchParams.set('add', ids.join(','))
  else url.searchParams.delete('add')
  return url
}

// A shared link's cities win; otherwise bring back the visitor's own from last time.
function readAdded (): number[] {
  const fromUrl = new URLSearchParams(location.search).get('add')
  if (fromUrl !== null) return parseIds(fromUrl)
  let saved: number[] = []
  try { saved = parseIds(localStorage.getItem(ADDED_KEY) ?? '') } catch {}
  if (saved.length) history.replaceState(null, '', withAdded(location.href, saved))
  return saved
}

function writeAdded (): void {
  const ids = addedIds()
  history.replaceState(null, '', withAdded(location.href, ids))
  try { localStorage.setItem(ADDED_KEY, ids.join(',')) } catch {}
}

function onPick (city: SearchResult): void {
  const existing = byKey(cityKey(city))
  if (existing) {
    rows.querySelector(`[data-key="${CSS.escape(existing.key)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  const entry = addEntry(city, 'added')!
  writeAdded()
  render()
  void load(entry)
}

rows.addEventListener('click', e => {
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

void loadHero()

document.querySelector('.hero__share')!.addEventListener('click', async e => {
  const button = e.currentTarget as HTMLButtonElement
  const text = londonNow ? shareText(londonNow) : document.title
  const url = withAdded(SITE_URL, addedIds()).href
  if (navigator.share) {
    try { await navigator.share({ title: document.title, text, url }) } catch {}
    return
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`)
    button.textContent = 'Link copied'
    setTimeout(() => { button.textContent = 'Share' }, 2000)
  } catch {}
})

const initial: Array<[City, Role]> = [
  [LONDON, 'london'],
  [VERBANIA, 'home'],
  ...pickRandom(POOL, RANDOM_COUNT).map((c): [City, Role] => [c, 'random'])
]
for (const [city, role] of initial) addEntry(city, role)
syncPeriod()
renderClimate(climate)
renderClimateRefs(document)
render()
entries.forEach(e => { void load(e) })

fetchVisitorCity()
  .then(city => {
    if (!city) return
    if (!isSamePlace(city, LONDON)) {
      visitor = { city }
      void loadVisitorNow()
    }
    const near = entries.find(e => isSamePlace(e.city, city))
    if (near) {
      near.nearVisitor = true
      render()
      return
    }
    const entry = addEntry(city, 'you')
    if (!entry) return
    // The visitor's city takes the place of one random city, keeping the league at six.
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

// Hidden tabs skip the poll; visibilitychange catches them up on return.
setInterval(() => { if (!document.hidden) void refreshNow() }, REFRESH_MS)
setInterval(() => { if (!document.hidden) tickClocks(document) }, 60_000)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() - lastRefresh > REFRESH_MS) void refreshNow()
})
