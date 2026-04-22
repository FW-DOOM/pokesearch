import type { PokemonCard } from './pokemonTcgApi'

const KEY = 'pokesearch_watchlist'

export interface WatchedCard {
  id: string
  name: string
  imageSmall: string
  setName: string
  savedPrice: number | null
  savedAt: number
}

export function getWatchlist(): WatchedCard[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

export function isWatched(cardId: string): boolean {
  return getWatchlist().some((c) => c.id === cardId)
}

export function addToWatchlist(card: PokemonCard, price: number | null) {
  const list = getWatchlist().filter((c) => c.id !== card.id)
  list.unshift({ id: card.id, name: card.name, imageSmall: card.images.small, setName: card.set.name, savedPrice: price, savedAt: Date.now() })
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)))
}

export function removeFromWatchlist(cardId: string) {
  const list = getWatchlist().filter((c) => c.id !== cardId)
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function toggleWatchlist(card: PokemonCard, price: number | null): boolean {
  if (isWatched(card.id)) { removeFromWatchlist(card.id); return false }
  addToWatchlist(card, price); return true
}
