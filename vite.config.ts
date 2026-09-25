import { defineConfig } from 'vite'

// The hero's giant "No." and its caption render before the fonts would otherwise be
// discovered (they're referenced from CSS), so preload those two faces.
const PRELOAD = ['instrument-serif-latin-400-normal', 'inter-latin-400-normal']

export default defineConfig({
  plugins: [{
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml (_html, { bundle }) {
      return Object.keys(bundle ?? {})
        .filter(file => file.endsWith('.woff2') && PRELOAD.some(name => file.includes(name)))
        .map(file => ({
          tag: 'link',
          attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
          injectTo: 'head' as const
        }))
    }
  }]
})
