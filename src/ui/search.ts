import { searchCity, type SearchResult } from '../api'
import { esc } from './format'

export function mountSearch (root: HTMLElement, onPick: (city: SearchResult) => void): void {
  const input = root.querySelector<HTMLInputElement>('input')!
  const list = root.querySelector<HTMLUListElement>('[role="listbox"]')!
  const status = root.querySelector<HTMLElement>('.search__status')!
  let results: SearchResult[] = []
  let active = -1
  let timer: number | undefined
  let inflight: AbortController | undefined

  const close = (): void => {
    list.hidden = true
    input.setAttribute('aria-expanded', 'false')
    input.removeAttribute('aria-activedescendant')
    active = -1
  }

  const paint = (): void => {
    list.innerHTML = results.map((r, i) => `
      <li id="opt-${i}" role="option" aria-selected="${i === active}" data-i="${i}">
        <span class="opt__name">${esc(r.name)}</span>
        <span class="opt__place">${esc([r.region, r.country].filter(Boolean).join(', '))}</span>
      </li>`).join('')
    list.hidden = results.length === 0
    input.setAttribute('aria-expanded', String(!list.hidden))
    if (active >= 0) input.setAttribute('aria-activedescendant', `opt-${active}`)
    else input.removeAttribute('aria-activedescendant')
  }

  const pick = (i: number): void => {
    const r = results[i]
    if (!r) return
    onPick(r)
    input.value = ''
    results = []
    status.textContent = `${r.name} added`
    close()
  }

  input.addEventListener('input', () => {
    clearTimeout(timer)
    const q = input.value.trim()
    if (q.length < 2) { results = []; close(); return }
    timer = window.setTimeout(async () => {
      inflight?.abort()
      inflight = new AbortController()
      try {
        results = await searchCity(q, inflight.signal)
        active = results.length ? 0 : -1
        status.textContent = results.length ? `${results.length} results` : 'No places found'
        paint()
      } catch (err) {
        if ((err as Error).name !== 'AbortError') status.textContent = 'Search is unavailable right now'
      }
    }, 220)
  })

  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!results.length) return
      e.preventDefault()
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length
      paint()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(active)
    } else if (e.key === 'Escape') {
      close()
    }
  })

  list.addEventListener('mousedown', e => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-i]')
    if (li) { e.preventDefault(); pick(Number(li.dataset.i)) }
  })

  input.addEventListener('blur', close)
  input.addEventListener('focus', () => { if (results.length) paint() })
}
