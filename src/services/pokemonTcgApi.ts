import { withCache, TTL } from './cache'

const BASE = 'https://api.pokemontcg.io/v2'

type PriceEntry = { low: number; mid: number; high: number; market: number }

export interface PokemonCard {
  id: string
  name: string
  supertype: string
  subtypes: string[]
  hp?: string
  number: string
  rarity?: string
  set: {
    id: string
    name: string
    series: string
    releaseDate: string
    images: { symbol: string; logo: string }
  }
  images: { small: string; large: string }
  tcgplayer?: {
    url: string
    updatedAt: string
    prices?: {
      // Standard variants
      normal?: PriceEntry
      holofoil?: PriceEntry
      reverseHolofoil?: PriceEntry
      // WOTC-era unlimited/1st ed
      '1stEditionNormal'?: PriceEntry
      '1stEditionHolofoil'?: PriceEntry
      unlimitedNormal?: PriceEntry
      unlimitedHolofoil?: PriceEntry
      // Promo / special
      promo?: PriceEntry
      // Catch-all for any future keys
      [key: string]: PriceEntry | undefined
    }
  }
  cardmarket?: {
    url: string
    updatedAt: string
    prices?: {
      averageSellPrice?: number
      lowPrice?: number
      trendPrice?: number
      avg1?: number
      avg7?: number
      avg30?: number
    }
  }
  artist?: string
  flavorText?: string
  nationalPokedexNumbers?: number[]
  attacks?: { name: string; damage: string; text: string }[]
  weaknesses?: { type: string; value: string }[]
  resistances?: { type: string; value: string }[]
  retreatCost?: string[]
  types?: string[]
  evolvesFrom?: string
}

export interface CardSearchResult {
  data: PokemonCard[]
  totalCount: number
}

export async function searchCards(query: string): Promise<PokemonCard[]> {
  return withCache(`cards:${query.toLowerCase()}`, TTL.CARDS, async () => {
    // Use wildcard so "Charizard" returns Charizard ex, VMAX, V, etc.
    const q = query.trim()
    const params = new URLSearchParams({
      q: `name:${q}*`,
      pageSize: '36',
      orderBy: '-set.releaseDate',
    })
    const res = await fetch(`${BASE}/cards?${params}`)
    if (!res.ok) throw new Error('Failed to fetch cards')
    const json: CardSearchResult = await res.json()
    return json.data
  })
}

export async function getCardById(id: string): Promise<PokemonCard> {
  return withCache(`card:${id}`, TTL.CARDS, async () => {
    const res = await fetch(`${BASE}/cards/${id}`)
    if (!res.ok) throw new Error('Card not found')
    const json = await res.json()
    return json.data
  })
}

// Bypass cache — always fetches fresh price data from the API
export async function refreshCardPrice(id: string): Promise<PokemonCard> {
  const res = await fetch(`${BASE}/cards/${id}`)
  if (!res.ok) throw new Error('Card not found')
  const json = await res.json()
  const card: PokemonCard = json.data
  // Store updated card back into cache
  localStorage.setItem(`poke:card:${id}`, JSON.stringify({ data: card, ts: Date.now() }))
  return card
}

export function getCardMarketPrice(card: PokemonCard): number | null {
  // Try TCGPlayer first — pick highest available market price across all variants
  const prices = card.tcgplayer?.prices
  if (prices) {
    const best = Object.values(prices)
      .filter((v): v is { low: number; mid: number; high: number; market: number } => !!v)
      .map(v => v.market ?? v.mid ?? 0)
      .filter(p => p > 0)
      .sort((a, b) => b - a)[0]
    if (best) return best
  }
  // Fall back to Cardmarket trend price
  const cm = card.cardmarket?.prices
  if (cm) return cm.trendPrice ?? cm.averageSellPrice ?? cm.avg7 ?? null
  return null
}

export function getRarityTier(rarity?: string): 'common' | 'uncommon' | 'rare' | 'ultra' | 'secret' {
  if (!rarity) return 'common'
  const r = rarity.toLowerCase()

  // ── Secret / Special (highest tier) ─────────────────────────────────
  if (r.includes('secret')) return 'secret'
  if (r.includes('special illustration')) return 'secret'

  // ── Ultra tier ───────────────────────────────────────────────────────
  if (r.includes('ultra')) return 'ultra'          // Ultra Rare, Shiny Ultra Rare
  if (r.includes('hyper')) return 'ultra'          // Hyper Rare (SV gold cards)
  if (r.includes('rainbow')) return 'ultra'
  if (r.includes('gold')) return 'ultra'
  if (r.includes('illustration rare')) return 'ultra'  // SV Illustration Rare (~$10–30)
  if (r.includes('ace spec')) return 'ultra'       // ACE SPEC cards (SV)
  if (r.includes('radiant')) return 'ultra'        // Radiant rares (S&S era)
  if (r.includes('legend')) return 'ultra'         // LEGEND cards (HGSS)
  if (r.includes('trainer gallery')) return 'ultra'

  // ── Rare tier ────────────────────────────────────────────────────────
  if (r.includes('rare')) return 'rare'            // covers Double Rare, Rare Holo, Shiny Rare, Amazing Rare, BREAK, etc.

  // ── Uncommon / Promo ─────────────────────────────────────────────────
  if (r.includes('uncommon')) return 'uncommon'
  if (r.includes('promo')) return 'uncommon'

  return 'common'
}

export interface TcgSet {
  id: string
  name: string
  series: string
  printedTotal: number
  total: number
  releaseDate: string
  images: { symbol: string; logo: string }
}

export async function getSets(): Promise<TcgSet[]> {
  return withCache('sets:all', TTL.CARDS * 6, async () => {
    // Fetch all sets across multiple pages (API max is 250 per page)
    const firstRes = await fetch(`${BASE}/sets?orderBy=-releaseDate&pageSize=250`)
    if (!firstRes.ok) throw new Error('Failed to fetch sets')
    const firstJson = await firstRes.json()
    const allSets: TcgSet[] = firstJson.data ?? []

    // If there are more pages, fetch them too
    const total: number = firstJson.totalCount ?? allSets.length
    if (total > 250) {
      const page2 = await fetch(`${BASE}/sets?orderBy=-releaseDate&pageSize=250&page=2`)
      if (page2.ok) {
        const j2 = await page2.json()
        allSets.push(...(j2.data ?? []))
      }
    }

    return allSets
  })
}

export async function getSetCards(setId: string): Promise<PokemonCard[]> {
  return withCache(`set-cards:${setId}`, TTL.CARDS * 3, async () => {
    const params = new URLSearchParams({ q: `set.id:${setId}`, pageSize: '250' })
    const res = await fetch(`${BASE}/cards?${params}`)
    if (!res.ok) throw new Error('Failed to fetch set cards')
    const json: CardSearchResult = await res.json()
    return json.data
  })
}

export async function getTrendingCards(): Promise<PokemonCard[]> {
  return withCache('trending', TTL.CARDS, async () => {
    // Pull the freshest high-rarity cards across all modern rarity names
    const rarities = [
      'Secret Rare', 'Special Illustration Rare', 'Hyper Rare',
      'Ultra Rare', 'Illustration Rare', 'ACE SPEC Rare', 'Shiny Ultra Rare',
    ].map(r => `rarity:"${r}"`).join(' OR ')
    const params = new URLSearchParams({
      q: rarities,
      pageSize: '20',
      orderBy: '-set.releaseDate',
    })
    const res = await fetch(`${BASE}/cards?${params}`)
    if (!res.ok) throw new Error('Failed to fetch trending')
    const json: CardSearchResult = await res.json()
    return json.data
  })
}

// Human-readable labels for every TCGPlayer price variant key
const PRICE_LABELS: Record<string, string> = {
  normal:               'Normal',
  holofoil:             'Holofoil',
  reverseHolofoil:      'Reverse Holo',
  '1stEditionNormal':   '1st Ed. Normal',
  '1stEditionHolofoil': '1st Ed. Holo',
  unlimitedNormal:      'Unlimited Normal',
  unlimitedHolofoil:    'Unlimited Holo',
  promo:                'Promo',
}

export function getAllPrices(card: PokemonCard): { label: string; market: number | null; low: number | null; high: number | null }[] {
  const prices = card.tcgplayer?.prices
  const cmPrices = card.cardmarket?.prices

  const rows: { label: string; market: number | null; low: number | null; high: number | null }[] = []

  if (prices) {
    for (const [key, v] of Object.entries(prices)) {
      if (!v) continue
      rows.push({
        label: PRICE_LABELS[key] ?? key,
        market: v.market ?? null,
        low: v.low ?? null,
        high: v.high ?? null,
      })
    }
  }

  // If Cardmarket has data and TCGPlayer didn't, surface it
  if (rows.length === 0 && cmPrices) {
    const market = cmPrices.trendPrice ?? cmPrices.averageSellPrice ?? null
    if (market) {
      rows.push({ label: 'Cardmarket (trend)', market, low: cmPrices.lowPrice ?? null, high: null })
    }
    if (cmPrices.avg30) rows.push({ label: 'Cardmarket 30-day avg', market: cmPrices.avg30, low: null, high: null })
  }

  return rows.sort((a, b) => (b.market ?? 0) - (a.market ?? 0))
}

// Estimated pull rates — more granular for modern Scarlet & Violet rarities
export function getPullRate(rarity?: string): string {
  if (!rarity) return 'Unknown pull rate'
  const r = rarity.toLowerCase()

  // SV-era specific
  if (r.includes('special illustration')) return '~1 in 180 packs'
  if (r.includes('hyper')) return '~1 in 120 packs'
  if (r.includes('secret')) return '~1 in 120 packs'
  if (r.includes('shiny ultra')) return '~1 in 100 packs'
  if (r.includes('ace spec')) return '~1 in 36 packs'
  if (r.includes('illustration rare')) return '~1 in 18 packs'
  if (r.includes('ultra')) return '~1 in 72 packs'    // Ultra Rare (full art ex)
  if (r.includes('rainbow')) return '~1 in 100 packs'
  if (r.includes('radiant')) return '~1 in 18 packs'
  if (r.includes('legend')) return '~1 in 36 packs'
  if (r.includes('amazing')) return '~1 in 12 packs'
  if (r.includes('double rare')) return '~1 in 9 packs'
  if (r.includes('shiny rare')) return '~1 in 18 packs'
  if (r.includes('rare holo v') || r.includes('rare ultra')) return '~1 in 36 packs'
  if (r.includes('rare holo')) return '~1 in 9 packs'
  if (r.includes('rare')) return '~1 in 8 packs'
  if (r.includes('promo')) return 'Promo / event'
  if (r.includes('uncommon')) return '~1 in 3 packs'
  return '~1 in 1 packs' // common
}
