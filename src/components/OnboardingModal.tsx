import { useState, useEffect } from 'react'
import { MapPin, Camera, ArrowRight, X, CheckCircle, Shield, Search, Zap } from 'lucide-react'

const STORAGE_KEY = 'pokesearch_onboarded'

export default function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null)
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
  }, [])

  async function requestLocation() {
    try {
      await new Promise<void>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(() => resolve(), reject, { timeout: 8000 })
      )
      setLocationGranted(true)
    } catch {
      setLocationGranted(false)
    }
  }

  async function requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((t) => t.stop())
      setCameraGranted(true)
    } catch {
      setCameraGranted(false)
    }
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  const steps = [
    {
      icon: <Zap className="w-10 h-10 text-yellow-400 fill-yellow-400" />,
      title: 'Welcome to PokeSearch',
      subtitle: 'Your all-in-one Pokémon card tool',
      content: (
        <div className="flex flex-col gap-3 text-sm text-slate-400">
          <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
            <MapPin className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div><p className="text-white font-medium">Find nearby stock</p><p>See which Target, Walmart & more have Pokémon packs near you.</p></div>
          </div>
          <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
            <Camera className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div><p className="text-white font-medium">Scan your cards</p><p>Point your camera at a card for price, PSA estimate, and damage analysis.</p></div>
          </div>
          <div className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
            <Search className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div><p className="text-white font-medium">Compare trades</p><p>Search two cards side by side to see if a trade is fair.</p></div>
          </div>
        </div>
      ),
    },
    {
      icon: <MapPin className="w-10 h-10 text-yellow-400" />,
      title: 'Allow Location',
      subtitle: 'So we can find stores near you',
      content: (
        <div className="flex flex-col gap-4">
          <p className="text-slate-400 text-sm">Your location is only used to find nearby stores. It is never stored or sent anywhere else.</p>
          {locationGranted === null ? (
            <button
              onClick={requestLocation}
              className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5" /> Allow Location Access
            </button>
          ) : locationGranted ? (
            <div className="flex items-center gap-2 text-green-400 bg-green-900/30 rounded-xl p-3">
              <CheckCircle className="w-5 h-5" /> Location access granted!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-slate-400 bg-slate-700 rounded-xl p-3 text-sm">
                Location denied. You can still use a ZIP code in the Find tab.
              </div>
              <p className="text-slate-500 text-xs">To enable later: click the lock icon in your browser address bar → Allow Location.</p>
            </div>
          )}
        </div>
      ),
    },
    {
      icon: <Camera className="w-10 h-10 text-yellow-400" />,
      title: 'Allow Camera',
      subtitle: 'To scan your Pokémon cards',
      content: (
        <div className="flex flex-col gap-4">
          <p className="text-slate-400 text-sm">Camera is used only for card scanning. Photos are analyzed locally — nothing is uploaded.</p>
          {cameraGranted === null ? (
            <button
              onClick={requestCamera}
              className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" /> Allow Camera Access
            </button>
          ) : cameraGranted ? (
            <div className="flex items-center gap-2 text-green-400 bg-green-900/30 rounded-xl p-3">
              <CheckCircle className="w-5 h-5" /> Camera access granted!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-slate-400 bg-slate-700 rounded-xl p-3 text-sm">
                Camera denied. You can still search cards by name in the Scan tab.
              </div>
              <p className="text-slate-500 text-xs">To enable later: click the lock icon in your browser address bar → Allow Camera.</p>
            </div>
          )}
        </div>
      ),
    },
    {
      icon: <Shield className="w-10 h-10 text-green-400" />,
      title: "You're all set!",
      subtitle: 'Your data stays on your device',
      content: (
        <div className="flex flex-col gap-3 text-sm text-slate-400">
          <div className="bg-slate-700/50 rounded-xl p-3">
            <p className="text-white font-medium mb-1">Privacy summary</p>
            <ul className="flex flex-col gap-1 text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" /> Location used only for nearby store lookup</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" /> Card photos never uploaded — analysis runs in your browser</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" /> Search results cached locally for speed</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" /> No account, no sign-up, no tracking</li>
            </ul>
          </div>
        </div>
      ),
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm border border-slate-700 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-700">
          <div
            className="h-full bg-yellow-400 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            {current.icon}
            <div className="flex-1">
              <h2 className="text-white font-bold text-xl leading-tight">{current.title}</h2>
              <p className="text-slate-400 text-sm mt-0.5">{current.subtitle}</p>
            </div>
            <button onClick={finish} className="text-slate-500 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {current.content}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-yellow-400' : i < step ? 'w-3 bg-slate-500' : 'w-3 bg-slate-700'}`} />
              ))}
            </div>
            <button
              onClick={() => isLast ? finish() : setStep((s) => s + 1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-colors"
            >
              {isLast ? 'Start' : 'Next'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
