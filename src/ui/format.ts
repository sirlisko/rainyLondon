export type Units = 'metric' | 'imperial'

const UNITS_KEY = 'units'

function initialUnits (): Units {
  try {
    const saved = localStorage.getItem(UNITS_KEY)
    if (saved === 'metric' || saved === 'imperial') return saved
  } catch {}
  return navigator.language === 'en-US' ? 'imperial' : 'metric'
}

let units: Units = initialUnits()

export const getUnits = (): Units => units

export function setUnits (next: Units): void {
  units = next
  try { localStorage.setItem(UNITS_KEY, next) } catch {}
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export const esc = (s: string): string => s.replace(/[&<>"']/g, c => ESCAPES[c])

const whole = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const rainUnit = (): string => units === 'metric' ? 'mm' : 'in'

export const rainValue = (mm: number): string =>
  units === 'metric' ? whole.format(Math.round(mm)) : oneDecimal.format(mm / 25.4)

export const rain = (mm: number): string => `${rainValue(mm)} ${rainUnit()}`

export const temp = (c: number): string =>
  `${Math.round(units === 'metric' ? c : c * 9 / 5 + 32)}°`

export const tempUnit = (): string => units === 'metric' ? 'C' : 'F'

export function localTime (timezone: string, date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(date)
}

export function shortDate (iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`))
}
