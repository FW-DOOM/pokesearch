import { useEffect, useState } from 'react'
import { getTrendingCards, getCardMarketPrice, type PokemonCard } from '../services/pokemonTcgApi'
import { Flame } from 'lucide-react'
import HoloCard from './HoloCard'

// Skeleton placeholder cards shown while fetching
function SkeletonCard() {
  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-1.5 w-20">
      <div className="w-20 rounded-lg bg-slate-700/60 animate-pulse" style={{ aspectRatio: '63/88' }} />
      <div className="h-2.5 w-14 bg-slate-700/60 animate-pulse rounded" />
      <div className="h-2.5 w-10 bg-slate-700/40 animate-pulse rounded" />
    </div>
  )
}

export default function TrendingCards({ onSelect }: { onSelect: (card: PokemonCard) => void }) {
  const [cards, setCards] = useState<PokemonCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Slight delay so the main UI paints first before kicking off the API call
    const t = setTimeout(() => {
      getTrendingCards()
        .then(setCards)
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 150)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-orange-400" />
        <span className="text-white font-semibold text-sm">Trending Pulls</span>
        <span className="text-slate-500 text-xs ml-auto">Recent secret &amp; ultra rares</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.length === 0
          ? <p className="text-slate-500 text-xs py-2">No trending cards found.</p>
          : cards.map((card) => {
              const price = getCardMarketPrice(card)
              return (
                <button
                  key={card.id}
                  onClick={() => onSelect(card)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 group w-20"
                >
                  <div className="w-20 aspect-[63/88]" style={{ perspective: '400px' }}>
                    <HoloCard
                      src={card.images.small}
                      alt={card.name}
                      rarity={card.rarity}
                      className="w-full h-full border-2 border-transparent group-hover:border-yellow-400/60 rounded-lg transition-colors"
                    />
                  </div>
                  <p className="text-xs text-slate-300 text-center leading-tight line-clamp-2 w-full">{card.name}</p>
                  {price !== null && <p className="text-yellow-400 font-bold text-xs">${price.toFixed(2)}</p>}
                </button>
              )
            })
        }
      </div>
    </div>
  )
}
