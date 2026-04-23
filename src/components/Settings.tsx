import { useState, useEffect } from 'react'
import { X, MapPin, Camera, RefreshCw, Trash2, Shield, Info, ToggleLeft, ToggleRight } from 'lucide-react'

interface SettingsData {
  locationEnabled: boolean
  cameraEnabled: boolean
  freshPrices: boolean
}

const DEFAULTS: SettingsData = {
  locationEnabled: true,
  cameraEnabled: true,
  freshPrices: false,
}

export function getSettings(): SettingsData {
  try {
    const raw = localStorage.getItem('pokesearch_settings')
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch { return DEFAULTS }
}

function saveSettings(s: SettingsData) {
  localStorage.setItem('pokesearch_settings', JSON.stringify(s))
}

function getCacheSize(): string {
  let bytes = 0
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('poke:')) bytes += (localStorage.getItem(key) ?? '').length * 2
  }
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function clearCache() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('poke:'))
    .forEach(k => localStorage.removeItem(k))
}

interface Props { onClose: () => void }

export default function Settings({ onClose }: Props) {
  const [settings, setSettings] = useState<SettingsData>(getSettings)
  const [cacheSize, setCacheSize] = useState(getCacheSize)
  const [cleared, setCleared] = useState(false)
  const [locPermission, setLocPermission] = useState<string>('unknown')
  const [camPermission, setCamPermission] = useState<string>('unknown')

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    // Query real browser permission states where available
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(r => setLocPermission(r.state))
        .catch(() => {})
      navigator.permissions.query({ name: 'camera' as PermissionName })
        .then(r => setCamPermission(r.state))
        .catch(() => {})
    }
  }, [])

  function toggle(key: keyof SettingsData) {
    setSettings(s => ({ ...s, [key]: !s[key] }))
  }

  function handleClearCache() {
    clearCache()
    setCleared(true)
    setCacheSize(getCacheSize())
    setTimeout(() => setCleared(false), 2000)
  }

  function PermissionBadge({ state }: { state: string }) {
    const color = state === 'granted' ? 'text-green-400' : state === 'denied' ? 'text-red-400' : 'text-slate-500'
    return <span className={`text-xs ${color} capitalize`}>{state === 'unknown' ? '—' : state}</span>
  }

  function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
    return (
      <button onClick={onClick} className="shrink-0">
        {on
          ? <ToggleRight className="w-7 h-7 text-yellow-400" />
          : <ToggleLeft className="w-7 h-7 text-slate-600" />}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg">Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">

          {/* Permissions */}
          <section>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Permissions</p>
            <div className="bg-slate-800 rounded-xl divide-y divide-slate-700/60">

              {/* Location */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Location</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-slate-500 text-xs">Used for nearby store finder</p>
                    <span className="text-slate-700">·</span>
                    <PermissionBadge state={locPermission} />
                  </div>
                  {locPermission === 'denied' && (
                    <p className="text-orange-400 text-xs mt-1">Blocked in browser — go to Settings → Safari → Location to re-enable</p>
                  )}
                </div>
                <Toggle on={settings.locationEnabled} onClick={() => toggle('locationEnabled')} />
              </div>

              {/* Camera */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Camera</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-slate-500 text-xs">Used for card scanning</p>
                    <span className="text-slate-700">·</span>
                    <PermissionBadge state={camPermission} />
                  </div>
                  {camPermission === 'denied' && (
                    <p className="text-orange-400 text-xs mt-1">Blocked — go to Settings → Safari → Camera to re-enable</p>
                  )}
                </div>
                <Toggle on={settings.cameraEnabled} onClick={() => toggle('cameraEnabled')} />
              </div>
            </div>
          </section>

          {/* Prices */}
          <section>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Prices</p>
            <div className="bg-slate-800 rounded-xl divide-y divide-slate-700/60">
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Always Fetch Fresh Prices</p>
                  <p className="text-slate-500 text-xs mt-0.5">Bypass cache — slower but gets the latest TCGPlayer data on every lookup</p>
                </div>
                <Toggle on={settings.freshPrices} onClick={() => toggle('freshPrices')} />
              </div>
            </div>
          </section>

          {/* Cache */}
          <section>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Data & Cache</p>
            <div className="bg-slate-800 rounded-xl divide-y divide-slate-700/60">
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Clear Cache</p>
                  <p className="text-slate-500 text-xs mt-0.5">Cached data: <span className="text-slate-300">{cacheSize}</span></p>
                </div>
                <button
                  onClick={handleClearCache}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    cleared ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-red-600 hover:text-white'
                  }`}
                >
                  {cleared ? '✓ Cleared' : 'Clear'}
                </button>
              </div>
            </div>
          </section>

          {/* PSA Info */}
          <section>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Grading</p>
            <div className="bg-slate-800 rounded-xl p-4 flex gap-3">
              <Shield className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium">PSA Grade Disclaimer</p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  PSA estimations are based on pixel-level image analysis of corners, edges, and surface. They are <strong className="text-white">estimates only</strong> and do not replace official PSA grading. Lighting and camera angle affect accuracy.
                </p>
              </div>
            </div>
          </section>

          {/* About */}
          <section>
            <div className="bg-slate-800 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium">PokeSearch</p>
                <p className="text-slate-500 text-xs mt-1">Card prices via <a href="https://pokemontcg.io" className="text-yellow-400 underline" target="_blank" rel="noopener noreferrer">pokemontcg.io</a> · TCGPlayer market data</p>
                <a href="https://github.com/FW-DOOM/pokesearch" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-yellow-400 transition-colors mt-1 block">
                  github.com/FW-DOOM/pokesearch →
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
