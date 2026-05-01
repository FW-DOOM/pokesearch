// Live store stock checking for premium boxes.
// Uses the same Target/Walmart proxy routes as storeInventory.ts.
// On GitHub Pages (no proxy server), API calls fail gracefully and the UI
// falls back to direct retailer search links.

import { withCache, TTL } from './cache'

export interface LiveStoreStock {
  store: string
  storeType: 'target' | 'walmart' | 'bestbuy' | 'gamestop' | 'amazon'
  inStock: boolean
  stockUnknown?: boolean
  price?: number
  distanceMiles?: number
  address?: string
  url: string
}

export interface BoxStockResult {
  stocks: LiveStoreStock[]
  hasLiveData: boolean   // false = proxy not available, showing search links only
  checkedAt: number
}

// ─── Target RedSky ────────────────────────────────────────────────────────────

const TARGET_KEY        = 'ff457966e64d5e877fdbad070f276d18ecec4a01'
const TARGET_SEARCH_KEY = '9f36aeafbe60771e321a7cc95a78140772ab3e96'

async function getTargetStores(lat: number, lon: number) {
  const url = `/api/target/v3/stores/nearby/${lat},${lon}?limit=5&within=25&unit=mile&key=${TARGET_KEY}`
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error('Target store fetch failed')
  const json = await res.json()
  return (json.locations ?? []) as Array<{
    location_id: string
    address: { formatted_address: string; city: string }
    distance: { value: number }
  }>
}

async function searchTargetForBox(storeId: string, storeIds: string, keyword: string) {
  const params = new URLSearchParams({
    keyword,
    count: '12',
    offset: '0',
    page: '/s/pokemon-cards',
    channel: 'WEB',
    isDLP: 'false',
    key: TARGET_SEARCH_KEY,
    pricing_store_id: storeId,
    scheduled_delivery_store_id: storeId,
    store_ids: storeIds,
    visitor_id: '018D2DB1E0F202089236B87BE00E94A3',
  })
  const url = `/api/target/redsky_aggregations/v1/web/plp_search_v1?${params}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('Target search failed')
  const json = await res.json()
  return (json.data?.search?.products ?? []) as Array<{
    tcin: string
    item: {
      product_description: { title: string }
      price: { current_retail: number }
    }
    fulfillment: {
      store_options?: Array<{
        location_id: string
        order_pickup: { availability_status: string }
      }>
    }
  }>
}

function isTargetInStock(status: string) {
  const s = (status ?? '').toUpperCase()
  return s === 'IN_STOCK' || s === 'AVAILABLE' || s === 'LIMITED_AVAILABILITY' || s.includes('AVAILABLE')
}

// ─── Walmart ──────────────────────────────────────────────────────────────────

async function searchWalmart(keyword: string) {
  const params = new URLSearchParams({ q: keyword, ps: '10' })
  const url = `/api/walmart/search?${params}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error('Walmart search failed')
  const json = await res.json()
  return (json.items ?? json.payload?.items ?? []) as Array<{
    name: string
    salePrice: number
    productUrl: string
    availabilityStatus: string
    stock: string
  }>
}

// ─── Main stock check ─────────────────────────────────────────────────────────

async function fetchBoxStock(
  _boxId: string,
  _boxName: string,
  searchKeyword: string,
  lat: number,
  lon: number,
): Promise<BoxStockResult> {
  const fallbackStocks = buildFallbackStocks(_boxName, searchKeyword)

  // Try Target ------------------------------------------------------------------
  let targetStocks: LiveStoreStock[] = []
  let hasLiveData = false

  try {
    const stores = await getTargetStores(lat, lon)
    if (stores.length > 0) {
      const storeId  = stores[0].location_id
      const storeIds = stores.map((s) => s.location_id).join(',')
      const products = await searchTargetForBox(storeId, storeIds, searchKeyword)

      // Find the closest matching product
      const match = products.find((p) =>
        searchKeyword.toLowerCase().split(' ').filter((w) => w.length > 3)
          .some((w) => p.item.product_description.title.toLowerCase().includes(w))
      )

      if (match) {
        hasLiveData = true
        for (const store of stores) {
          const opt    = match.fulfillment.store_options?.find((o) => o.location_id === store.location_id)
          const status = opt?.order_pickup?.availability_status ?? ''
          targetStocks.push({
            store:         `Target — ${store.address.city}`,
            storeType:     'target',
            inStock:       isTargetInStock(status),
            price:         match.item.price?.current_retail,
            distanceMiles: parseFloat(store.distance.value.toFixed(1)),
            address:       store.address.formatted_address,
            url:           `https://www.target.com/p/-/A-${match.tcin}`,
          })
        }
      }
    }
  } catch { /* proxy unavailable or CORS — use fallback */ }

  // Try Walmart ----------------------------------------------------------------
  let walmartStock: LiveStoreStock | null = null
  try {
    const items = await searchWalmart(searchKeyword)
    const match = items.find((i) =>
      searchKeyword.toLowerCase().split(' ').filter((w) => w.length > 3)
        .some((w) => i.name?.toLowerCase().includes(w))
    )
    if (match) {
      hasLiveData = true
      walmartStock = {
        store:     'Walmart',
        storeType: 'walmart',
        inStock:   match.availabilityStatus === 'available' || match.stock === 'Available',
        price:     match.salePrice,
        url:       match.productUrl
          ? `https://www.walmart.com${match.productUrl}`
          : `https://www.walmart.com/search?q=${encodeURIComponent(searchKeyword)}`,
      }
    }
  } catch { /* ignore */ }

  const liveStocks: LiveStoreStock[] = [
    ...(targetStocks.length > 0 ? targetStocks : []),
    ...(walmartStock ? [walmartStock] : []),
  ]

  // Always append fallback links for stores we don't have live data for
  const coveredTypes = new Set(liveStocks.map((s) => s.storeType))
  for (const fb of fallbackStocks) {
    if (!coveredTypes.has(fb.storeType)) liveStocks.push(fb)
  }

  return { stocks: liveStocks, hasLiveData, checkedAt: Date.now() }
}

function buildFallbackStocks(_boxName: string, keyword: string): LiveStoreStock[] {
  const enc = encodeURIComponent(keyword)
  return [
    {
      store: 'Target',    storeType: 'target',   inStock: false, stockUnknown: true,
      url: `https://www.target.com/s?searchTerm=${enc}`,
    },
    {
      store: 'Walmart',   storeType: 'walmart',  inStock: false, stockUnknown: true,
      url: `https://www.walmart.com/search?q=${enc}`,
    },
    {
      store: 'Best Buy',  storeType: 'bestbuy',  inStock: false, stockUnknown: true,
      url: `https://www.bestbuy.com/site/searchpage.jsp?st=${enc}`,
    },
    {
      store: 'GameStop',  storeType: 'gamestop', inStock: false, stockUnknown: true,
      url: `https://www.gamestop.com/search#q=${enc}`,
    },
    {
      store: 'Amazon',    storeType: 'amazon',   inStock: false, stockUnknown: true,
      url: `https://www.amazon.com/s?k=${enc}`,
    },
  ]
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Map boxId → short search keyword optimised for store APIs
const BOX_SEARCH_KEYWORDS: Record<string, string> = {
  'destined-rivals-bbox':  'pokemon destined rivals booster box',
  'destined-rivals-etb':   'pokemon destined rivals elite trainer',
  'prismatic-etb':         'prismatic evolutions elite trainer box',
  'prismatic-bbox':        'prismatic evolutions booster box',
  'surging-sparks-etb':    'surging sparks elite trainer box',
  'charizard-upc':         'charizard ultra premium collection pokemon',
  'pikachu-upc':           'pikachu ultra premium collection pokemon',
  'stellar-crown-etb':     'stellar crown elite trainer box',
  '151-etb':               'pokemon 151 elite trainer box',
}

export function getSearchKeyword(boxId: string, boxName: string): string {
  return BOX_SEARCH_KEYWORDS[boxId] ?? boxName.toLowerCase()
}

export async function checkBoxStock(
  boxId: string,
  boxName: string,
  lat: number,
  lon: number,
): Promise<BoxStockResult> {
  const keyword = getSearchKeyword(boxId, boxName)
  const cacheKey = `box-stock:${boxId}:${lat.toFixed(2)},${lon.toFixed(2)}`
  return withCache(cacheKey, TTL.STORES, () => fetchBoxStock(boxId, boxName, keyword, lat, lon))
}

// Check all favorited boxes and return any that are in stock somewhere live
export async function checkFavoritesStock(
  favIds: string[],
  lat: number,
  lon: number,
  allBoxes: Array<{ id: string; name: string }>,
): Promise<Array<{ boxName: string; store: string; price?: number; url: string }>> {
  const results = await Promise.allSettled(
    favIds.map((id) => {
      const box = allBoxes.find((b) => b.id === id)
      return box ? checkBoxStock(id, box.name, lat, lon) : Promise.reject()
    })
  )

  const hits: Array<{ boxName: string; store: string; price?: number; url: string }> = []

  for (let i = 0; i < results.length; i++) {
    const res = results[i]
    if (res.status !== 'fulfilled' || !res.value.hasLiveData) continue
    const box = allBoxes.find((b) => b.id === favIds[i])
    if (!box) continue
    for (const s of res.value.stocks) {
      if (s.inStock && !s.stockUnknown) {
        hits.push({ boxName: box.name, store: s.store, price: s.price, url: s.url })
      }
    }
  }

  return hits
}
