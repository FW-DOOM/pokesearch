import { useState } from 'react'
import { Search, Loader2, ArrowLeftRight, TrendingUp, TrendingDown, Minus, RotateCcw } from 'lucide-react'
import { searchCards, type PokemonCard, getCardMarketPrice, getRarityTier, getPullRate } from '../services/pokemonTcgApi'

interface CardSlot {
  query: string
  results: PokemonCard[]
  selected: PokemonCard | null
  searching: boolean
}

const RARITY_RANK: Record<string, number> = { common: 1, uncommon: 2, rare: 3, ultra: 4, secret: 5 }

function TradeSlot({
  slot,
  label,
  onQuery,
  onSearch,
  onSelect,
}: {
  slot: CardSlot
  label: string
  onQuery: (q: string) => void
  onSearch: () => void
  onSelect: (c: PokemonCard) => void
}) {
  return (
    <div className="flex-1 flex flex-col gap-3 min-w-0">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</p>

      {slot.selected ? (
        <div className="flex flex-col items-center gap-2">
          <img src={slot.selected.images.large} alt={slot.selected.name} className="w-full max-w-[140px] rounded-xl shadow-lg" />
          <p className="text-white font-bold text-sm text-center leading-tight">{slot.selected.name}</p>
          <p className="text-slate-400 text-xs text-center">{slot.selected.set.name}</p>
        </div>
      ) : (
        <div className="bg-slate-700/50 rounded-xl aspect-[63/88] flex items-center justify-center border-2 border-dashed border-slate-600">
          <p className="text-slate-500 text-xs text-center px-3">Search a card to compare</p>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); onSearch() }} className="flex gap-1.5">
        <input
          type="text"
          value={slot.query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Card name..."
          className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-400 text-xs"
        />
        <button type="submit" disabled={slot.searching} className="px-2.5 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 disabled:opacity-50 transition-colors">
          {slot.searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </button>
      </form>

      {slot.results.length > 0 && (
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {slot.results.map((card) => (
            <button key={card.id} onClick={() => onSelect(card)} className="group flex flex-col gap-1 items-center">
              <div className="w-full aspect-[63/88] rounded-lg overflow-hidden bg-slate-700 border-2 border-transparent group-hover:border-yellow-400 transition-colors">
                <img src={card.images.small} alt={card.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-slate-300 text-center leading-tight line-clamp-2">{card.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Verdict({ cardA, cardB }: { cardA: PokemonCard; cardB: PokemonCard }) {
  const priceA = getCardMarketPrice(cardA)
  const priceB = getCardMarketPrice(cardB)
  const rarityA = RARITY_RANK[getRarityTier(cardA.rarity)] ?? 1
  const rarityB = RARITY_RANK[getRarityTier(cardB.rarity)] ?? 1

  const bothHavePrice = priceA !== null && priceB !== null && priceA > 0 && priceB > 0
  const priceDiff = bothHavePrice ? priceA! - priceB! : null

  // Fair = within 25% of each other's value
  type Fairness = 'fair' | 'favor-a' | 'favor-b' | 'unknown'
  let fairness: Fairness = 'unknown'
  let overallScore = 0 // positive = A worth more, negative = B worth more

  if (bothHavePrice && priceDiff !== null) {
    const ratio = Math.abs(priceDiff) / Math.max(priceA!, priceB!)
    if (ratio <= 0.25) {
      fairness = 'fair'
    } else {
      fairness = priceDiff > 0 ? 'favor-a' : 'favor-b'
      overallScore = priceDiff
    }
  } else if (priceA !== null && priceA > 0 && (priceB === null || priceB === 0)) {
    // A has price, B doesn't — A likely worth more
    fairness = 'favor-a'
    overallScore = priceA
  } else if (priceB !== null && priceB > 0 && (priceA === null || priceA === 0)) {
    fairness = 'favor-b'
    overallScore = -(priceB)
  } else {
    // No prices at all — fall back to rarity comparison
    if (rarityA > rarityB + 1) { fairness = 'favor-a'; overallScore = 1 }
    else if (rarityB > rarityA + 1) { fairness = 'favor-b'; overallScore = -1 }
    else fairness = 'fair'
  }

  const priceWinner = priceDiff !== null ? (priceDiff > 0 ? 'a' : priceDiff < 0 ? 'b' : 'tie')
    : priceA !== null && priceA > 0 ? 'a'
    : priceB !== null && priceB > 0 ? 'b'
    : 'tie'

  const rows = [
    {
      label: 'Market Price',
      a: priceA !== null && priceA > 0 ? `$${priceA.toFixed(2)}` : 'No data',
      b: priceB !== null && priceB > 0 ? `$${priceB.toFixed(2)}` : 'No data',
      winner: priceWinner,
    },
    {
      label: 'Rarity',
      a: cardA.rarity ?? '—',
      b: cardB.rarity ?? '—',
      winner: rarityA > rarityB ? 'a' : rarityA < rarityB ? 'b' : 'tie',
    },
    {
      label: 'Pull Rate',
      a: getPullRate(cardA.rarity),
      b: getPullRate(cardB.rarity),
      winner: rarityA > rarityB ? 'a' : rarityA < rarityB ? 'b' : 'tie',
    },
    {
      label: 'Set',
      a: cardA.set.name,
      b: cardB.set.name,
      winner: 'tie' as const,
    },
  ]

  const bannerStyle = {
    fair:     'bg-green-900/50 border border-green-700/60 text-green-300',
    'favor-a':'bg-blue-900/50 border border-blue-700/60 text-blue-200',
    'favor-b':'bg-orange-900/50 border border-orange-700/60 text-orange-200',
    unknown:  'bg-slate-700/50 border border-slate-600 text-slate-300',
  }[fairness]

  const bannerText = {
    fair:     `✓ Fair Trade — values are within 25% of each other`,
    'favor-a':`⚠ Favors You — ${cardA.name} is worth significantly more`,
    'favor-b':`⚠ Favors Them — ${cardB.name} is worth significantly more`,
    unknown:  `⚡ No price data — compare by rarity and condition`,
  }[fairness]

  return (
    <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-4">
      {/* Verdict banner */}
      <div className={`rounded-xl px-4 py-3 font-bold text-sm ${bannerStyle}`}>
        {bannerText}
      </div>

      {/* Missing price warning */}
      {(!bothHavePrice && (priceA !== null || priceB !== null)) && (
        <p className="text-yellow-400/80 text-xs flex items-start gap-1.5">
          ⚠ One or both cards have no TCGPlayer price data. Verdict is based on available info only.
        </p>
      )}

      {/* Comparison rows */}
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs">
            <span className={`text-right font-medium ${row.winner === 'a' ? 'text-yellow-400' : 'text-slate-300'}`}>{row.a}</span>
            <span className="text-slate-500 text-center px-1">{row.label}</span>
            <span className={`font-medium ${row.winner === 'b' ? 'text-yellow-400' : 'text-slate-300'}`}>{row.b}</span>
          </div>
        ))}
      </div>

      {/* Price delta */}
      <div className="border-t border-slate-700 pt-3 flex items-center justify-center gap-2 text-sm">
        {priceDiff !== null && Math.abs(priceDiff) < 0.5 ? (
          <><Minus className="w-4 h-4 text-slate-400" /><span className="text-slate-400">Nearly identical value</span></>
        ) : priceDiff !== null && priceDiff > 0 ? (
          <><TrendingUp className="w-4 h-4 text-green-400" /><span className="text-slate-300">{cardA.name} is worth <span className="text-green-400 font-bold">${priceDiff.toFixed(2)} more</span></span></>
        ) : priceDiff !== null ? (
          <><TrendingDown className="w-4 h-4 text-orange-400" /><span className="text-slate-300">{cardB.name} is worth <span className="text-orange-400 font-bold">${Math.abs(priceDiff).toFixed(2)} more</span></span></>
        ) : overallScore > 0 ? (
          <><TrendingUp className="w-4 h-4 text-blue-400" /><span className="text-slate-300">{cardA.name} has pricing data, {cardB.name} does not</span></>
        ) : overallScore < 0 ? (
          <><TrendingDown className="w-4 h-4 text-orange-400" /><span className="text-slate-300">{cardB.name} has pricing data, {cardA.name} does not</span></>
        ) : (
          <><Minus className="w-4 h-4 text-slate-500" /><span className="text-slate-500">No price data available for comparison</span></>
        )}
      </div>
    </div>
  )
}

export default function TradeCompare() {
  const emptySlot = (): CardSlot => ({ query: '', results: [], selected: null, searching: false })
  const [slotA, setSlotA] = useState<CardSlot>(emptySlot())
  const [slotB, setSlotB] = useState<CardSlot>(emptySlot())

  async function doSearch(which: 'a' | 'b') {
    const slot = which === 'a' ? slotA : slotB
    const set = which === 'a' ? setSlotA : setSlotB
    if (!slot.query.trim()) return
    set((s) => ({ ...s, searching: true, results: [] }))
    try {
      const results = await searchCards(slot.query.trim())
      set((s) => ({ ...s, results, searching: false }))
    } catch {
      set((s) => ({ ...s, searching: false }))
    }
  }

  function selectCard(which: 'a' | 'b', card: PokemonCard) {
    const set = which === 'a' ? setSlotA : setSlotB
    set((s) => ({ ...s, selected: card, results: [] }))
  }

  function reset() {
    setSlotA(emptySlot())
    setSlotB(emptySlot())
  }

  const bothSelected = slotA.selected && slotB.selected

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">Search two cards to compare value and fairness of a trade.</p>
        {(slotA.selected || slotB.selected) && (
          <button onClick={reset} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      <div className="flex gap-4 items-start">
        <TradeSlot slot={slotA} label="Your Card" onQuery={(q) => setSlotA((s) => ({ ...s, query: q }))} onSearch={() => doSearch('a')} onSelect={(c) => selectCard('a', c)} />
        <div className="flex items-center justify-center pt-16 shrink-0">
          <ArrowLeftRight className="w-5 h-5 text-yellow-400" />
        </div>
        <TradeSlot slot={slotB} label="Their Card" onQuery={(q) => setSlotB((s) => ({ ...s, query: q }))} onSearch={() => doSearch('b')} onSelect={(c) => selectCard('b', c)} />
      </div>

      {bothSelected && <Verdict cardA={slotA.selected!} cardB={slotB.selected!} />}

      {!bothSelected && (
        <div className="text-center py-6 text-slate-600 text-sm">
          Search and select both cards to see the trade analysis
        </div>
      )}
    </div>
  )
}
