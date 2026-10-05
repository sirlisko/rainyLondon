import { expect, it } from 'vitest'
import { distanceKm, isSamePlace, LONDON } from '../cities'
import climate from '../data/climate.json'
import { joinNames, rivalsBeaten, versusAverage } from '../ui/climate'

it('measures great-circle distance', () => {
  expect(distanceKm(LONDON, { latitude: 48.8534, longitude: 2.3488 })).toBeCloseTo(343, -1)
})

it('treats a visitor in central London as London, but not Manchester', () => {
  expect(isSamePlace(LONDON, { latitude: 51.4613, longitude: -0.3037 })).toBe(true)
  expect(isSamePlace(LONDON, { latitude: 53.48, longitude: -2.24 })).toBe(false)
})

it('only names rivals that really get more rain than London', () => {
  const avg = (name: string): number => climate.cities.find(c => c.name === name)!.avgMm
  const rivals = rivalsBeaten()
  expect(rivals.length).toBeGreaterThan(0)
  for (const name of rivals) expect(avg(name)).toBeGreaterThan(avg('London'))
})

it('joins names in plain English', () => {
  expect(joinNames([])).toBe('')
  expect(joinNames(['Rome'])).toBe('Rome')
  expect(joinNames(['Rome', 'Sydney'])).toBe('Rome and Sydney')
  expect(joinNames(['Rome', 'New York', 'Sydney'])).toBe('Rome, New York and Sydney')
})

it('compares the last 12 months with the same place\'s 30-year average', () => {
  const avg = climate.cities.find(c => c.name === 'London')!.avgMm
  const period = `${climate.from}–${climate.to}`
  expect(versusAverage(LONDON, avg * 0.9)).toBe(`10% drier than its ${period} average`)
  expect(versusAverage(LONDON, avg * 1.25)).toBe(`25% wetter than its ${period} average`)
  expect(versusAverage(LONDON, avg * 1.01)).toBe(`About average for ${period}`)
  expect(versusAverage({ latitude: 59.91, longitude: 10.75 }, 800)).toBeUndefined()
})
