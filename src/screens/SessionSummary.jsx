import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Clock, Moon, MapPin, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/store/authStore'
import useProfileStore from '@/store/profileStore'
import useSessionStore from '@/store/sessionStore'
import { calcCountedMinutes } from '@/services/capRules'
import { calcNightMinutes, getCoordsForCity } from '@/services/nightHours'
import { LOG_TYPES, LOG_TYPE_LABELS } from '@/utils/constants'
import { dayKey, formatMinutes, formatTime } from '@/utils/dateTime'

export default function SessionSummary() {
  const navigate = useNavigate()
  const location = useLocation()
  const { familyId } = useAuthStore()
  const { drivers, supervisors } = useProfileStore()
  const { saveSession, getSessionsForDriver } = useSessionStore()

  // Passed from LiveSession: { config, startMs, endMs, totalMinutes, route }
  const data = location.state
  const [saving, setSaving] = useState(false)

  // If there's no session data (e.g. navigated here directly), bail out to home
  useEffect(() => {
    if (!data) navigate('/', { replace: true })
  }, [])

  const summary = useMemo(() => {
    if (!data) return null
    const { config, startMs, endMs, totalMinutes } = data
    const dateStr = dayKey(new Date(startMs))

    // Exclude any in-progress session from today's sessions
    const allForDriver = getSessionsForDriver(config.driverId)
    const todaysSessions = allForDriver.filter(s => s.date === dateStr)

    const countedMinutes = calcCountedMinutes(
      { logType: config.logType, totalMinutes, date: dateStr },
      todaysSessions
    )

    let nightMinutes = 0
    if (config.logType === LOG_TYPES.PRACTICE_30HR) {
      const [lat, lng] = getCoordsForCity(config.city)
      nightMinutes = calcNightMinutes(dateStr, lat, lng, startMs, endMs)
    }

    return {
      dateStr,
      countedMinutes,
      nightMinutes,
      isCapped: countedMinutes < totalMinutes,
    }
  }, [data])

  // If there's no state (e.g. page was refreshed), go home
  if (!data || !summary) {
    navigate('/', { replace: true })
    return null
  }

  const { config, startMs, endMs, totalMinutes, route } = data
  const driver = drivers.find(d => d.id === config.driverId)
  const supervisor = supervisors.find(s => s.id === config.supervisorId)

  async function handleSave() {
    setSaving(true)
    try {
      const session = {
        driverId: config.driverId,
        supervisorId: config.supervisorId,
        logType: config.logType,
        date: summary.dateStr,
        startTime: new Date(startMs).toISOString(),
        endTime: new Date(endMs).toISOString(),
        totalMinutes,
        countedMinutes: summary.countedMinutes,
        nightMinutes: summary.nightMinutes,
        isNightSession: summary.nightMinutes > 0,
        city: config.city ?? '',
        gpsRoute: route ?? [],
        hasGPS: (route?.length ?? 0) > 0,
        isManualEntry: false,
        sunsetTime: null,
        sunriseTime: null,
        syncedToCloud: false,
        createdAt: new Date().toISOString(),
      }

      await saveSession(familyId, session)
      toast.success('Session saved')
      navigate('/history', { replace: true })
    } catch (err) {
      console.error('Save session error:', err)
      toast.error('Failed to save session')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="pt-2 space-y-2">
        <h1 className="text-xl font-bold tracking-tight">Session complete</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge>{LOG_TYPE_LABELS[config.logType]}</Badge>
          {driver && (
            <span className="text-sm text-muted-foreground">{driver.fullName}</span>
          )}
        </div>
      </header>

      {/* Session details */}
      <Card>
        <CardContent className="py-3 px-4 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock size={14} /> Drive window
            </span>
            <span className="font-medium">
              {formatTime(new Date(startMs))} – {formatTime(new Date(endMs))}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock size={14} /> Total drive time
            </span>
            <span className="font-medium">{formatMinutes(totalMinutes)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock size={14} /> Counts toward log
            </span>
            <div className="flex items-center gap-1.5">
              {summary.isCapped && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 text-yellow-600 border-yellow-400">
                  Daily cap
                </Badge>
              )}
              <span className="font-medium">{formatMinutes(summary.countedMinutes)}</span>
            </div>
          </div>

          {config.logType === LOG_TYPES.PRACTICE_30HR && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Moon size={14} /> Night hours
              </span>
              <span className="font-medium">
                {summary.nightMinutes > 0 ? formatMinutes(summary.nightMinutes) : '—'}
              </span>
            </div>
          )}

          {(route?.length ?? 0) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin size={14} /> GPS points
              </span>
              <span className="font-medium">{route.length} recorded</span>
            </div>
          )}
        </CardContent>
      </Card>

      {supervisor && (
        <p className="text-xs text-muted-foreground text-center">
          Supervised by {supervisor.fullName} ({supervisor.relationship})
        </p>
      )}

      <Separator />

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => navigate('/', { replace: true })}
          disabled={saving}
        >
          <X size={16} />
          Discard
        </Button>
        <Button
          size="lg"
          className="flex-1 gap-2"
          onClick={handleSave}
          disabled={saving}
        >
          <Check size={16} />
          {saving ? 'Saving…' : 'Save session'}
        </Button>
      </div>
    </div>
  )
}
