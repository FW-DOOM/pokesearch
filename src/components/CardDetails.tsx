import { useState } from 'react'
import { type PokemonCard, getCardMarketPrice, getPullRate, getRarityTier, getAllPrices } from '../services/pokemonTcgApi'
import { type PSAEstimation, detectFake } from '../services/cardAnalysis'
import { toggleWatchlist, isWatched } from '../services/watchlist'
import HoloCard from './HoloCard'
import { DollarSign, TrendingUp, Shield, AlertTriangle, CheckCircle, XCircle, Star, Info, Heart, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  card: PokemonCard
  psaEstimation: PSAEstimation | null
  capturedImage: string | null
}

const RARITY_TIER_STYLES: Record<string, { badge: string; glow: string; header: string }> = {
  common:   { badge: 'text-slate-400 bg-slate-700', glow: '', header: 'from-slate-800 to-slate-900' },
  uncommon: { badge: 'text-green-400 bg-green-900/40', glow: '', header: 'from-green-950 to-slate-900' },
  rare:     { badge: 'text-blue-400 bg-blue-900/40', glow: 'shadow-blue-500/20', header: 'from-blue-950 to-slate-900' },
  ultra:    { badge: 'text-purple-400 bg-purple-900/40', glow: 'shadow-purple-500/30', header: 'from-purple-950 to-slate-900' },
  secret:   { badge: 'text-yellow-400 bg-yellow-900/40', glow: 'shadow-yellow-500/40', header: 'from-yellow-950 to-slate-900' },
}

const PSA_GRADE_HEX: Record<number, string> = {
  10: '#22c55e', 9: '#4ade80', 8: '#a3e635', 7: '#facc15',
  6: '#fb923c', 5: '#f87171', 4: '#ef4444', 3: '#dc2626', 2: '#b91c1c', 1: '#7f1d1d',
}
function psaColor(g: number) { return PSA_GRADE_HEX[Math.round(g)] ?? '#94a3b8' }

function estimateGradedValue(raw: number | null, grade: number): number | null {
  if (!raw) return null
  const m: Record<number, number> = { 10: 8, 9: 3.5, 8: 2, 7: 1.3, 6: 1.1, 5: 0.9, 4: 0.7, 3: 0.5, 2: 0.3, 1: 0.1 }
  return raw * (m[Math.round(grade)] ?? 1)
}

export default function CardDetails({ card, psaEstimation, capturedImage }: Props) {
  const marketPrice = getCardMarketPrice(card)
  const allPrices = getAllPrices(card)
  const pullRate = getPullRate(card.rarity)
  const rarityTier = getRarityTier(card.rarity)
  const styles = RARITY_TIER_STYLES[rarityTier] ?? RARITY_TIER_STYLES.common
  const fakeInfo = detectFake({ name: card.name, rarity: card.rarity })
  const gradedValue = psaEstimation ? estimateGradedValue(marketPrice, psaEstimation.grade) : null

  const [watched, setWatched] = useState(() => isWatched(card.id))
  const [showAllPrices, setShowAllPrices] = useState(false)
  const [heartAnim, setHeartAnim] = useState(false)

  function handleWatch() {
    const now = toggleWatchlist(card, marketPrice)
    setWatched(now)
    if (now) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 600) }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Hero card header ─────────────────────────────────────────── */}
      <div className={`bg-gradient-to-br ${styles.header} rounded-2xl p-4 flex gap-4 border border-slate-700/60 shadow-xl ${styles.glow}`}>
        <div className="shrink-0 w-32" style={{ perspective: '800px' }}>
          <HoloCard src={card.images.large} alt={card.name} rarity={card.rarity} />
          {capturedImage && (
            <img src={capturedImage} alt="Captured" className="mt-2 w-full rounded-lg border border-slate-600 opacity-70" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-black text-xl leading-tight tracking-tight">{card.name}</h2>
              <p className="text-slate-400 text-sm mt-0.5">{card.set.name} · #{card.number}</p>
            </div>
            <button
              onClick={handleWatch}
              className={`p-2 rounded-xl transition-all ${watched ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400 hover:text-red-400'} ${heartAnim ? 'scale-125' : 'scale-100'}`}
            >
              <Heart className={`w-5 h-5 transition-all ${watched ? 'fill-red-400' : ''}`} />
            </button>
          </div>

          {card.rarity && (
            <span className={`self-start text-xs px-2.5 py-1 rounded-full font-semibold tracking-wide ${styles.badge}`}>
              {card.rarity}
            </span>
          )}

          {card.hp && (
            <p className="text-slate-400 text-sm">HP <span className="text-white font-bold">{card.hp}</span></p>
          )}

          {card.supertype && (
            <p className="text-slate-500 text-xs">{card.supertype}{card.subtypes?.length ? ` · ${card.subtypes.join(', ')}` : ''}</p>
          )}

          {/* Quick price */}
          {marketPrice !== null && (
            <div className="mt-auto">
              <p className="text-yellow-400 font-black text-2xl leading-none">${marketPrice.toFixed(2)}</p>
              <p className="text-slate-500 text-xs">TCGPlayer market</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Price breakdown ──────────────────────────────────────────── */}
      {allPrices.length > 0 && (
        <div className="bg-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-semibold text-sm">Price Breakdown</span>
            {gradedValue && psaEstimation && (
              <span className="ml-auto text-green-400 text-xs flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                PSA {psaEstimation.grade}: ~${gradedValue.toFixed(0)}
              </span>
            )}
          </div>
          {(showAllPrices ? allPrices : allPrices.slice(0, 2)).map((p) => (
            <div key={p.label} className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-700/60">
              <span className="text-slate-400 text-sm flex-1">{p.label}</span>
              <span className="text-slate-500 text-xs">${p.low?.toFixed(2) ?? '—'} – ${p.high?.toFixed(2) ?? '—'}</span>
              <span className="text-white font-bold text-sm w-16 text-right">{p.market !== null ? `$${p.market.toFixed(2)}` : '—'}</span>
            </div>
          ))}
          {allPrices.length > 2 && (
            <button
              onClick={() => setShowAllPrices((v) => !v)}
              className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-slate-500 hover:text-slate-300 border-t border-slate-700/60 transition-colors"
            >
              {showAllPrices ? <><ChevronUp className="w-3.5 h-3.5" /> Less</> : <><ChevronDown className="w-3.5 h-3.5" /> {allPrices.length - 2} more variants</>}
            </button>
          )}
        </div>
      )}

      {/* ── Pull rate ────────────────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center shrink-0">
          <Star className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{pullRate}</p>
          <p className="text-slate-500 text-xs">{card.rarity ?? 'Unknown rarity'} · {card.set.name}</p>
        </div>
        {card.tcgplayer?.url && (
          <a href={card.tcgplayer.url} target="_blank" rel="noopener noreferrer"
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors">
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
        )}
      </div>

      {/* ── PSA slab ─────────────────────────────────────────────────── */}
      {!psaEstimation && (
        <div className="bg-slate-800 rounded-2xl p-4 flex items-center gap-3 border border-dashed border-slate-700">
          <Shield className="w-8 h-8 text-slate-600 shrink-0" />
          <div>
            <p className="text-slate-300 font-medium text-sm">PSA Grade Estimation</p>
            <p className="text-slate-500 text-xs mt-0.5">Scan the physical card with the camera for a damage analysis and grade estimate.</p>
          </div>
        </div>
      )}

      {psaEstimation && (
        <div className="bg-slate-800 rounded-2xl overflow-hidden">
          {/* PSA slab header bar */}
          <div className="h-2 w-full" style={{ background: psaColor(psaEstimation.grade) }} />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-semibold">PSA Grade Estimation</span>
              <span className="ml-auto text-slate-500 text-xs">~{Math.round(psaEstimation.confidence * 100)}% confidence</span>
            </div>

            {/* Slab visual */}
            <div className="flex gap-4 items-center mb-4">
              <div
                className="relative flex flex-col items-center justify-center rounded-2xl border-4 w-20 h-20 shrink-0 font-black"
                style={{ borderColor: psaColor(psaEstimation.grade), background: psaColor(psaEstimation.grade) + '18' }}
              >
                <span className="text-3xl leading-none" style={{ color: psaColor(psaEstimation.grade) }}>{psaEstimation.grade}</span>
                <span className="text-xs text-slate-400 font-normal">/ 10</span>
                {/* Slab shine */}
                <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg leading-tight">{psaEstimation.label}</p>
                <div className={`flex items-center gap-1.5 mt-1.5 text-sm font-medium ${psaEstimation.shouldSend ? 'text-green-400' : 'text-red-400'}`}>
                  {psaEstimation.shouldSend
                    ? <><CheckCircle className="w-4 h-4 shrink-0" /> Worth sending to PSA</>
                    : <><XCircle className="w-4 h-4 shrink-0" /> Not worth grading costs</>}
                </div>
                {gradedValue && (
                  <p className="text-slate-400 text-xs mt-1">Estimated graded value: <span className="text-green-400 font-bold">${gradedValue.toFixed(0)}</span></p>
                )}
              </div>
            </div>

            {/* Grade bar */}
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${psaEstimation.grade * 10}%`, background: `linear-gradient(90deg, ${psaColor(1)}, ${psaColor(psaEstimation.grade)})` }} />
            </div>

            {/* Reasoning */}
            {psaEstimation.reasoning.map((r, i) => (
              <p key={i} className="text-slate-400 text-sm flex items-start gap-2 mb-1">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" />{r}
              </p>
            ))}

            {/* Damage list */}
            {psaEstimation.damageRegions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Damage Detected</p>
                {psaEstimation.damageRegions.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${r.severity === 'major' ? 'bg-red-500' : r.severity === 'moderate' ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                    <span className="text-slate-300 text-sm flex-1">{r.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.severity === 'major' ? 'bg-red-900/50 text-red-400' : r.severity === 'moderate' ? 'bg-orange-900/50 text-orange-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                      {r.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Fake detection ───────────────────────────────────────────── */}
      <div className={`rounded-2xl p-4 ${fakeInfo.isSuspect ? 'bg-red-950/50 border border-red-700' : 'bg-slate-800'}`}>
        <div className="flex items-center gap-2 mb-2">
          {fakeInfo.isSuspect
            ? <AlertTriangle className="w-4 h-4 text-red-400" />
            : <CheckCircle className="w-4 h-4 text-green-400" />}
          <span className={`font-semibold text-sm ${fakeInfo.isSuspect ? 'text-red-400' : 'text-white'}`}>
            {fakeInfo.isSuspect ? 'Fake Card Suspected' : 'Authenticity Check'}
          </span>
        </div>
        {fakeInfo.flags.length > 0 ? fakeInfo.flags.map((f, i) => (
          <p key={i} className="text-slate-400 text-sm flex items-start gap-2 mt-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />{f}
          </p>
        )) : (
          <p className="text-slate-400 text-sm">No obvious authenticity concerns detected.</p>
        )}
      </div>

      {/* ── Set info ─────────────────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Set Info</p>
        <div className="flex items-center gap-3">
          <img src={card.set.images.symbol} alt="" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <p className="text-white font-semibold text-sm">{card.set.name}</p>
            <p className="text-slate-500 text-xs">{card.set.series} · Released {card.set.releaseDate}</p>
          </div>
        </div>
        {card.artist && <p className="text-slate-500 text-xs mt-3">Art by <span className="text-slate-400">{card.artist}</span></p>}
        {card.flavorText && <p className="text-slate-500 text-xs mt-2 italic leading-relaxed">"{card.flavorText}"</p>}
      </div>
    </div>
  )
}
