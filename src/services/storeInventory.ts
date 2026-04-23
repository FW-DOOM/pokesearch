import { withCache, TTL } from './cache'

// Only allow https:// links to known retail domains — prevents javascript: injection
const ALLOWED_DOMAINS = ['target.com', 'walmart.com', 'gamestop.com', 'bestbuy.com', 'amazon.com']
function safeUrl(url: string | undefined, fallback: string): string {
  if (!url) return fallback
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return fallback
    if (!ALLOWED_DOMAINS.some((d) => parsed.hostname.endsWith(d))) return fallback
    return url
  } catch { return fallback }
}

export interface StoreProduct {
  id: string
  name: string
  type: 'booster-pack' | 'booster-box' | 'elite-trainer-box' | 'case' | 'tin' | 'collection' | 'other'
  price: number
  imageUrl: string
  tcin?: string
  stores: StoreStock[]
}

export interface StoreStock {
  storeName: string
  storeType: 'target' | 'walmart' | 'gamestop' | 'bestbuy' | 'amazon' | 'local'
  inStock: boolean
  stockUnknown?: boolean   // true = couldn't confirm, show "Check Store" instead of Out of Stock
  distanceMiles?: number
  address?: string
  storeUrl?: string
  price?: number
  storeId?: string
}

// ─── Target RedSky API ────────────────────────────────────────────────────────

const TARGET_KEY = 'ff457966e64d5e877fdbad070f276d18ecec4a01'
const TARGET_SEARCH_KEY = '9f36aeafbe60771e321a7cc95a78140772ab3e96'

interface TargetStore {
  location_id: string
  address: { formatted_address: string; city: string; state: string }
  distance: { unit: string; value: number }
}

async function getNearbyTargetStores(lat: number, lon: number): Promise<TargetStore[]> {
  const url = `/api/target/v3/stores/nearby/${lat},${lon}?limit=5&within=25&unit=mile&key=${TARGET_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Target store API failed')
  const json = await res.json()
  return json.locations ?? []
}

interface TargetProduct {
  tcin: string
  item: {
    product_description: { title: string }
    product_classification: { product_type_name: string }
    primary_image: { url: string }
    price: { current_retail: number }
  }
  available_to_promise_network: {
    availability: string
    stores_available_count: number
    availability_status: string
  }
  fulfillment: {
    is_out_of_stock_in_all_store_locations?: boolean
    store_options?: Array<{
      location_id: string
      in_store_only: boolean
      order_pickup: { availability_status: string }
    }>
  }
}

async function searchTargetPokemonProducts(
  storeId: string,
  storeIds: string,
  keyword = 'pokemon cards'
): Promise<TargetProduct[]> {
  const params = new URLSearchParams({
    keyword,
    count: '36',
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
  const res = await fetch(url)
  if (!res.ok) throw new Error('Target search failed')
  const json = await res.json()
  return json.data?.search?.products ?? []
}

function isTargetInStock(status: string): boolean {
  // Target uses several status strings for "yes it's available"
  const s = (status ?? '').toUpperCase()
  return (
    s === 'IN_STOCK' ||
    s === 'AVAILABLE' ||
    s === 'LIMITED_AVAILABILITY' ||
    s === 'ON_SHELF' ||
    s.includes('AVAILABLE')
  )
}

function classifyTargetProduct(title: string): StoreProduct['type'] {
  const t = title.toLowerCase()
  if (t.includes('booster box') || t.includes('36 pack')) return 'booster-box'
  if (t.includes('elite trainer') || t.includes('etb')) return 'elite-trainer-box'
  if (t.includes('tin')) return 'tin'
  if (t.includes('collection') || t.includes('premium')) return 'collection'
  if (t.includes('case')) return 'case'
  if (t.includes('booster') || t.includes('pack')) return 'booster-pack'
  return 'other'
}

// ─── Walmart ─────────────────────────────────────────────────────────────────

interface WalmartProduct {
  name: string
  salePrice: number
  thumbnailImage: string
  productUrl: string
  availabilityStatus: string
  stock: string
}

async function searchWalmartProducts(): Promise<WalmartProduct[]> {
  const params = new URLSearchParams({
    q: 'pokemon trading cards booster',
    typeahead: 'pokemon',
    affinityOverride: 'default',
    // page size
    ps: '20',
  })
  const url = `/api/walmart/search?${params}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Walmart search failed')
  const json = await res.json()
  // Walmart returns items inside json.items or json.payload.items
  const items: WalmartProduct[] = json.items ?? json.payload?.items ?? []
  return items
}

// ─── Main export ─────────────────────────────────────────────────────────────

async function fetchNearbyProducts(lat: number, lon: number): Promise<StoreProduct[]> {
  let targetStores: TargetStore[] = []
  let targetProducts: TargetProduct[] = []
  let walmartProducts: WalmartProduct[] = []

  await Promise.allSettled([
    getNearbyTargetStores(lat, lon).then((s) => { targetStores = s }),
    searchWalmartProducts().then((p) => { walmartProducts = p }),
  ])

  if (targetStores.length > 0) {
    const storeId = targetStores[0].location_id
    const storeIds = targetStores.map((s) => s.location_id).join(',')

    // Run two searches in parallel: generic + Prismatic Evolutions specifically
    // so new hot products don't get buried behind generic results
    const [general, prismatic] = await Promise.allSettled([
      searchTargetPokemonProducts(storeId, storeIds, 'pokemon cards'),
      searchTargetPokemonProducts(storeId, storeIds, 'prismatic evolutions pokemon'),
    ])

    const generalResults = general.status === 'fulfilled' ? general.value : []
    const prismaticResults = prismatic.status === 'fulfilled' ? prismatic.value : []

    // Merge: put prismatic-specific results first, dedupe by tcin
    const seen = new Set<string>()
    for (const p of [...prismaticResults, ...generalResults]) {
      if (!seen.has(p.tcin)) { seen.add(p.tcin); targetProducts.push(p) }
    }
  }

  const products: StoreProduct[] = []

  if (targetProducts.length > 0) {
    for (const tp of targetProducts.slice(0, 18)) {
      const title = tp.item?.product_description?.title ?? 'Pokemon Product'
      const price = tp.item?.price?.current_retail ?? 0
      const image = tp.item?.primary_image?.url ?? ''
      const type = classifyTargetProduct(title)

      const storeStocks: StoreStock[] = targetStores.map((ts) => {
        const storeOption = tp.fulfillment?.store_options?.find(
          (so) => so.location_id === ts.location_id
        )
        const status = storeOption?.order_pickup?.availability_status ?? ''
        const inStock = isTargetInStock(status)
        return {
          storeName: `Target — ${ts.address.city}`,
          storeType: 'target',
          inStock,
          distanceMiles: parseFloat(ts.distance.value.toFixed(1)),
          address: ts.address.formatted_address,
          storeUrl: safeUrl(`https://www.target.com/p/-/A-${tp.tcin}`, 'https://www.target.com'),
          price,
          storeId: ts.location_id,
        }
      })

      const wmMatch = walmartProducts.find((w) =>
        title.split(' ').slice(0, 3).some((word) => w.name?.toLowerCase().includes(word.toLowerCase()))
      )
      const wmUrl = wmMatch?.productUrl
        ? safeUrl(`https://www.walmart.com${wmMatch.productUrl}`, `https://www.walmart.com/search?q=${encodeURIComponent(title)}`)
        : `https://www.walmart.com/search?q=pokemon+${encodeURIComponent(title)}`

      storeStocks.push({
        storeName: 'Walmart',
        storeType: 'walmart',
        inStock: wmMatch ? (wmMatch.availabilityStatus === 'available' || wmMatch.stock === 'Available') : false,
        storeUrl: wmUrl,
        price: wmMatch?.salePrice,
      })

      storeStocks.push(
        { storeName: 'GameStop', storeType: 'gamestop', inStock: false, storeUrl: `https://www.gamestop.com/search#q=${encodeURIComponent(title)}` },
        { storeName: 'Amazon', storeType: 'amazon', inStock: true, storeUrl: `https://www.amazon.com/s?k=pokemon+${encodeURIComponent(title)}`, price: price * 1.05 }
      )

      products.push({ id: tp.tcin, name: title, type, price, imageUrl: image, tcin: tp.tcin, stores: storeStocks })
    }
  }

  return products.length > 0 ? products : getFallbackProducts(lat, lon)
}

export async function getNearbyProducts(lat: number, lon: number): Promise<StoreProduct[]> {
  const key = `stores:${lat.toFixed(2)},${lon.toFixed(2)}`
  return withCache(key, TTL.STORES, () => fetchNearbyProducts(lat, lon))
}

// ─── Fallback product catalog ─────────────────────────────────────────────────
// Used when the Target/Walmart proxy APIs are unavailable (e.g. on GitHub Pages).
// Stock is always unknown — we link directly to each retailer's search page.
// Products are grouped: current retail sets → older retail → vintage/secondary market

interface CuratedProduct extends Omit<StoreProduct, 'stores'> {
  vintage?: boolean   // true = not sold at Target/Walmart, link to TCGPlayer/eBay
}

const CURATED: CuratedProduct[] = [
  // ── Current Scarlet & Violet retail (Target / Walmart / GameStop) ──────────
  { id: 'sv-prismatic-etb',        name: 'Prismatic Evolutions Elite Trainer Box',  type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/sv8pt5/logo.png' },
  { id: 'sv-prismatic-bbox',       name: 'Prismatic Evolutions Booster Box',         type: 'booster-box',       price: 143.64, imageUrl: 'https://images.pokemontcg.io/sv8pt5/logo.png' },
  { id: 'sv-prismatic-pack',       name: 'Prismatic Evolutions Booster Pack',        type: 'booster-pack',      price: 4.99,   imageUrl: 'https://images.pokemontcg.io/sv8pt5/logo.png' },
  { id: 'sv-surging-sparks-etb',   name: 'Surging Sparks Elite Trainer Box',         type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/sv8/logo.png' },
  { id: 'sv-surging-sparks-bbox',  name: 'Surging Sparks Booster Box',               type: 'booster-box',       price: 143.64, imageUrl: 'https://images.pokemontcg.io/sv8/logo.png' },
  { id: 'sv-stellar-crown-etb',    name: 'Stellar Crown Elite Trainer Box',          type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/sv7/logo.png' },
  { id: 'sv-shrouded-fable-etb',   name: 'Shrouded Fable Elite Trainer Box',         type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/sv6pt5/logo.png' },
  { id: 'sv-twilight-masq-etb',    name: 'Twilight Masquerade Elite Trainer Box',    type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/sv6/logo.png' },
  { id: 'sv-temporal-forces-etb',  name: 'Temporal Forces Elite Trainer Box',        type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/sv5/logo.png' },
  { id: 'sv-temporal-forces-bbox', name: 'Temporal Forces Booster Box',              type: 'booster-box',       price: 143.64, imageUrl: 'https://images.pokemontcg.io/sv5/logo.png' },
  { id: 'paldean-fates-etb',       name: 'Paldean Fates Elite Trainer Box',          type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/sv4pt5/logo.png' },
  { id: 'sv-paradox-rift-etb',     name: 'Paradox Rift Elite Trainer Box',           type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/sv4/logo.png' },
  { id: '151-etb',                 name: 'Pokémon 151 Elite Trainer Box',            type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/sv3pt5/logo.png' },
  { id: 'sv-obsidian-etb',         name: 'Obsidian Flames Elite Trainer Box',        type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/sv3/logo.png' },
  { id: 'sv-charizard-collection', name: 'Charizard ex Premium Collection',          type: 'collection',        price: 39.99,  imageUrl: 'https://images.pokemontcg.io/sv3/logo.png' },
  { id: 'sv-pikachu-tin',          name: 'Pikachu ex Tin',                           type: 'tin',               price: 19.99,  imageUrl: 'https://images.pokemontcg.io/sv1/logo.png' },
  { id: 'sv-scarlet-violet-etb',   name: 'Scarlet & Violet Elite Trainer Box',       type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/sv1/logo.png' },

  // ── Sword & Shield era (still common at retail) ───────────────────────────
  { id: 'swsh-silver-tempest-etb', name: 'Silver Tempest Elite Trainer Box',         type: 'elite-trainer-box', price: 44.99,  imageUrl: 'https://images.pokemontcg.io/swsh12/logo.png' },
  { id: 'swsh-lost-origin-etb',    name: 'Lost Origin Elite Trainer Box',            type: 'elite-trainer-box', price: 44.99,  imageUrl: 'https://images.pokemontcg.io/swsh11/logo.png' },
  { id: 'swsh-fusion-strike-etb',  name: 'Fusion Strike Elite Trainer Box',          type: 'elite-trainer-box', price: 44.99,  imageUrl: 'https://images.pokemontcg.io/swsh8/logo.png' },
  { id: 'swsh-brilliant-stars-etb','name': 'Brilliant Stars Elite Trainer Box',      type: 'elite-trainer-box', price: 44.99,  imageUrl: 'https://images.pokemontcg.io/swsh9/logo.png' },
  { id: 'swsh-celebrations',       name: 'Celebrations 25th Anniversary ETB',        type: 'elite-trainer-box', price: 49.99,  imageUrl: 'https://images.pokemontcg.io/cel25/logo.png' },
  { id: 'swsh-vmax-charizard',     name: 'Charizard VMAX Premium Collection',        type: 'collection',        price: 39.99,  imageUrl: 'https://images.pokemontcg.io/swsh3/logo.png' },

  // ── Vintage — secondary market only (TCGPlayer / eBay) ────────────────────
  { id: 'base-set-pack',           name: 'Base Set Booster Pack (1999)',             type: 'booster-pack',      price: 399.99, imageUrl: 'https://images.pokemontcg.io/base1/logo.png',    vintage: true },
  { id: 'team-rocket-pack',        name: 'Team Rocket Booster Pack (2000)',          type: 'booster-pack',      price: 89.99,  imageUrl: 'https://images.pokemontcg.io/base2/logo.png',    vintage: true },
  { id: 'jungle-pack',             name: 'Jungle Booster Pack (1999)',               type: 'booster-pack',      price: 149.99, imageUrl: 'https://images.pokemontcg.io/base3/logo.png',    vintage: true },
  { id: 'fossil-pack',             name: 'Fossil Booster Pack (1999)',               type: 'booster-pack',      price: 129.99, imageUrl: 'https://images.pokemontcg.io/base4/logo.png',    vintage: true },
  { id: 'gym-heroes-pack',         name: 'Gym Heroes Booster Pack (2000)',           type: 'booster-pack',      price: 79.99,  imageUrl: 'https://images.pokemontcg.io/gym1/logo.png',     vintage: true },
  { id: 'gym-challenge-pack',      name: 'Gym Challenge Booster Pack (2000)',        type: 'booster-pack',      price: 74.99,  imageUrl: 'https://images.pokemontcg.io/gym2/logo.png',     vintage: true },
  { id: 'neo-genesis-pack',        name: 'Neo Genesis Booster Pack (2000)',          type: 'booster-pack',      price: 69.99,  imageUrl: 'https://images.pokemontcg.io/neo1/logo.png',     vintage: true },
  { id: 'neo-discovery-pack',      name: 'Neo Discovery Booster Pack (2001)',        type: 'booster-pack',      price: 59.99,  imageUrl: 'https://images.pokemontcg.io/neo2/logo.png',     vintage: true },
  { id: 'neo-revelation-pack',     name: 'Neo Revelation Booster Pack (2001)',       type: 'booster-pack',      price: 64.99,  imageUrl: 'https://images.pokemontcg.io/neo3/logo.png',     vintage: true },
  { id: 'neo-destiny-pack',        name: 'Neo Destiny Booster Pack (2002)',          type: 'booster-pack',      price: 89.99,  imageUrl: 'https://images.pokemontcg.io/neo4/logo.png',     vintage: true },
]

function getFallbackProducts(_lat: number, _lon: number): StoreProduct[] {
  return CURATED.map((p) => {
    const { vintage, ...product } = p

    if (vintage) {
      // Vintage packs — not sold at retail, link to secondary market only
      return {
        ...product,
        stores: [
          {
            storeName: 'TCGPlayer', storeType: 'amazon' as const,
            inStock: false, stockUnknown: true,
            storeUrl: `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(p.name)}`,
          },
          {
            storeName: 'eBay', storeType: 'amazon' as const,
            inStock: false, stockUnknown: true,
            storeUrl: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(p.name)}+pokemon+sealed`,
          },
          {
            storeName: 'Amazon', storeType: 'amazon' as const,
            inStock: false, stockUnknown: true,
            storeUrl: `https://www.amazon.com/s?k=${encodeURIComponent(p.name)}+pokemon+sealed`,
          },
        ] as StoreStock[],
      }
    }

    // Modern retail products — all stock unknown, link to each store's search
    return {
      ...product,
      stores: [
        { storeName: 'Target',   storeType: 'target'   as const, inStock: false, stockUnknown: true, storeUrl: `https://www.target.com/s?searchTerm=${encodeURIComponent(p.name)}`,                  price: p.price },
        { storeName: 'Walmart',  storeType: 'walmart'  as const, inStock: false, stockUnknown: true, storeUrl: `https://www.walmart.com/search?q=${encodeURIComponent(p.name)}`,                     price: p.price },
        { storeName: 'GameStop', storeType: 'gamestop' as const, inStock: false, stockUnknown: true, storeUrl: `https://www.gamestop.com/search#q=${encodeURIComponent(p.name)}`,                    price: p.price },
        { storeName: 'Best Buy', storeType: 'bestbuy'  as const, inStock: false, stockUnknown: true, storeUrl: `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(p.name)}`,       price: p.price },
        { storeName: 'Amazon',   storeType: 'amazon'   as const, inStock: false, stockUnknown: true, storeUrl: `https://www.amazon.com/s?k=pokemon+${encodeURIComponent(p.name)}`,                  price: p.price * 1.1 },
      ] as StoreStock[],
    }
  })
}
