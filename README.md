# Rainy London

Is it raining in London right now? Probably not.

A live answer, plus a year of real rainfall data comparing London with Lake Maggiore and cities around the world. Search any city to add it to the comparison; added cities are kept in the URL (`?add=<geonames ids>`) so a comparison can be shared.

## Develop

```sh
npm install
npm run dev
```

`npm run build` type-checks and outputs a static site to `dist/`.

Deployed on Netlify at https://rainylondon.sirlisko.com. The "near you" card comes from a Netlify Edge Function (`netlify/edge-functions/geo.ts`) using Netlify's IP geolocation; it only works under `netlify dev` or when deployed, and the page simply skips that card elsewhere.

## Data

All weather data comes from [Open-Meteo](https://open-meteo.com/) (CC BY 4.0), no API key needed:

- current conditions from the Forecast API
- the last 365 days of daily precipitation from the Historical Weather API (ERA5, which lags about 5 days behind)
- 1996–2025 yearly totals for London and Lake Maggiore, from the same API
- city search from the Geocoding API

A "dry day" is a day with less than 1 mm of precipitation, the flip side of the usual meteorological "rain day" definition.
