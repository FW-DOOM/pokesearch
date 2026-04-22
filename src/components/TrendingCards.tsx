import { useEffect, useState } from 'react'
import { getTrendingCards, getCardMarketPrice, type PokemonCard } from '../services/pokemonTcgApi'
import { Flame, Loader2 } from 'lucide-react'
import HoloCard from './HoloCard'

export default function TrendingCards({ onSelect }: { onSelect: (card: PokemonCard) => void }) {
  const [cards, setCards] = useState<PokemonCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTrendingCards().then(setCards).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading trending pulls…
      </div>
    )
  }

  if (!cards.length) return null

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-orange-400" />
        <span className="text-white font-semibold text-sm">Trending Pulls</span>
        <span className="text-slate-500 text-xs ml-auto">Recent secret & ultra rares</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {cards.map((card) => {
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
        })}
      </div>
    </div>
  )
}
