import { describe as group, expect, it } from 'vitest'
import type { Current, Hourly } from '../api'
import { describe, isRaining, outlook, stats } from '../weather'

const current = (weatherCode: number, precipitation = 0): Current =>
  ({ time: '2026-09-25T12:00', temperature: 18, precipitation, weatherCode, isDay: true })

group('isRaining', () => {
  it('is true for drizzle, rain and storms', () => {
    expect(isRaining(current(51))).toBe(true)
    expect(isRaining(current(63))).toBe(true)
    expect(isRaining(current(95))).toBe(true)
  })

  it('is false for dry conditions, including overcast', () => {
    expect(isRaining(current(0))).toBe(false)
    expect(isRaining(current(3))).toBe(false)
  })

  it('trusts measured precipitation over the weather code', () => {
    expect(isRaining(current(3, 0.2))).toBe(true)
  })

  it('treats unknown codes as cloudy, not raining', () => {
    expect(describe(42)).toEqual({ label: 'Unknown', kind: 'cloud' })
  })
})

group('stats', () => {
  it('counts days under 1 mm as dry', () => {
    const s = stats({ dates: ['a', 'b', 'c', 'd'], precipitation: [0, 0.9, 1, 12] })
    expect(s.dryDays).toBe(2)
    expect(s.totalMm).toBeCloseTo(13.9)
    expect(s.days).toBe(4)
  })

  it('takes the last 30 days for the recent summary', () => {
    const precipitation = [...Array(40).fill(5), ...Array(30).fill(0)]
    const s = stats({ dates: precipitation.map(String), precipitation })
    expect(s.last30Mm).toBe(0)
    expect(s.last30DryDays).toBe(30)
  })
})

group('outlook', () => {
  // Hourly series starting at midnight on 20 Sept, `rainAt` hour offsets are wet.
  function hourly (hours: number, rainAt: number[], probability: (i: number) => number | null = () => 0): Hourly {
    const start = Date.UTC(2026, 8, 20)
    const time = Array.from({ length: hours }, (_, i) => new Date(start + i * 3_600_000).toISOString().slice(0, 16))
    return { time, precipitation: time.map((_, i) => rainAt.includes(i) ? 0.5 : 0), probability: time.map((_, i) => probability(i)) }
  }
  const nowAt = (h: Hourly, i: number): string => h.time[i]

  it('reports hours since the last wet hour', () => {
    const h = hourly(24 * 7, [10])
    expect(outlook(h, nowAt(h, 10 + 72), false).hoursSinceRain).toBe(72)
  })

  it('reports null when there was no rain in the window', () => {
    const h = hourly(48, [])
    expect(outlook(h, nowAt(h, 30), false).hoursSinceRain).toBeNull()
  })

  it('measures the dry gap before the current spell of rain', () => {
    const h = hourly(24 * 7, [5, 100, 101, 102])
    expect(outlook(h, nowAt(h, 102), true).dryHoursBeforeThisRain).toBe(94)
  })

  it('takes the highest chance of rain for the rest of the same day only', () => {
    const h = hourly(48, [], i => i === 20 ? 70 : i === 30 ? 90 : 10)
    expect(outlook(h, nowAt(h, 12), false).restOfDayChance).toBe(70)
  })

  it('finds when rain is likely to start, ignoring unlikely traces', () => {
    const h = hourly(48, [14, 16, 17], i => i === 14 ? 20 : 70)
    expect(outlook(h, nowAt(h, 12), false).turn).toEqual({ at: '16:00', tomorrow: false })
  })

  it('finds when the current rain should stop, flagging tomorrow', () => {
    const h = hourly(48, [22, 23, 24, 25], () => 80)
    expect(outlook(h, nowAt(h, 22), true).turn).toEqual({ at: '02:00', tomorrow: true })
  })

  it('looks twelve hours ahead', () => {
    const h = hourly(48, [30], () => 90)
    const o = outlook(h, nowAt(h, 12), false)
    expect(o.ahead).toHaveLength(12)
    expect(o.ahead[0].time).toBe(h.time[13])
    expect(o.turn).toBeNull()
  })

  it('has no rest-of-day chance in the last hour of the day', () => {
    const h = hourly(48, [], () => 40)
    expect(outlook(h, nowAt(h, 23), false).restOfDayChance).toBeNull()
  })
})
