import { useState, useEffect, useRef, useCallback } from 'react'
import { GPS_SAMPLE_INTERVAL_MS, GPS_DOWNSAMPLE_THRESHOLD } from '@/utils/constants'

/**
 * Tracks GPS position and builds a route array during a live session.
 * Works offline — the Geolocation API uses the device's GPS chip directly.
 */
export function useGeolocation(active = false, initialRoute = []) {
  const [position, setPosition] = useState(null)  // { lat, lng, accuracy }
  const [error, setError] = useState(null)
  const [route, setRoute] = useState(initialRoute) // [{ lat, lng, timestamp }, ...]
  const watchIdRef = useRef(null)
  const lastSampleRef = useRef(0)
  const routeLengthRef = useRef(0)

  const handlePosition = useCallback((pos) => {
    const now = Date.now()
    const { latitude: lat, longitude: lng, accuracy } = pos.coords
    setPosition({ lat, lng, accuracy })
    setError(null)

    // Dynamic sampling: every 5s normally, every 15s once route gets long
    const interval = routeLengthRef.current > GPS_DOWNSAMPLE_THRESHOLD
      ? 15000
      : GPS_SAMPLE_INTERVAL_MS

    if (now - lastSampleRef.current >= interval) {
      lastSampleRef.current = now
      routeLengthRef.current += 1
      setRoute(prev => [...prev, { lat, lng, timestamp: now }])
    }
  }, [])

  const handleError = useCallback((err) => {
    setError(err.message)
  }, [])

  useEffect(() => {
    if (!active) return
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this device')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [active, handlePosition, handleError])

  const resetRoute = useCallback(() => {
    setRoute([])
    routeLengthRef.current = 0
    lastSampleRef.current = 0
  }, [])

  return { position, error, route, resetRoute }
}
