import { useEffect, useState } from 'react'
import { MapPin, Package, ShoppingBag, ExternalLink, CheckCircle, XCircle, HelpCircle, Loader2, Filter, Radio, RefreshCw, Clock } from 'lucide-react'
import { useGeolocation } from '../hooks/useGeolocation'
import { getNearbyProducts, type StoreProduct, type StoreStock } from '../services/storeInventory'

const STORE_COLORS: Record<string, string> = {
  target: 'bg-red-600',
  walmart: 'bg-blue-600',
  gamestop: 'bg-yellow-600',
  bestbuy: 'bg-blue-800',
  amazon: 'bg-orange-500',
  local: 'bg-green-600',
}

const TYPE_LABELS: Record<string, string> = {
  'booster-pack': 'Booster Pack',
  'booster-box': 'Booster Box',
  'elite-trainer-box': 'Elite Trainer Box',
  'case': 'Case',
  'tin': 'Tin',
  'collection': 'Collection',
}

async function zipToLatLon(zip: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=US&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const json = await res.json()
    if (!json[0]) return null
    return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) }
  } catch {
    return null
  }
}

export default function StoreFinder() {
  const geo = useGeolocation()
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null)
  const [filterInStock, setFilterInStock] = useState(false)
  const [isLiveData, setIsLiveData] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [zipInput, setZipInput] = useState('')
  const [zipError, setZipError] = useState('')
  const [manualCoords, setManualCoords] = useState<{ lat: number; lon: number } | null>(null)

  const activeLat = manualCoords?.lat ?? geo.lat
  const activeLon = manualCoords?.lon ?? geo.lon

  function loadProducts(lat: number, lon: number) {
    setLoading(true)
    setError(null)
    getNearbyProducts(lat, lon)
      .then((result) => {
        setProducts(result)
        setIsLiveData(result.some((p) => !!p.tcin))
      })
      .catch(() => setError('Failed to load nearby products'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!geo.lat || !geo.lon) return
    loadProducts(geo.lat, geo.lon)
  }, [geo.lat, geo.lon])

  async function handleZipSubmit(e: React.FormEvent) {
    e.preventDefault()
    setZipError('')
    const coords = await zipToLatLon(zipInput.trim())
    if (!coords) { setZipError('ZIP code not found.'); return }
    setManualCoords(coords)
    loadProducts(coords.lat, coords.lon)
  }

  const filteredProducts = products.filter((p) => {
    if (filterType !== 'all' && p.type !== filterType) return false
    if (filterInStock && !p.stores.some((s) => s.inStock)) return false
    return true
  })

  if (geo.loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-400" />
        <p className="text-slate-400">Getting your location...</p>
      </div>
    )
  }

  if (geo.error && !manualCoords) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
        <MapPin className="w-12 h-12 text-slate-500" />
        <p className="text-white font-semibold">Enter your ZIP code to find nearby stores</p>
        <p className="text-slate-500 text-sm">Location access was denied — enter your ZIP instead.</p>
        <form onSubmit={handleZipSubmit} className="flex gap-2 mt-2 w-full max-w-xs">
          <input
            type="text"
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value)}
            placeholder="e.g. 90210"
            maxLength={10}
            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-400 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-colors"
          >
            Go
          </button>
        </form>
        {zipError && <p className="text-red-400 text-sm">{zipError}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-slate-800/50 rounded-xl p-3">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <button
          onClick={() => setFilterInStock((v) => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterInStock ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          In Stock Only
        </button>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-700 text-slate-300 rounded-lg px-3 py-1.5 text-sm border border-slate-600 focus:outline-none focus:border-yellow-400"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="ml-auto flex items-center gap-2">
          {!loading && products.length > 0 && (
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${isLiveData ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
              <Radio className="w-3 h-3" />
              {isLiveData ? 'Live Stock' : 'Estimated'}
            </span>
          )}
          {activeLat && (
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {activeLat.toFixed(3)}, {activeLon!.toFixed(3)}
            </span>
          )}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-16 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
          <p className="text-slate-400">Scanning nearby stores...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">{error}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const anyInStock = product.stores.some((s) => s.inStock)
            const allUnknown = !anyInStock && product.stores.every((s) => s.stockUnknown)
            const closestInStock = product.stores
              .filter((s) => s.inStock && s.distanceMiles)
              .sort((a, b) => (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99))[0]

            // Lowest price — only from stores with CONFIRMED live stock (not fallback/unknown)
            const confirmedInStock = product.stores.filter(s => s.inStock && !s.stockUnknown && s.price && s.price > 0)
            const cheapest = confirmedInStock.length > 0
              ? confirmedInStock.reduce((b, s) => (s.price ?? 999) < (b.price ?? 999) ? s : b)
              : null
            const lowestPrice = cheapest ? {
              price: cheapest.price!,
              store: cheapest.storeName.replace(/^Target — .+$/, 'Target'),
              distance: cheapest.distanceMiles,
            } : null

            return (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="bg-slate-800 rounded-xl p-4 cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700 hover:border-yellow-400/40"
              >
                {/* Product image + name + type */}
                <div className="flex gap-3 items-start">
                  <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => { ;(e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <Package className="w-7 h-7 text-slate-500 absolute" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm leading-tight">{product.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{TYPE_LABELS[product.type]}</p>
                  </div>
                </div>

                {/* Lowest price + stock status — big and prominent */}
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    {lowestPrice !== null ? (
                      <>
                        <p className="text-yellow-400 font-black text-2xl leading-none">${lowestPrice.price.toFixed(2)}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Best price · <span className="text-slate-400">{lowestPrice.store}</span>
                          {lowestPrice.distance ? ` · ${lowestPrice.distance}mi` : ''}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-white font-black text-2xl leading-none">${product.price.toFixed(2)}</p>
                        <p className="text-slate-500 text-xs mt-0.5">MSRP · tap for stores</p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      {anyInStock ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-xs font-medium">
                            {closestInStock ? `${closestInStock.distanceMiles}mi` : 'In Stock'}
                          </span>
                        </>
                      ) : allUnknown ? (
                        <>
                          <HelpCircle className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-400 text-xs font-medium">Check Store</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 text-xs font-medium">Out of Stock</span>
                        </>
                      )}
                    </div>
                    <span className="text-slate-600 text-xs">
                      {product.stores.filter(s => s.inStock).length}/{product.stores.length} stores
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  )
}

// ─── Restock info ────────────────────────────────────────────────────────────

interface RestockInfo {
  schedule: string      // "Tues & Thurs mornings"
  tip: string           // "Best to check right when store opens"
  urgency: 'high' | 'medium' | 'low'
}

function getRestockInfo(storeType: StoreStock['storeType'], productType: StoreProduct['type'], productName: string): RestockInfo {
  const name = productName.toLowerCase()
  const isHotProduct = name.includes('prismatic') || name.includes('151') || name.includes('paradox') || name.includes('surging sparks')
  const isBox = productType === 'booster-box' || productType === 'elite-trainer-box' || productType === 'case'

  switch (storeType) {
    case 'target':
      return isHotProduct
        ? { schedule: 'Tue & Thu mornings (varies by store)', tip: 'Hot product — check the app or visit right at open (8 AM). Sells out within hours.', urgency: 'high' }
        : { schedule: 'Tue & Thu, sometimes Mon', tip: 'Check the card aisle near the toy section. Stock goes fast on new releases.', urgency: isBox ? 'medium' : 'low' }
    case 'walmart':
      return isHotProduct
        ? { schedule: 'Overnight Mon–Thu (stocked ~6–7 AM)', tip: 'Hot product — best chance is early morning on weekdays before the resellers.', urgency: 'high' }
        : { schedule: 'Overnight Mon–Thu', tip: 'Ask a store associate to check the back — items sometimes sit in stock rooms.', urgency: isBox ? 'medium' : 'low' }
    case 'gamestop':
      return { schedule: 'Weekly — usually Mon or Tue', tip: 'Call ahead or check the GameStop app. They often hold ETBs at the register.', urgency: 'medium' }
    case 'bestbuy':
      return { schedule: 'Tue & Wed with weekly ad', tip: 'Best Buy restocks with weekly sale cycles. Check online pickup availability first.', urgency: 'low' }
    case 'amazon':
      return { schedule: 'Continuously (third-party sellers)', tip: 'Prime-fulfilled listings restock fastest. Watch for price spikes on hot sets.', urgency: 'low' }
    default:
      return { schedule: 'Varies by store', tip: 'Call ahead to confirm before making a trip.', urgency: 'low' }
  }
}

function StoreRow({ store, productType, productName }: { store: StoreStock; productType: StoreProduct['type']; productName: string }) {
  const restock = getRestockInfo(store.storeType, productType, productName)
  const statusColor = store.inStock ? 'bg-green-400' : store.stockUnknown ? 'bg-slate-500' : 'bg-red-400'
  const urgencyColors = { high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-slate-500' }

  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      {/* Top row: store name + status + price + link */}
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${STORE_COLORS[store.storeType] ?? 'bg-slate-600'}`}>
              {store.storeName}
            </span>
            {store.distanceMiles && (
              <span className="text-slate-400 text-xs">{store.distanceMiles} mi</span>
            )}
          </div>
          {store.address && <p className="text-slate-500 text-xs mt-0.5 truncate">{store.address}</p>}
        </div>
        <div className="text-right shrink-0">
          {store.price && <p className="text-white text-sm font-semibold">${store.price.toFixed(2)}</p>}
          <span className={`text-xs font-medium ${store.inStock ? 'text-green-400' : store.stockUnknown ? 'text-slate-400' : 'text-red-400'}`}>
            {store.inStock ? 'In Stock' : store.stockUnknown ? 'Check Store' : 'Out of Stock'}
          </span>
        </div>
        {store.storeUrl && (
          <a href={store.storeUrl} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors shrink-0">
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        )}
      </div>

      {/* Restock info — shown when out of stock or unknown */}
      {!store.inStock && (
        <div className="mt-2 ml-5 bg-slate-700/40 rounded-lg px-3 py-2 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-slate-300 text-xs font-medium">Restock: </span>
            <span className="text-slate-400 text-xs">{restock.schedule}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Clock className={`w-3 h-3 shrink-0 mt-0.5 ${urgencyColors[restock.urgency]}`} />
            <span className={`text-xs leading-snug ${urgencyColors[restock.urgency]}`}>{restock.tip}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductModal({ product, onClose }: { product: StoreProduct; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-700 flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain p-1"
              onError={(e) => { ;(e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg leading-tight">{product.name}</h3>
            <p className="text-slate-400 text-sm">{TYPE_LABELS[product.type]}</p>
            <p className="text-yellow-400 font-bold text-xl mt-1">${product.price.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 font-medium text-sm">Store Availability</span>
          </div>
          {product.stores
            .sort((a, b) => (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99))
            .map((store) => (
              <StoreRow key={store.storeName} store={store} productType={product.type} productName={product.name} />
            ))}
        </div>
      </div>
    </div>
  )
}
