// PokeSearch Service Worker — network-first so iOS PWA always loads fresh builds
const CACHE = 'pokesearch-v1'

// Install immediately — don't wait for old SW to die
self.addEventListener('install', () => self.skipWaiting())

// Activate — clear any old caches, then take control of all open tabs
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  if (!req.url.startsWith('http')) return

  // Never intercept API / pokemon data calls — let them hit the network directly
  if (
    req.url.includes('pokemontcg.io') ||
    req.url.includes('nominatim.openstreetmap.org') ||
    req.url.includes('/api/')
  ) return

  // Network-first: always try the network, fall back to cache when offline
  e.respondWith(
    fetch(req)
      .then(res => {
        // Store a copy for offline fallback
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(req, clone))
        }
        return res
      })
      .catch(() => caches.match(req))
  )
})
