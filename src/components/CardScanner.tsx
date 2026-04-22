import { useRef, useState, useCallback } from 'react'
import { Camera, CameraOff, Search, RotateCcw, Loader2, ZoomIn } from 'lucide-react'
import { searchCards, type PokemonCard } from '../services/pokemonTcgApi'
import { analyzeCardImage, type PSAEstimation } from '../services/cardAnalysis'
import CardDetails from './CardDetails'
import TrendingCards from './TrendingCards'

type ScanMode = 'idle' | 'camera' | 'captured' | 'analyzing' | 'results'

export default function CardScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [mode, setMode] = useState<ScanMode>('idle')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PokemonCard[]>([])
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null)
  const [psaEstimation, setPsaEstimation] = useState<PSAEstimation | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } },
      })
      streamRef.current = stream
      // Set mode first so the video element is mounted, then assign srcObject
      setMode('camera')
      // Wait one frame for React to render the video element
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    } catch {
      setCameraError('Camera access denied or unavailable.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedImage(dataUrl)
    stopCamera()
    setMode('analyzing')

    const estimation = await analyzeCardImage(canvas)
    setPsaEstimation(estimation)
    setMode('captured')
  }, [stopCamera])

  const reset = useCallback(() => {
    stopCamera()
    setMode('idle')
    setCapturedImage(null)
    setSearchQuery('')
    setSearchResults([])
    setSelectedCard(null)
    setPsaEstimation(null)
    setCameraError(null)
  }, [stopCamera])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchResults([])
    setSelectedCard(null)
    try {
      const results = await searchCards(searchQuery.trim())
      setSearchResults(results)
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }

  const selectCard = (card: PokemonCard) => {
    setSelectedCard(card)
    setSearchResults([])
  }

  // Show full details — side-by-side if we have a captured photo, single column if just search
  if (selectedCard) {
    if (capturedImage) {
      return (
        <div className="flex flex-col gap-3">
          <button onClick={reset} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm self-start">
            <RotateCcw className="w-4 h-4" /> Scan Another Card
          </button>

          {/* Side-by-side: photo left, info right */}
          <div className="flex gap-3 items-start">
            {/* Left: captured photo with damage overlay */}
            <div className="relative rounded-xl overflow-hidden bg-black shrink-0" style={{ width: '42%', aspectRatio: '3/4' }}>
              <img src={capturedImage} alt="Scanned card" className="w-full h-full object-contain" />
              {psaEstimation?.damageRegions.map((region, i) => (
                <div key={i} className="damage-highlight" style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }} title={region.label} />
              ))}
              {psaEstimation && (
                <div className="absolute bottom-0 inset-x-0 bg-slate-900/90 px-2 py-1.5 flex items-center gap-2">
                  <span className="font-black text-lg leading-none" style={{ color: psaEstimation.grade >= 9 ? '#22c55e' : psaEstimation.grade >= 7 ? '#facc15' : '#ef4444' }}>
                    {psaEstimation.grade}
                  </span>
                  <div>
                    <p className="text-white text-xs font-semibold leading-none">{psaEstimation.label}</p>
                    <p className={`text-xs leading-none mt-0.5 ${psaEstimation.shouldSend ? 'text-green-400' : 'text-red-400'}`}>
                      {psaEstimation.shouldSend ? '✓ Send to PSA' : '✗ Not worth it'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: card details, scrollable */}
            <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: '80vh' }}>
              <CardDetails card={selectedCard} psaEstimation={psaEstimation} capturedImage={null} />
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4">
        <button onClick={reset} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm self-start">
          <RotateCcw className="w-4 h-4" /> Back to Search
        </button>
        <CardDetails card={selectedCard} psaEstimation={null} capturedImage={null} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Camera area */}
      <div className="relative bg-slate-800 rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3', maxHeight: 480 }}>
        {mode === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="w-20 h-20 rounded-full bg-yellow-400/10 flex items-center justify-center">
              <Camera className="w-10 h-10 text-yellow-400" />
            </div>
            <p className="text-slate-300 font-medium">Point camera at your Pokémon card</p>
            <p className="text-slate-500 text-sm">Get price, PSA grade, damage analysis, and more</p>
            {cameraError && <p className="text-red-400 text-sm">{cameraError}</p>}
            <button
              onClick={startCamera}
              className="mt-2 px-6 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-colors flex items-center gap-2"
            >
              <Camera className="w-5 h-5" /> Open Camera
            </button>
          </div>
        )}

        {mode === 'camera' && (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {/* Card guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="border-2 border-yellow-400/70 rounded-xl"
                style={{ width: '65%', aspectRatio: '63/88' }}
              >
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-yellow-400 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-yellow-400 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-yellow-400 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-yellow-400 rounded-br" />
              </div>
            </div>
            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-4">
              <button
                onClick={() => { stopCamera(); setMode('idle') }}
                className="px-4 py-2 bg-slate-700/80 text-white rounded-xl flex items-center gap-2 hover:bg-slate-600 transition-colors"
              >
                <CameraOff className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center hover:bg-yellow-300 transition-colors shadow-lg border-4 border-white/30"
              >
                <div className="w-10 h-10 bg-white rounded-full" />
              </button>
            </div>
          </>
        )}

        {mode === 'analyzing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {capturedImage && <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="" />}
            <Loader2 className="w-12 h-12 animate-spin text-yellow-400" />
            <p className="text-white font-semibold">Analyzing card...</p>
            <p className="text-slate-400 text-sm">Checking edges, corners, and surface</p>
          </div>
        )}

        {mode === 'captured' && capturedImage && (
          <div className="relative w-full h-full">
            <img src={capturedImage} className="w-full h-full object-contain bg-black" alt="Captured card" />
            {psaEstimation?.damageRegions.map((region, i) => (
              <div
                key={i}
                className="damage-highlight"
                style={{
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                }}
                title={region.label}
              />
            ))}
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={reset}
                className="px-3 py-1.5 bg-slate-800/90 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retake
              </button>
            </div>
            {psaEstimation && (
              <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 rounded-xl p-3 flex items-center gap-3">
                <div className={`text-center ${psaEstimation.grade >= 9 ? 'text-green-400' : psaEstimation.grade >= 7 ? 'text-yellow-400' : 'text-red-400'}`}>
                  <div className="psa-badge">{psaEstimation.grade}</div>
                  <div className="text-xs">PSA Est.</div>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">{psaEstimation.label}</p>
                  <p className="text-slate-400 text-xs">
                    {psaEstimation.shouldSend ? '✓ Worth sending to PSA' : '✗ Not worth grading'}
                  </p>
                </div>
                <ZoomIn className="w-5 h-5 text-slate-400" />
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Card search */}
      {(mode === 'captured' || mode === 'idle') && (
        <div className="bg-slate-800 rounded-2xl p-5">
          <p className="text-slate-300 font-medium mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-yellow-400" />
            {mode === 'captured' ? 'Search card name to get full details' : 'Search a card by name'}
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Charizard, Pikachu VMAX..."
              className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-400 text-sm"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2.5 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto">
              {searchResults.map((card) => (
                <button key={card.id} onClick={() => selectCard(card)}
                  className="group flex flex-col gap-1.5 items-center hover:scale-105 transition-transform">
                  <div className="w-full aspect-[63/88] rounded-lg overflow-hidden bg-slate-700 border-2 border-transparent group-hover:border-yellow-400 transition-colors">
                    <img src={card.images.small} alt={card.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-slate-300 text-center leading-tight line-clamp-2">{card.name}</p>
                  <p className="text-xs text-slate-500">{card.set.name}</p>
                </button>
              ))}
            </div>
          )}
          {searching && <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-yellow-400" /></div>}
        </div>
      )}

      {/* Trending — shown only on idle */}
      {mode === 'idle' && (
        <TrendingCards onSelect={(card) => selectCard(card)} />
      )}
    </div>
  )
}
