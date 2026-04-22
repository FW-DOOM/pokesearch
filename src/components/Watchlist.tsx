import { useState } from 'react'
import { getWatchlist, removeFromWatchlist, type WatchedCard } from '../services/watchlist'
import { Heart, Trash2, TrendingUp, Clock } from 'lucide-react'

export default function Watchlist({ onSelectCard }: { onSelectCard: (id: string) => void }) {
  const [list, setList] = useState<WatchedCard[]>(() => getWatchlist())

  function remove(id: string) {
    removeFromWatchlist(id)
    setList(getWatchlist())
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <Heart className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-slate-300 font-semibold">No cards saved yet</p>
        <p className="text-slate-500 text-sm">Tap the ♥ on any card to add it to your watchlist.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-slate-500 text-xs">{list.length} card{list.length !== 1 ? 's' : ''} saved</p>
      {list.map((card) => (
        <div key={card.id} className="bg-slate-800 rounded-2xl flex items-center gap-3 p-3 hover:bg-slate-750 transition-colors">
          <button onClick={() => onSelectCard(card.id)} className="shrink-0">
            <img src={card.imageSmall} alt={card.name} className="w-12 h-16 object-cover rounded-lg" />
          </button>
          <div className="flex-1 min-w-0" onClick={() => onSelectCard(card.id)}>
            <p className="text-white font-semibold text-sm leading-tight truncate">{card.name}</p>
            <p className="text-slate-400 text-xs mt-0.5 truncate">{card.setName}</p>
            <div className="flex items-center gap-2 mt-1.5">
              {card.savedPrice !== null && (
                <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                  <TrendingUp className="w-3 h-3" />${card.savedPrice.toFixed(2)}
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-500 text-xs">
                <Clock className="w-3 h-3" />
                {new Date(card.savedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button onClick={() => remove(card.id)} className="p-2 text-slate-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
