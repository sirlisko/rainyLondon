export interface City {
  name: string
  country: string
  latitude: number
  longitude: number
  timezone: string
  note?: string
}

export const LONDON: City = {
  name: 'London',
  country: 'United Kingdom',
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: 'Europe/London',
  note: 'The accused'
}

export const VERBANIA: City = {
  name: 'Verbania',
  country: 'Italy',
  latitude: 45.9214,
  longitude: 8.5518,
  timezone: 'Europe/Rome',
  note: 'Lake Maggiore'
}

export const POOL: City[] = [
  { name: 'Rome', country: 'Italy', latitude: 41.8919, longitude: 12.5113, timezone: 'Europe/Rome' },
  { name: 'Milan', country: 'Italy', latitude: 45.4643, longitude: 9.1895, timezone: 'Europe/Rome' },
  { name: 'Paris', country: 'France', latitude: 48.8534, longitude: 2.3488, timezone: 'Europe/Paris' },
  { name: 'Dublin', country: 'Ireland', latitude: 53.3331, longitude: -6.2489, timezone: 'Europe/Dublin' },
  { name: 'Glasgow', country: 'United Kingdom', latitude: 55.8651, longitude: -4.2576, timezone: 'Europe/London' },
  { name: 'Bergen', country: 'Norway', latitude: 60.392, longitude: 5.328, timezone: 'Europe/Oslo' },
  { name: 'New York', country: 'United States', latitude: 40.7143, longitude: -74.006, timezone: 'America/New_York' },
  { name: 'Seattle', country: 'United States', latitude: 47.6062, longitude: -122.3321, timezone: 'America/Los_Angeles' },
  { name: 'Miami', country: 'United States', latitude: 25.7743, longitude: -80.1937, timezone: 'America/New_York' },
  { name: 'Rio de Janeiro', country: 'Brazil', latitude: -22.9064, longitude: -43.1822, timezone: 'America/Sao_Paulo' },
  { name: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.6917, timezone: 'Asia/Tokyo' },
  { name: 'Singapore', country: 'Singapore', latitude: 1.2897, longitude: 103.8501, timezone: 'Asia/Singapore' },
  { name: 'Mumbai', country: 'India', latitude: 19.0728, longitude: 72.8826, timezone: 'Asia/Kolkata' },
  { name: 'Sydney', country: 'Australia', latitude: -33.8679, longitude: 151.2073, timezone: 'Australia/Sydney' },
  { name: 'Cairo', country: 'Egypt', latitude: 30.0626, longitude: 31.2497, timezone: 'Africa/Cairo' }
]

export function pickRandom (pool: City[], n: number): City[] {
  const copy = [...pool]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

export const cityKey = (c: City): string => `${c.latitude.toFixed(2)},${c.longitude.toFixed(2)}`

// IP geolocation is only city-accurate, so anything this close counts as the same place.
const SAME_PLACE_KM = 30

export const isSamePlace = (a: Pick<City, 'latitude' | 'longitude'>, b: Pick<City, 'latitude' | 'longitude'>): boolean =>
  distanceKm(a, b) < SAME_PLACE_KM

export function distanceKm (a: Pick<City, 'latitude' | 'longitude'>, b: Pick<City, 'latitude' | 'longitude'>): number {
  const rad = (d: number): number => d * Math.PI / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLon = rad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
