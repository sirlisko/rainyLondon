// Netlify resolves the visitor's approximate location from their IP at the edge,
// so the page can show "near you" without a permission prompt or a third-party lookup.
interface Geo {
  city?: string
  country?: { code?: string, name?: string }
  subdivision?: { code?: string, name?: string }
  latitude?: number
  longitude?: number
  timezone?: string
}

export default (_request: Request, context: { geo: Geo }): Response => {
  const { city, country, subdivision, latitude, longitude, timezone } = context.geo
  return Response.json(
    { city, country: country?.name, region: subdivision?.name, latitude, longitude, timezone },
    { headers: { 'cache-control': 'private, no-store' } }
  )
}

export const config = { path: '/api/geo' }
