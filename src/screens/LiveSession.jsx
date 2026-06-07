import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pause, Play, Square, Navigation, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { LOG_TYPE_LABELS } from '@/utils/constants'
import { formatElapsed, dayKey } from '@/utils/dateTime'
import { getDailyRemainingMinutes } from '@/services/capRules'
import useSessionStore from '@/store/sessionStore'

export default function LiveSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeSession, startActiveSession, updateActiveSession, clearActiveSession, getSessionsForDriver } = useSessionStore()

  // Capture mount time once — used as fallback before the store initializes on a fresh session
  const mountTimeRef = useRef(Date.now())

  const incomingConfig = location.state  // present on fresh start from PreSession, null on return

  // Initialize or validate on mount
  useEffect(() => {
    // Discard persisted sessions older than 4 hours — they can't be meaningfully resumed
    if (!incomingConfig && activeSession) {
      const ageMs = Date.now() - (activeSession.startedAt ?? 0)
      if (ageMs > 4 * 60 * 60 * 1000) {
        clearActiveSession()
        navigate('/session/pre', { replace: true })
        return
      }
    }

    if (incomingConfig) {
      const now = mountTimeRef.current
      const today = dayKey()
      const todaysSessions = getSessionsForDriver(incomingConfig.driverId)
        .filter(s => s.date === today)
      const capRemainingMs = getDailyRemainingMinutes(incomingConfig.logType, todaysSessions) * 60000
      startActiveSession({
        config: incomingConfig,
        startedAt: now,
        effectiveStartTime: now,
        paused: false,
        pausedElapsed: 0,
        route: [],
        capRemainingMs,
      })
    } else if (!activeSession) {
      navigate('/session/pre', { replace: true })
    }
    // If returning (no incomingConfig but activeSession exists) — just render from store
  }, [])

  // Derive values — fall back to mount-time refs before the store initializes (first render only)
  const config          = activeSession?.config          ?? incomingConfig
  const sessionStartedAt = activeSession?.startedAt      ?? mountTimeRef.current
  const effectiveStartTime = activeSession?.effectiveStartTime ?? mountTimeRef.current
  const paused          = activeSession?.paused          ?? false
  const storedRoute     = activeSession?.route           ?? []

  const { position, error: gpsError, route } = useGeolocation(!paused, storedRoute)
  const elapsed = useSessionTimer(effectiveStartTime, !paused)

  // Keep the store's route current as new GPS points arrive
  useEffect(() => {
    if (route.length > storedRoute.length) {
      updateActiveSession({ route })
    }
  }, [route])

  // Auto-stop at daily cap, with a 5-minute warning
  const capRemainingMs = activeSession?.capRemainingMs ?? Infinity
  const warned5MinRef = useRef(false)
  useEffect(() => {
    if (capRemainingMs === Infinity || elapsed === 0) return
    const remaining = capRemainingMs - elapsed
    if (remaining <= 5 * 60000 && remaining > 0 && !warned5MinRef.current) {
      warned5MinRef.current = true
      toast.warning('5 minutes until the daily limit — session will stop automatically')
    }
    if (elapsed >= capRemainingMs) {
      toast.info('Daily limit reached — session ended automatically')
      const endMs = Date.now()
      const totalMinutes = Math.max(1, Math.round(elapsed / 60000))
      const finalRoute = activeSession?.route ?? route
      clearActiveSession()
      navigate('/session/summary', {
        state: { config, startMs: sessionStartedAt, endMs, totalMinutes, route: finalRoute },
        replace: true,
      })
    }
  }, [elapsed])

  if (!config) return null

  function handlePause() {
    updateActiveSession({ paused: true, pausedElapsed: elapsed })
  }

  function handleResume() {
    const newEffective = Date.now() - elapsed
    updateActiveSession({ paused: false, effectiveStartTime: newEffective })
  }

  function handleEnd() {
    const endMs = Date.now()
    const totalMinutes = Math.max(1, Math.round(elapsed / 60000))
    const finalRoute = activeSession?.route ?? route

    clearActiveSession()

    navigate('/session/summary', {
      state: {
        config,
        startMs: sessionStartedAt,
        endMs,
        totalMinutes,
        route: finalRoute,
      },
      replace: true,
    })
  }

  const hasMinTime = elapsed >= 60000   // require at least 1 minute to end

  return (
    <div className="flex flex-col h-svh bg-background">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2 shrink-0">
        <Badge variant="outline" className="text-xs">
          {LOG_TYPE_LABELS[config.logType]}
        </Badge>

        <GpsStatus position={position} error={gpsError} />
      </div>

      {/* ── Elapsed timer ── */}
      <div className="flex flex-col items-center justify-center py-5 shrink-0">
        <p className="text-6xl font-mono font-bold tracking-tight tabular-nums select-none">
          {formatElapsed(elapsed)}
        </p>
        {paused && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 font-medium">
            Paused
          </p>
        )}
      </div>

      {/* ── Map ── */}
      <div className="flex-1 mx-4 rounded-2xl overflow-hidden border border-border min-h-0">
        {position ? (
          <MapContainer
            center={[position.lat, position.lng]}
            zoom={16}
            className="w-full h-full"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            {route.length > 1 && (
              <Polyline
                positions={route.map(p => [p.lat, p.lng])}
                color="#3b82f6"
                weight={4}
                opacity={0.85}
              />
            )}
            <CircleMarker
              center={[position.lat, position.lng]}
              radius={9}
              pathOptions={{
                color: '#1d4ed8',
                fillColor: '#60a5fa',
                fillOpacity: 1,
                weight: 2,
              }}
            />
            <RecenterMap position={position} paused={paused} />
          </MapContainer>
        ) : (
          <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2">
            {gpsError ? (
              <>
                <AlertCircle size={24} className="text-destructive" />
                <p className="text-sm text-destructive text-center px-4">{gpsError}</p>
              </>
            ) : (
              <>
                <Navigation size={24} className="text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Acquiring GPS signal…</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex gap-3 px-4 py-4 shrink-0">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 gap-2"
          onClick={paused ? handleResume : handlePause}
        >
          {paused
            ? <><Play size={18} />Resume</>
            : <><Pause size={18} />Pause</>
          }
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="flex-1 gap-2"
          onClick={handleEnd}
          disabled={!hasMinTime}
          title={!hasMinTime ? 'Drive at least 1 minute to end' : undefined}
        >
          <Square size={18} fill="currentColor" />
          End session
        </Button>
      </div>

    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function RecenterMap({ position, paused }) {
  const map = useMap()
  useEffect(() => {
    if (position && !paused) {
      map.setView([position.lat, position.lng], undefined, { animate: true })
    }
  }, [position, paused, map])
  return null
}

function GpsStatus({ position, error }) {
  if (error) {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle size={11} />
        GPS unavailable
      </span>
    )
  }
  if (!position) {
    return <span className="text-xs text-muted-foreground">Acquiring GPS…</span>
  }
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Navigation size={11} />
      ±{Math.round(position.accuracy)}m
    </span>
  )
}
