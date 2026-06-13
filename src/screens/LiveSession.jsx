import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pause, Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { LOG_TYPE_LABELS } from '@/utils/constants'
import { formatElapsed, dayKey } from '@/utils/dateTime'
import { getDailyRemainingMinutes } from '@/services/capRules'
import useSessionStore from '@/store/sessionStore'
import useAuthStore from '@/store/authStore'
import {
  saveActiveSession,
  deleteActiveSession,
} from '@/firebase/firestore'

export default function LiveSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeSession, startActiveSession, updateActiveSession, clearActiveSession, getSessionsForDriver } = useSessionStore()
  const { familyId } = useAuthStore()

  const mountTimeRef = useRef(Date.now())
  const incomingConfig = location.state

  useEffect(() => {
    if (!incomingConfig && activeSession) {
      const ageMs = Date.now() - (activeSession.startedAt ?? 0)
      if (ageMs > 4 * 60 * 60 * 1000) {
        clearActiveSession()
        deleteActiveSession(familyId).catch(() => {})
        navigate('/session/pre', { replace: true })
        return
      }
      // Recovered from localStorage or cloud — ensure cloud backup is current
      saveActiveSession(familyId, activeSession).catch(() => {})
      return
    }

    if (incomingConfig) {
      const now = mountTimeRef.current
      const today = dayKey()
      const todaysSessions = getSessionsForDriver(incomingConfig.driverId)
        .filter(s => s.date === today)
      const capRemainingMs = getDailyRemainingMinutes(incomingConfig.logType, todaysSessions) * 60000
      const sessionState = {
        config: incomingConfig,
        startedAt: now,
        effectiveStartTime: now,
        paused: false,
        pausedElapsed: 0,
        capRemainingMs,
      }
      startActiveSession(sessionState)
      saveActiveSession(familyId, sessionState).catch(() => {})
    } else if (!activeSession) {
      navigate('/session/pre', { replace: true })
    }
  }, [])

  const config             = activeSession?.config             ?? incomingConfig
  const sessionStartedAt   = activeSession?.startedAt          ?? mountTimeRef.current
  const effectiveStartTime = activeSession?.effectiveStartTime ?? mountTimeRef.current
  const paused             = activeSession?.paused             ?? false

  // When recovering a paused session (localStorage or cloud), the timer hook
  // starts at 0 before the first interval fires. Seed it with pausedElapsed
  // so the display is correct immediately on mount.
  const elapsed = useSessionTimer(
    effectiveStartTime,
    !paused,
    paused ? (activeSession?.pausedElapsed ?? 0) : 0,
  )

  // Auto-stop at daily cap with a 5-minute warning
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
      const totalMinutes = Math.max(1, capRemainingMs / 60000)
      clearActiveSession()
      deleteActiveSession(familyId).catch(() => {})
      navigate('/session/summary', {
        state: { config, startMs: sessionStartedAt, endMs, totalMinutes },
        replace: true,
      })
    }
  }, [elapsed])

  if (!config) return null

  function handlePause() {
    const newState = { ...activeSession, paused: true, pausedElapsed: elapsed }
    updateActiveSession({ paused: true, pausedElapsed: elapsed })
    saveActiveSession(familyId, newState).catch(() => {})
  }

  function handleResume() {
    const newEffective = Date.now() - elapsed
    const newState = { ...activeSession, paused: false, effectiveStartTime: newEffective }
    updateActiveSession({ paused: false, effectiveStartTime: newEffective })
    saveActiveSession(familyId, newState).catch(() => {})
  }

  function handleEnd() {
    const endMs = Date.now()
    const totalMinutes = Math.max(1, Math.round(elapsed / 60000))
    clearActiveSession()
    deleteActiveSession(familyId).catch(() => {})
    navigate('/session/summary', {
      state: { config, startMs: sessionStartedAt, endMs, totalMinutes },
      replace: true,
    })
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100svh-5rem)] bg-background px-4 py-safe">

      {/* ── Top bar ── */}
      <div className="w-full flex items-center justify-between pt-4 pb-2">
        <Badge variant="outline" className="text-xs">
          {LOG_TYPE_LABELS[config.logType]}
        </Badge>
        {paused && (
          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">
            Paused
          </Badge>
        )}
      </div>

      {/* ── Timer ── */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-7xl font-mono font-bold tracking-tight tabular-nums select-none">
          {formatElapsed(elapsed)}
        </p>
        <p className="text-sm text-muted-foreground">
          {paused ? 'Session paused' : 'Session in progress'}
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="w-full flex gap-3 pb-8">
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
        >
          <Square size={18} fill="currentColor" />
          End session
        </Button>
      </div>

    </div>
  )
}
