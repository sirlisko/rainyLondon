import { expect, it } from 'vitest'
import { outlookLines } from '../ui/hero'

const base = { hoursSinceRain: null, dryHoursBeforeThisRain: null, restOfDayChance: null }

it('describes a dry spell in whole days', () => {
  expect(outlookLines({ ...base, hoursSinceRain: 80 }, false)).toEqual(['Dry for 3 days.'])
  expect(outlookLines({ ...base, hoursSinceRain: 30 }, false)).toEqual(['Dry for a day.'])
})

it('uses hours for recent rain', () => {
  expect(outlookLines({ ...base, hoursSinceRain: 1 }, false)).toEqual(['Last rain an hour ago.'])
  expect(outlookLines({ ...base, hoursSinceRain: 5 }, false)).toEqual(['Last rain 5 hours ago.'])
})

it('calls out the first rain after a dry spell', () => {
  expect(outlookLines({ ...base, dryHoursBeforeThisRain: 100 }, true)).toEqual(['The first rain in 4 days.'])
  expect(outlookLines({ ...base, dryHoursBeforeThisRain: 10 }, true)).toEqual([])
})

it('suggests an umbrella only when rain is likely', () => {
  expect(outlookLines({ ...base, hoursSinceRain: 0, restOfDayChance: 60 }, false)).toEqual(['Take an umbrella later: 60% chance of rain.'])
  expect(outlookLines({ ...base, hoursSinceRain: 0, restOfDayChance: 10 }, false)).toEqual(['10% chance of rain for the rest of today.'])
  expect(outlookLines({ ...base, hoursSinceRain: 0, restOfDayChance: 0 }, false)).toEqual(['No rain expected for the rest of today.'])
})
