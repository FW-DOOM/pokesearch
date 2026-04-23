import { useState, useEffect, useMemo } from 'react'
import { getSets, getSetCards, getCardMarketPrice, getRarityTier, type TcgSet, type PokemonCard } from '../services/pokemonTcgApi'
import { Package, TrendingUp, TrendingDown, Minus, Loader2, ChevronDown } from 'lucide-react'

// Cards per pack slot by era
function getPackSlots(series: string) {
  const s = series.toLowerCase()
  if (s.includes('scarlet') || s.includes('sword') || s.includes('sun') || s.includes('xy') || s.includes('black') || s.includes('heartgold')) {
    return { common: 4, uncommon: 3, rare: 1 }
  }
  if (s.includes('e-card') || s.includes('neo') || s.includes('gym') || s.includes('base')) {
    return { common: 7, uncommon: 3, rare: 1 } // older sets had 11 cards/pack
  }
  return { common: 4, uncommon: 3, rare: 1 }
}

// Approximate retail pack price by era
function getPackRetail(releaseDate: string): number {
  const year = parseInt(releaseDate.slice(0, 4))
  if (year >= 2023) return 4.99
  if (year >= 2020) return 4.49
  if (year >= 2016) return 3.99
  if (year >= 2011) return 3.49
  return 2.99 // vintage (Base, Gym, Neo, etc.)
}

const RARITY_PULL_ODDS: Record<string, number> = {
  common:   1,
  uncommon: 1,
  rare:     0.5,
  ultra:    1 / 72,
  secret:   1 / 144,
}

interface EVResult {
  packEV: number
  boxEV: number
  packRetail: number
  boxRetail: number
  packProfit: number
  boxProfit: number
  topPulls: { card: PokemonCard; price: number; odds: number }[]
  rarityBreakdown: { label: string; count: number; avgPrice: number; ev: number }[]
  totalCards: number
}

function calcEV(cards: PokemonCard[], set: TcgSet): EVResult {
  const packRetail = getPackRetail(set.releaseDate)
  const boxRetail  = parseFloat((packRetail * 36).toFixed(2))
  const slots      = getPackSlots(set.series)

  const byTier: Record<string, PokemonCard[]> = { common: [], uncommon: [], rare: [], ultra: [], secret: [] }
  for (const c of cards) {
    const tier = getRarityTier(c.rarity)
    byTier[tier].push(c)
  }

  function avgPrice(tier: string): number {
    const group = byTier[tier]
    if (!group.length) return 0
    const prices = group.map(c => getCardMarketPrice(c) ?? 0).filter(p => p > 0)
    return prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  }

  const commonEV   = slots.common   * avgPrice('common')
  const uncommonEV = slots.uncommon * avgPrice('uncommon')
  const rareEV     = slots.rare     * 0.5               * avgPrice('rare')
  const ultraEV    = slots.rare     * RARITY_PULL_ODDS.ultra  * avgPrice('ultra')
  const secretEV   = slots.rare     * RARITY_PULL_ODDS.secret * avgPrice('secret')

  const packEV = parseFloat((commonEV + uncommonEV + rareEV + ultraEV + secretEV).toFixed(2))
  const boxEV  = parseFloat((packEV * 36).toFixed(2))

  const topPulls = cards
    .map(c => ({ card: c, price: getCardMarketPrice(c) ?? 0, odds: RARITY_PULL_ODDS[getRarityTier(c.rarity)] ?? 0.5 }))
    .filter(x => x.price > 0)
    .sort((a, b) => b.price - a.price)
    .slice(0, 8)

  const rarityBreakdown = (
    ['common', 'uncommon', 'rare', 'ultra', 'secret'] as const
  ).map(tier => {
    const odds = RARITY_PULL_ODDS[tier]
    const ap = avgPrice(tier)
    return {
      label: tier.charAt(0).toUpperCase() + tier.slice(1),
      count: byTier[tier].length,
      avgPrice: parseFloat(ap.toFixed(2)),
      ev: parseFloat((odds * ap * (tier === 'common' ? slots.common : tier === 'uncommon' ? slots.uncommon : 1)).toFixed(3)),
    }
  }).filter(r => r.count > 0)

  return {
    packEV, boxEV, packRetail, boxRetail,
    packProfit: parseFloat((packEV - packRetail).toFixed(2)),
    boxProfit:  parseFloat((boxEV  - boxRetail).toFixed(2)),
    topPulls, rarityBreakdown, totalCards: cards.length,
  }
}

// Series display order — classic → modern
const SERIES_ORDER = [
  'Scarlet & Violet', 'Sword & Shield', 'Sun & Moon', 'XY', 'Black & White',
  'HeartGold & SoulSilver', 'Platinum', 'Diamond & Pearl',
  'EX', 'e-Card', 'Neo', 'Gym', 'Base',
  'POP Series', 'Nintendo Black Star Promos', 'Wizards Black Star Promos',
]

function groupSetsBySeries(sets: TcgSet[]): Map<string, TcgSet[]> {
  const map = new Map<string, TcgSet[]>()
  for (const s of sets) {
    const key = s.series || 'Other'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  // Sort within each group newest first
  for (const [, arr] of map) arr.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
  return map
}

export default function PackEV() {
  const [sets, setSets] = useState<TcgSet[]>([])
  const [selectedSet, setSelectedSet] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [setsLoading, setSetsLoading] = useState(true)
  const [result, setResult] = useState<EVResult | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getSets()
      .then(s => { setSets(s); if (s[0]) setSelectedSet(s[0].id) })
      .finally(() => setSetsLoading(false))
  }, [])

  const filteredSets = useMemo(() => {
    if (!search.trim()) return sets
    const q = search.toLowerCase()
    return sets.filter(s => s.name.toLowerCase().includes(q) || s.series.toLowerCase().includes(q))
  }, [sets, search])

  const grouped = useMemo(() => groupSetsBySeries(filteredSets), [filteredSets])

  // Ordered series keys
  const seriesKeys = useMemo(() => {
    const keys = [...grouped.keys()]
    return [
      ...SERIES_ORDER.filter(s => keys.includes(s)),
      ...keys.filter(k => !SERIES_ORDER.includes(k)).sort(),
    ]
  }, [grouped])

  async function calculate() {
    if (!selectedSet) return
    setLoading(true)
    setResult(null)
    try {
      const setInfo = sets.find(s => s.id === selectedSet)!
      const cards = await getSetCards(selectedSet)
      setResult(calcEV(cards, setInfo))
    } finally {
      setLoading(false)
    }
  }

  const setInfo = sets.find(s => s.id === selectedSet)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-slate-400 text-sm">
        Select any set — from Base Set and Team Rocket to the latest Scarlet &amp; Violet —
        to see expected value per pack and box based on live TCGPlayer prices.
      </p>

      {/* Set search + picker */}
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setResult(null) }}
          placeholder="Search sets… e.g. Team Rocket, Base Set, Paldea"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-400 text-sm"
        />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={selectedSet}
              onChange={e => { setSelectedSet(e.target.value); setResult(null) }}
              disabled={setsLoading}
              className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-400 pr-10"
            >
              {setsLoading
                ? <option>Loading all sets…</option>
                : seriesKeys.map(series => (
                  <optgroup key={series} label={`── ${series} ──`}>
                    {grouped.get(series)!.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.releaseDate.slice(0, 4)}) · {s.total} cards
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={calculate}
            disabled={loading || setsLoading}
            className="px-5 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Calculate
          </button>
        </div>
      </div>

      {setInfo && (
        <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-3 py-2">
          <img src={setInfo.images.symbol} alt="" className="w-6 h-6 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <p className="text-slate-400 text-xs">
            {setInfo.series} · {setInfo.total} cards · Released {setInfo.releaseDate}
          </p>
          <span className="ml-auto text-yellow-400 text-xs font-semibold">
            ~${getPackRetail(setInfo.releaseDate).toFixed(2)}/pack
          </span>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
          <p className="text-slate-400 text-sm">Crunching {setInfo?.total} cards from TCGPlayer…</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <EVCard label="Pack EV"       ev={result.packEV} retail={result.packRetail} profit={result.packProfit} icon={<Package className="w-5 h-5" />} />
            <EVCard label="Booster Box"   ev={result.boxEV}  retail={result.boxRetail}  profit={result.boxProfit}  icon={<Package className="w-5 h-5" />} />
          </div>

          {/* Rarity breakdown */}
          <div className="bg-slate-800 rounded-2xl p-4">
            <p className="text-white font-semibold text-sm mb-3">EV Breakdown by Rarity</p>
            {result.rarityBreakdown.map(row => (
              <div key={row.label} className="flex items-center gap-3 py-2 border-b border-slate-700/60 last:border-0">
                <span className="text-slate-400 text-sm w-20">{row.label}</span>
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.min(100, (row.avgPrice / 20) * 100)}%` }} />
                </div>
                <span className="text-slate-500 text-xs w-14 text-right">{row.count} cards</span>
                <span className="text-white font-semibold text-sm w-14 text-right">${row.avgPrice.toFixed(2)}</span>
              </div>
            ))}
            <p className="text-slate-500 text-xs mt-3">{result.totalCards} total cards in set</p>
          </div>

          {/* Top pulls */}
          <div className="bg-slate-800 rounded-2xl p-4">
            <p className="text-white font-semibold text-sm mb-3">Top Pulls in This Set</p>
            <div className="grid grid-cols-4 gap-2">
              {result.topPulls.map(({ card, price }) => (
                <div key={card.id} className="flex flex-col gap-1 items-center">
                  <div className="w-full aspect-[63/88] rounded-lg overflow-hidden bg-slate-700">
                    <img src={card.images.small} alt={card.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-slate-300 text-center leading-tight line-clamp-1">{card.name}</p>
                  <p className="text-yellow-400 font-bold text-xs">${price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EVCard({ label, ev, retail, profit, icon }: { label: string; ev: number; retail: number; profit: number; icon: React.ReactNode }) {
  const positive = profit >= 0
  return (
    <div className={`rounded-2xl p-4 border ${positive ? 'bg-green-950/40 border-green-700/50' : 'bg-slate-800 border-slate-700'}`}>
      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">{icon} {label}</div>
      <p className={`text-2xl font-black ${positive ? 'text-green-400' : 'text-white'}`}>${ev.toFixed(2)}</p>
      <p className="text-slate-500 text-xs">Retail: ${retail.toFixed(2)}</p>
      <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {positive ? <TrendingUp className="w-3.5 h-3.5" /> : profit === 0 ? <Minus className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {positive ? '+' : ''}{profit.toFixed(2)} {positive ? 'profit' : 'loss'} per {label.includes('Box') ? 'box' : 'pack'}
      </div>
    </div>
  )
}
