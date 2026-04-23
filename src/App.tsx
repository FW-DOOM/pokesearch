import { useState, useEffect } from 'react'
import { MapPin, Camera, Zap, ArrowLeftRight, HelpCircle, Heart, Package, X, Settings2 } from 'lucide-react'
import StoreFinder from './components/StoreFinder'
import CardScanner from './components/CardScanner'
import TradeCompare from './components/TradeCompare'
import PackEV from './components/PackEV'
import Watchlist from './components/Watchlist'
import OnboardingModal from './components/OnboardingModal'
import Settings from './components/Settings'
import { getCardById } from './services/pokemonTcgApi'
import CardDetails from './components/CardDetails'
import { getWatchlist } from './services/watchlist'

type Tab = 'store' | 'scanner' | 'trade' | 'ev' | 'watchlist'

const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'store',     label: 'Find',      icon: <MapPin className="w-3.5 h-3.5" />,         desc: 'Find packs & boxes at nearby stores' },
  { id: 'scanner',   label: 'Scan',      icon: <Camera className="w-3.5 h-3.5" />,          desc: 'Scan or search any card for price, PSA & damage' },
  { id: 'trade',     label: 'Trade',     icon: <ArrowLeftRight className="w-3.5 h-3.5" />,  desc: 'Compare two cards — is the trade fair?' },
  { id: 'ev',        label: 'Pack EV',   icon: <Package className="w-3.5 h-3.5" />,         desc: 'Expected value of any set\'s packs & boxes' },
  { id: 'watchlist', label: 'Saved',     icon: <Heart className="w-3.5 h-3.5" />,           desc: 'Your saved cards & prices' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('store')
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [watchlistCard, setWatchlistCard] = useState<Awaited<ReturnType<typeof getCardById>> | null>(null)
  const [watchCount, setWatchCount] = useState(() => getWatchlist().length)
  const [headerGlow, setHeaderGlow] = useState(false)

  // Subtle header pulse on tab switch
  useEffect(() => {
    setHeaderGlow(true)
    const t = setTimeout(() => setHeaderGlow(false), 600)
    return () => clearTimeout(t)
  }, [tab])

  function reopenOnboarding() {
    localStorage.removeItem('pokesearch_onboarded')
    setShowHelp(false)
    window.location.reload()
  }

  async function openWatchlistCard(id: string) {
    const card = await getCardById(id)
    setWatchlistCard(card)
  }

  function updateWatchCount() {
    setWatchCount(getWatchlist().length)
  }

  const current = TAB_CONFIG.find((t) => t.id === tab)!

  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col">
      <OnboardingModal />
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-40 border-b border-slate-800 transition-all duration-300 ${headerGlow ? 'bg-[#0f0f20]/98' : 'bg-[#0a0a14]/96'} backdrop-blur`}>
        {/* Top strip */}
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-400/25">
              <Zap className="w-5 h-5 text-black fill-black" />
            </div>
            <span className="text-white font-black text-xl tracking-tight">PokeSearch</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <Settings2 className="w-5 h-5" />
            </button>
            <div className="relative">
              <button onClick={() => setShowHelp((v) => !v)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
              {showHelp && (
                <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-2xl p-4 w-64 shadow-2xl z-50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-bold text-sm">PokeSearch Guide</p>
                    <button onClick={() => setShowHelp(false)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {TAB_CONFIG.map((t) => (
                      <div key={t.id} className="flex items-start gap-2">
                        <span className="text-yellow-400 mt-0.5">{t.icon}</span>
                        <div><p className="text-white text-xs font-semibold">{t.label}</p><p className="text-slate-400 text-xs">{t.desc}</p></div>
                      </div>
                    ))}
                  </div>
                  <button onClick={reopenOnboarding} className="mt-3 w-full text-xs text-slate-500 hover:text-white transition-colors text-left pt-3 border-t border-slate-700">
                    Show setup guide again →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-2xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id === 'watchlist') updateWatchCount() }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t.icon}
              {t.label}
              {t.id === 'watchlist' && watchCount > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold leading-none ${tab === 'watchlist' ? 'bg-black/20 text-black' : 'bg-red-500 text-white'}`}>
                  {watchCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Page title ─────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-1">
        <h1 className="text-white font-bold text-2xl flex items-center gap-2">
          <span className="text-yellow-400">{current.icon}</span>
          {current.label === 'Find' ? 'Nearby Pokémon Products'
            : current.label === 'Scan' ? 'Card Scanner'
            : current.label === 'Trade' ? 'Trade Compare'
            : current.label === 'Pack EV' ? 'Pack Expected Value'
            : 'Saved Cards'}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">{current.desc}</p>
      </div>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-10">
        {tab === 'store'     && <StoreFinder />}
        {tab === 'scanner'   && <CardScanner />}
        {tab === 'trade'     && <TradeCompare />}
        {tab === 'ev'        && <PackEV />}
        {tab === 'watchlist' && (
          watchlistCard ? (
            <div className="flex flex-col gap-4">
              <button onClick={() => setWatchlistCard(null)} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm self-start">
                ← Back to Saved
              </button>
              <CardDetails card={watchlistCard} psaEstimation={null} capturedImage={null} />
            </div>
          ) : (
            <Watchlist onSelectCard={openWatchlistCard} />
          )
        )}
      </main>
    </div>
  )
}
