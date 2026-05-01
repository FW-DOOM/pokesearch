import { useState, useEffect, useCallback } from 'react'
import { Star, ChevronDown, ChevronUp, Bell, BellOff, Clock, ExternalLink, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import {
  PREMIUM_BOXES,
  type BoxType,
  type PremiumBox,
  type RedditAlert,
  type FavMatch,
  getFavorites,
  toggleFavorite,
  getRedditRestockAlerts,
  requestNotificationPermission,
  checkFavoritesAgainstAlerts,
} from '../services/premiumBoxes'
import {
  type BoxStockResult,
  checkBoxStock,
} from '../services/premiumBoxStock'
import { useGeolocation } from '../hooks/useGeolocation'

const FILTER_TABS: { label: string; value: BoxType | 'all' | 'hot' }[] = [
  { label: 'All',         value: 'all' },
  { label: '🔥 Hot',      value: 'hot' },
  { label: 'ETB',         value: 'etb' },
  { label: 'Booster Box', value: 'booster-box' },
  { label: 'UPC',         value: 'upc' },
  { label: 'Collection',  value: 'premium-collection' },
]

const STORE_COLORS: Record<string, string> = {
  'Target':         'bg-red-600',
  'Walmart':        'bg-blue-600',
  'Best Buy':       'bg-blue-700',
  'GameStop':       'bg-green-700',
  'Amazon':         'bg-orange-600',
  'Pokémon Center': 'bg-yellow-600',
  'TCGPlayer':      'bg-purple-600',
  'eBay':           'bg-red-500',
  'Costco':         'bg-blue-800',
  'Five Below':     'bg-pink-600',
}

function stockBadge(status: PremiumBox['stockStatus']) {
  if (status === 'hard-to-find') return { label: 'Hard to Find', color: 'bg-red-500/20 text-red-400 border border-red-500/30' }
  if (status === 'limited')     return { label: 'Limited',       color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' }
  return                               { label: 'Available',     color: 'bg-green-500/20 text-green-400 border border-green-500/30' }
}

function stockDot(status: PremiumBox['stockStatus']) {
  if (status === 'hard-to-find') return 'bg-red-500'
  if (status === 'limited')     return 'bg-yellow-400'
  return                               'bg-green-400'
}

// ─── Box Card ────────────────────────────────────────────────────────────────

function BoxCard({ box, favIds, onFavToggle, liveStock, onCheckStock, stockLoading }: {
  box: PremiumBox
  favIds: string[]
  onFavToggle: (id: string) => void
  liveStock?: BoxStockResult
  onCheckStock: (box: PremiumBox) => void
  stockLoading: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isFav = favIds.includes(box.id)
  const badge = stockBadge(box.stockStatus)

  return (
    <div className={`rounded-2xl border transition-all ${isFav ? 'border-yellow-400/40 bg-[#1a1a2e]' : 'border-slate-700/50 bg-[#111122]'}`}>
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start gap-3">
          {/* Image */}
          <div className="w-16 h-16 rounded-xl bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
            <img
              src={box.imageUrl}
              alt={box.name}
              className="w-full h-full object-contain p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                {box.setTag && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-block ${
                    box.setTag === 'Team Rocket' ? 'bg-red-900/50 text-red-400 border border-red-500/30' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {box.setTag === 'Team Rocket' ? '🚀 ' : ''}{box.setTag}
                  </span>
                )}
                <h3 className="text-white font-bold text-sm leading-snug">{box.name}</h3>
              </div>
              {/* Favorite */}
              <button
                onClick={() => onFavToggle(box.id)}
                className={`p-1.5 rounded-xl flex-shrink-0 transition-all ${
                  isFav
                    ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
                    : 'text-slate-500 hover:text-yellow-400 hover:bg-yellow-400/10'
                }`}
                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`w-4 h-4 ${isFav ? 'fill-yellow-400' : ''}`} />
              </button>
            </div>

            {/* MSRP + stock */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-yellow-400 font-bold text-sm">${box.msrp.toFixed(2)} MSRP</span>
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${stockDot(box.stockStatus)}`} />
                {badge.label}
              </span>
              {box.isHot && <span className="text-xs text-orange-400">🔥 Hot</span>}
            </div>
          </div>
        </div>

        {/* Live stock results */}
        {liveStock && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              {liveStock.hasLiveData
                ? <><Wifi className="w-3 h-3 text-green-400" /><span className="text-green-400 text-xs font-semibold">Live Stock</span></>
                : <><WifiOff className="w-3 h-3 text-slate-500" /><span className="text-slate-500 text-xs">Store links</span></>}
              <span className="text-slate-600 text-xs ml-auto">
                {new Date(liveStock.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {liveStock.stocks.map((s) => (
                <a key={s.store} href={s.url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg text-white transition-opacity hover:opacity-90 ${STORE_COLORS[s.store.split(' — ')[0]] ?? 'bg-slate-600'}`}>
                  {s.store.split(' — ')[0]}
                  {s.distanceMiles != null && <span className="opacity-70 text-[10px]">{s.distanceMiles}mi</span>}
                  {!s.stockUnknown && (
                    <span className={`text-[10px] font-bold px-1 rounded ${s.inStock ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'}`}>
                      {s.inStock ? '✓' : '✗'}
                    </span>
                  )}
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Check stock button (shown when no live data yet) */}
        {!liveStock && (
          <button
            onClick={() => onCheckStock(box)}
            disabled={stockLoading}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
          >
            {stockLoading
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking stores…</>
              : <><Wifi className="w-3.5 h-3.5" /> Check Stock Near Me</>}
          </button>
        )}

        {/* Restock schedule toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors w-full"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Restock Schedule</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
        </button>
      </div>

      {/* Expanded restock schedule */}
      {expanded && (
        <div className="border-t border-slate-700/50 px-4 py-3 flex flex-col gap-2">
          {box.restockSchedule.map((sched) => (
            <div key={sched.store} className="flex items-start gap-2 text-xs">
              <span className={`flex-shrink-0 font-bold text-white px-2 py-0.5 rounded-lg ${STORE_COLORS[sched.store] ?? 'bg-slate-600'}`}>
                {sched.store}
              </span>
              <div>
                <span className="text-white font-semibold">{sched.days}</span>
                <span className="text-slate-400"> · {sched.time}</span>
                {sched.notes && <p className="text-slate-500 mt-0.5">{sched.notes}</p>}
              </div>
            </div>
          ))}
          <p className="text-slate-600 text-xs mt-1">Times are approximate. Retail restocks vary by location.</p>
        </div>
      )}
    </div>
  )
}

// ─── Reddit alert card ────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: RedditAlert }) {
  return (
    <a
      href={alert.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-xl bg-[#111122] border border-slate-700/50 hover:border-slate-600 transition-colors"
    >
      <div className="w-7 h-7 rounded-full bg-orange-600/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-orange-400 text-xs font-black">r/</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold line-clamp-2 leading-snug">{alert.title}</p>
        <div className="flex items-center gap-2 mt-1">
          {alert.store && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold text-white ${STORE_COLORS[alert.store] ?? 'bg-slate-600'}`}>
              {alert.store}
            </span>
          )}
          <span className="text-slate-500 text-xs">↑{alert.upvotes} · {alert.postedAgo} · r/pokemontcg</span>
        </div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-1" />
    </a>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PremiumBoxes() {
  const [filter, setFilter]               = useState<BoxType | 'all' | 'hot'>('all')
  const [favIds, setFavIds]               = useState<string[]>(() => getFavorites())
  const [alerts, setAlerts]               = useState<RedditAlert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [notifGranted, setNotifGranted]   = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted')
  const [notifDenied, setNotifDenied]     = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'denied')
  const [toasts, setToasts]               = useState<FavMatch[]>([])
  // Live store stock per boxId
  const [stockMap, setStockMap]           = useState<Record<string, BoxStockResult>>({})
  const [stockLoading, setStockLoading]   = useState<string | null>(null)
  const geo = useGeolocation()

  function addToast(match: FavMatch) {
    setToasts((t) => [match, ...t].slice(0, 3))
    setTimeout(() => setToasts((t) => t.filter((x) => x !== match)), 8000)
  }

  async function refreshAlerts() {
    setAlertsLoading(true)
    const newAlerts = await getRedditRestockAlerts()
    setAlerts(newAlerts)
    setAlertsLoading(false)
    // Check favorites against fresh alerts and show toasts
    const matches = await checkFavoritesAgainstAlerts()
    matches.forEach(addToast)
  }

  // Load alerts on mount + poll every 2 min while tab is open
  useEffect(() => {
    refreshAlerts()
    const interval = setInterval(refreshAlerts, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Check a single box's stock manually
  async function handleCheckStock(box: PremiumBox) {
    if (!geo.lat || !geo.lon) return
    setStockLoading(box.id)
    try {
      const result = await checkBoxStock(box.id, box.name, geo.lat, geo.lon)
      setStockMap((m) => ({ ...m, [box.id]: result }))
    } finally {
      setStockLoading(null)
    }
  }

  // Auto-check favorited boxes when geo is ready
  useEffect(() => {
    if (!geo.lat || !geo.lon || favIds.length === 0) return
    const favBoxes = PREMIUM_BOXES.filter((b) => favIds.includes(b.id))
    Promise.allSettled(
      favBoxes.map(async (box) => {
        const result = await checkBoxStock(box.id, box.name, geo.lat!, geo.lon!)
        setStockMap((m) => ({ ...m, [box.id]: result }))
        // Toast if live in-stock hit
        if (result.hasLiveData) {
          const inStockStore = result.stocks.find((s) => s.inStock && !s.stockUnknown)
          if (inStockStore) {
            addToast({ boxName: box.name, store: inStockStore.store, alert: { title: '', url: inStockStore.url, postedAgo: '', upvotes: 0 } })
          }
        }
      })
    )
  }, [geo.lat, geo.lon, favIds.join(',')])

  const handleFavToggle = useCallback((id: string) => {
    toggleFavorite(id)
    setFavIds(getFavorites())
  }, [])

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermission()
    setNotifGranted(granted)
    setNotifDenied(!granted && typeof Notification !== 'undefined' && Notification.permission === 'denied')
    if (granted) checkFavoritesAgainstAlerts().then((m) => m.forEach(addToast))
  }

  const filtered = PREMIUM_BOXES.filter((b) => {
    if (filter === 'all')  return true
    if (filter === 'hot')  return b.isHot
    return b.type === filter
  })

  return (
    <div className="flex flex-col gap-4">

      {/* In-app toast alerts for favorites */}
      {toasts.length > 0 && (
        <div className="flex flex-col gap-2">
          {toasts.map((t, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/40 animate-pulse">
              <span className="text-xl">⭐</span>
              <div className="flex-1">
                <p className="text-yellow-300 font-bold text-sm">Restock spotted!</p>
                <p className="text-yellow-200 text-xs mt-0.5">{t.boxName} seen at {t.store}</p>
                <a href={t.alert.url} target="_blank" rel="noopener noreferrer"
                  className="text-yellow-400 text-xs underline mt-1 inline-block">
                  View post on Reddit →
                </a>
              </div>
              <button onClick={() => setToasts((p) => p.filter((_, j) => j !== i))}
                className="text-yellow-600 hover:text-yellow-300 text-lg leading-none">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Notification banner */}
      {!notifGranted && !notifDenied && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <Bell className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-300 text-xs flex-1">
            ⭐ Star a box and get notified when it restocks near you
          </p>
          <button
            onClick={handleEnableNotifications}
            className="text-xs font-bold bg-yellow-400 text-black px-3 py-1 rounded-lg hover:bg-yellow-300 transition-colors flex-shrink-0"
          >
            Enable
          </button>
        </div>
      )}
      {notifGranted && favIds.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-500/10 border border-green-500/30">
          <Bell className="w-3.5 h-3.5 text-green-400" />
          <p className="text-green-300 text-xs">Restock alerts on for {favIds.length} favorite{favIds.length > 1 ? 's' : ''}</p>
        </div>
      )}
      {notifDenied && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 border border-slate-700">
          <BellOff className="w-3.5 h-3.5 text-slate-500" />
          <p className="text-slate-500 text-xs">Notifications blocked — enable them in your browser settings to get restock alerts</p>
        </div>
      )}

      {/* Reddit community alerts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-bold text-sm flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            Community Restock Alerts
            <span className="text-xs text-slate-500 font-normal">from r/pokemontcg</span>
          </h2>
          <button
            onClick={refreshAlerts}
            className="p-1 text-slate-500 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${alertsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {alertsLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-3">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking r/pokemontcg…
          </div>
        )}
        {!alertsLoading && alerts.length === 0 && (
          <p className="text-slate-600 text-xs py-2">No restock posts in the last 24 hours — check back soon</p>
        )}
        {!alertsLoading && alerts.length > 0 && (
          <div className="flex flex-col gap-2">
            {alerts.map((a) => <AlertCard key={a.url} alert={a} />)}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_TABS.map((ft) => (
          <button
            key={ft.value}
            onClick={() => setFilter(ft.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === ft.value
                ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20'
                : 'text-slate-400 hover:text-white bg-slate-800'
            }`}
          >
            {ft.label}
          </button>
        ))}
      </div>

      {/* Box grid */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="text-slate-500 text-sm py-4 text-center">No products match this filter</p>
        )}
        {filtered.map((box) => (
          <BoxCard
            key={box.id}
            box={box}
            favIds={favIds}
            onFavToggle={handleFavToggle}
            liveStock={stockMap[box.id]}
            onCheckStock={handleCheckStock}
            stockLoading={stockLoading === box.id}
          />
        ))}
      </div>

      <p className="text-slate-600 text-xs text-center pb-2">
        Prices shown are MSRP. Secondary market prices may vary.
        Restock times are estimates based on community reports.
      </p>
    </div>
  )
}
