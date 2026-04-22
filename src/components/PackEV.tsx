import { useState, useEffect } from 'react'
import { getSets, getSetCards, getCardMarketPrice, getRarityTier, type TcgSet, type PokemonCard } from '../services/pokemonTcgApi'
import { Package, TrendingUp, TrendingDown, Minus, Loader2, ChevronDown } from 'lucide-react'

// Approximate cards per pack slot distribution
const PACK_SLOTS = {
  common: 4,
  uncommon: 3,
  rare: 1,      // could be rare, ultra, or secret
}

const RARITY_PULL_ODDS: Record<string, number> = {
  common: 1,
  uncommon: 1,
  rare: 0.5,
  ultra: 1 / 72,
  secret: 1 / 144,
}

interface EVResult {
  packEV: number
  boxEV: number
  packRetail: number
  boxRetail: number
  packProfit: number
  boxProfit: number
  topPulls: { card: PokemonCard; price: number; odds: number }[]
  rarityBreakdown: { label: string; count: number; avgPrice: number }[]
}

function calcEV(cards: PokemonCard[]): EVResult {
  const packRetail = 4.99
  const boxRetail = 119.99

  const byTier: Record<string, PokemonCard[]> = { common: [], uncommon: [], rare: [], ultra: [], secret: [] }
  for (const c of cards) {
    const tier = getRarityTier(c.rarity)
    byTier[tier].push(c)
  }

  function avgPrice(tier: string): number {
    const group = byTier[tier]
    if (!group.length) return 0
    const prices = group.map((c) => getCardMarketPrice(c) ?? 0).filter((p) => p > 0)
    return prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  }

  // EV per pack = sum over all tiers of (slots × pull_odds × avg_price)
  const commonEV = PACK_SLOTS.common * avgPrice('common')
  const uncommonEV = PACK_SLOTS.uncommon * avgPrice('uncommon')
  const rareEV = PACK_SLOTS.rare * 0.5 * avgPrice('rare')
  const ultraEV = PACK_SLOTS.rare * RARITY_PULL_ODDS.ultra * avgPrice('ultra')
  const secretEV = PACK_SLOTS.rare * RARITY_PULL_ODDS.secret * avgPrice('secret')

  const packEV = parseFloat((commonEV + uncommonEV + rareEV + ultraEV + secretEV).toFixed(2))
  const boxEV = parseFloat((packEV * 36).toFixed(2))

  // Top pulls = highest priced cards
  const topPulls = cards
    .map((c) => ({ card: c, price: getCardMarketPrice(c) ?? 0, odds: RARITY_PULL_ODDS[getRarityTier(c.rarity)] ?? 0.5 }))
    .filter((x) => x.price > 0)
    .sort((a, b) => b.price - a.price)
    .slice(0, 8)

  const rarityBreakdown = ['common', 'uncommon', 'rare', 'ultra', 'secret'].map((tier) => ({
    label: tier.charAt(0).toUpperCase() + tier.slice(1),
    count: byTier[tier].length,
    avgPrice: parseFloat(avgPrice(tier).toFixed(2)),
  })).filter((r) => r.count > 0)

  return { packEV, boxEV, packRetail, boxRetail, packProfit: packEV - packRetail, boxProfit: boxEV - boxRetail, topPulls, rarityBreakdown }
}

export default function PackEV() {
  const [sets, setSets] = useState<TcgSet[]>([])
  const [selectedSet, setSelectedSet] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [setsLoading, setSetsLoading] = useState(true)
  const [result, setResult] = useState<EVResult | null>(null)

  useEffect(() => {
    getSets().then((s) => { setSets(s); if (s[0]) setSelectedSet(s[0].id) }).finally(() => setSetsLoading(false))
  }, [])

  async function calculate() {
    if (!selectedSet) return
    setLoading(true)
    setResult(null)
    try {
      const cards = await getSetCards(selectedSet)
      setResult(calcEV(cards))
    } finally {
      setLoading(false)
    }
  }

  const setInfo = sets.find((s) => s.id === selectedSet)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-slate-400 text-sm">Select a set to calculate the expected value of a pack or box based on real TCGPlayer market prices.</p>

      {/* Set picker */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            value={selectedSet}
            onChange={(e) => { setSelectedSet(e.target.value); setResult(null) }}
            disabled={setsLoading}
            className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-400 pr-10"
          >
            {setsLoading ? <option>Loading sets…</option> : sets.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.releaseDate.slice(0, 4)})</option>
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

      {setInfo && (
        <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-3 py-2">
          <img src={setInfo.images.symbol} alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <p className="text-slate-400 text-xs">{setInfo.series} · {setInfo.total} cards · Released {setInfo.releaseDate}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
          <p className="text-slate-400 text-sm">Fetching card prices from TCGPlayer…</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          {/* Pack vs Box EV cards */}
          <div className="grid grid-cols-2 gap-3">
            <EVCard
              label="Pack EV"
              ev={result.packEV}
              retail={result.packRetail}
              profit={result.packProfit}
              icon={<Package className="w-5 h-5" />}
            />
            <EVCard
              label="Booster Box EV"
              ev={result.boxEV}
              retail={result.boxRetail}
              profit={result.boxProfit}
              icon={<Package className="w-5 h-5" />}
            />
          </div>

          {/* Rarity breakdown */}
          <div className="bg-slate-800 rounded-2xl p-4">
            <p className="text-white font-semibold text-sm mb-3">Expected Value by Rarity</p>
            {result.rarityBreakdown.map((row) => (
              <div key={row.label} className="flex items-center gap-3 py-2 border-b border-slate-700/60 last:border-0">
                <span className="text-slate-400 text-sm w-20">{row.label}</span>
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.min(100, (row.avgPrice / 10) * 100)}%` }} />
                </div>
                <span className="text-slate-400 text-xs w-12 text-right">{row.count} cards</span>
                <span className="text-white font-semibold text-sm w-14 text-right">${row.avgPrice.toFixed(2)}</span>
              </div>
            ))}
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
      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">
        {icon} {label}
      </div>
      <p className={`text-2xl font-black ${positive ? 'text-green-400' : 'text-white'}`}>${ev.toFixed(2)}</p>
      <p className="text-slate-500 text-xs">Retail: ${retail.toFixed(2)}</p>
      <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {positive ? <TrendingUp className="w-3.5 h-3.5" /> : profit === 0 ? <Minus className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {positive ? '+' : ''}{profit.toFixed(2)} {positive ? 'profit' : 'loss'} per {label.includes('Box') ? 'box' : 'pack'}
      </div>
    </div>
  )
}
