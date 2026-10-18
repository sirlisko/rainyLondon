// Umami is injected by Netlify, so it's absent in dev, tests and behind ad
// blockers — calls are a silent no-op there. Never send the visitor's own
// location: only places they picked themselves.

type EventData = Record<string, string | number | boolean>

declare global {
  interface Window {
    umami?: { track(name: string, data?: EventData): void }
  }
}

// The injected script can load after this module, so early events wait for it.
export function track (name: string, data?: EventData): void {
  const flush = (): void => window.umami?.track(name, data)
  if (document.readyState === 'complete') flush()
  else window.addEventListener('load', flush, { once: true })
}
