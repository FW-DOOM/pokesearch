interface CacheEntry<T> {
  data: T
  expiresAt: number
}

function get<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() > entry.expiresAt) { localStorage.removeItem(key); return null }
    return entry.data
  } catch { return null }
}

function set<T>(key: string, data: T, ttlMs: number) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, expiresAt: Date.now() + ttlMs }))
  } catch { /* storage full — ignore */ }
}

export async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const cached = get<T>(key)
  if (cached !== null) return cached
  const data = await fn()
  set(key, data, ttlMs)
  return data
}

const MIN = 60_000
export const TTL = {
  CARDS: 10 * MIN,       // card search results: 10 min
  STORES: 15 * MIN,      // store inventory: 15 min
  GEOCODE: 60 * MIN,     // zip → coords: 1 hour
}
