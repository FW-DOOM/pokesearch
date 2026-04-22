import { useState, useEffect } from 'react'

export interface GeoState {
  lat: number | null
  lon: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ lat: null, lon: null, error: null, loading: true })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ lat: null, lon: null, error: 'Geolocation not supported', loading: false })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ lat: pos.coords.latitude, lon: pos.coords.longitude, error: null, loading: false }),
      (err) => setState({ lat: null, lon: null, error: err.message, loading: false }),
      { timeout: 10000 }
    )
  }, [])

  return state
}
