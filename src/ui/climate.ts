import type { YearTotal } from '../weather'
import { esc, rain, rainUnit, rainValue } from './format'

export interface ClimateSeries {
  london: YearTotal[]
  lake: YearTotal[]
}

const H = 280
const PAD = { top: 16, right: 8, bottom: 28, left: 44 }

let observer: ResizeObserver | undefined

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length

function niceStep (max: number, ticks: number): number {
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw)!
}

// Square at the baseline, rounded at the data end.
function column (x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

function chart (data: ClimateSeries, width: number): string {
  const years = data.london.map(d => d.year)
  const innerW = width - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const max = Math.max(...data.lake.map(d => d.mm), ...data.london.map(d => d.mm))
  const toUnit = (mm: number): number => rainUnit() === 'mm' ? mm : mm / 25.4
  const step = niceStep(toUnit(max), 4)
  const top = Math.ceil(toUnit(max) / step) * step
  const y = (mm: number): number => PAD.top + innerH - (toUnit(mm) / top) * innerH

  const band = innerW / years.length
  const colW = Math.max(2, Math.min(12, (band - 4) / 2))
  const gap = colW >= 4 ? 2 : 1

  const grid = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => {
    const v = i * step
    const gy = PAD.top + innerH - (v / top) * innerH
    return `<line class="chart__grid${i === 0 ? ' chart__grid--base' : ''}" x1="${PAD.left}" x2="${width - PAD.right}" y1="${gy}" y2="${gy}"/>
      <text class="chart__tick" x="${PAD.left - 8}" y="${gy + 4}" text-anchor="end">${v.toLocaleString('en-GB')}</text>`
  }).join('')

  const labelEvery = band < 18 ? 10 : 5
  const xLabels = years.map((yr, i) => yr % labelEvery === 0 || i === 0 || i === years.length - 1
    ? `<text class="chart__tick" x="${PAD.left + band * i + band / 2}" y="${H - 8}" text-anchor="middle">${yr}</text>`
    : '').join('')

  const cols = years.map((_, i) => {
    const cx = PAD.left + band * i + band / 2
    const l = data.london[i]
    const k = data.lake[i]
    return `<path class="chart__col chart__col--london" d="${column(cx - gap / 2 - colW, y(l.mm), colW, y(0) - y(l.mm))}"/>
      <path class="chart__col chart__col--lake" d="${column(cx + gap / 2, y(k.mm), colW, y(0) - y(k.mm))}"/>
      <rect class="chart__hit" data-i="${i}" x="${PAD.left + band * i}" y="${PAD.top}" width="${band}" height="${innerH}"/>`
  }).join('')

  const avgLine = (series: YearTotal[]): string => {
    const ay = y(mean(series.map(d => d.mm)))
    return `<line class="chart__avg" x1="${PAD.left}" x2="${width - PAD.right}" y1="${ay}" y2="${ay}"/>`
  }

  return `<svg class="chart__svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" role="img"
      aria-label="Yearly rainfall ${years[0]} to ${years.at(-1)}, London and Lake Maggiore. The data table below lists every value.">
    ${grid}${xLabels}${cols}
    ${avgLine(data.lake)}${avgLine(data.london)}
  </svg>`
}

function table (data: ClimateSeries): string {
  return `<table>
    <thead><tr><th scope="col">Year</th><th scope="col">London (${rainUnit()})</th><th scope="col">Lake Maggiore (${rainUnit()})</th><th scope="col">London dry days</th><th scope="col">Lake dry days</th></tr></thead>
    <tbody>${data.london.map((l, i) => {
      const k = data.lake[i]
      return `<tr><th scope="row">${l.year}</th><td>${rainValue(l.mm)}</td><td>${rainValue(k.mm)}</td><td>${l.dryDays}</td><td>${k.dryDays}</td></tr>`
    }).join('')}</tbody></table>`
}

export function renderClimate (root: HTMLElement, data: ClimateSeries): void {
  const n = data.london.length
  const wetterYears = data.lake.filter((k, i) => k.mm > data.london[i].mm).length
  const lAvg = mean(data.london.map(d => d.mm))
  const kAvg = mean(data.lake.map(d => d.mm))
  const lDry = Math.round(mean(data.london.map(d => d.dryDays)))
  const kDry = Math.round(mean(data.lake.map(d => d.dryDays)))
  const first = data.london[0].year
  const last = data.london[n - 1].year

  root.innerHTML = `
    <h2 class="climate__title">Thirty years, same story.</h2>
    <p class="climate__lead">${wetterYears === n
      ? `In <strong>every one</strong> of the last ${n} years, Lake Maggiore got more rain than London.`
      : `In <strong>${wetterYears} of the last ${n} years</strong>, Lake Maggiore got more rain than London.`}
      On average it gets ${(kAvg / lAvg).toFixed(1)}× as much.</p>
    <div class="climate__stats">
      <div class="stat"><span class="swatch swatch--london"></span><p class="stat__label">London, yearly average</p>
        <p class="stat__value">${rain(lAvg)}</p><p class="stat__sub">${lDry} dry days a year</p></div>
      <div class="stat"><span class="swatch swatch--lake"></span><p class="stat__label">Lake Maggiore, yearly average</p>
        <p class="stat__value">${rain(kAvg)}</p><p class="stat__sub">${kDry} dry days a year</p></div>
    </div>
    <figure class="chart">
      <figcaption class="chart__legend">
        <span><span class="swatch swatch--london"></span>London</span>
        <span><span class="swatch swatch--lake"></span>Lake Maggiore (Verbania)</span>
        <span><span class="swatch swatch--avg"></span>30-year average</span>
        <span class="chart__caption">Total rain per year (${rainUnit()}), ${first}–${last}</span>
      </figcaption>
      <div class="chart__plot"></div>
      <div class="chart__tip" role="status" hidden></div>
    </figure>
    <details class="chart__table"><summary>Show the data table</summary>${table(data)}</details>`

  const plot = root.querySelector<HTMLElement>('.chart__plot')!
  const tip = root.querySelector<HTMLElement>('.chart__tip')!
  let active = -1

  const draw = (): void => {
    const w = plot.clientWidth
    if (w > 0) plot.innerHTML = chart(data, w)
  }

  const show = (i: number, hit: SVGRectElement): void => {
    if (i === active) return
    active = i
    const l = data.london[i]
    const k = data.lake[i]
    tip.innerHTML = `<strong>${l.year}</strong>
      <span><span class="swatch swatch--london"></span>London ${esc(rain(l.mm))}</span>
      <span><span class="swatch swatch--lake"></span>Lake Maggiore ${esc(rain(k.mm))}</span>
      <span class="chart__tip-ratio">${(k.mm / l.mm).toFixed(1)}× London</span>`
    tip.hidden = false
    const box = hit.getBoundingClientRect()
    const host = plot.parentElement!.getBoundingClientRect()
    const right = box.right - host.left + 8
    const fitsRight = right + tip.offsetWidth <= host.width
    tip.style.top = `${plot.offsetTop}px`
    tip.style.left = `${fitsRight ? right : box.left - host.left - 8 - tip.offsetWidth}px`
    plot.querySelectorAll('.chart__hit--on').forEach(el => el.classList.remove('chart__hit--on'))
    hit.classList.add('chart__hit--on')
  }

  const hide = (): void => {
    active = -1
    tip.hidden = true
    plot.querySelectorAll('.chart__hit--on').forEach(el => el.classList.remove('chart__hit--on'))
  }

  plot.addEventListener('pointermove', e => {
    const hit = (e.target as Element).closest<SVGRectElement>('.chart__hit')
    if (hit) show(Number(hit.dataset.i), hit)
    else hide()
  })
  plot.addEventListener('pointerleave', hide)

  observer?.disconnect()
  observer = new ResizeObserver(draw)
  observer.observe(plot)
}
