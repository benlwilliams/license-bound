import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pause, Play, Square, Navigation, AlertCircle } from 'lucide-react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { LOG_TYPE_LABELS } from '@/utils/constants'
import { formatElapsed } from '@/utils/dateTime'

export default function LiveSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const config = location.state   // { driverId, supervisorId, logType, city }

  // Wall-clock start time — never changes, used for the session record
  const [sessionStartedAt] = useState(() => Date.now())

  // Adjusted start for the timer — shifts on each resume to exclude pause time
  const [effectiveStartTime, setEffectiveStartTime] = useState(() => Date.now())
  const [paused, setPaused] = useState(false)
  const [pausedElapsed, setPausedElapsed] = useState(0)

  const { position, error: gpsError, route } = useGeolocation(!paused)
  const elapsed = useSessionTimer(effectiveStartTime, !paused)

  // Redirect if arrived without config (e.g. refreshed the page)
  useEffect(() => {
    if (!config) navigate('/session/pre', { replace: true })
  }, [])

  if (!config) return null

  function handlePause() {
    setPausedElapsed(elapsed)
    setPaused(true)
  }

  function handleResume() {
    // Shift effectiveStartTime so the timer resumes from pausedElapsed
    setEffectiveStartTime(Date.now() - pausedElapsed)
    setPaused(false)
  }

  function handleEnd() {
    const endMs = Date.now()
    // Use elapsed (driving time only, excludes pauses) for totalMinutes
    const totalMinutes = Math.max(1, Math.round(elapsed / 60000))

    navigate('/session/summary', {
      state: {
        config,
        startMs: sessionStartedAt,
        endMs,
        totalMinutes,
        route,
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
