// Premium box data, favorites management, Reddit restock alerts, and notifications

export type BoxType = 'etb' | 'booster-box' | 'upc' | 'premium-collection' | 'tin'

export interface RestockSchedule {
  store: string
  days: string
  time: string
  notes?: string
}

export interface StoreLink {
  store: string
  url: string
  price?: number
  isRetail?: boolean
}

export interface PremiumBox {
  id: string
  name: string
  type: BoxType
  msrp: number
  imageUrl: string
  setTag?: string
  isHot?: boolean
  stockStatus: 'hard-to-find' | 'limited' | 'available'
  restockSchedule: RestockSchedule[]
  storeLinks: StoreLink[]
}

export interface RedditAlert {
  title: string
  url: string
  store?: string
  postedAgo: string
  upvotes: number
}

// ─── Curated premium box catalog ─────────────────────────────────────────────

export const PREMIUM_BOXES: PremiumBox[] = [
  // ── Team Rocket (Destined Rivals) ─────────────────────────────────────────
  {
    id: 'destined-rivals-bbox',
    name: 'Destined Rivals Booster Box',
    type: 'booster-box',
    msrp: 143.99,
    imageUrl: 'https://images.pokemontcg.io/sv10/logo.png',
    setTag: 'Team Rocket',
    isHot: true,
    stockStatus: 'hard-to-find',
    restockSchedule: [
      { store: 'Target',         days: 'Tue & Thu',   time: '7–8 AM',     notes: 'Check electronics aisle early, sells in minutes' },
      { store: 'Walmart',        days: 'Mon – Thu',   time: '6–7 AM',     notes: 'Overnight shelf restock' },
      { store: 'Best Buy',       days: 'Varies',      time: '7 AM ET',    notes: 'Online drops — add to cart fast' },
      { store: 'GameStop',       days: 'Random',      time: 'Call ahead', notes: 'Very limited quantities' },
      { store: 'Pokémon Center', days: 'Periodic',    time: '9–11 AM ET', notes: 'Sign up for restock emails at pokemoncenter.com' },
      { store: 'Amazon',         days: 'Daily drops', time: 'Varies',     notes: 'Watch for sold-by Amazon listings at MSRP' },
    ],
    storeLinks: [
      { store: 'Pokémon Center', url: 'https://www.pokemoncenter.com/en-us/product/10-10157-101',                                         price: 143.99, isRetail: true },
      { store: 'Amazon',         url: 'https://www.amazon.com/dp/B0F2GZJ3TZ',                                                             price: 143.99, isRetail: true },
      { store: 'Best Buy',       url: 'https://www.bestbuy.com/site/searchpage.jsp?st=destined+rivals+booster+box',                       price: 143.99, isRetail: true },
      { store: 'GameStop',       url: 'https://www.gamestop.com/search#q=destined+rivals+booster+box',                                    price: 143.99, isRetail: true },
      { store: 'Target',         url: 'https://www.target.com/s?searchTerm=destined+rivals+booster+box',                                  price: 143.99, isRetail: true },
      { store: 'Walmart',        url: 'https://www.walmart.com/search?q=pokemon+destined+rivals+booster+box',                             price: 143.99, isRetail: true },
      { store: 'TCGPlayer',      url: 'https://www.tcgplayer.com/product/624679/pokemon-sv10-destined-rivals-destined-rivals-booster-box' },
      { store: 'eBay',           url: 'https://www.ebay.com/sch/i.html?_nkw=pokemon+destined+rivals+booster+box+sealed' },
    ],
  },
  {
    id: 'destined-rivals-etb',
    name: 'Destined Rivals Elite Trainer Box',
    type: 'etb',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv10/logo.png',
    setTag: 'Team Rocket',
    isHot: true,
    stockStatus: 'hard-to-find',
    restockSchedule: [
      { store: 'Target',         days: 'Tue & Thu',   time: '7–8 AM' },
      { store: 'Walmart',        days: 'Mon – Thu',   time: '6–7 AM' },
      { store: 'Best Buy',       days: 'Varies',      time: '7 AM ET' },
      { store: 'GameStop',       days: 'Random',      time: 'Call store' },
      { store: 'Pokémon Center', days: 'Periodic',    time: '9–11 AM ET' },
    ],
    storeLinks: [
      { store: 'Pokémon Center', url: 'https://www.pokemoncenter.com/en-us/search?q=destined+rivals+elite+trainer',       price: 49.99, isRetail: true },
      { store: 'Target',         url: 'https://www.target.com/s?searchTerm=destined+rivals+elite+trainer+box',            price: 49.99, isRetail: true },
      { store: 'Walmart',        url: 'https://www.walmart.com/search?q=destined+rivals+elite+trainer+box',               price: 49.99, isRetail: true },
      { store: 'Best Buy',       url: 'https://www.bestbuy.com/site/searchpage.jsp?st=destined+rivals+elite+trainer',     price: 49.99, isRetail: true },
      { store: 'GameStop',       url: 'https://www.gamestop.com/search#q=destined+rivals+elite+trainer',                  price: 49.99, isRetail: true },
      { store: 'TCGPlayer',      url: 'https://www.tcgplayer.com/search/pokemon/product?q=destined+rivals+elite+trainer' },
      { store: 'eBay',           url: 'https://www.ebay.com/sch/i.html?_nkw=pokemon+destined+rivals+elite+trainer+box+sealed' },
    ],
  },

  // ── Prismatic Evolutions ──────────────────────────────────────────────────
  {
    id: 'prismatic-etb',
    name: 'Prismatic Evolutions Elite Trainer Box',
    type: 'etb',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv8pt5/logo.png',
    setTag: 'Prismatic Evolutions',
    isHot: true,
    stockStatus: 'hard-to-find',
    restockSchedule: [
      { store: 'Best Buy',       days: 'Varies',      time: '7 AM ET',    notes: 'Invite-only lottery — sign up free at bestbuy.com' },
      { store: 'Target',         days: 'Tue & Thu',   time: '7–8 AM',     notes: 'Extremely rare, sells in seconds' },
      { store: 'Walmart',        days: 'Mon – Thu',   time: '6–7 AM',     notes: 'Overnight shelf restock' },
      { store: 'GameStop',       days: 'Varies',      time: 'Call store',  notes: 'Limited stock when available' },
      { store: 'Pokémon Center', days: 'Rare drops',  time: '9–11 AM ET', notes: 'Sign up for restock emails' },
    ],
    storeLinks: [
      { store: 'Best Buy',       url: 'https://www.bestbuy.com/site/searchpage.jsp?st=prismatic+evolutions+elite+trainer+box',             price: 49.99, isRetail: true },
      { store: 'Target',         url: 'https://www.target.com/s?searchTerm=prismatic+evolutions+elite+trainer+box',                        price: 49.99, isRetail: true },
      { store: 'Walmart',        url: 'https://www.walmart.com/search?q=prismatic+evolutions+elite+trainer+box',                           price: 49.99, isRetail: true },
      { store: 'GameStop',       url: 'https://www.gamestop.com/search#q=prismatic+evolutions+elite+trainer+box',                          price: 49.99, isRetail: true },
      { store: 'Pokémon Center', url: 'https://www.pokemoncenter.com/en-us/search?q=prismatic+evolutions',                                 price: 49.99, isRetail: true },
      { store: 'TCGPlayer',      url: 'https://www.tcgplayer.com/search/pokemon/product?q=prismatic+evolutions+elite+trainer+box' },
      { store: 'eBay',           url: 'https://www.ebay.com/sch/i.html?_nkw=prismatic+evolutions+elite+trainer+box+sealed' },
    ],
  },
  {
    id: 'prismatic-bbox',
    name: 'Prismatic Evolutions Booster Box',
    type: 'booster-box',
    msrp: 143.99,
    imageUrl: 'https://images.pokemontcg.io/sv8pt5/logo.png',
    setTag: 'Prismatic Evolutions',
    isHot: true,
    stockStatus: 'hard-to-find',
    restockSchedule: [
      { store: 'Target',         days: 'Tue & Thu',   time: '7–8 AM' },
      { store: 'Walmart',        days: 'Mon – Thu',   time: '6–7 AM' },
      { store: 'Best Buy',       days: 'Varies',      time: '7 AM ET' },
      { store: 'GameStop',       days: 'Varies',      time: 'Call store' },
    ],
    storeLinks: [
      { store: 'Target',    url: 'https://www.target.com/s?searchTerm=prismatic+evolutions+booster+box',                  price: 143.99, isRetail: true },
      { store: 'Walmart',   url: 'https://www.walmart.com/search?q=prismatic+evolutions+booster+box',                     price: 143.99, isRetail: true },
      { store: 'Best Buy',  url: 'https://www.bestbuy.com/site/searchpage.jsp?st=prismatic+evolutions+booster+box',       price: 143.99, isRetail: true },
      { store: 'TCGPlayer', url: 'https://www.tcgplayer.com/search/pokemon/product?q=prismatic+evolutions+booster+box' },
      { store: 'eBay',      url: 'https://www.ebay.com/sch/i.html?_nkw=prismatic+evolutions+booster+box+sealed' },
    ],
  },

  // ── Surging Sparks ────────────────────────────────────────────────────────
  {
    id: 'surging-sparks-etb',
    name: 'Surging Sparks Elite Trainer Box',
    type: 'etb',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv8/logo.png',
    setTag: 'Surging Sparks',
    stockStatus: 'limited',
    restockSchedule: [
      { store: 'Target',   days: 'Tue & Thu', time: '7–8 AM' },
      { store: 'Walmart',  days: 'Mon – Thu', time: '6–7 AM' },
      { store: 'GameStop', days: 'Varies',    time: 'Call store' },
    ],
    storeLinks: [
      { store: 'Target',    url: 'https://www.target.com/s?searchTerm=surging+sparks+elite+trainer+box',    price: 49.99, isRetail: true },
      { store: 'Walmart',   url: 'https://www.walmart.com/search?q=surging+sparks+elite+trainer+box',       price: 49.99, isRetail: true },
      { store: 'GameStop',  url: 'https://www.gamestop.com/search#q=surging+sparks+elite+trainer+box',      price: 49.99, isRetail: true },
      { store: 'Amazon',    url: 'https://www.amazon.com/s?k=surging+sparks+elite+trainer+box',             price: 49.99, isRetail: true },
      { store: 'TCGPlayer', url: 'https://www.tcgplayer.com/search/pokemon/product?q=surging+sparks+elite+trainer' },
      { store: 'eBay',      url: 'https://www.ebay.com/sch/i.html?_nkw=surging+sparks+elite+trainer+box+sealed' },
    ],
  },

  // ── Ultra Premium Collections ─────────────────────────────────────────────
  {
    id: 'charizard-upc',
    name: 'Charizard ex Ultra Premium Collection',
    type: 'upc',
    msrp: 119.99,
    imageUrl: 'https://images.pokemontcg.io/sv3/logo.png',
    setTag: 'Obsidian Flames',
    stockStatus: 'limited',
    restockSchedule: [
      { store: 'Target',    days: 'Tue & Thu', time: '7–8 AM' },
      { store: 'Amazon',    days: 'Daily',     time: 'Varies', notes: 'Check frequently for MSRP listings' },
      { store: 'GameStop',  days: 'Varies',    time: 'Call store' },
    ],
    storeLinks: [
      { store: 'Amazon',    url: 'https://www.amazon.com/s?k=charizard+ex+ultra+premium+collection+pokemon',   price: 119.99, isRetail: true },
      { store: 'Target',    url: 'https://www.target.com/s?searchTerm=charizard+ultra+premium+collection',     price: 119.99, isRetail: true },
      { store: 'GameStop',  url: 'https://www.gamestop.com/search#q=charizard+ultra+premium+collection',       price: 119.99, isRetail: true },
      { store: 'TCGPlayer', url: 'https://www.tcgplayer.com/search/pokemon/product?q=charizard+ultra+premium' },
      { store: 'eBay',      url: 'https://www.ebay.com/sch/i.html?_nkw=charizard+ultra+premium+collection+pokemon+sealed' },
    ],
  },
  {
    id: 'pikachu-upc',
    name: 'Pikachu ex Ultra Premium Collection',
    type: 'upc',
    msrp: 119.99,
    imageUrl: 'https://images.pokemontcg.io/sv1/logo.png',
    setTag: 'Scarlet & Violet',
    stockStatus: 'available',
    restockSchedule: [
      { store: 'Target',  days: 'Tue & Thu', time: '7–8 AM' },
      { store: 'Walmart', days: 'Mon – Thu', time: '6–7 AM' },
      { store: 'Amazon',  days: 'Daily',     time: 'Varies' },
    ],
    storeLinks: [
      { store: 'Amazon',    url: 'https://www.amazon.com/s?k=pikachu+ex+ultra+premium+collection+pokemon',      price: 119.99, isRetail: true },
      { store: 'Target',    url: 'https://www.target.com/s?searchTerm=pikachu+ultra+premium+collection',        price: 119.99, isRetail: true },
      { store: 'Walmart',   url: 'https://www.walmart.com/search?q=pikachu+ultra+premium+collection+pokemon',   price: 119.99, isRetail: true },
      { store: 'TCGPlayer', url: 'https://www.tcgplayer.com/search/pokemon/product?q=pikachu+ultra+premium' },
      { store: 'eBay',      url: 'https://www.ebay.com/sch/i.html?_nkw=pikachu+ultra+premium+collection+pokemon+sealed' },
    ],
  },

  // ── Premium Collections ───────────────────────────────────────────────────
  {
    id: 'stellar-crown-etb',
    name: 'Stellar Crown Elite Trainer Box',
    type: 'etb',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv7/logo.png',
    setTag: 'Stellar Crown',
    stockStatus: 'available',
    restockSchedule: [
      { store: 'Target',  days: 'Tue & Thu', time: '7–8 AM' },
      { store: 'Walmart', days: 'Mon – Thu', time: '6–7 AM' },
    ],
    storeLinks: [
      { store: 'Target',    url: 'https://www.target.com/s?searchTerm=stellar+crown+elite+trainer+box',    price: 49.99, isRetail: true },
      { store: 'Walmart',   url: 'https://www.walmart.com/search?q=stellar+crown+elite+trainer+box',       price: 49.99, isRetail: true },
      { store: 'Amazon',    url: 'https://www.amazon.com/s?k=stellar+crown+elite+trainer+box',             price: 49.99, isRetail: true },
      { store: 'TCGPlayer', url: 'https://www.tcgplayer.com/search/pokemon/product?q=stellar+crown+elite+trainer' },
    ],
  },
  {
    id: '151-etb',
    name: 'Pokémon 151 Elite Trainer Box',
    type: 'etb',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/logo.png',
    setTag: '151',
    stockStatus: 'available',
    restockSchedule: [
      { store: 'Target',  days: 'Tue & Thu', time: '7–8 AM' },
      { store: 'Walmart', days: 'Mon – Thu', time: '6–7 AM' },
    ],
    storeLinks: [
      { store: 'Target',    url: 'https://www.target.com/s?searchTerm=pokemon+151+elite+trainer+box',   price: 49.99, isRetail: true },
      { store: 'Walmart',   url: 'https://www.walmart.com/search?q=pokemon+151+elite+trainer+box',      price: 49.99, isRetail: true },
      { store: 'Amazon',    url: 'https://www.amazon.com/s?k=pokemon+151+elite+trainer+box',            price: 49.99, isRetail: true },
      { store: 'TCGPlayer', url: 'https://www.tcgplayer.com/search/pokemon/product?q=pokemon+151+etb' },
      { store: 'eBay',      url: 'https://www.ebay.com/sch/i.html?_nkw=pokemon+151+elite+trainer+box+sealed' },
    ],
  },
]

// ─── Favorites ────────────────────────────────────────────────────────────────

const FAV_KEY = 'pokesearch_premium_favorites'

export function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]') } catch { return [] }
}

export function toggleFavorite(id: string): boolean {
  const favs = getFavorites()
  const idx = favs.indexOf(id)
  if (idx === -1) { favs.push(id); localStorage.setItem(FAV_KEY, JSON.stringify(favs)); return true }
  favs.splice(idx, 1); localStorage.setItem(FAV_KEY, JSON.stringify(favs)); return false
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id)
}

// ─── Reddit restock alerts ────────────────────────────────────────────────────
// Uses Reddit's public read-only JSON API — no auth required.
// Supplements (but does not replace) the curated restock schedule.

const RESTOCK_KEYWORDS = ['restock', 'found', 'in stock', 'spotted', 'available', 'restocked']

function isRestockPost(title: string): boolean {
  const t = title.toLowerCase()
  return RESTOCK_KEYWORDS.some((kw) => t.includes(kw)) &&
    (t.includes('pokemon') || t.includes('destined rivals') || t.includes('prismatic') || t.includes('etb') || t.includes('booster'))
}

function timeAgo(utcSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - utcSeconds
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function extractStore(title: string): string | undefined {
  const t = title.toLowerCase()
  if (t.includes('target'))    return 'Target'
  if (t.includes('walmart'))   return 'Walmart'
  if (t.includes('gamestop'))  return 'GameStop'
  if (t.includes('best buy'))  return 'Best Buy'
  if (t.includes('amazon'))    return 'Amazon'
  if (t.includes('costco'))    return 'Costco'
  if (t.includes('five below')) return 'Five Below'
  return undefined
}

let _alertCache: { data: RedditAlert[]; ts: number } | null = null
const ALERT_TTL = 5 * 60 * 1000 // 5 min

export async function getRedditRestockAlerts(): Promise<RedditAlert[]> {
  if (_alertCache && Date.now() - _alertCache.ts < ALERT_TTL) return _alertCache.data

  try {
    const url = 'https://www.reddit.com/r/pokemontcg/search.json?q=restock+found+in+stock+pokemon+cards&sort=new&limit=25&t=day&restrict_sr=1'
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error('Reddit fetch failed')
    const json = await res.json()

    const posts: RedditAlert[] = (json.data?.children ?? [])
      .filter((c: { data: { title: string } }) => isRestockPost(c.data.title))
      .slice(0, 6)
      .map((c: { data: { title: string; permalink: string; created_utc: number; score: number } }) => ({
        title:     c.data.title,
        url:       `https://www.reddit.com${c.data.permalink}`,
        store:     extractStore(c.data.title),
        postedAgo: timeAgo(c.data.created_utc),
        upvotes:   c.data.score,
      }))

    _alertCache = { data: posts, ts: Date.now() }
    return posts
  } catch {
    return []
  }
}

// ─── Browser notifications ─────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function notifyRestock(boxName: string, store: string) {
  if (Notification.permission !== 'granted') return
  new Notification('🔴 Restock Alert — PokeSearch', {
    body: `${boxName} spotted at ${store}! Check now before it sells out.`,
    icon: '/apple-touch-icon.png',
    badge: '/apple-touch-icon.png',
  })
}

// Check Reddit alerts for favorited boxes and fire notifications for new hits
let _notifiedUrls = new Set<string>()

export async function checkAndNotifyFavorites(): Promise<void> {
  const favIds = getFavorites()
  if (favIds.length === 0) return
  if (Notification.permission !== 'granted') return

  const favNames = PREMIUM_BOXES
    .filter((b) => favIds.includes(b.id))
    .map((b) => b.name.toLowerCase())

  const alerts = await getRedditRestockAlerts()
  for (const alert of alerts) {
    if (_notifiedUrls.has(alert.url)) continue
    const titleLow = alert.title.toLowerCase()
    const matched = favNames.find((name) =>
      name.split(' ').slice(0, 3).some((word) => word.length > 3 && titleLow.includes(word))
    )
    if (matched) {
      _notifiedUrls.add(alert.url)
      notifyRestock(matched.replace(/\b\w/g, (c) => c.toUpperCase()), alert.store ?? 'a store')
    }
  }
}
