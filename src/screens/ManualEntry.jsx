import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, Moon, Clock, Info } from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/store/authStore'
import useProfileStore from '@/store/profileStore'
import useSessionStore from '@/store/sessionStore'
import { calcCountedMinutes } from '@/services/capRules'
import { calcNightMinutes, getCoordsForCity } from '@/services/nightHours'
import { LOG_TYPES, LOG_TYPE_LABELS } from '@/utils/constants'
import { dayKey, formatMinutes } from '@/utils/dateTime'
import { validateManualSession } from '@/utils/validation'

export default function ManualEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const { familyId } = useAuthStore()
  const { drivers, supervisors, selectedDriverId, selectedSupervisorId } = useProfileStore()
  const { saveSession, updateSession, loadSessions, getSessionsForDriver } = useSessionStore()

  // If editing, location.state.session is populated
  const editing = location.state?.session ?? null

  const [values, setValues] = useState({
    driverId: editing?.driverId ?? selectedDriverId ?? '',
    supervisorId: editing?.supervisorId ?? selectedSupervisorId ?? '',
    logType: editing?.logType ?? '',
    date: editing?.date ?? dayKey(),
    startTime: editing?.startTime ? toTimeInput(editing.startTime) : '',
    endTime: editing?.endTime ? toTimeInput(editing.endTime) : '',
    city: editing?.city ?? 'Austin',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Load sessions for the selected driver so cap rules have real data
  useEffect(() => {
    if (familyId && values.driverId) {
      loadSessions(familyId, values.driverId)
    }
  }, [familyId, values.driverId])

  function set(field, value) {
    setValues(v => ({ ...v, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  // ── Derived calculations (live preview) ────────────────────────────────────

  const preview = useMemo(() => {
    if (!values.date || !values.startTime || !values.endTime || !values.logType) return null

    const startMs = toMs(values.date, values.startTime)
    const endMs = toMs(values.date, values.endTime)
    if (!startMs || !endMs || endMs <= startMs) return null

    const totalMinutes = Math.round((endMs - startMs) / 60000)

    // All sessions for this driver on this date (excluding the one being edited)
    const allForDriver = getSessionsForDriver(values.driverId)
    const todaysSessions = allForDriver.filter(s =>
      s.date === values.date && s.sessionId !== editing?.sessionId
    )

    const countedMinutes = calcCountedMinutes(
      { logType: values.logType, totalMinutes, date: values.date },
      todaysSessions
    )

    let nightMinutes = 0
    if (values.logType === LOG_TYPES.PRACTICE_30HR) {
      const [lat, lng] = getCoordsForCity(values.city)
      nightMinutes = calcNightMinutes(values.date, lat, lng, startMs, endMs)
    }

    const isCapped = countedMinutes < totalMinutes

    return { totalMinutes, countedMinutes, nightMinutes, isCapped }
  }, [values, editing])

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    const errs = validateManualSession(values)
    if (Object.keys(errs).length) { setErrors(errs); return }
    if (!preview) { toast.error('Check your start and end times'); return }

    setSaving(true)
    try {
      const startMs = toMs(values.date, values.startTime)
      const endMs = toMs(values.date, values.endTime)

      const session = {
        ...(editing ?? {}),
        driverId: values.driverId,
        supervisorId: values.supervisorId,
        logType: values.logType,
        date: values.date,
        startTime: new Date(startMs).toISOString(),
        endTime: new Date(endMs).toISOString(),
        totalMinutes: preview.totalMinutes,
        countedMinutes: preview.countedMinutes,
        nightMinutes: preview.nightMinutes,
        isNightSession: preview.nightMinutes > 0,
        city: values.city,
        gpsRoute: editing?.gpsRoute ?? [],
        hasGPS: false,
        isManualEntry: true,
        sunsetTime: null,
        sunriseTime: null,
        syncedToCloud: false,
        createdAt: editing?.createdAt ?? new Date().toISOString(),
      }

      if (editing) {
        await updateSession(familyId, editing.sessionId, values.driverId, session)
        toast.success('Session updated')
      } else {
        await saveSession(familyId, session)
        toast.success('Session saved')
      }

      navigate('/history')
    } catch (err) {
      console.error('Save session error:', err)
      toast.error('Failed to save session')
    } finally {
      setSaving(false)
    }
  }

  const selectedDriver = drivers.find(d => d.id === values.driverId)
  const selectedSupervisor = supervisors.find(s => s.id === values.supervisorId)

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <header className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">
          {editing ? 'Edit session' : 'Manual entry'}
        </h1>
      </header>

      {/* Driver */}
      <div className="space-y-1.5">
        <Label>Driver</Label>
        <Select value={values.driverId} onValueChange={v => set('driverId', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select driver">
              {drivers.find(d => d.id === values.driverId)?.fullName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {drivers.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.driverId && <p className="text-xs text-destructive">{errors.driverId}</p>}
      </div>

      {/* Supervisor */}
      <div className="space-y-1.5">
        <Label>Supervisor</Label>
        <Select value={values.supervisorId} onValueChange={v => set('supervisorId', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select supervisor">
              {supervisors.find(s => s.id === values.supervisorId)?.fullName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {supervisors.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.fullName} — {s.relationship}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.supervisorId && <p className="text-xs text-destructive">{errors.supervisorId}</p>}
      </div>

      {/* Log type */}
      <div className="space-y-1.5">
        <Label>Log type</Label>
        <Select value={values.logType} onValueChange={v => set('logType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Which log does this count toward?">
              {values.logType ? LOG_TYPE_LABELS[values.logType] : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LOG_TYPES.DL91B_OBSERVATION}>{LOG_TYPE_LABELS[LOG_TYPES.DL91B_OBSERVATION]}</SelectItem>
            <SelectItem value={LOG_TYPES.DL91B_INSTRUCTION}>{LOG_TYPE_LABELS[LOG_TYPES.DL91B_INSTRUCTION]}</SelectItem>
            <SelectItem value={LOG_TYPES.PRACTICE_30HR}>{LOG_TYPE_LABELS[LOG_TYPES.PRACTICE_30HR]}</SelectItem>
          </SelectContent>
        </Select>
        {errors.logType && <p className="text-xs text-destructive">{errors.logType}</p>}
      </div>

      {/* Log type helper text */}
      {values.logType && (
        <div className="flex gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>{logTypeHint(values.logType)}</span>
        </div>
      )}

      {/* Date */}
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input
          type="date"
          value={values.date}
          max={dayKey()}
          onChange={e => set('date', e.target.value)}
        />
        {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
      </div>

      {/* Start / End time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Start time</Label>
          <Input
            type="time"
            value={values.startTime}
            onChange={e => set('startTime', e.target.value)}
          />
          {errors.startTime && <p className="text-xs text-destructive">{errors.startTime}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>End time</Label>
          <Input
            type="time"
            value={values.endTime}
            onChange={e => set('endTime', e.target.value)}
          />
          {errors.endTime && <p className="text-xs text-destructive">{errors.endTime}</p>}
        </div>
      </div>

      {/* City (for night hours calculation) */}
      {values.logType === LOG_TYPES.PRACTICE_30HR && (
        <div className="space-y-1.5">
          <Label>City <span className="text-muted-foreground font-normal">(for night hours)</span></Label>
          <Input
            value={values.city}
            onChange={e => set('city', e.target.value)}
            placeholder="e.g. Austin, Dallas, Houston"
          />
          <p className="text-xs text-muted-foreground">Used to calculate sunset/sunrise. Defaults to Austin if not found.</p>
        </div>
      )}

      {/* Live preview */}
      {preview && (
        <>
          <Separator />
          <Card className="bg-muted/50">
            <CardContent className="py-3 px-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock size={14} className="text-muted-foreground" />
                  <span>Total drive time</span>
                </div>
                <span className="font-medium">{formatMinutes(preview.totalMinutes)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock size={14} className="text-muted-foreground" />
                  <span>Counts toward log</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {preview.isCapped && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 text-yellow-600 border-yellow-400">
                      Daily cap
                    </Badge>
                  )}
                  <span className="font-medium">{formatMinutes(preview.countedMinutes)}</span>
                </div>
              </div>

              {values.logType === LOG_TYPES.PRACTICE_30HR && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Moon size={14} className="text-muted-foreground" />
                    <span>Night hours</span>
                  </div>
                  <span className="font-medium">
                    {preview.nightMinutes > 0 ? formatMinutes(preview.nightMinutes) : '—'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Save */}
      <Button
        size="lg"
        className="w-full mt-2"
        onClick={handleSave}
        disabled={saving || !preview}
      >
        {saving ? 'Saving…' : editing ? 'Update session' : 'Save session'}
      </Button>

      {!preview && values.startTime && values.endTime && values.startTime >= values.endTime && (
        <p className="text-xs text-destructive text-center -mt-2">End time must be after start time</p>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toMs(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

function toTimeInput(isoString) {
  const d = new Date(isoString)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function logTypeHint(logType) {
  switch (logType) {
    case LOG_TYPES.DL91B_OBSERVATION:
      return 'Parent instructor drives while teen observes. Max 4 hrs/day combined with instruction.'
    case LOG_TYPES.DL91B_INSTRUCTION:
      return 'Teen drives with licensed parent instructor. Max 2 hrs/day, 4 hrs/day combined with observation.'
    case LOG_TYPES.PRACTICE_30HR:
      return 'Teen drives with any qualified adult 21+. Max 2 hrs/day. Night hours count automatically.'
    default:
      return ''
  }
}
